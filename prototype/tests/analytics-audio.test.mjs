import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioPlayer} from '../src/media.js';
const entry={status:'ready',audioFile:'test.wav'};
test('audio success, muted, failure and cancellation produce separate terminal outcomes',async()=>{
 let sound;const results=[];const player=new AudioPlayer(()=>sound={pause(){},play(){return Promise.resolve();}},{stop(){}});player.onPlayback=source=>result=>results.push([source,result]);
 await player.play(entry,false,assert.fail);assert.deepEqual(results,[]);
 let pending=player.play(entry,true,assert.fail);await new Promise(r=>setImmediate(r));sound.onended();await pending;assert.deepEqual(results.map(x=>x[1]),['started','completed']);results.length=0;
 pending=player.play(entry,true,assert.fail);await new Promise(r=>setImmediate(r));await player.stop();await pending;assert.deepEqual(results.map(x=>x[1]),['started','cancelled']);results.length=0;
 let errors=0;pending=player.play(entry,true,()=>errors++);await new Promise(r=>setImmediate(r));const fail=sound.onerror;fail();fail();await pending;assert.equal(errors,1);assert.deepEqual(results.map(x=>x[1]),['started','failed']);
});
test('device voice refusal is cancellation, device rejection is failure',async()=>{
 const results=[];let proceed=false;const player=new AudioPlayer(()=>{}, {stop(){},prepare:async()=>({proceed}),speak:async()=>{throw Error('private message');}});player.onPlayback=()=>result=>results.push(result);
 const device={status:'device-tts',text:'never sent',locale:'ja-JP'};await player.play(device,true,assert.fail);assert.deepEqual(results,['started','cancelled']);results.length=0;proceed=true;await player.play(device,true,()=>{});assert.deepEqual(results,['started','failed']);
});
