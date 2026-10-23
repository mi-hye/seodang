import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioPlayer} from '../src/media.js';
import {courseVoice} from '../src/course-expansion-content.js';

test('bundled course recordings play offline without the published download catalog',async t=>{
 const played=[];
 t.mock.method(globalThis,'fetch',async()=>{throw Error('Network disabled');});
 const player=new AudioPlayer(source=>({pause(){},play(){played.push(source);queueMicrotask(()=>this.onended?.());return Promise.resolve();}}),{stop(){}});
 player.remote=true;
 for(const direction of ['ko-ja','ja-ko']){
  const entry=courseVoice(direction,'course3-8','0.answer',direction==='ko-ja'?'道を間違えたようです。':'길을 잘못 든 것 같아요.');
  await player.play(entry,true,assert.fail);
  assert.equal(played.at(-1),entry.audioFile);
 }
 assert.equal(globalThis.fetch.mock.callCount(),0);
 const before=played.length;
 await player.play(courseVoice('ko-ja','course3-8','0.answer','道を間違えたようです。'),false,assert.fail);
 assert.equal(played.length,before);
});

test('bundled flag does not bypass publication validation for arbitrary paths',async t=>{
 const errors=[];
 t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({files:{}})}));
 const player=new AudioPlayer(()=>{assert.fail('Unpublished file reached audio output');},{stop(){}});player.remote=true;
 for(const audioFile of ['assets/audio/unpublished.wav','https://example.test/ja-JP-1234567890123456.m4a','assets/course-voices/../ja-JP-1234567890123456.m4a'])await player.play({status:'ready',bundled:true,audioFile},true,error=>errors.push(error));
 assert.equal(errors.length,3);
});
