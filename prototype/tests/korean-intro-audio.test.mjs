import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioPlayer} from '../src/media.js';
import {freshState} from '../src/engine.js';
import {koreanIntroAudio,renderKorean} from '../src/korean.js';
import {koreanContent} from '../src/korean-content.js';
import {freshKoreanProgress} from '../src/korean-state.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){const sounds=[];return {sounds,player:new AudioPlayer(src=>{const sound={src,pause(){},play(){}};sounds.push(sound);return sound;},{stop(){}})};}
const entries=['first','second','third'].map(audioFile=>({audioFile,status:'ready',playbackRate:.8}));
test('intro queue plays all sentences in order at lesson speed',async()=>{
 const {player,sounds}=fixture(),pending=player.playSequence(entries,true,assert.fail);
 for(let i=0;i<3;i++){await tick();assert.equal(sounds.length,i+1);assert.equal(sounds[i].src,entries[i].audioFile);assert.equal(sounds[i].playbackRate,.8);sounds[i].onended();}
 await pending;
});
test('intro queue respects mute, navigation cancellation, replay and failures',async()=>{
 const {player,sounds}=fixture();await player.playSequence(entries,false,assert.fail);assert.equal(sounds.length,0);
 let pending=player.playSequence(entries,true,assert.fail);await player.stop();await pending;assert.equal(sounds.length,0);
 pending=player.playSequence(entries,true,assert.fail);await tick();await player.stop();await pending;assert.equal(sounds.length,1);
 pending=player.playSequence(entries,true,assert.fail);await tick();const replacement=player.play(entries[2],true,assert.fail);await tick();await pending;assert.equal(sounds.length,3);sounds[2].onended();await replacement;
 let errors=0;pending=player.playSequence(entries,true,()=>errors++);await tick();sounds[3].onerror();await pending;assert.equal(errors,1);assert.equal(sounds.length,4);
});
test('Korean scenarios preview every sentence without changing learning progress',()=>{
 for(const id of ['3-1','3-4','3-2','3-3','4-1']){
  const s={...freshState(),korean:{active:id,lessons:{[id]:{...freshKoreanProgress(id),phase:'scenario',index:1}}}},before=structuredClone(s);
  const audio=koreanIntroAudio(s);assert.equal(audio.length,koreanContent[id].length);assert.deepEqual(audio.map(e=>e.text),koreanContent[id].map(e=>e.spoken||e.text));
  if(id.startsWith('3-'))assert.ok(audio.every(e=>e.playbackRate===.8));
  assert.deepEqual(s,before);assert.match(renderKorean(s,()=>''),/korean-intro-audio/);
  s.korean.lessons[id].phase='learn';assert.deepEqual(koreanIntroAudio(s),[]);
 }
});
