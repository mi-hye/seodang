import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';import {valid,load} from '../src/storage.js';
import {scenarioLessons,scenarioKey,scenarioProgress} from '../src/scenario-state.js';import {scenarioContent,scenarioAudio} from '../src/scenario-content.js';import {renderLearningMap} from '../src/learning-map.js';import {learningSnapshot,checkedAnswer} from '../src/analytics-learning.js';
const act=(s,type,id)=>reduce(s,{type,id},new Date('2026-10-19T12:00:00'));
for(const direction of ['ko-ja','ja-ko'])for(const l of scenarioLessons)test(`${direction}/${l.id}: map, learn, retry, resume, finish and replay preserve other progress`,()=>{
 let s={...freshState(),courseDirection:direction,onboardingLevel:l.level};
 assert.equal((renderLearningMap(s).match(/data-action="scenario"/g)||[]).length,l.id==='5'?0:1);
 s=act(s,'scenario-start',l.id);assert.equal(scenarioProgress(s).phase,'intro');s=act(s,'scenario-next');
 for(let i=0;i<3;i++){
  assert.equal(scenarioProgress(s).phase,'learn');s=act(s,'scenario-next');const untouched=act(s,'scenario-next');assert.equal(scenarioProgress(untouched).phase,'quiz');
  if(l.id==='2'){for(const n of [2,1,0])s=act(s,'scenario-token',n);}else s=act(s,'scenario-select',(i+1)%3);
  const b=learningSnapshot(s,'scenario');s=act(s,'scenario-check');assert.equal(checkedAnswer(b,learningSnapshot(s,'scenario'),'scenario-check'),false);assert.equal(scenarioProgress(s).retry,true);
  const restored=load({getItem:()=>JSON.stringify(s)});assert.equal(restored.blocked,false);assert.deepEqual(scenarioProgress(restored.state),scenarioProgress(s));
  if(l.id==='2'){s=act(s,'scenario-clear');for(const n of [0,1,2])s=act(s,'scenario-token',n);}else s=act(s,'scenario-select',i);
  s=act(s,'scenario-check');assert.equal(scenarioProgress(s).checked,true);s=act(s,'scenario-next');if(l.id==='2'){assert.equal(scenarioProgress(s).phase,'speak');assert.equal(load({getItem:()=>JSON.stringify(s)}).blocked,false);s=act(s,'scenario-speak-next');}assert.ok(valid(s));
 }
 assert.equal(scenarioProgress(s).completed,true);assert.equal(learningSnapshot(s,'scenario').done,true);
 const h=direction==='ja-ko'?s.korean.history:s.history;assert.equal(h.days['2026-10-19'].cases,1);
 const other={...s,courseDirection:direction==='ko-ja'?'ja-ko':'ko-ja'};assert.equal(scenarioProgress(other).started,false);
 s=act(s,'scenario-start',l.id);assert.equal(scenarioProgress(s).phase,'intro');assert.equal(scenarioProgress(s).completed,true);assert.ok(valid(s));
});
test('new content teaches exact short answers and token builders before questions',()=>{
 for(const [direction,lessons]of Object.entries(scenarioContent))for(const [id,l]of Object.entries(lessons)){
  assert.equal(l.items.length,3);for(const [i,x]of l.items.entries()){
   assert.equal(scenarioAudio(direction,id,i).text,x.text);assert.ok(x.hint&&x.prompt);
   if(id==='2'){assert.equal(x.parts.length,3);assert.equal(x.parts.join('').replaceAll(' ',''),x.text.replaceAll(' ',''));}
   else{assert.equal(x.others.length,2);assert.equal(new Set([x.answer,...x.others]).size,3);if(Number(id)<=3)assert.ok(x.text.includes(x.answer));}
  }
 }
});
test('old states stay valid; malformed or cross-level scenario entry is rejected',()=>{
 const s={...freshState(),onboardingLevel:0};assert.ok(valid(s));assert.equal(load({getItem:()=>JSON.stringify(s)}).blocked,false);
 assert.equal(act(s,'scenario-start','5').scenarioActive,undefined);
 const started=act({...s,onboardingLevel:2},'scenario-start','2');assert.equal(valid({...started,scenarioActive:'99'}),false);
 const key=scenarioKey(started);assert.equal(valid({...started,scenarios:{[key]:{...scenarioProgress(started),index:99}}}),false);
});

test('all new lesson IDs survive the analytics privacy allowlist',async()=>{
 const {createAnalytics}=await import('../src/analytics-core.js');let saved;
 const a=createAnalytics({storage:{getItem:()=>null,setItem:(_,v)=>saved=JSON.parse(v)},send:async()=>{},uuid:()=> '11111111-1111-4111-8111-111111111111'});a.setConsent(true);
 for(const direction of ['ko-ja','ja-ko'])for(const l of scenarioLessons){const id=`${direction}:scenario:${l.id}`;a.capture('lesson_started',{lesson_id:id,course_direction:direction,level:Number(l.id),phase:'intro',answer:'private learner input'});const props=saved.queue.at(-1).properties;assert.equal(props.lesson_id,id);assert.equal(props.answer,undefined);}
});
test('starting a completed Korean lesson from an unfinished one never counts a new completion',()=>{
 let s={...freshState(),courseDirection:'ja-ko',onboardingLevel:2};s=act(s,'scenario-start','2');
 s.scenarios['ja-ko:scenario:3']={...scenarioProgress(s),phase:'done',completed:true};s.onboardingLevel=4;
 s=act(s,'scenario-start','3');assert.equal(s.korean?.history?.days?.['2026-10-19']?.cases??0,0);assert.ok(valid(s));
});

test('level one has no extra scenario and retired progress remains loadable',()=>{
 for(const courseDirection of ['ko-ja','ja-ko']){
  const s={...freshState(),courseDirection,onboardingLevel:0};
  assert.equal(scenarioLessons.some(l=>l.level===0),false);
  assert.doesNotMatch(renderLearningMap(s),/data-action="scenario"/);
  assert.deepEqual(act(s,'scenario-start','1'),s);
  const old={...s,scenarioActive:'1',scenarios:{[`${courseDirection}:scenario:1`]:{...scenarioProgress(s,'1'),started:true,completed:true,phase:'done'}}};
  if(courseDirection==='ko-ja')old.history={version:1,startedOn:'2026-10-19',completed:['ko-ja:scenario:1'],days:{}};
  assert.ok(valid(old));assert.equal(load({getItem:()=>JSON.stringify(old)}).blocked,false);
  assert.doesNotMatch(renderLearningMap(old),/data-action="scenario"/);
  assert.deepEqual(act(old,'scenario-next'),old);
 }
});

// A phrase must not wrap the end of one speaker's line together with the next.
test('dialogue phrase boundaries preserve line order and original audio text',()=>{
 const x=scenarioContent['ko-ja']['3'].items[0];
 assert.deepEqual(x.phrases,['お名前を','お願いします。','\n','キムの名前で','予約しています。']);
 for(const lessons of Object.values(scenarioContent))for(const lesson of Object.values(lessons))for(const x of lesson.items)if(x.phrases){
  assert.equal(x.phrases.join(''),x.text);
  assert.ok(x.phrases.every(p=>p==='\n'||!p.includes('\n')));
 }
});
