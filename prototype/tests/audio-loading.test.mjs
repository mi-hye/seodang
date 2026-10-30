import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioPlayer} from '../src/media.js';
const tick=()=>new Promise(r=>setImmediate(r));
const entry={status:'ready',audioFile:'clip.wav'};
test('loading covers media startup; repeated taps retain the pending request and buffering recovers',async()=>{
 let ready,sound,count=0;const player=new AudioPlayer(()=>{count++;return sound={pause(){},play:()=>new Promise(r=>ready=r)};},{stop(){}});
 const pending=player.play(entry,true,assert.fail);assert.equal(player.state,'loading');await tick();
 await player.play({...entry},true,assert.fail);assert.equal(count,1);assert.equal(player.state,'loading');
 ready();await tick();assert.equal(player.state,'playing');sound.onwaiting();assert.equal(player.state,'loading');sound.onplaying();assert.equal(player.state,'playing');sound.onended();await pending;assert.equal(player.state,'idle');
});
test('leaving during startup clears loading and late ready cannot revive playback',async()=>{
 let ready,sound;const player=new AudioPlayer(()=>sound={pause(){},play:()=>new Promise(r=>ready=r)},{stop(){}});
 const pending=player.play(entry,true,assert.fail);await tick();await player.stop();assert.equal(player.state,'idle');ready();await pending;await tick();assert.equal(player.state,'idle');
});
test('file startup failure clears loading and allows a retry',async()=>{
 let count=0;const player=new AudioPlayer(()=>({pause(){},play(){count++;return Promise.reject(Error('failed'));}}),{stop(){}});let errors=0;
 await player.play(entry,true,()=>errors++);assert.equal(player.state,'idle');await player.play(entry,true,()=>errors++);assert.equal(count,2);assert.equal(errors,2);
});
test('device voice preparation shows loading then completes and can be cancelled',async()=>{
 let ready,done;const player=new AudioPlayer(()=>{}, {stop(){},prepare:()=>new Promise(r=>ready=r),speak:()=>new Promise(r=>done=r)});
 const device={status:'device-tts',text:'こんにちは',locale:'ja-JP'};
 const pending=player.play(device,true,assert.fail);await tick();assert.equal(player.state,'loading');ready({proceed:true});await tick();assert.equal(player.state,'playing');done();await pending;assert.equal(player.state,'idle');
 const cancelled=player.play(device,true,assert.fail);await tick();await player.stop();ready({proceed:true});await cancelled;assert.equal(player.state,'idle');
});
