import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioPlayer } from '../src/media.js';
import { playLetterPreview } from '../src/kana-preview.js';
const letters = [{id:'a',text:'あ'}, {id:'i',text:'い'}, {id:'u',text:'う'}];
const noTTS={stop(){},prepare(){assert.fail('Bundled kana must not prompt for voices');},speak(){assert.fail('Bundled kana must not use TTS');}};
test('preview waits for every audio file to end, highlighting each glyph without device TTS', async () => {
  const sounds=[],highlighted=[];
  const player=new AudioPlayer(src=>{const sound={src,currentTime:0,pause(){},async play(){}};sounds.push(sound);return sound;},noTTS);
  let done=false;
  const run=playLetterPreview(player,letters,id=>highlighted.push(id),()=>done=true,assert.fail);
  for(let i=0;i<3;i++){
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(sounds.length,i+1);assert.equal(done,false);
    assert.equal(sounds[i].src,`assets/audio/kana/${letters[i].id}.wav`);
    sounds[i].onended();
  }
  await run;
  assert.deepEqual(highlighted,['a','i','u',null]);assert.equal(done,true);
});
test('leaving during preview settles playback and cancels remaining files', async () => {
  let created=0,paused=0,done=false;
  const player=new AudioPlayer(()=>{created++;return {currentTime:0,pause(){paused++;},async play(){}};},noTTS);
  const run=playLetterPreview(player,letters,()=>{},()=>done=true,assert.fail);
  await new Promise(resolve=>setImmediate(resolve));await player.stop();await run;
  assert.equal(created,1);assert.equal(paused,1);assert.equal(done,false);
});
test('audio failure stops preview without silently switching to TTS', async () => {
  let done=false,error;
  const player=new AudioPlayer(()=>({pause(){},async play(){throw Error('missing file');}}),noTTS);
  await playLetterPreview(player,letters,()=>{},()=>done=true,message=>error=message);
  assert.equal(done,false);assert.match(error,/음성/);
});
test('a dismissed device voice notice cannot restart speech after leaving the screen', async () => {
  let resolvePrompt,spoken=0;
  const player=new AudioPlayer(null,{stop(){},prepare(){return new Promise(resolve=>resolvePrompt=resolve);},speak(){spoken++;}});
  const run=player.play({text:'あ',locale:'ja-JP',status:'device-tts'},true,assert.fail);
  await new Promise(resolve=>setImmediate(resolve));
  await player.stop();resolvePrompt({proceed:true});await run;
  assert.equal(spoken,0);
});
