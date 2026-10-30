import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
import {valid} from '../src/storage.js';
import {recordStudyCompletion,scheduledReviews,reviewDueOn,validStudy} from '../src/study-state.js';
import {studyCatalog} from '../src/study-catalog.js';
const key='ko-ja:video:frieren-uncertainty',before={lesson_id:key,course_direction:'ko-ja',done:false},after={...before,done:true};
const lessons=[{key,position:'4-3',completed:true}];
test('whole lessons become due on the third local calendar day, including month/year rollover',()=>{
 let s=recordStudyCompletion(freshState(),before,after,new Date(2026,9,20,23,59));assert.ok(valid(s));
 assert.equal(scheduledReviews(s,lessons,new Date(2026,9,22))[0].due,false);
 assert.equal(scheduledReviews(s,lessons,new Date(2026,9,23))[0].due,true);
 assert.equal(reviewDueOn('2026-12-30'),'2027-01-02');assert.equal(reviewDueOn('2028-02-27'),'2028-03-01');
 s=recordStudyCompletion(s,before,after,new Date(2026,9,24));assert.equal(scheduledReviews(s,lessons,new Date(2026,9,24))[0].dueOn,'2026-10-27');
});
test('opening, partial progress and repeated completed renders never move the review date',()=>{
 const s=recordStudyCompletion(freshState(),before,after,new Date(2026,9,20));
 assert.equal(recordStudyCompletion(s,before,before),s);assert.equal(recordStudyCompletion(s,after,after),s);assert.equal(recordStudyCompletion(s,before,{...after,lesson_id:'ko-ja:scenario:4'}),s);
});
test('language schedules remain separate and legacy undated completions stay available',()=>{
 const s=recordStudyCompletion(freshState(),before,after,new Date(2026,9,20));
 assert.equal(scheduledReviews({...s,courseDirection:'ja-ko'},[{key:'ja-ko:video:queen-condition',position:'4-3',completed:true}])[0].completedOn,null);
 assert.equal(scheduledReviews(freshState(),lessons)[0].due,true);assert.equal(scheduledReviews(freshState(),[{...lessons[0],completed:false}]).length,0);
 assert.ok(validStudy({'ko-ja':{reviews:{},mistakes:{},daily:{day:'2026-10-20',ids:[],index:0,revealed:false}}}));
 assert.equal(validStudy({'ko-ja':{lessons:{[key]:{completedOn:'2026-02-31'}}}}),false);
});
test('review metadata matches the map numbers for both languages without a three-item cap',()=>{
 for(const courseDirection of ['ko-ja','ja-ko']){
  const s={...freshState(),courseDirection},all=studyCatalog(s),video=all.find(x=>x.id===(courseDirection==='ko-ja'?'frieren-uncertainty':'queen-condition'));assert.equal(video.kind,'video');assert.equal(video.id,courseDirection==='ko-ja'?'frieren-uncertainty':'queen-condition');
  assert.equal(new Set(all.map(x=>x.key)).size,all.length);assert.equal(scheduledReviews(s,all.map(l=>({...l,completed:true}))).length,all.length);
 }
});
