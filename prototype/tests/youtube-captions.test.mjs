import test from 'node:test';
import assert from 'node:assert/strict';
import {disableCaptions,mountCaptionDefaults} from '../src/youtube-captions.js';
test('captions are unloaded only while the module is loaded',()=>{
 let loaded=true,calls=0;
 const player={getOptions:()=>loaded?['captions']:[],unloadModule:name=>{assert.equal(name,'captions');loaded=false;calls++;disableCaptions(player);}};
 disableCaptions(player);assert.equal(calls,1);
 assert.doesNotThrow(()=>disableCaptions({}));
});
test('ready preserves clip bounds; cleanup ignores late events and destroys player',async()=>{
 const prior=globalThis.YT;let events,destroyed=0,cues=[],unloads=0;
 const player={getPlayerState:()=>5,cueVideoById:x=>cues.push(x),getOptions:()=>['captions'],unloadModule:()=>unloads++,destroy:()=>destroyed++};
 globalThis.YT={Player:class{constructor(iframe,options){events=options.events;return player;}}};
 try{
  const cleanup=mountCaptionDefaults({src:'https://www.youtube.com/embed/xRlcrGXwtrA?start=143&end=148',isConnected:true});
  await Promise.resolve();events.onReady({target:player});
  assert.deepEqual(cues,[{videoId:'xRlcrGXwtrA',startSeconds:143,endSeconds:148}]);
  events.onStateChange({target:player});assert.equal(unloads,2);
  events.onStateChange({target:player,data:0});assert.deepEqual(cues[1],cues[0]);assert.equal(unloads,3);
  cleanup();events.onApiChange({target:player});assert.equal(unloads,3);assert.equal(destroyed,1);
  const early=mountCaptionDefaults({src:'https://www.youtube.com/embed/xRlcrGXwtrA',isConnected:true});early();await Promise.resolve();assert.equal(destroyed,1);
 }finally{globalThis.YT=prior;}
});
test('playing corrects an early start, enforces the end after seek, and clears timers',async t=>{
 const intervals=new Map();let next=0;const oldSet=globalThis.setInterval,oldClear=globalThis.clearInterval;
 globalThis.setInterval=fn=>{intervals.set(++next,fn);return next;};globalThis.clearInterval=id=>intervals.delete(id);
 const tick=()=>{for(const fn of [...intervals.values()])fn();};
 const previous=globalThis.YT;let events,time=140,paused=0,cues=0,seeks=[];
 const player={getOptions:()=>[],getCurrentTime:()=>time,seekTo:(n,allow)=>{seeks.push([n,allow]);time=n;},pauseVideo:()=>paused++,cueVideoById:()=>cues++,destroy:()=>{}};
 globalThis.YT={Player:class{constructor(iframe,options){events=options.events;return player;}}};
 try{
  const cleanup=mountCaptionDefaults({src:'https://www.youtube.com/embed/xRlcrGXwtrA?start=143&end=148',isConnected:true});await Promise.resolve();
  events.onStateChange({data:1,target:player});assert.deepEqual(seeks,[[143,true]]);
  time=147.8;tick();assert.equal(paused,0);
  time=148.1;tick();assert.equal(paused,1);assert.equal(cues,1);
  tick();assert.equal(paused,1);
  time=144;events.onStateChange({data:1,target:player});events.onStateChange({data:2,target:player});time=149;tick();assert.equal(paused,1);
  time=144;events.onStateChange({data:1,target:player});cleanup();time=149;tick();assert.equal(paused,1);
 }finally{globalThis.YT=previous;globalThis.setInterval=oldSet;globalThis.clearInterval=oldClear;}
});
