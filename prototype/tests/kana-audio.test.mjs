import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { kanaLetters } from '../src/kana-state.js';
import { kanaLetterAudio } from '../src/kana-audio.js';
// Sakura single-mora clips can be below 250 ms; silence/peak checks remain mandatory.
test('all 46 letters used by writing, reading and matching have verified bundled audio',()=>{
 const stories=JSON.parse(readFileSync(new URL('../assets/audio/kana-stories/manifest.json',import.meta.url)));

 const manifest=JSON.parse(readFileSync(new URL('../assets/audio/kana/manifest.json',import.meta.url)));
 assert.equal(Object.keys(manifest.files).length,49);
 for(const entry of kanaLetters.map(kanaLetterAudio)){
  assert.equal(entry.status,'ready');
  const raw=readFileSync(new URL('../'+entry.audioFile,import.meta.url));
  assert.equal(raw.toString('ascii',0,4),'RIFF');assert.equal(raw.toString('ascii',8,12),'WAVE');
  const meta=Object.values({...manifest.files,...stories.files}).find(x=>x.file===entry.audioFile);
  assert.equal(meta.text,entry.text);
  assert.equal(createHash('sha256').update(raw).digest('hex'),meta.sha256);
  assert.ok(meta.duration>.15 && meta.duration<4);assert.ok(meta.peak<32768 && meta.rms>50);
 }
 assert.equal(manifest.files.wo.synthesisText,'オ');
 assert.equal(manifest.files.n.synthesisText,'ん');
});
