import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';import {valid,load,STORAGE_KEY} from '../src/storage.js';import {videoLessons,videoLesson,videoProgress} from '../src/video-lesson-state.js';import {renderLearningMap} from '../src/learning-map.js';import {renderVideoLesson} from '../src/video-lesson.js';
for(const {direction,level,count,number} of videoLessons)test(`video course ${direction} ${level}: map, progress, reload, restart`,()=>{
 let s={...freshState(),courseDirection:direction,onboardingLevel:level};assert.equal(videoLesson(s).number,number);
 const map=renderLearningMap(s);assert.match(map,new RegExp(`${number}\\. ${videoLesson(s).title}`));
 s=reduce(s,{type:'video-start'});assert.equal(valid(s),true);assert.match(renderLearningMap(s),/data-action="video"[^>]*aria-current="step"/);
 for(let i=0;i<count;i++){
  assert.equal(videoProgress(s).index,i);assert.equal(videoProgress(s).phase,'watch');const html=renderVideoLesson(s,()=> '');assert.match(html,/https:\/\/www.youtube.com\/embed\//);assert.match(html,/autoplay=0/);assert.doesNotMatch(html,/<video|<audio/);
  for(let n=0;n<2;n++){s=reduce(s,{type:'video-next'});assert.equal(valid(s),true);}
 }
 assert.equal(videoProgress(s).phase,'done');assert.equal(videoProgress(s).completed,true);
 const raw=JSON.stringify(s);const restored=load({getItem:k=>k===STORAGE_KEY?raw:null,setItem(){}});assert.equal(restored.blocked,false);assert.equal(videoProgress(restored.state).completed,true);
 const host=direction==='ko-ja'?s:s.korean;assert.equal(Object.values(host.history.days)[0].cases,1);assert.equal(Object.values(host.history.days)[0].expressions,count);
 s=reduce(s,{type:'video-start'});assert.equal(videoProgress(s).phase,'watch');assert.equal(videoProgress(s).completed,true);
});
test('unsupported direction/level and malformed saved progress are rejected',()=>{
 const s={...freshState(),onboardingLevel:0};assert.equal(videoLesson(s),undefined);assert.deepEqual(reduce(s,{type:'video-start'}),s);
 assert.equal(valid({...s,videoLessons:{frieren:{version:1,phase:'watch',index:2,started:true,completed:false}}}),false);
});
test('previous/replay do not award completion',()=>{let s={...freshState(),onboardingLevel:4};s=reduce(s,{type:'video-start'});s=reduce(s,{type:'video-next'});s=reduce(s,{type:'video-replay'});assert.equal(videoProgress(s).phase,'watch');assert.equal(s.history,undefined);});

test('old Misaeng progress is valid but starts the replacement lesson fresh',()=>{
 const old={...freshState(),courseDirection:'ja-ko',onboardingLevel:7,videoLessons:{misaeng:{version:1,started:true,completed:true,index:0,phase:'done'}}};
 assert.equal(valid(old),true);assert.equal(videoProgress(old).version,2);assert.equal(videoProgress(old).completed,false);
 const next=reduce(old,{type:'video-start'});assert.equal(next.videoLessons.misaeng.version,2);assert.equal(next.videoLessons.misaeng.phase,'watch');
 assert.equal(valid(next),true);
});

test('saved speaking steps resume at the expression without losing progress',()=>{
 let s={...freshState(),onboardingLevel:4,videoLessons:{frieren:{version:1,started:true,completed:false,index:1,phase:'speak'}}};
 assert.equal(valid(s),true);assert.equal(videoProgress(s).phase,'learn');assert.equal(videoProgress(s).index,1);
 assert.doesNotMatch(renderVideoLesson(s,()=>''),/내 문장으로 말/);
 s=reduce(s,{type:'video-next'});assert.equal(videoProgress(s).phase,'done');
});
test('previous from the next clip returns to the preceding expression',()=>{
 let s={...freshState(),onboardingLevel:4};s=reduce(s,{type:'video-start'});
 s=reduce(s,{type:'video-next'});s=reduce(s,{type:'video-next'});s=reduce(s,{type:'video-previous'});
 assert.equal(videoProgress(s).phase,'learn');assert.equal(videoProgress(s).index,0);
});

test('each direction has exactly one video lesson for every level from 2 to 5',()=>{
 for(const direction of ['ko-ja','ja-ko']){
  for(const level of [2,4,5,7])assert.equal(videoLessons.filter(l=>l.direction===direction&&l.level===level).length,1);
  assert.equal(videoLesson({...freshState(),courseDirection:direction,onboardingLevel:6}).level,5);
 }
});
