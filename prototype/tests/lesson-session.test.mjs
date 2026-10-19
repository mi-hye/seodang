import test from 'node:test';
import assert from 'node:assert/strict';
import {practiceCases} from '../scripts/practice-fixtures.mjs';
import {prepareContent,practiceKey,interceptCompletion} from '../src/practice-content.js';
import {reduce} from '../src/engine.js';
import {advancePractice} from '../src/practice-state.js';
import {entryState,shouldOfferResume,restartLesson,lessonPercent,lessonProgress} from '../src/lesson-session.js';
test('all courses restart only the chosen attempt and include all four rounds in progress',async()=>{
 for(const [kind,s,action] of practiceCases()){
  await prepareContent(kind);
  const key=practiceKey(s,kind),pending=interceptCompletion(s,reduce(s,action),kind,action);
  assert.ok(shouldOfferResume(pending,kind),kind);
  let last=lessonPercent(s,kind),p=pending.practices[key];assert.ok(last<100);
  while(p){const current=lessonPercent({...pending,practices:{[key]:p}},kind);assert.ok(current>=last&&current<100,kind);last=current;p=advancePractice(p);}
  assert.equal(lessonPercent(reduce(s,action),kind),100,kind);
  const before=JSON.stringify(pending),reset=restartLesson(pending,kind);
  assert.equal(JSON.stringify(pending),before);assert.equal(reset.practices[key],undefined);assert.equal(lessonPercent(reset,kind),0);assert.equal(shouldOfferResume(reset,kind),false);
  assert.deepEqual(reset.learningHistory,pending.learningHistory);
 }
});
test('selecting another lesson does not inherit or clear the active lesson',()=>{
 const [,s]=practiceCases().find(([kind])=>kind==='basic');
 const target=entryState(s,'basic','7');assert.equal(shouldOfferResume(target,'basic'),false);assert.equal(target.basics.active,7);assert.deepEqual(target.basics.lessons[6],s.basics.lessons[6]);
 const reset=restartLesson(entryState(s,'basic','6'),'basic');assert.equal(lessonProgress(reset,'basic').index,0);assert.equal(s.basics.lessons[6].index,5);
});

test('opening a case introduction alone never prompts to resume, actual learning still does',()=>{
 const base=practiceCases()[0][1];
 for(const kind of ['sentence','dialogue','reading','korean','play']){
  let s={...base,practices:{},onboardingLevel:5,courseDirection:kind==='korean'?'ja-ko':'ko-ja'};
  if(kind==='korean')s={...s,korean:{version:4,active:'3-1',lessons:{}}};
  s=restartLesson(s,kind);
  s=reduce(s,{type:kind==='play'?'start':`${kind}-start`,...(kind==='korean'?{id:'3-1'}:{})});
  assert.equal(shouldOfferResume(s,kind),false,kind);
  s=reduce(s,{type:kind==='play'?'next':`${kind}-next`});
  assert.equal(shouldOfferResume(s,kind),true,kind);
 }
});

test('scenario and expert entries share resume and isolated restart for both languages',async()=>{
 const {freshState}=await import('../src/engine.js');const {valid}=await import('../src/storage.js');
 const {scenarioLessons}=await import('../src/scenario-state.js');
 for(const direction of ['ko-ja','ja-ko'])for(const kind of ['scenario','expert'])for(const lesson of kind==='scenario'?scenarioLessons:[0,1,2,3].map(id=>({id,level:7}))){
  let s=entryState({...freshState(),onboarded:true,onboardingLevel:lesson.level,courseDirection:direction},kind,lesson.id);
  assert.equal(shouldOfferResume(s,kind),false);
  s=reduce(s,{type:`${kind}-start`,id:lesson.id});assert.equal(shouldOfferResume(s,kind),false);
  s=reduce(s,{type:`${kind}-next`});assert.equal(shouldOfferResume(s,kind),true);
  const before=structuredClone(s),reset=restartLesson(s,kind);assert.deepEqual(s,before);assert.equal(lessonProgress(reset,kind).phase,'intro');assert.equal(shouldOfferResume(reset,kind),false);assert.ok(valid(reset));
  const resumed=reduce(s,{type:`${kind}-start`,id:lesson.id});assert.deepEqual(lessonProgress(resumed,kind),lessonProgress(s,kind));
  const other=kind==='expert'?(Number(lesson.id)+1)%4:lesson.id==='2'?'3':'2';assert.equal(shouldOfferResume(entryState(s,kind,other),kind),false);
  const done=structuredClone(s);lessonProgress(done,kind).phase='done';lessonProgress(done,kind).completed=true;assert.equal(shouldOfferResume(done,kind),false);assert.equal(lessonProgress(restartLesson(done,kind),kind).completed,true);
 }
});
