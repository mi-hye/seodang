import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {katakanaLessons} from '../src/katakana-lessons.js';
import {basicContent} from '../src/basics.js';
import {freshBasic,basicUnlocked,nextBasic} from '../src/basics-state.js';
import {prepareContent,interceptCompletion} from '../src/practice-content.js';
import {lessonPercent} from '../src/lesson-session.js';
import {devLessonPosition} from '../src/dev-lesson-tools.js';
import {valid,load} from '../src/storage.js';
test('katakana covers 46 letters and foreign sounds in bounded groups',()=>{
 const letters=katakanaLessons.slice(0,5).flatMap(l=>basicContent[l.id].map(([text])=>text));
 assert.equal(letters.join(''),'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン');
 assert.equal(new Set(letters).size,46);
 for(const l of katakanaLessons){assert.equal(basicContent[l.id].length,l.count);assert.ok(l.groupSize<=5);}
 const all=katakanaLessons.flatMap(l=>basicContent[l.id].map(([text])=>text));
 for(const text of ['ガ','ポ','キャ','リョ','ピュ','カップ','コーヒー','ティ','ファ','ヴァ','クォ'])assert.ok(all.includes(text));
});
test('all katakana lessons unlock, save, progress and finish once without extra repetitions',async()=>{
 await prepareContent('basic');
 let s={...freshState(),onboarded:true,onboardingLevel:0,basics:{version:7,active:10,lessons:{10:{...freshBasic(),started:true,index:11,phase:'done',completed:true}}}};
 assert.equal(nextBasic(s),7);assert.equal(basicUnlocked(s,12),true);
 for(const l of katakanaLessons){
  assert.equal(basicUnlocked(s,l.id),true);s=reduce(s,{type:'basic-start',id:l.id});
  assert.equal(devLessonPosition(s,'basic').total,l.count*3+Math.ceil(l.count/l.groupSize));
  let previous=-1;
  while(s.basics.lessons[l.id].phase!=='done'){
   const p=s.basics.lessons[l.id],percent=lessonPercent(s,'basic');assert.ok(percent>=previous);previous=percent;
   const action=p.phase==='quiz'?{type:p.selected===null?'basic-select':'basic-check',id:String(p.index%4)}:{type:'basic-next'};
   s=interceptCompletion(s,reduce(s,action),'basic',action);assert.ok(valid(s));
   const restored=load({getItem:()=>JSON.stringify(s)});assert.equal(restored.blocked,false);s=restored.state;
  }
  assert.equal(lessonPercent(s,'basic'),100);assert.equal(s.practices?.[`ko-ja:basic:${l.id}`],undefined);assert.ok(s.history.completed.includes(`basic-${l.id}`));assert.equal(s.onboardingLevel,0);
 }
 assert.equal(s.basics.lessons[10].completed,true);
});
