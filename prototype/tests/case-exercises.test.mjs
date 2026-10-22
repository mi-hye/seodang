import {caseFixtures} from '../scripts/case-exercise-fixtures.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';import {load,valid} from '../src/storage.js';
import {prepareContent,caseTasks,practiceKey,practiceUnits,interceptCompletion} from '../src/practice-content.js';
import {practiceState,renderPractice} from '../src/practice.js';
import {hasExpressionReview,expressionReviewCount,casePracticeVersion,advancePractice,practiceRoundCount,practiceHasWriting} from '../src/practice-state.js';
import {freshSentence} from '../src/sentence-state.js';import {freshDialogue} from '../src/dialogue-state.js';import {freshReading,readingAnswers} from '../src/reading-state.js';import {freshKoreanProgress} from '../src/korean-state.js';
test('all active cases use a bounded mix of tasks, source-backed evidence and no translation loop',async()=>{
 for(const [kind,s,action] of caseFixtures()){
  await prepareContent(kind);const tasks=caseTasks(s,kind),key=practiceKey(s,kind);assert.equal(tasks.length,expressionReviewCount(key)||practiceUnits(s,kind).length);assert.ok(new Set(tasks.map(t=>t.type)).size>=2);assert.equal(practiceRoundCount(key),1);assert.equal(practiceHasWriting(key),false);
  let pending=interceptCompletion(s,reduce(s,action),kind,action);assert.deepEqual(pending.history,s.history);assert.deepEqual(pending.korean?.history,s.korean?.history);
  let p=practiceState(pending,kind),count=0;
  while(p){const task=tasks[p.index];assert.ok(task.scene&&task.prompt&&task.hint);if(task.type==='order'){assert.ok(task.tokens.length>=2);assert.equal(new Set(task.tokens).size,task.tokens.length);}else{assert.ok(task.options[task.answer]);assert.equal(new Set(task.options).size,task.options.length);if(task.type==='evidence')assert.ok(task.passage.replaceAll('|','').includes(task.options[task.answer].replaceAll('|','')),`${key}: missing evidence`);}
   const html=renderPractice({...pending,practices:{[key]:p}},kind,()=> '');assert.match(html,hasExpressionReview(key)?/introduction-review/:/case-practice/);if(!hasExpressionReview(key))assert.doesNotMatch(html,/듣고 뜻|聞いて意味|data-practice="choice"|canvas/);assert.ok(valid({...pending,practices:{[key]:p}}));count++;p=advancePractice(p,practiceRoundCount(key),false);
  }assert.equal(count,tasks.length);const completed=reduce({...pending,practices:{}},action);assert.ok(valid(completed));
 }
});
test('old three-round case practice restarts at the new transfer tasks and retains pending completion/history',async()=>{
 for(const [kind,s,action] of caseFixtures()){await prepareContent(kind);const key=practiceKey(s,kind),old={...s,practices:{[key]:{version:1,round:2,mode:2,index:1,count:practiceUnits(s,kind).length,action}}};const result=load({getItem:()=>JSON.stringify(old)});assert.equal(result.blocked,false);const p=result.state.practices[key];assert.equal(p.caseVersion,casePracticeVersion(key));assert.equal(p.index,0);assert.equal(p.round,0);assert.equal(p.mode,0);assert.deepEqual(p.action,action);assert.deepEqual(result.state.korean?.history,old.korean?.history);assert.deepEqual(load({getItem:()=>JSON.stringify(result.state)}).state,result.state);}
});
