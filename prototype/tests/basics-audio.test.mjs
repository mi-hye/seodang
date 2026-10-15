import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {basicContent,basicAudio} from '../src/basics.js';
// Sakura single-mora clips can be 177–250 ms; RMS/hash checks also verify integrity.
const root=new URL('../',import.meta.url);
const manifest={files:{...JSON.parse(readFileSync(new URL('assets/audio/hiragana-extra-manifest.json',root))).files,...JSON.parse(readFileSync(new URL('assets/audio/basics/manifest.json',root))).files,...JSON.parse(readFileSync(new URL('assets/audio/katakana/manifest.json',root))).files}};
test('all new basic lesson sounds resolve to verified bundled recordings',()=>{
 let count=0;
 for(const [level,items] of Object.entries(basicContent))for(const [index,[text]] of items.entries()){
  const entry=basicAudio({basics:{active:Number(level),lessons:{[level]:{index}}}}),record=manifest.files[entry.id];
  assert.equal(entry.status,'ready');assert.equal(record.text,text);assert.equal(entry.audioFile,record.file);
  const wav=readFileSync(new URL(entry.audioFile,root));
  assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
  assert.equal(createHash('sha256').update(wav).digest('hex'),record.sha256);
  assert.ok(record.duration>.15&&record.duration<4);assert.ok(record.rms>50);
  count++;
 }
 assert.equal(count,Object.values(basicContent).reduce((sum,items)=>sum+items.length,0));assert.ok(Object.keys(manifest.files).length>=count);
});
