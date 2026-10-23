import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {load,valid} from '../src/storage.js';
import {videoLessons,videoProgress,videosForCourse,lessonNumberWithVideo} from '../src/video-lesson-state.js';
import {videoSceneContent} from '../src/video-scene-content.js';
import {renderAllLearningMap} from './map-pagination-fixtures.mjs';
import {learningSnapshot,checkedAnswer} from '../src/analytics-learning.js';
import {recordStudyCompletion} from '../src/study-state.js';
import {hasExpressionReview} from '../src/practice-state.js';

const scenes=videoLessons.filter(l=>l.mode==='scene'&&l.count===1);
const now=new Date('2026-10-22T12:00:00');
const fixture=l=>({...freshState(),courseDirection:l.direction,onboardingLevel:l.level,videoActive:l.id});
const reload=s=>{const result=load({getItem:()=>JSON.stringify(s)});assert.equal(result.blocked,false);return result.state;};
for(const l of scenes)test(`${l.id}: scene questions, replay, reload and completion preserve independent progress`,()=>{
 let s=fixture(l);
 const act=(type,id)=>{const before=learningSnapshot(s,'video');s=reduce(s,{type,id},now);const after=learningSnapshot(s,'video');s=recordStudyCompletion(s,before,after,now);assert.ok(valid(s));return {before,after};};
 const key=`${l.direction}:video:${l.id}`;
 assert.equal(l.number%3,0);assert.equal(hasExpressionReview(key),false);
 const map=renderAllLearningMap(s),stops=[...map.matchAll(/<button class="map-choice"[^>]*data-action="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(stops[l.number-1],'video');assert.equal(stops.filter(x=>x==='video').length,4);
 assert.deepEqual(l.answers,[videoSceneContent[l.id].meaning.answer,videoSceneContent[l.id].use.answer]);
 act('video-start',l.id);assert.equal(videoProgress(s).phase,'watch');act('video-next');
 for(const [stage,phase]of ['meaning','use'].entries()){
  const answer=l.answers[stage],wrong=(answer+1)%3;
  assert.equal(videoProgress(s).phase,phase);act('video-next');assert.equal(videoProgress(s).phase,phase);
  act('video-check');assert.equal(videoProgress(s).checked,false);
  act('video-select',wrong);const failed=act('video-check');assert.equal(checkedAnswer(failed.before,failed.after,'video-check'),false);
  assert.equal(videoProgress(s).retry,true);act('video-next');assert.equal(videoProgress(s).phase,phase);
  s=reload(s);assert.equal(videoProgress(s).selected,wrong);assert.equal(videoProgress(s).retry,true);
  act('video-select',answer);const correct=act('video-check');assert.equal(checkedAnswer(correct.before,correct.after,'video-check'),true);
  assert.equal(videoProgress(s).checked,true);act('video-select',wrong);assert.equal(videoProgress(s).selected,answer);
  const saved=structuredClone(videoProgress(s));act('video-replay');assert.equal(videoProgress(s).resume,phase);assert.equal(videoProgress(s).phase,'watch');
  s=reload(s);act('video-start',l.id);act('video-next');assert.deepEqual(videoProgress(s),saved);
  assert.equal(s.studyTools?.[l.direction]?.lessons?.[key],undefined);assert.equal((l.direction==='ko-ja'?s:s.korean)?.history,undefined);
  act('video-next');
  if(phase==='meaning'){
   assert.equal(videoProgress(s).phase,'learn');act('video-replay');s=reload(s);act('video-next');assert.equal(videoProgress(s).phase,'learn');act('video-next');
  }
 }
 assert.equal(videoProgress(s).phase,'done');assert.equal(videoProgress(s).completed,true);assert.equal(learningSnapshot(s,'video').done,true);
 assert.equal(s.studyTools[l.direction].lessons[key].completedOn,'2026-10-22');
 const host=l.direction==='ko-ja'?s:s.korean;assert.deepEqual(host.history.days['2026-10-22'],{letters:0,expressions:1,sentences:0,cases:1});
 s=reload(s);const history=structuredClone((l.direction==='ko-ja'?s:s.korean).history);act('video-next');assert.deepEqual((l.direction==='ko-ja'?s:s.korean).history,history);
 act('video-start',l.id);assert.equal(videoProgress(s).phase,'watch');assert.equal(videoProgress(s).completed,true);assert.equal(videoProgress(s).selected,null);
});

test('all eight legacy video progress records remain readable without changing completed status',()=>{
 const legacyScenes=scenes.filter(l=>l.level===2);assert.equal(legacyScenes.length,8);
 for(const l of legacyScenes)for(const phase of ['watch','learn','speak','done']){
  const legacy={version:l.id==='frieren-just-right'?2:1,started:true,completed:phase==='done',index:0,phase};
  const s=reload({...fixture(l),videoLessons:{[l.id]:legacy}}),p=videoProgress(s);
  assert.equal(p.version,3);assert.equal(p.phase,phase==='done'?'done':'watch');assert.equal(p.completed,legacy.completed);
  assert.deepEqual(s.videoLessons[l.id],legacy);
 }
});

for(const direction of ['ko-ja','ja-ko'])test(`${direction}: two scene lessons keep separate resume and completion history`,()=>{
 let s={...freshState(),courseDirection:direction,onboardingLevel:2};const [first,second]=videosForCourse(s);
 const act=(type,id)=>{s=reduce(s,{type,id},now);assert.ok(valid(s));};
 assert.deepEqual([first.number,second.number],[3,6]);assert.equal(lessonNumberWithVideo(s,5),7);
 act('video-start',first.id);act('video-next');act('video-select',first.answers[0]);const saved=structuredClone(videoProgress(s));
 act('video-start',second.id);assert.equal(videoProgress(s).phase,'watch');act('video-next');
 for(const [i,answer]of second.answers.entries()){act('video-select',answer);act('video-check');act('video-next');if(i===0)act('video-next');}
 assert.equal(videoProgress(s).completed,true);assert.deepEqual(videoProgress(s,first.id),saved);
 s=reload(s);act('video-start',first.id);assert.deepEqual(videoProgress(s),saved);
 const host=direction==='ko-ja'?s:s.korean;assert.equal(host.history.days['2026-10-22'].cases,1);
 assert.deepEqual(reduce(s,{type:'video-start',id:'misaeng'}),s);assert.equal(valid({...s,videoActive:'not-a-lesson'}),false);
});

test('malformed scene selections, resume phases and versions cannot enter the saved course',()=>{
 const l=scenes[0],s=reduce(fixture(l),{type:'video-start',id:l.id});
 for(const mutation of [{version:4},{selected:3},{phase:'infer'},{phase:'meaning',resume:'use'},{resume:'done'},{checked:true,selected:null}])assert.equal(valid({...s,videoLessons:{[l.id]:{...videoProgress(s),...mutation}}}),false);
});

test('level 3-6 upgrades old watch/learn/speak/done saves without losing completion',()=>{
 for(const id of ['frieren-permission','blackdog-confirmation','frieren-uncertainty','frieren-realization','queen-condition','queen-belief']){
  const l=videoLessons.find(l=>l.id===id);assert.equal(l.mode,'scene');assert.equal(l.revision,2);
  for(const phase of ['watch','learn','speak','done'])for(const completed of [false,true]){
   if(phase==='done'&&!completed)continue;
   const old={version:1,started:true,completed,index:0,phase};
   let s=reload({...fixture(l),videoLessons:{[id]:old}});
   assert.equal(videoProgress(s).completed,completed);assert.equal(videoProgress(s).phase,phase==='done'?'done':'watch');
   s=reduce(s,{type:'video-start',id});assert.ok(valid(s));assert.equal(videoProgress(s).version,2);assert.equal(videoProgress(s).phase,'watch');assert.equal(videoProgress(s).completed,completed);
   for(const phase of ['meaning','use'])assert.equal(valid({...s,videoLessons:{[id]:{...old,phase}}}),false);
  }
 }
});
