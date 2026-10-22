import test from 'node:test';import assert from 'node:assert/strict';import {existsSync,readFileSync} from 'node:fs';
import {freshState,reduce} from '../src/engine.js';import {valid,load} from '../src/storage.js';
import {koreanLessons,koreanGroups,koreanGroup,freshKoreanProgress,normalizeKorean,validKorean} from '../src/korean-state.js';
import {koreanContent} from '../src/korean-content.js';import {koreanLetterChoices,koreanExample,koreanExampleAudio,composeKorean} from '../src/korean-letters.js';
import {prepareContent,interceptCompletion} from '../src/practice-content.js';import {lessonPercent} from '../src/lesson-session.js';import {koreanStrokes} from '../src/korean-stroke-data.js';
const lessons=koreanLessons.filter(l=>l.level===0);
test('Korean stage zero covers every component with valid composition, four choices and bundled example sounds',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../assets/audio/korean/manifest.json',import.meta.url)));
 for(const l of lessons){assert.equal(koreanGroups[l.id].reduce((a,b)=>a+b),l.count);assert.ok(koreanGroups[l.id].every(size=>size<=5));for(const [index,item] of koreanContent[l.id].entries()){
  const choices=koreanLetterChoices(l.id,index);assert.equal(choices.length,4);assert.equal(new Set(choices).size,4);assert.equal(choices[index%4],item.answer||item.text);
  const example=koreanExample(item);assert.notEqual(example.text,'？');if(l.practice)assert.equal(composeKorean(item.parts),item.text);
  assert.ok(koreanStrokes(item.text)?.length,`${l.id} ${item.text}`);
  const audio=koreanExampleAudio({korean:{active:l.id,lessons:{[l.id]:{index}}}});assert.equal(audio.text,example.text);assert.ok(existsSync(audio.audioFile));assert.equal(manifest.files[audio.id].spoken,audio.text);
 }}
 const glyphs=lessons.filter(l=>!l.practice).flatMap(l=>koreanContent[l.id].map(x=>x.text)).filter(g=>g.charCodeAt(0)<0xac00);assert.equal(new Set(glyphs).size,40);
});
test('every Korean zero course completes once with monotonic progress, group intros, write and no extra repetitions',async()=>{
 await prepareContent('korean');let s={...freshState(),courseDirection:'ja-ko',onboardingLevel:0,onboarded:true};
 for(const l of lessons){s=reduce(s,{type:'korean-start',id:l.id});assert.equal(s.korean.lessons[l.id].phase,l.practice?'learn':'intro');let previous=0,steps=0;
 while(s.korean.lessons[l.id].phase!=='done'){
  const p=s.korean.lessons[l.id];assert.ok((l.practice?['learn','write','quiz']:['intro','learn']).includes(p.phase));const percent=lessonPercent(s,'korean');assert.ok(percent>=previous,`${l.id} ${p.index}/${p.phase}`);previous=percent;
  const a=p.phase==='quiz'?{type:p.selected===null?'korean-select':'korean-check',id:String(p.index%4)}:{type:'korean-next'};
  s=interceptCompletion(s,reduce(s,a),'korean',a);assert.ok(valid(s));assert.equal(s.practices?.[`ja-ko:korean:${l.id}`],undefined);s=load({getItem:()=>JSON.stringify(s)}).state;assert.ok(++steps<100);
 }
 assert.equal(lessonPercent(s,'korean'),100);assert.equal(s.onboardingLevel,0);
 }
});
test('v2 Korean progress and history survive; old extra practice resumes in the explanation phase',()=>{
 const old={...freshState(),courseDirection:'ja-ko',onboarded:true,korean:{version:2,active:'1-3',lessons:{'1-1':{...freshKoreanProgress(),completed:true,started:true,phase:'done',index:9},'1-3':{...freshKoreanProgress(),started:true,index:8,phase:'quiz',selected:2}}},practices:{'ja-ko:korean:1-3':{version:1,round:1,mode:2,index:5,count:14,action:{type:'korean-check'}}}};
 const result=load({getItem:()=>JSON.stringify(old)});assert.equal(result.blocked,false);assert.equal(result.state.korean.version,4);assert.equal(result.state.korean.lessons['1-1'].completed,true);assert.equal(result.state.korean.lessons['1-3'].index,5);assert.equal(result.state.korean.lessons['1-3'].phase,'learn');assert.equal(result.state.korean.lessons['1-3'].selected,null);assert.equal(result.state.practices['ja-ko:korean:1-3'],undefined);assert.ok(valid(result.state));
});

test('v3 saves migrate to explanation or practice without dropping positions, completion or history',()=>{
 for(const l of lessons)for(const phase of ['intro','learn','write','quiz','done']){
  const old={version:3,active:l.id,lessons:{[l.id]:{index:2,phase,selected:phase==='quiz'?1:null,retry:phase==='quiz',started:true,completed:phase==='done'}},history:{version:1,startedOn:'2026-10-14',days:{'2026-10-14':{letters:8,expressions:0,sentences:0,cases:1}}}};
  assert.ok(validKorean(old));const migrated=normalizeKorean(old);assert.ok(validKorean(migrated));assert.equal(migrated.version,4);assert.equal(migrated.lessons[l.id].index,2);assert.equal(migrated.lessons[l.id].completed,phase==='done');assert.deepEqual(migrated.history,old.history);assert.equal(old.version,3);
  assert.equal(migrated.lessons[l.id].phase,phase==='done'?'done':l.practice?(phase==='intro'?'learn':phase):['write','quiz'].includes(phase)?'learn':phase);
 }
});
test('explanation completion hands off to practice and replay preserves case count',()=>{
 let s={...freshState(),courseDirection:'ja-ko',onboarded:true,onboardingLevel:0};s=reduce(s,{type:'korean-start',id:'1-1'});
 for(let guard=0;s.korean.lessons['1-1'].phase!=='done';guard++){assert.ok(guard<30);s=reduce(s,{type:'korean-next'});}
 const cases=Object.values(s.korean.history.days).reduce((n,d)=>n+d.cases,0);s=reduce(s,{type:'korean-start',id:'1-1'});assert.equal(s.korean.lessons['1-1'].phase,'intro');assert.equal(s.korean.lessons['1-1'].completed,true);
 while(s.korean.lessons['1-1'].phase!=='done')s=reduce(s,{type:'korean-next'});
 assert.equal(Object.values(s.korean.history.days).reduce((n,d)=>n+d.cases,0),cases);s=reduce(s,{type:'korean-start',id:'1-2'});assert.equal(s.korean.lessons['1-2'].phase,'learn');s=reduce(s,{type:'korean-next'});assert.equal(s.korean.lessons['1-2'].phase,'write');s=reduce(s,{type:'korean-next'});assert.equal(s.korean.lessons['1-2'].phase,'quiz');
});
