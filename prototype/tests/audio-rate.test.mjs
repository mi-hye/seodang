import test from 'node:test';import assert from 'node:assert/strict';
import {renderHeader} from '../src/header.js';
import {AudioPlayer} from '../src/media.js';import {freshState} from '../src/engine.js';import {freshReading} from '../src/reading-state.js';import {renderReading,prepareReading} from '../src/reading.js';import {renderKorean} from '../src/korean.js';import {freshKoreanProgress} from '../src/korean-state.js';
test('slow recordings preserve pitch; normal playback resets rate and cancels prior sound',async()=>{
 const sounds=[];const player=new AudioPlayer(src=>{const sound={src,webkitPreservesPitch:false,currentTime:0,pause(){this.paused=true;},play(){}};sounds.push(sound);return sound;},{stop(){}});
 const entry={status:'ready',audioFile:'assets/audio/advanced/level7-1.wav'};
 const slow=player.play(entry,true,assert.fail,{rate:.8});await new Promise(r=>setImmediate(r));assert.equal(sounds[0].playbackRate,.8);assert.equal(sounds[0].preservesPitch,true);assert.equal(sounds[0].webkitPreservesPitch,true);
 const normal=player.play(entry,true,assert.fail);await new Promise(r=>setImmediate(r));await slow;assert.equal(sounds[0].paused,true);assert.equal(sounds[1].playbackRate,1);sounds[1].onended();await normal;
 await player.play(entry,false,assert.fail,{rate:.8});assert.equal(sounds.length,2);
});
test('adjustable speed controls appear in both reading levels and passage phases',async()=>{
 await prepareReading(7);
 for(const level of [5,6,7])for(const phase of ['learn','read']){
 const s={...freshState(),onboarded:true,onboardingLevel:level,readings:{[level]:{...freshReading(),phase}}};assert.equal(renderReading(s).includes('data-audio-rate'),true);
 }
 for(const level of [5,6,7])for(const phase of ['learn','quiz']){
 const id=`${level}-1`,s={...freshState(),courseDirection:'ja-ko',onboarded:true,onboardingLevel:level,korean:{active:id,lessons:{[id]:{...freshKoreanProgress(id),phase}}}};assert.equal(renderKorean(s,t=>renderHeader(t,{audioRate:s.settings.audioRate})).includes('data-audio-rate'),true);
 }
});

test('speed changes affect current audio without restarting and old settings accept a saved speed',async()=>{
 const sound={currentTime:17,pause(){},play(){}};const player=new AudioPlayer(()=>sound,{stop(){}});const playing=player.play({status:'ready',audioFile:'test.wav'},true,assert.fail,{rate:1.3});await new Promise(r=>setImmediate(r));assert.equal(sound.playbackRate,1);player.setRate(.6);assert.equal(sound.playbackRate,.6);assert.equal(sound.currentTime,17);player.setRate(99);assert.equal(sound.playbackRate,1);sound.onended();await playing;
 const {reduce}=await import('../src/engine.js');const old=freshState();delete old.settings.audioRate;const updated=reduce(old,{type:'setting',key:'audioRate',value:1.4});assert.equal(updated.settings.audioRate,1);assert.equal(old.settings.audioRate,undefined);
});

test('pause and resume preserve position and rate, ending or stopping returns to idle',async()=>{
 const sound={currentTime:23,pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}};const player=new AudioPlayer(()=>sound,{stop(){}});const pending=player.play({status:'ready',audioFile:'test.wav'},true,assert.fail,{rate:1.2});await new Promise(r=>setImmediate(r));assert.equal(player.state,'playing');player.pause();assert.equal(player.state,'paused');assert.equal(sound.currentTime,23);player.setRate(.7);await player.resume();assert.equal(player.state,'playing');assert.equal(sound.currentTime,23);assert.equal(sound.playbackRate,.7);sound.onended();await pending;assert.equal(player.state,'idle');await player.resume();assert.equal(player.state,'idle');await player.stop();assert.equal(sound.currentTime,0);
});

test('lesson playback speed preserves pitch and explicit overrides still work',async()=>{
 const sounds=[];const player=new AudioPlayer(()=>{const sound={pause(){},play(){}};sounds.push(sound);return sound;},{stop(){}});
 const entry={status:'ready',audioFile:'lesson.wav',playbackRate:.8};
 const pending=player.play(entry,true,assert.fail);await new Promise(r=>setImmediate(r));
 assert.equal(sounds[0].playbackRate,.8);assert.equal(sounds[0].preservesPitch,true);sounds[0].onended();await pending;
 const override=player.play(entry,true,assert.fail,{rate:1.2});await new Promise(r=>setImmediate(r));
 assert.equal(sounds[1].playbackRate,1);sounds[1].onended();await override;
});

test('speed selected while model audio is preparing is used when it starts',async()=>{
 let release;const sound={pause(){},play(){}};
 const player=new AudioPlayer(()=>sound,{stop:()=>new Promise(resolve=>{release=resolve;})});
 const playing=player.play({status:'ready',audioFile:'model.wav'},true,assert.fail,{rate:1});
 await new Promise(r=>setImmediate(r));assert.equal(player.state,'loading');
 player.setRate(.3);release();await new Promise(r=>setImmediate(r));
 assert.equal(sound.playbackRate,.3);assert.equal(sound.preservesPitch,true);sound.onended();await playing;
});


test('one user speed covers files with old base rates, sequences, and device speech',async()=>{
 let rate=.3;const sounds=[],spoken=[];
 const player=new AudioPlayer(()=>{const sound={pause(){},play(){sounds.push(this.playbackRate);queueMicrotask(()=>this.onended?.());}};return sound;},{stop(){},speak(entry){spoken.push(entry.playbackRate);}});
 player.rateProvider=()=>rate;
 const file={status:'ready',audioFile:'model.wav',playbackRate:.8};
 await player.play(file,true,assert.fail);assert.deepEqual(sounds,[.3]);
 rate=.7;await player.playSequence([file,{...file,audioFile:'next.wav'}],true,assert.fail);assert.deepEqual(sounds,[.3,.7,.7]);
 await player.play({status:'device-tts',text:'안녕하세요',locale:'ko-KR'},true,assert.fail);assert.deepEqual(spoken,[.7]);
 rate=1;await player.play(file,true,assert.fail);assert.equal(sounds.at(-1),1);
});

test('selected speed reaches native and browser speech synthesis',async()=>{
 const original={Capacitor:globalThis.Capacitor,speechSynthesis:globalThis.speechSynthesis,SpeechSynthesisUtterance:globalThis.SpeechSynthesisUtterance};
 try{
  const calls=[];globalThis.Capacitor={isNativePlatform:()=>true,nativePromise:async(plugin,method,args)=>{calls.push({plugin,method,args});return {};}};
  const native=new AudioPlayer();native.rateProvider=()=>.3;
  await native.play({status:'device-tts',text:'안녕하세요',locale:'ko-KR'},true,assert.fail);
  assert.deepEqual(calls.find(x=>x.method==='speak').args,{text:'안녕하세요',locale:'ko-KR',rate:.3});
  delete globalThis.Capacitor;let spoken;
  globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  globalThis.speechSynthesis={cancel(){},getVoices:()=>[],speak(utterance){spoken=utterance;queueMicrotask(()=>utterance.onend());}};
  const web=new AudioPlayer();web.rateProvider=()=>.7;
  await web.play({status:'device-tts',text:'안녕하세요',locale:'ko-KR'},true,assert.fail);
  assert.equal(spoken.rate,.7);assert.equal(spoken.lang,'ko-KR');
 }finally{for(const [key,value] of Object.entries(original)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
