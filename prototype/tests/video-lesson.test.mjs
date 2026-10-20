import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';import {valid,load,STORAGE_KEY} from '../src/storage.js';import {videoLessons,videoLesson,videoProgress,lessonNumberWithVideo,videosForCourse} from '../src/video-lesson-state.js';import {renderLearningMap} from '../src/learning-map.js';import {renderVideoLesson} from '../src/video-lesson.js';
for(const {id,direction,level,count,number} of videoLessons)test(`video course ${direction} ${level}: map, progress, reload, restart`,()=>{
 let s={...freshState(),courseDirection:direction,onboardingLevel:level,videoActive:id};assert.equal(videoLesson(s).number,number);
 const map=renderLearningMap(s);
 const stops=[...map.matchAll(/<button class="map-choice"[^>]*data-action="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(number%3,0);assert.equal(stops[number-1],'video');assert.equal(stops.filter(x=>x==='video').length,videosForCourse(s).length);
 assert.equal(lessonNumberWithVideo(s,2),2);assert.equal(lessonNumberWithVideo(s,3),4);
assert.match(map.replace(/<[^>]*>/g,''),new RegExp(`${number}\\. ${videoLesson(s).title}`));
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

test('each direction has two videos at every level from 2 through 5',()=>{
 for(const direction of ['ko-ja','ja-ko']){
  for(const level of [2,4,5,7])assert.equal(videoLessons.filter(l=>l.direction===direction&&l.level===level).length,2);
  assert.equal(videoLesson({...freshState(),courseDirection:direction,onboardingLevel:6}).level,5);
 }
});

for(const direction of ['ko-ja','ja-ko'])test(`${direction} two video lessons keep separate progress and completion history`,()=>{
 let s={...freshState(),courseDirection:direction,onboardingLevel:2};const [first,second]=videosForCourse(s);
 assert.deepEqual([first.number,second.number],[3,6]);assert.equal(lessonNumberWithVideo(s,5),7);
 s=reduce(s,{type:'video-start',id:first.id});s=reduce(s,{type:'video-next'});
 const saved=structuredClone(videoProgress(s));s=reduce(s,{type:'video-start',id:second.id});assert.equal(videoProgress(s).phase,'watch');assert.deepEqual(videoProgress(s,first.id),saved);
 s=reduce(s,{type:'video-next'});s=reduce(s,{type:'video-next'});
 const host=x=>direction==='ko-ja'?x:x.korean;assert.equal(Object.values(host(s).history.days)[0].cases,1);
 s=reduce(s,{type:'video-start',id:first.id});assert.equal(videoProgress(s).phase,'learn');
 s=reduce(s,{type:'video-start',id:second.id});assert.equal(Object.values(host(s).history.days)[0].cases,1);
 s=reduce(s,{type:'video-start',id:first.id});s=reduce(s,{type:'video-next'});assert.equal(Object.values(host(s).history.days)[0].cases,2);
 const loaded=load({getItem:k=>k===STORAGE_KEY?JSON.stringify(s):null,setItem(){}});assert.equal(loaded.blocked,false);assert.equal(videoProgress(loaded.state,second.id).completed,true);
 assert.deepEqual(reduce(s,{type:'video-start',id:'misaeng'}),s);assert.equal(valid({...s,videoActive:'not-a-lesson'}),false);
});

for(const level of [4,5,7])for(const direction of ['ko-ja','ja-ko'])test(`${direction} internal level ${level} lesson 6 preserves lesson 3 resume`,()=>{
 let s={...freshState(),courseDirection:direction,onboardingLevel:level};const [first,second]=videosForCourse(s);
 assert.deepEqual([first.number,second.number],[3,6]);s=reduce(s,{type:'video-start',id:first.id});s=reduce(s,{type:'video-next'});const saved=structuredClone(videoProgress(s));
 s=reduce(s,{type:'video-start',id:second.id});s=reduce(s,{type:'video-next'});s=reduce(s,{type:'video-next'});
 assert.equal(videoProgress(s).completed,true);assert.deepEqual(videoProgress(s,first.id),saved);
 s=load({getItem:k=>k===STORAGE_KEY?JSON.stringify(s):null}).state;s=reduce(s,{type:'video-start',id:first.id});assert.deepEqual(videoProgress(s),saved);
});
