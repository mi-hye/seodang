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
