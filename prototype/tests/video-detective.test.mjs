import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';import {valid,load} from '../src/storage.js';
import {videoLessons,videoProgress} from '../src/video-lesson-state.js';import {renderVideoLesson} from '../src/video-lesson.js';import {studyCatalog} from '../src/study-catalog.js';
for(const l of videoLessons.filter(l=>l.mode==='detective'))test(`${l.id}: infer, evidence, retry, resume, completion and replay`,()=>{
 let s={...freshState(),courseDirection:l.direction,onboardingLevel:7};const act=(type,id)=>{s=reduce(s,{type,id},new Date('2026-10-21T12:00:00'));assert.ok(valid(s));};
 assert.equal(studyCatalog(s).find(x=>x.kind==='video'&&x.id===l.id).position,'5-9');act('video-start',l.id);
 assert.equal(videoProgress(s).phase,'watch');assert.match(renderVideoLesson(s,()=>''),/cc_load_policy=0/);act('video-next');
 for(const [phase,answer] of [['infer',1],['clue',2]]){
  assert.equal(videoProgress(s).phase,phase);act('video-next');assert.equal(videoProgress(s).phase,phase);act('video-check');assert.equal(videoProgress(s).checked,false);
  act('video-select',0);act('video-check');assert.equal(videoProgress(s).retry,true);assert.equal(videoProgress(s).completed,false);
  const loaded=load({getItem:()=>JSON.stringify(s)});assert.equal(loaded.blocked,false);s=loaded.state;assert.equal(videoProgress(s).selected,0);
  act('video-select',answer);act('video-check');assert.equal(videoProgress(s).checked,true);act('video-select',0);assert.equal(videoProgress(s).selected,answer);act('video-next');
 }
 assert.equal(videoProgress(s).phase,'learn');assert.equal(videoProgress(s).completed,false);act('video-next');assert.equal(videoProgress(s).completed,true);
 const host=l.direction==='ja-ko'?s.korean:s;assert.equal(host.history.days['2026-10-21'].cases,1);
 act('video-start',l.id);assert.equal(videoProgress(s).phase,'watch');assert.equal(videoProgress(s).completed,true);assert.equal(videoProgress(s).selected,null);
 act('video-next');act('video-select',1);act('video-check');act('video-next');act('video-previous');assert.equal(videoProgress(s).phase,'infer');assert.equal(videoProgress(s).checked,false);
 act('video-replay');assert.equal(videoProgress(s).phase,'watch');assert.equal(videoProgress(s).resume,'infer');act('video-next');assert.equal(videoProgress(s).phase,'infer');
 act('video-select',1);act('video-check');act('video-next');act('video-select',2);act('video-check');act('video-replay');assert.equal(videoProgress(s).phase,'watch');
 assert.match(renderVideoLesson(s,()=>''),/data-action="video-next"[^>]*>[^<]*(단서로 돌아가기|手がかりに戻る)/);
 const saved=load({getItem:()=>JSON.stringify(s)});assert.equal(saved.blocked,false);s=saved.state;
 act('video-next');assert.equal(videoProgress(s).phase,'clue');assert.equal(videoProgress(s).checked,true);assert.equal(videoProgress(s).selected,2);
 act('video-next');act('video-replay');act('video-next');assert.equal(videoProgress(s).phase,'learn');
 act('video-start',l.id);assert.equal(videoProgress(s).phase,'learn');
});
test('detective-only phases and malformed selections cannot corrupt older video progress',()=>{
 const s={...freshState()};assert.equal(valid({...s,videoLessons:{frieren:{version:1,started:true,completed:false,index:0,phase:'infer'}}}),false);
 assert.equal(valid({...s,videoLessons:{'frieren-subtext':{version:1,started:true,completed:false,index:0,phase:'infer',selected:5,checked:false,retry:false}}}),false);
 assert.equal(valid({...s,videoLessons:{'frieren-subtext':{version:2,started:true,completed:false,index:0,phase:'infer',selected:null,checked:false,retry:false,resume:'clue'}}}),false);
 assert.equal(valid({...s,videoLessons:{'frieren-subtext':{version:2,started:true,completed:false,index:0,phase:'watch',selected:null,checked:false,retry:false,resume:'done'}}}),false);
});
test('replacement clips reset only obsolete detective progress and retain other lessons',()=>{
 for(const l of videoLessons.filter(l=>l.mode==='detective')){
  const legacy={version:1,started:true,completed:true,index:0,phase:'done',selected:null,checked:false,retry:false};
  const other={version:1,started:true,completed:false,index:0,phase:'learn'};
  const s={...freshState(),courseDirection:l.direction,onboardingLevel:7,videoActive:l.id,videoLessons:{[l.id]:legacy,'frieren-wait':other}};
  assert.equal(valid(s),true);
  assert.equal(videoProgress(s).phase,'watch');assert.equal(videoProgress(s).completed,false);
  const next=reduce(s,{type:'video-start',id:l.id});
  assert.equal(next.videoLessons[l.id].version,2);assert.equal(next.videoLessons[l.id].started,true);
  assert.deepEqual(next.videoLessons['frieren-wait'],other);
 }
});
