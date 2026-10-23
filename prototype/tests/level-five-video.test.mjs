import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {valid,load} from '../src/storage.js';
import {videoLessons,videoProgress} from '../src/video-lesson-state.js';
import {videoSceneContent} from '../src/video-scene-content.js';
import {renderVideoScene} from '../src/video-scene.js';
const base={...freshState(),courseDirection:'ja-ko',onboardingLevel:7,videoActive:'misaeng'};
test('Misaeng preserves both clips and completes only after all four checks, including reload and backward navigation',()=>{
 let s=base;const l=videoLessons.find(x=>x.id==='misaeng');
 const act=(type,id)=>{s=reduce(s,{type,id});assert.ok(valid(s));};
 act('video-start','misaeng');assert.deepEqual(l.answers,videoSceneContent.misaeng.flatMap(x=>[x.meaning.answer,x.use.answer]));
 for(let index=0;index<2;index++){
  assert.equal(videoProgress(s).index,index);assert.equal(videoProgress(s).phase,'watch');assert.equal(videoProgress(s).completed,false);
  assert.ok(renderVideoScene(s,()=>'',x=>String(x.startSeconds)).includes(index?'177':'143'));
  if(index){act('video-previous');assert.equal(videoProgress(s).index,0);assert.equal(videoProgress(s).phase,'use');act('video-select',2);act('video-check');act('video-next');}
  act('video-next');
  for(let n=0;n<2;n++){
   act('video-select',(l.answers[index*2+n]+1)%3);act('video-check');assert.equal(videoProgress(s).checked,false);
   act('video-select',l.answers[index*2+n]);act('video-check');assert.equal(videoProgress(s).checked,true);
   act('video-replay');s=load({getItem:()=>JSON.stringify(s)}).state;act('video-next');assert.equal(videoProgress(s).checked,true);assert.equal(videoProgress(s).index,index);
   act('video-next');if(n===0)act('video-next');
  }
 }
 assert.equal(videoProgress(s).phase,'done');assert.equal(videoProgress(s).completed,true);
});
test('Misaeng version 2 completion survives scene upgrade; retired version 1 stays reset',()=>{
 for(const version of [1,2])for(const phase of ['watch','learn','speak','done']){
  const s={...base,videoLessons:{misaeng:{version,phase,index:version===2?1:0,started:true,completed:phase==='done'}}};assert.ok(valid(s));
  const p=videoProgress(load({getItem:()=>JSON.stringify(s)}).state);assert.equal(p.version,3);assert.equal(p.completed,version===2&&phase==='done');assert.equal(p.index,0);
 }
});
