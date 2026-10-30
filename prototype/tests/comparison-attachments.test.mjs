import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {load,valid} from '../src/storage.js';
import {comparisonAttachments,comparisonsAfter,resumedComparison} from '../src/comparison-attachments.js';
import {freshKoreanProgress} from '../src/korean-state.js';
import {mapCourseLessons,mapCurrentLesson,mapNextLesson,renderLearningMap} from '../src/learning-map.js';
import {studyCatalog} from '../src/study-catalog.js';
import {songLessons} from '../src/song-state.js';
import {lessonTitle} from '../src/lesson-title.js';
const base=()=>({...freshState(),onboarded:true,courseDirection:'ja-ko',onboardingLevel:2});
const restore=s=>{assert.ok(valid(s));const r=load({getItem:()=>JSON.stringify(s)});assert.equal(r.blocked,false);return r.state;};
for(const preview of [false,true])test(`all 17 supplements have a visible stable parent; numbered regular lessons follow their parents, preview=${preview}`,()=>{
 const released=songLessons.map(l=>l.released);if(preview)songLessons.forEach(l=>l.released=true);
 try{
  assert.equal(comparisonAttachments.length,17);assert.equal(new Set(comparisonAttachments.map(l=>l.id)).size,17);
  const s=base(),all=studyCatalog(s);
  assert.equal(all.filter(x=>comparisonAttachments.some(c=>c.id===x.id)).length,17);
  for(const l of comparisonAttachments){
   const parent=all.find(p=>p.kind===l.parent.kind&&String(p.id)===l.parent.id);assert.ok(parent,l.id);assert.equal(parent.level,l.level);
   const item=all.find(p=>p.id===l.id);assert.equal(item.level,parent.level);assert.equal(item.key,`ja-ko:korean:${l.id}`);assert.match(item.title,/特別学習/);
   const siblings=comparisonsAfter('ja-ko',l.parent.kind,l.parent.id),offset=siblings.findIndex(c=>c.id===l.id)+1;
   assert.equal(item.number,parent.number+offset);
   const state={...s,onboardingLevel:l.level},map=mapCourseLessons(state),index=map.findIndex(x=>x.id===l.id);
   assert.ok(index>0);assert.equal(index+1,item.number);
   assert.equal(mapNextLesson(state,map[index-1].action,map[index-1].id).id,l.id);
   assert.equal(mapNextLesson(state,'korean',l.id).id,map[index+1].id);
   assert.equal(map.length,all.filter(x=>x.level===l.level).length);
  }
 }finally{songLessons.forEach((l,i)=>l.released=released[i]);}
});
for(const l of comparisonAttachments)test(`${l.id} legacy selection migrates and resumes without losing progress or other language`,()=>{
 const old=l.id.startsWith('25-')?9:10,p={...freshKoreanProgress(l.id),started:true,index:1,phase:'quiz'};
 const legacy={...base(),onboardingLevel:old,courseLevels:{'ja-ko':old,'ko-ja':7},korean:{version:4,active:l.id,lessons:{[l.id]:p}}};
 const s=restore(legacy);assert.equal(s.onboardingLevel,l.level);assert.deepEqual(s.korean,legacy.korean);assert.equal(s.courseLevels['ko-ja'],7);assert.equal(resumedComparison(s).id,l.id);assert.deepEqual(restore(s),s);
 const switched=restore({...legacy,courseDirection:'ko-ja',onboardingLevel:7});assert.equal(switched.onboardingLevel,7);assert.equal(switched.courseLevels['ja-ko'],l.level);assert.equal(resumedComparison(switched),null);
 const reenter=reduce(switched,{type:'course',value:'ja-ko'});assert.equal(resumedComparison(reenter).id,l.id);
 const main=reduce(s,{type:'korean-start',id:'3-1'});assert.equal(main.comparisonResume,null);assert.equal(main.korean.lessons[l.id].index,1);
 assert.match(lessonTitle(s,'korean'),/^\d+\. 特別学習/);
 const html=renderLearningMap(s);assert.match(html,new RegExp(`data-id="${l.id}"`));
});
test('saved hidden level migrates even if current Korean level is already regular',()=>{
 const s=restore({...base(),courseLevels:{'ja-ko':10}});assert.equal(s.onboardingLevel,2);assert.equal(s.courseLevels['ja-ko'],4);
});
test('comparison resume becomes the single current destination, including stored level 6',()=>{
 let s=reduce(base(),{type:'korean-start',id:'25-2'});s={...s,onboardingLevel:6};
 assert.equal(resumedComparison(s).id,'25-2');assert.equal(mapCurrentLesson(s).id,'25-2');
 const html=renderLearningMap(s);assert.doesNotMatch(html,/comparison-links|map-comparison-resume|表現を比べる/);
 assert.equal((html.match(/aria-current="step"/g)||[]).length,1);
});
test('finishing a parent recommends its next comparison without moving established progress backwards',()=>{
 const done=id=>({...freshKoreanProgress(id),started:true,completed:true,phase:'done'});
 const s={...base(),korean:{version:4,active:'3-1',lessons:{'3-1':done('3-1')}}};
 assert.equal(mapCurrentLesson(s).id,'25-3');
 const advanced={...s,korean:{...s.korean,active:'3-4',lessons:{...s.korean.lessons,'3-4':done('3-4'),'25-3':{...freshKoreanProgress('25-3'),started:true}}}};
 assert.equal(mapCurrentLesson(advanced).id,'25-1');
 assert.equal(mapCourseLessons(advanced).find(l=>l.id==='25-3').complete,false);
});
