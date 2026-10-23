import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {courseFiveCatalog} from '../src/course-five-catalog.js';
import {courseFiveContent} from '../src/course-five-content.js';
import {orderLessons} from '../src/lesson-order.js';

const directions=['ko-ja','ja-ko'];
const hasKorean=/[가-힣]/;
const hasJapanese=/[ぁ-ゖァ-ヺ一-龯]/;
const required=['text','meaning','answer','answerMeaning','prompt','learnNote','hint'];
const normalized=s=>s.replaceAll(/\s+/g,'').replaceAll(/[、。，.?!？！「」]/g,'');

test('level five adds eight stable paired lessons and preserves video positions',()=>{
 assert.equal(courseFiveCatalog.length,8);
 assert.equal(new Set(courseFiveCatalog.map(x=>x.id)).size,8);
 for(const [index,entry] of courseFiveCatalog.entries()){
  assert.equal(entry.id,`course5-${index+10}`);
  assert.equal(entry.level,7);
  assert.equal(entry.count,3);
  assert.equal(entry.extended,true);
  assert.ok(entry.answers.length===3&&entry.answers.every(n=>Number.isInteger(n)&&n>=0&&n<3));
  assert.equal(entry.titles.length,2);
  assert.match(entry.titles[0],hasKorean);
  assert.match(entry.titles[1],hasJapanese);
  for(const direction of directions)assert.equal(entry.number[direction],index+7);
 }
 for(const direction of directions){
  const regular=Array.from({length:6},(_,index)=>({id:`existing-${index}`})).concat(courseFiveCatalog);
  const special=[3,6,9].map(number=>({id:`video-${number}`,number}));
  const ordered=orderLessons(regular,special);
  assert.equal(ordered.length,17);
  for(const number of [3,6,9])assert.equal(ordered[number-1].id,`video-${number}`);
  for(const number of [10,11,12,13,14,15,16,17])assert.equal(ordered[number-1].id,`course5-${number}`);
  assert.deepEqual(Object.keys(courseFiveContent[direction]).sort(),courseFiveCatalog.map(x=>x.id).sort());
 }
});

for(const direction of directions){
 test(`${direction}: all level-five lessons teach complete text, reply, rationale and new-context practice`,()=>{
  const activities=new Set();
  const allReplies=new Set();
  for(const entry of courseFiveCatalog){
   const lesson=courseFiveContent[direction][entry.id];
   assert.equal(lesson.mode,'course-expansion');
   assert.ok(['dialogue','repair','reading'].includes(lesson.activity));
   activities.add(lesson.activity);
   assert.equal(lesson.items.length,entry.count);
   assert.ok(lesson.scene.length>15);
   assert.ok(lesson.partner.length>1);
   assert.ok(lesson.items.every(x=>Number.isInteger(x.transfer.answer)&&x.transfer.answer>=0&&x.transfer.answer<3));
   for(const [index,item] of lesson.items.entries()){
    const key=`${direction}:${entry.id}:${index}`;
    for(const field of required)assert.ok(typeof item[field]==='string'&&item[field].trim().length>3,`${key}: ${field}`);
    assert.ok(!item.text.includes('|'),`${key}: plain speech text`);
    assert.equal(item.phrases.join(''),item.text,`${key}: exact phrase reconstruction`);
    assert.equal(item.answerParts.join(''),item.answer,`${key}: exact reply reconstruction`);
    assert.ok(item.answerParts.length>=3&&item.answerParts.length<=6,`${key}: useful assembly chunks`);
    assert.equal(new Set(item.answerParts.map(x=>x.trim())).size,item.answerParts.length,`${key}: distinct assembly chunks`);
    assert.ok(item.answerParts.every(x=>x.trim().length>0),`${key}: nonempty chunks`);
    assert.ok(!allReplies.has(item.answer),`${key}: each turn has its own target response`);
    allReplies.add(item.answer);
    assert.equal(item.others.length,2,`${key}: two distractors`);
    assert.equal(new Set([item.answer,...item.others].map(normalized)).size,3,`${key}: distinct main options`);
    assert.equal(item.words.length,2,`${key}: focused vocabulary`);
    assert.ok(item.words.every(x=>x.length===2&&x.every(y=>typeof y==='string'&&y.trim())),`${key}: paired word meanings`);
    assert.equal(item.transfer.options.length,3,`${key}: transfer choices`);
    assert.equal(new Set(item.transfer.options.map(normalized)).size,3,`${key}: distinct transfer options`);
    assert.ok(Number.isInteger(item.transfer.answer)&&item.transfer.answer>=0&&item.transfer.answer<3,`${key}: transfer answer`);
    assert.ok(item.transfer.prompt.length>15&&item.transfer.explanation.length>8,`${key}: explicit new situation and rationale`);
    assert.notEqual(item.transfer.options[item.transfer.answer],item.answer,`${key}: transfer uses a new example`);
   }
  }
  assert.deepEqual([...activities].sort(),['dialogue','reading','repair']);
  assert.equal(allReplies.size,24);
 });

 test(`${direction}: target language and UI language stay separate`,()=>{
  const target=direction==='ko-ja'?hasJapanese:hasKorean;
  const ui=direction==='ko-ja'?hasKorean:hasJapanese;
  const other=direction==='ko-ja'?hasKorean:hasJapanese;
  for(const [id,lesson] of Object.entries(courseFiveContent[direction])){
   assert.match(lesson.partner,ui,id);
   assert.match(lesson.scene,ui,id);
   for(const item of lesson.items){
    for(const s of [item.text,item.answer,...item.others,...item.transfer.options]){
     assert.match(s,target,`${id}: target-language text`);
     assert.ok(!other.test(s),`${id}: no UI translation in target speech`);
    }
    for(const s of [item.meaning,item.answerMeaning,item.prompt,item.learnNote,item.hint,item.transfer.prompt,item.transfer.explanation])assert.match(s,ui,`${id}: explanation language`);
    for(const [word,meaning] of item.words){assert.match(word,target,id);assert.match(meaning,ui,id);}
    if(direction==='ko-ja'){
     assert.ok(item.phrases.length>=3,`${id}: Japanese phrase boundaries`);
     assert.ok(item.phrases.every(x=>x.length<=30),`${id}: phrases fit narrow screens`);
    }else{
     assert.ok(item.answer.includes(' '),`${id}: preserve Korean word spacing`);
     assert.ok(!item.answer.includes('  '),`${id}: no duplicate spaces`);
    }
   }
  }
 });
}

test('level-five scene images reuse existing local files',async()=>{
 const images=new Set(Object.values(courseFiveContent).flatMap(lessons=>Object.values(lessons).map(x=>x.image)));
 for(const image of images){
  assert.match(image,/^assets\/lesson-scenes\/[^/]+\.jpg$/);
  await access(new URL(`../${image}`,import.meta.url));
 }
});

test('equivalent level-five assembly orders preserve each complete response',()=>{
 for(const lessons of Object.values(courseFiveContent))for(const lesson of Object.values(lessons))for(const item of lesson.items){
  if(!item.acceptedOrders)continue;
  const canonical=item.answerParts.map((_,i)=>i);
  assert.deepEqual(item.acceptedOrders[0],canonical);
  for(const order of item.acceptedOrders)assert.deepEqual([...order].sort((a,b)=>a-b),canonical);
 }
 assert.deepEqual(courseFiveContent['ko-ja']['course5-12'].items[2].acceptedOrders[1],[1,0,2,3]);
 assert.deepEqual(courseFiveContent['ko-ja']['course5-13'].items[0].acceptedOrders[1],[0,1,3,2,4]);
 assert.deepEqual(courseFiveContent['ko-ja']['course5-16'].items[0].acceptedOrders[1],[2,0,1,3]);
});
