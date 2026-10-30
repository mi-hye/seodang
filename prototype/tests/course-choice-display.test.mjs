import test from 'node:test';
import assert from 'node:assert/strict';
import {courseChoiceParts} from '../src/course-choice-display.js';
import {courseThreeFourChoiceLines} from '../src/course-choice-display-three-four.js';
import {courseTwentyChoiceLines} from '../src/course-choice-display-twenty.js';
import {courseFiveChoiceLines} from '../src/course-choice-display-five.js';
import {prepareCourseExpansion,expandedCourseContent} from '../src/course-expansion-content.js';
import {courseExpansionCatalog} from '../src/course-expansion-state.js';
import {courseExpansionReview} from '../src/course-expansion-review.js';

for(const group of ['course3-8','course4-8','course5-10','course20-2-19'])await prepareCourseExpansion(group);
const lessons=courseExpansionCatalog.filter(l=>l.level>0).map(l=>({id:l.id,content:expandedCourseContent('ko-ja',l.id)}));

test('Japanese distractors and transfer choices have exact meaningful display boundaries',()=>{
 const source=new Set(lessons.flatMap(({content})=>content.items.flatMap(x=>[...x.others,...x.transfer.options])));
 const annotated=[...courseThreeFourChoiceLines,...courseFiveChoiceLines,...courseTwentyChoiceLines];
 assert.deepEqual(new Set(annotated.map(line=>line.replaceAll('|',''))),source);
 for(const text of source){
  const parts=courseChoiceParts(text);
  assert.equal(parts.join(''),text);
  if(text.length>10)assert.ok(parts.length>1,text);
  for(const part of parts){
   assert.ok(part.length>=2&&part.length<=10,part);
   assert.ok(!/^[、。！？）」』]/u.test(part),part);
   assert.ok(!/^[はがをにへでとものやか]$/u.test(part),part);
  }
 }
});

test('transfer option boundaries and revealed answer preserve the exact spoken source',()=>{
 for(const {id}of lessons){
  const tasks=courseExpansionReview('ko-ja:scenario:'+id).filter(t=>t.type==='apply');
  assert.equal(tasks.length,3);
  for(const task of tasks){
   assert.deepEqual(task.optionPhrases.map(parts=>parts.join('')),task.options);
   assert.equal(task.unit.phrases.join(''),task.unit.text);
   assert.deepEqual(task.optionAudio.map(audio=>audio.text),task.options);
   assert.equal(task.unit.audio.text,task.options[task.answer]);
  }
 }
});
