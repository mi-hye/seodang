import {mainLessons,baselineCatalog,mainStops} from './main-lesson-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freshState} from '../src/engine.js';
import {studyCatalog} from '../src/study-catalog.js';
import {courseGroup} from '../src/curriculum.js';
import {lessonTitle} from '../src/lesson-title.js';
import {songLessons} from '../src/song-state.js';
import {courseTwentyCatalog} from '../src/course-twenty-catalog.js';
import {courseTwentyContent} from '../src/course-twenty-content.js';
import {courseTwentyVideos} from '../src/course-twenty-video-catalog.js';
import {courseTwentySongs} from '../src/course-twenty-song-catalog.js';
import {courseTwentyVideoContent} from '../src/course-twenty-video-content.js';
import {courseTwentySongContent} from '../src/course-twenty-song-content.js';
import {videoContent} from '../src/video-lesson-content.js';

for(const direction of ['ko-ja','ja-ko'])for(const dev of [false,true])test(`course 20 scope, final slots and header numbering ${direction} preview=${dev}`,()=>{
 const flags=songLessons.map(l=>l.released);try{
  songLessons.forEach(l=>l.released=dev);
  const state={...freshState(),courseDirection:direction};
  const catalog=studyCatalog(state);
  for(const level of [0,2,4,5,7]){
   const lessons=mainLessons(catalog.filter(l=>courseGroup(l.level)===level));
   assert.equal(lessons.length,level===0?(direction==='ko-ja'?30:10):dev?20:level===2?16:19);
   if(level===0)continue;
   assert.deepEqual(lessons.slice(-3).map(l=>l.kind),dev?['video','scenario','song']:['scenario','video','scenario']);
   if(dev){assert.ok(lessons[17].id.endsWith('-18'));assert.ok(lessons[18].id.endsWith('-19'));assert.ok(lessons[19].id.includes('course20'));}
   for(const lesson of lessons.filter(l=>String(l.id).includes('course20')||String(l.id).endsWith('-18'))){
    const s={...state,onboardingLevel:level,scenarioActive:lesson.id,songActive:lesson.id,videoActive:lesson.id};
    assert.ok(lessonTitle(s,lesson.kind).startsWith(`${lesson.position.split('-')[1]}. `),lesson.key);
   }
  }
 }finally{songLessons.forEach((l,i)=>l.released=flags[i]);}
});

test('new taught answers, choices and review positions are coherent in each language',()=>{
 const distributions=new Set();
 for(const meta of courseTwentyCatalog){
  distributions.add(meta.answers.join(','));
  for(const direction of meta.directions||['ko-ja','ja-ko']){
   const c=courseTwentyContent[direction][meta.id];assert.equal(c.items.length,3);assert.ok(c.image);
   assert.equal(new Set(c.items.map(x=>x.transfer.answer)).size,3,meta.id);
   for(const x of c.items){
    assert.equal(x.answerParts.join(''),x.answer);assert.equal(new Set([x.answer,...x.others]).size,3);
    assert.equal(new Set(x.transfer.options).size,3);assert.ok(x.transfer.options[x.transfer.answer]);
    assert.ok(x.learnNote&&x.prompt&&x.meaning&&x.answerMeaning);
    assert.ok(!JSON.stringify(x).includes('라면예요'));
   }
  }
 }
 assert.ok(distributions.size>=4);
});

test('all 16 new media clips have source evidence and preserve separate lyric release restrictions',()=>{
 const provenance=JSON.parse(readFileSync(new URL('../docs/asset-provenance/course-twenty-20261027.json',import.meta.url)));
 assert.equal(provenance.entries.length,16);assert.equal(courseTwentyVideos.length,8);assert.equal(courseTwentySongs.length,8);
 for(const meta of [...courseTwentyVideos,...courseTwentySongs]){
  const video=meta.mode==='scene',c=video?courseTwentyVideoContent[meta.id][0]:courseTwentySongContent[meta.id],source=provenance.entries.find(e=>e.lessonId===meta.id);
  assert.equal(source.videoId,c.videoId);assert.equal(source.startSeconds,c.startSeconds);assert.equal(source.endSeconds,c.endSeconds);
  assert.equal(source.playableInEmbed,true);assert.equal(source.availability,'public');assert.equal(source.humanListening,false);
  assert.ok(Number.isInteger(c.startSeconds)&&Number.isInteger(c.endSeconds)&&c.endSeconds>c.startSeconds);
  if(video){
   assert.equal(meta.number,18);
   for(const [id,clips]of Object.entries(videoContent))if(id!==meta.id)assert.ok(!clips.some(x=>x.quote===c.quote),meta.id);
  }else{
   assert.equal(meta.number,20);assert.equal(meta.learnFirst,true);assert.equal(source.released,false);
   assert.equal(songLessons.find(x=>x.id===meta.id).released,false);
   assert.equal(c.gap.before+c.gap.options[c.gap.answer]+c.gap.after,c.target);
  }
 }
});
