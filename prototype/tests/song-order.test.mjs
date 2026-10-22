import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
import {orderLessons,lessonNumberWithSpecials} from '../src/lesson-order.js';
import {studyCatalog} from '../src/study-catalog.js';
import {renderLearningMap} from '../src/learning-map.js';
import {lessonTitle} from '../src/lesson-title.js';
import {songLessons,songsForCourse} from '../src/song-state.js';
import {videosForCourse,freshVideo,lessonNumberWithVideo} from '../src/video-lesson-state.js';
import {freshScenario} from '../src/scenario-state.js';
import {freshSentence} from '../src/sentence-state.js';
import {freshKoreanProgress} from '../src/korean-state.js';

const courseState=direction=>({...freshState(),courseDirection:direction,onboardingLevel:2});
const levelTwo=state=>studyCatalog(state).filter(l=>l.position.startsWith('2-'));
const previewSongs=state=>songLessons.filter(l=>l.direction===state.courseDirection&&l.level===2).map(l=>({...l,kind:'song',key:`${l.direction}:song:${l.id}`,completed:false}));
const previewOrder=state=>{
 const original=levelTwo(state),regular=original.filter(l=>l.kind!=='video');
 const special=[...original.filter(l=>l.kind==='video').map(l=>({...l,number:Number(l.position.split('-')[1])})),...previewSongs(state)];
 return {original,regular,special,ordered:orderLessons(regular,special)};
};

for(const direction of ['ko-ja','ja-ko']){
 test(`${direction} production keeps all 14 existing lessons while unreleased songs are hidden`,()=>{
  const s=courseState(direction),catalog=levelTwo(s),map=renderLearningMap(s);
  assert.equal(catalog.length,14);
  assert.deepEqual(songsForCourse(s),[]);
  assert.equal(catalog.filter(l=>l.kind==='song').length,0);
  assert.doesNotMatch(map,/data-action="song"/);
  const mapKeys=[...map.matchAll(/class="map-choice" data-action="([^"]+)" data-id="([^"]+)"/g)].map(([,kind,id])=>`${direction}:${kind}:${id}`);
  assert.deepEqual(mapKeys,catalog.map(l=>l.key));
  assert.deepEqual(catalog.filter(l=>l.kind==='video').map(l=>l.position),['2-3','2-6','2-9','2-12']);
 });

 test(`${direction} preview reserves songs at 5, 10 and 15 without replacing an existing lesson`,()=>{
  const s=courseState(direction),{original,regular,special,ordered}=previewOrder(s);
  const inputs=structuredClone({regular,special});
  assert.equal(ordered.length,17);
  assert.equal(new Set(ordered.map(l=>l.key)).size,17);
  assert.deepEqual(ordered.filter(l=>l.kind!=='song').map(l=>l.key).sort(),original.map(l=>l.key).sort());
  assert.deepEqual(ordered.filter(l=>!['song','video'].includes(l.kind)).map(l=>l.key),regular.map(l=>l.key));
  assert.deepEqual(ordered.flatMap((l,i)=>l.kind==='song'?[i+1]:[]),[5,10,15]);
  assert.deepEqual(ordered.flatMap((l,i)=>l.kind==='video'?[i+1]:[]),[3,6,9,12]);
  assert.deepEqual(regular.map((_,i)=>lessonNumberWithSpecials(i+1,special)),[1,2,4,7,8,11,13,14,16,17]);
  assert.deepEqual(orderLessons(regular,[...special].reverse()),ordered);
  assert.deepEqual({regular,special},inputs);
  for(let i=0;i<regular.length;i++)assert.equal(ordered[lessonNumberWithSpecials(i+1,special)-1].key,regular[i].key);
 });

 test(`${direction} shifted positions preserve completion, pending progress and review dates by stable ID`,()=>{
  const s=courseState(direction),sentenceKey=direction==='ko-ja'?'ko-ja:sentence:2':'ja-ko:korean:3-3';
  if(direction==='ko-ja')s.sentenceLessons={2:{...freshSentence(),started:true,completed:true,phase:'summary'}};
  else s.korean={version:4,active:'3-3',lessons:{'3-3':{...freshKoreanProgress('3-3'),started:true,completed:true,phase:'done'}}};
  s.scenarios={
   [`${direction}:scenario:14`]:{...freshScenario(),started:true,completed:true,phase:'done',index:2},
   [`${direction}:scenario:17`]:{...freshScenario(),started:true,phase:'quiz',index:1,selected:2}
  };
  const video=videosForCourse(s)[0];
  s.videoLessons={[video.id]:{...freshVideo(video.revision,video.mode),started:true,completed:true,phase:'done'}};
  s.studyTools={[direction]:{lessons:{[sentenceKey]:{completedOn:'2026-10-20'},[`${direction}:scenario:14`]:{completedOn:'2026-10-21'}}}};
  const before=structuredClone(s),{original,ordered}=previewOrder(s);
  for(const l of original)assert.equal(ordered.find(x=>x.key===l.key).completed,l.completed);
  assert.equal(ordered.findIndex(l=>l.key===sentenceKey)+1,7);
  assert.equal(ordered.findIndex(l=>l.key===`${direction}:scenario:14`)+1,13);
  assert.deepEqual(s,before);
 });

 test(`${direction} existing lesson titles and production catalogue share the same numbering`,()=>{
  const s=courseState(direction);
  for(const l of levelTwo(s)){
   let state=s;
   if(l.kind==='sentence')state={...s,sentenceActive:l.id};
   else if(l.kind==='korean')state={...s,korean:{...s.korean,active:l.id}};
   else if(l.kind==='scenario')state={...s,scenarioActive:l.id};
   else if(l.kind==='video')state={...s,videoActive:l.id};
   assert.ok(lessonTitle(state,l.kind).startsWith(`${l.position.split('-')[1]}. `),l.key);
  }
  assert.deepEqual(Array.from({length:10},(_,i)=>lessonNumberWithVideo(s,i+1)),[1,2,4,5,7,8,10,11,13,14]);
 });
}

test('six independent preview song IDs cover both language directions',()=>{
 assert.equal(songLessons.length,6);
 assert.equal(new Set(songLessons.map(l=>l.id)).size,6);
 assert.ok(songLessons.every(l=>l.level===2&&l.released===false));
 for(const direction of ['ko-ja','ja-ko'])assert.deepEqual(previewSongs(courseState(direction)).map(l=>l.number).sort((a,b)=>a-b),[5,10,15]);
});
