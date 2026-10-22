import {practiceCases} from '../scripts/practice-fixtures.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';
import {freshState,reduce} from '../src/engine.js';import {valid,load} from '../src/storage.js';
import {isCasePractice,expressionReviewCount,practiceRoundCount,advancePractice,practiceHasWriting,validPractices} from '../src/practice-state.js';import {prepareContent,practiceUnits,practiceKey,interceptCompletion} from '../src/practice-content.js';
import {normalizeKana,kanaLessons,kanaRound} from '../src/kana-state.js';import {freshBasic} from '../src/basics-state.js';import {freshLabels} from '../src/labels-state.js';import {freshListening} from '../src/listening-state.js';import {freshSentence} from '../src/sentence-state.js';import {freshDialogue} from '../src/dialogue-state.js';import {freshReading,readingAnswers} from '../src/reading-state.js';import {freshKoreanProgress} from '../src/korean-state.js';
const base=()=>({...freshState(),onboarded:true,onboardingLevel:1});
test('all lesson completions wait for three rounds of level-appropriate practice, with serializable resume and deferred history',async()=>{
 for(const [kind,s,action] of practiceCases()){
  await prepareContent(kind);const candidate=reduce(s,action),gated=interceptCompletion(s,candidate,kind,action),key=practiceKey(s,kind);assert.ok(gated.practices?.[key],kind);assert.deepEqual(gated.history,s.history);assert.deepEqual(gated.korean?.history,s.korean?.history);
  const units=practiceUnits(s,kind);for(const unit of units){assert.ok(unit.text&&unit.meaning&&unit.audio?.audioFile,`${kind}: ${JSON.stringify(unit)}`);assert.ok(existsSync(new URL('../'+unit.audio.audioFile,import.meta.url)),unit.audio.audioFile);}
  let p=gated.practices[key],steps=0;while(p){assert.ok(validPractices({[key]:p}));p=advancePractice(p,practiceRoundCount(key),practiceHasWriting(key));steps++;}assert.equal(steps,(expressionReviewCount(key)||units.length)*practiceRoundCount(key)*(practiceHasWriting(key)?2:1),kind);
  const restored=load({getItem:()=>JSON.stringify(gated)});assert.equal(restored.blocked,false,kind);assert.deepEqual(restored.state.practices,gated.practices);
  const result=reduce({...gated,practices:{}},action);assert.deepEqual(result,{...candidate,practices:{}},kind);
 }
});
test('practice validation rejects invalid counters and preserves separate language/lesson progress',()=>{
 const p={version:1,round:2,mode:3,index:1,count:6,action:{type:'basic-check'}};assert.ok(validPractices({'ko-ja:basic:6':p,'ja-ko:korean:1-2':p}));for(const patch of [{round:4},{mode:4},{index:6},{count:0},{action:{type:'reset'}}])assert.equal(validPractices({'ko-ja:basic:6':{...p,...patch}}),false);
 assert.ok(valid({...base(),practices:{'ko-ja:basic:6':p}}));
});

test('all Korean lesson practice material and new recap audio remain locally available',async()=>{
 const {koreanLessons}=await import('../src/korean-state.js');await prepareContent('korean');
 for(const lesson of koreanLessons){const s={...base(),courseDirection:'ja-ko',onboardingLevel:lesson.level,korean:{active:lesson.id}};const units=practiceUnits(s,'korean');assert.equal(units.length,lesson.count);for(const unit of units){assert.ok(unit.meaning);assert.ok(existsSync(new URL('../'+unit.audio.audioFile,import.meta.url)));if(lesson.level>=5)assert.equal(unit.audio.text,unit.text);}}
});

test('legacy vocabulary reading skips removed writing to the next listening round',()=>{
 const p={version:1,round:1,mode:1,index:3,count:6,action:{type:'basic-check'}};
 const state={...freshState(),practices:{'ko-ja:basic:6':p}};
 const restored=load({getItem:()=>JSON.stringify(state)}).state.practices['ko-ja:basic:6'];
 assert.equal(restored.mode,0);assert.equal(restored.index,0);assert.equal(restored.round,2);
 assert.deepEqual(advancePractice({...p,mode:0,index:5}),{...p,mode:2,index:0});
});

test('old fourth-round saves resume at the final step of three rounds',()=>{
 const p={version:1,round:3,mode:0,index:1,count:6,action:{type:'basic-check'}};
 const restored=load({getItem:()=>JSON.stringify({...freshState(),practices:{'ko-ja:basic:6':p}})});
 assert.equal(restored.blocked,false);const current=restored.state.practices['ko-ja:basic:6'];
 assert.deepEqual(current,{...p,round:2,mode:0,index:5});assert.equal(advancePractice(current,3,false),null);
});

test('listening grids have four distinct choices with exactly one target in every lesson',async()=>{
 const {renderPractice}=await import('../src/practice.js');
 const {koreanLessons}=await import('../src/korean-state.js');
 const cases=practiceCases().map(([kind,s])=>[kind,s]);
 for(const l of koreanLessons)cases.push(['korean',{...freshState(),courseDirection:'ja-ko',onboardingLevel:l.level,korean:{active:l.id}}]);
 for(const [kind,s] of cases){if(isCasePractice(practiceKey(s,kind)))continue;await prepareContent(kind);const units=practiceUnits(s,kind);for(let round=0;round<3;round++)for(let index=0;index<units.length;index++){
  const state={...s,practices:{[practiceKey(s,kind)]:{round,mode:0,index,count:units.length}}};
  const html=renderPractice(state,kind,()=>''),choices=[...html.matchAll(/data-choice="\d"[^>]*>(.*?)<\/button>/g)].map(m=>m[1].replace(/<[^>]+>/g,''));
  assert.equal(choices.length,4,`${kind} ${index}`);assert.equal(new Set(choices).size,4);assert.equal(choices.filter(x=>x===units[(index+round)%units.length].text).length,1);
 }}
});

test('removed speaking saves migrate to the next listening round or final listening step',async()=>{
 const {normalizePractice}=await import('../src/practice-state.js');
 for(const round of [0,1,2]){const p={version:1,round,mode:3,index:2,count:6,action:{type:'basic-check'}};const restored=load({getItem:()=>JSON.stringify({...freshState(),practices:{'ko-ja:basic:6':p}})});assert.equal(restored.blocked,false);assert.deepEqual(restored.state.practices['ko-ja:basic:6'],round<2?{...p,round:round+1,mode:0,index:0}:{...p,mode:0,index:5});assert.deepEqual(normalizePractice(restored.state.practices['ko-ja:basic:6']),restored.state.practices['ko-ja:basic:6']);}
});

test('lessons 8 and 9 repeat listening and writing once, including old saves',async()=>{
 const {practiceRoundCount,normalizePractice}=await import('../src/practice-state.js');
 for(const [id,count] of [[9,6],[10,6]]){
  const key=`ko-ja:basic:${id}`,rounds=practiceRoundCount(key);assert.equal(rounds,1);
  let p={version:1,round:0,mode:0,index:0,count,action:{type:'basic-check'}},steps=0;
  while(p){assert.equal(p.round,0);steps++;p=advancePractice(p,rounds);}
  assert.equal(steps,count*2);
  const old={version:1,round:2,mode:0,index:1,count,action:{type:'basic-check'}};
  const normalized=normalizePractice(old,rounds);assert.equal(normalized.mode,2);assert.equal(normalized.index,count-1);assert.equal(advancePractice(normalized,rounds),null);
  const restored=load({getItem:()=>JSON.stringify({...freshState(),practices:{[key]:old}})});assert.equal(restored.blocked,false);assert.deepEqual(restored.state.practices[key],id===10?{...normalized,action:{type:'basic-next'}}:normalized);
 }
 assert.equal(practiceRoundCount('ko-ja:basic:6'),3);assert.equal(practiceRoundCount('ja-ko:korean:9'),3);
});

test('only letter lessons retain writing; vocabulary and higher levels render listening after legacy writing',async()=>{
 const {practiceState,renderPractice}=await import('../src/practice.js');const {lessonPercent}=await import('../src/lesson-session.js');
 for(const key of ['ko-ja:kana:0','ko-ja:basic:7','ko-ja:basic:26','ja-ko:korean:1-2','ja-ko:korean:1-10'])assert.equal(practiceHasWriting(key),true,key);
 for(const [kind,s,action] of practiceCases()){
  await prepareContent(kind);const key=practiceKey(s,kind);if(practiceHasWriting(key))continue;
  const count=practiceUnits(s,kind).length;for(const round of [0,1,2]){const pending={version:1,round,mode:2,index:0,count,action},state={...s,practices:{[key]:pending}};
   const p=practiceState(state,kind);assert.equal(p.mode,0);assert.equal(p.round,isCasePractice(key)?0:Math.min(2,round+1));assert.doesNotMatch(renderPractice(state,kind,()=>''),/<canvas|data-practice="clear"/);assert.ok(lessonPercent(state,kind)<100);
  }
 }
});
