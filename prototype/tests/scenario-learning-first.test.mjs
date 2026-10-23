import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {freshScenario,scenarioLessons,scenarioLearnsFirst,scenarioKey,scenarioProgress} from '../src/scenario-state.js';
import {load,valid} from '../src/storage.js';
import {lessonPercent,restartLesson} from '../src/lesson-session.js';
import {prepareContent,interceptCompletion} from '../src/practice-content.js';

const now=new Date(2026,9,22,12);
const act=(s,type,id)=>reduce(s,{type,id},now);
const restored=s=>{const result=load({getItem:()=>JSON.stringify(s)});assert.equal(result.blocked,false);return result.state;};
const fixture=(direction,id,p={})=>({...freshState(),courseDirection:direction,onboardingLevel:2,scenarioActive:id,scenarios:{[`${direction}:scenario:${id}`]:{...freshScenario(id),started:true,...p}}});
const legacy=(direction,id,p)=>{const s=fixture(direction,id,p);delete s.scenarios[scenarioKey(s)].learningVersion;return s;};
await prepareContent('scenario');

for(const direction of ['ko-ja','ja-ko'])for(const id of ['14','15','16','17']){
 test(`${direction}/${id}: every question follows its learning page and progress includes six lesson steps`,()=>{
  const lesson=scenarioLessons.find(l=>l.id===id);
  let s=act({...freshState(),courseDirection:direction,onboardingLevel:2},'scenario-start',id);
  assert.equal(scenarioProgress(s).learningVersion,1);
  assert.equal(scenarioProgress(s).phase,'intro');assert.equal(lessonPercent(s,'scenario'),0);
  s=act(s,'scenario-next');
  for(let index=0;index<3;index++){
   assert.equal(scenarioProgress(s).index,index);assert.equal(scenarioProgress(s).phase,'learn');
   assert.equal(lessonPercent(s,'scenario'),Math.floor(index*2/9*100));
   assert.equal(act(s,'scenario-select',lesson.answers[index]),s);
   assert.equal(act(s,'scenario-check'),s);
   s=act(s,'scenario-next');assert.equal(scenarioProgress(s).phase,'quiz');
   assert.equal(lessonPercent(s,'scenario'),Math.floor((index*2+1)/9*100));
   assert.equal(act(s,'scenario-next'),s);
   s=act(s,'scenario-select',lesson.answers[index]);s=act(s,'scenario-check');
   const before=s,next=act(s,'scenario-next');
   if(index===2){
    const pending=interceptCompletion(before,next,'scenario',{type:'scenario-next'});
    assert.equal(scenarioProgress(pending).phase,'quiz');assert.equal(scenarioProgress(pending).checked,true);
    assert.equal(lessonPercent(pending,'scenario'),66);assert.ok(valid(pending));
    assert.deepEqual(act(restored(pending),'scenario-start',id).practices,pending.practices);
   }
   s=next;
  }
  assert.equal(scenarioProgress(s).phase,'done');assert.equal(scenarioProgress(s).completed,true);
  assert.equal(lessonPercent(s,'scenario'),100);assert.ok(valid(s));
 });

 test(`${direction}/${id}: previous revisits learning, and new question resumes keep choices`,()=>{
  const base=fixture(direction,id,{phase:'quiz',index:1,selected:0,retry:true,attempts:2});
  let s=act(restored(base),'scenario-start',id);assert.deepEqual(scenarioProgress(s),scenarioProgress(base));
  s=act(s,'scenario-previous');assert.equal(scenarioProgress(s).phase,'learn');assert.equal(scenarioProgress(s).index,1);assert.equal(scenarioProgress(s).selected,null);
  s=act(restored(s),'scenario-start',id);assert.equal(scenarioProgress(s).phase,'learn');assert.equal(scenarioProgress(s).index,1);
  s=act(s,'scenario-previous');assert.equal(scenarioProgress(s).phase,'learn');assert.equal(scenarioProgress(s).index,0);
  s=act(s,'scenario-previous');assert.equal(scenarioProgress(s).phase,'intro');assert.equal(scenarioProgress(s).index,0);
  assert.equal(act(s,'scenario-previous'),s);
  const reset=restartLesson(base,'scenario');assert.equal(scenarioProgress(reset).learningVersion,1);assert.equal(scenarioProgress(reset).phase,'intro');
 });

 test(`${direction}/${id}: legacy unchecked question migrates once without moving its expression`,()=>{
  const old=legacy(direction,id,{phase:'quiz',index:1,selected:2,retry:true,attempts:4}),before=structuredClone(old);
  assert.ok(valid(old));let s=act(restored(old),'scenario-start',id);
  assert.deepEqual(old,before);assert.equal(scenarioProgress(s).phase,'learn');assert.equal(scenarioProgress(s).index,1);
  assert.equal(scenarioProgress(s).learningVersion,1);assert.equal(scenarioProgress(s).selected,null);assert.equal(scenarioProgress(s).retry,false);assert.equal(scenarioProgress(s).attempts,4);
  s=act(s,'scenario-next');s=act(s,'scenario-select',2);
  const saved=structuredClone(scenarioProgress(s));s=act(restored(s),'scenario-start',id);assert.deepEqual(scenarioProgress(s),saved);
 });

 test(`${direction}/${id}: legacy checked answers, completion badges and pending reviews survive entry`,()=>{
  const lesson=scenarioLessons.find(l=>l.id===id),checked=legacy(direction,id,{phase:'quiz',index:1,selected:lesson.answers[1],checked:true,attempts:3});
  const resumed=act(restored(checked),'scenario-start',id);
  assert.deepEqual(scenarioProgress(resumed),{...scenarioProgress(checked),learningVersion:1});
  const advanced=act(resumed,'scenario-next');assert.equal(scenarioProgress(advanced).phase,'learn');assert.equal(scenarioProgress(advanced).index,2);
  const final=legacy(direction,id,{phase:'quiz',index:2,selected:lesson.answers[2],checked:true,attempts:3});
  const pending=interceptCompletion(final,act(final,'scenario-next'),'scenario',{type:'scenario-next'});
  const pendingBefore=structuredClone(pending),entry=act(restored(pending),'scenario-start',id);
  assert.deepEqual(pending,pendingBefore);assert.deepEqual(entry.practices,pending.practices);
  assert.deepEqual(scenarioProgress(entry),{...scenarioProgress(pending),learningVersion:1});
  // A held review must be kept even if an old record lacks its checked flag.
  const held=structuredClone(pending);held.scenarios[scenarioKey(held)].checked=false;
  const heldEntry=act(restored(held),'scenario-start',id);assert.equal(scenarioProgress(heldEntry).phase,'quiz');assert.deepEqual(heldEntry.practices,held.practices);
  const completed=legacy(direction,id,{phase:'done',index:2,completed:true,attempts:3});
  completed.studyTools={[direction]:{lessons:{[scenarioKey(completed)]:{completedOn:'2026-10-21'}}}};
  const replay=act(restored(completed),'scenario-start',id);assert.equal(scenarioProgress(replay).phase,'intro');assert.equal(scenarioProgress(replay).completed,true);
  assert.deepEqual(replay.studyTools,completed.studyTools);assert.equal(scenarioProgress(restartLesson(replay,'scenario')).completed,true);
 });
}

test('learning-first metadata remains scoped and existing higher-level question-first lessons keep their flow',()=>{
 assert.deepEqual(scenarioLessons.filter(l=>!l.extended&&scenarioLearnsFirst(l.id)).map(l=>l.id).sort(),['10','11','12','14','15','16','17','9']);
 for(const id of ['8']){
  const l=scenarioLessons.find(l=>l.id===id);
  let s=act({...freshState(),onboardingLevel:l.level},'scenario-start',id);s=act(s,'scenario-next');
  assert.equal(scenarioProgress(s).phase,'quiz');assert.equal(scenarioProgress(s).learningVersion,undefined);
  const p=scenarioProgress(s),key=scenarioKey(s);s={...s,scenarios:{...s.scenarios,[key]:{...p,checked:true,selected:0}}};
  s=act(s,'scenario-next');assert.equal(scenarioProgress(s).phase,'quiz');assert.equal(scenarioProgress(s).index,1);
  s=act(s,'scenario-previous');assert.equal(scenarioProgress(s).phase,'quiz');assert.equal(scenarioProgress(s).index,0);
 }
 const s=fixture('ko-ja','14',{learningVersion:2});assert.equal(valid(s),false);
 const wrongScope=fixture('ko-ja','13',{learningVersion:1});assert.equal(valid(wrongScope),false);
});
