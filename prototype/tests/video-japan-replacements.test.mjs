import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freshState,reduce} from '../src/engine.js';
import {load,valid} from '../src/storage.js';
import {videoLessons,videoProgress,freshVideo} from '../src/video-lesson-state.js';
import {videoContent} from '../src/video-lesson-content.js';
import {videoSceneContent} from '../src/video-scene-content.js';
const evidence=JSON.parse(readFileSync(new URL('../docs/asset-provenance/video-japan-replacements-20261112.json',import.meta.url)));
for(const entry of evidence.entries)test(`${entry.lessonId}: replacement accepts old saves and preserves completion without stale answers`,()=>{
 const l=videoLessons.find(l=>l.id===entry.lessonId),questions=l.mode==='detective'?['infer','clue']:['meaning','use'];
 for(const phase of ['watch',...questions,'learn','done'])for(const completed of [false,true]){
  if(phase==='done'&&!completed)continue;
  const old={...freshVideo(entry.previousRevision,l.mode),started:true,completed,phase,selected:1,checked:true,resume:phase==='watch'?questions[1]:null};
  const other={...freshVideo(1),started:true,phase:'learn'};
  const s={...freshState(),courseDirection:l.direction,onboardingLevel:l.level,videoActive:l.id,videoLessons:{[l.id]:old,frieren:other}};
  const loaded=load({getItem:()=>JSON.stringify(s)});assert.equal(loaded.blocked,false,`${phase}/${completed}`);
  assert.deepEqual(loaded.state.videoLessons[l.id],old);
  const p=videoProgress(loaded.state);assert.equal(p.version,entry.previousRevision+1);assert.equal(p.completed,completed);assert.equal(p.phase,phase==='done'?'done':'watch');assert.equal(p.selected,null);assert.equal(p.checked,false);assert.equal(p.resume,null);
  const next=reduce(loaded.state,{type:'video-start',id:l.id});assert.ok(valid(next));assert.equal(videoProgress(next).phase,'watch');assert.equal(videoProgress(next).completed,completed);assert.deepEqual(next.videoLessons.frieren,other);
  for(const bad of [{selected:9},{version:99},{phase:'missing'},{phase:questions[0],resume:questions[1]}])assert.equal(valid({...s,videoLessons:{[l.id]:{...old,...bad}}}),false);
 }
});
test('Korean clips retain region and embed evidence, integer bounds, Japanese copy and aligned answers',()=>{
 const changed=new Set(evidence.entries.map(e=>e.lessonId));assert.equal(changed.size,13);
 for(const l of videoLessons.filter(l=>l.direction==='ja-ko'))for(const clip of videoContent[l.id]){
  const source=evidence.sources.find(x=>x.videoId===clip.videoId);assert.ok(source,l.id);
  assert.ok(source.availableCountries.includes('JP'),l.id);assert.ok(source.availableCountries.includes('KR'),l.id);assert.equal(source.playableInEmbed,true,l.id);
  if(!changed.has(l.id))continue;
  const record=evidence.entries.find(e=>e.lessonId===l.id);
  for(const key of ['videoId','quote','startSeconds','endSeconds'])assert.equal(clip[key],record[key],`${l.id}/${key}`);
  assert.ok(Number.isInteger(clip.startSeconds)&&Number.isInteger(clip.endSeconds));assert.ok(clip.endSeconds>clip.startSeconds&&clip.endSeconds-clip.startSeconds<=30);
  assert.equal(clip.explanationLang,'ja');assert.ok(clip.work&&clip.channel&&clip.translation);
  if(l.mode==='scene')assert.deepEqual(l.answers,[videoSceneContent[l.id].meaning.answer,videoSceneContent[l.id].use.answer]);
 }
});
