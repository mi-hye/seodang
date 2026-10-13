import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {audioManifest,AudioPlayer} from '../src/media.js';
import {episode,expressions} from '../src/content.js';
test('all current cafe dialogue and expression audio is bundled and avoids device voice installation',async()=>{
 const metadata=JSON.parse(readFileSync(new URL('../assets/audio/cafe/manifest.json',import.meta.url)));
 const ids=[episode.intro[0].audioId,...expressions.map(e=>`case01.${e.id}.ja`)];
 const played=[];
 const player=new AudioPlayer(src=>({currentTime:0,pause(){},async play(){played.push(src);queueMicrotask(()=>this.onended?.());}}),{stop(){},prepare(){assert.fail('No TTS prompt');},speak(){assert.fail('No device TTS');}});
 for(const id of ids){
  const entry=audioManifest[id],info=metadata.files[id];
  assert.equal(entry.status,'ready');assert.equal(entry.text,info.text);assert.equal(entry.audioFile,info.file);
  const file=readFileSync(new URL('../'+info.file,import.meta.url));
  assert.equal(file.toString('ascii',0,4),'RIFF');
  assert.equal(createHash('sha256').update(file).digest('hex'),info.sha256);
  await player.play(entry,true,assert.fail);
 }
 assert.equal(played.length,3);
 await player.play(audioManifest[ids[0]],false,assert.fail);
 assert.equal(played.length,3);
});


test('all shipped learning voices use the selected current voice, Nemo female 1',()=>{
 for(const group of ['kana','cafe']) {
  const metadata=JSON.parse(readFileSync(new URL(`../assets/audio/${group}/manifest.json`,import.meta.url)));
  assert.equal(metadata.styleId,10005);assert.equal(metadata.voice,'女声1');
 }
 for(const entry of Object.values(audioManifest)) {
  assert.equal(entry.status,'ready');assert.equal(entry.voiceStyleId,10005);
 }
 assert.equal(audioManifest['guide.intro.ko'],undefined);
});

test('combined introduction advances once and selects the current expression audio, including old saves',async()=>{
 const {freshState,reduce,episodeAudioId}=await import('../src/engine.js');
 for(const dialogue of [0,1]) {
  let state=freshState();state.episode.dialogue=dialogue;
  assert.equal(episodeAudioId(state),episode.intro[0].audioId);
  state=reduce(state,{type:'next'});
  assert.equal(state.episode.step,'learn');assert.equal(state.episode.lesson,0);
  assert.equal(episodeAudioId(state),'case01.blue-bag.ja');
  state=reduce(state,{type:'next'});
  assert.equal(episodeAudioId(state),'case01.near-window.ja');
  state=reduce(state,{type:'next'});
  assert.equal(state.episode.step,'investigate');assert.equal(episodeAudioId(state),null);
  assert.equal(state.encountered.length,2);
 }
});
