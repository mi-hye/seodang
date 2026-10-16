import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContent,practiceUnits} from '../src/practice-content.js';
import {freshState} from '../src/engine.js';
const catalog=JSON.parse(readFileSync(new URL('../assets/audio/catalog.json',import.meta.url)));
test('published packs cover every lesson practice clip and use verified immutable media',async()=>{
 const hashes=new Map();
 for(const [file,clip]of Object.entries(catalog.files)){
  assert.match(file,/^assets\/audio\/.+\.wav$/);assert.match(clip.sha256,/^[a-f0-9]{64}$/);assert.ok(clip.bytes>0&&clip.duration>0);
  assert.equal(clip.url,`https://jrmtfhmhcbkdzqzhbgfv.supabase.co/storage/v1/object/public/seodang-audio/voices-v1/${clip.sha256}.m4a`);
  assert.ok(['VOICEVOX Nemo 男声1','Supertonic 3 M1'].includes(clip.voice));
  if(hashes.has(clip.sha256))assert.equal(clip.bytes,hashes.get(clip.sha256));hashes.set(clip.sha256,clip.bytes);
 }
 for(const [key,pack]of Object.entries(catalog.packs)){
  const [courseDirection,kind,id]=key.split(':');await prepareContent(kind);
  const s={...freshState(),courseDirection,onboardingLevel:pack.level,sentenceActive:Number(id),basics:{active:Number(id)},kana:{active:Number(id)},korean:{active:id}};
  for(const unit of practiceUnits(s,kind))assert.ok(pack.files.includes(unit.audio.audioFile),`${key}: ${unit.audio.audioFile}`);
  for(const file of pack.files)assert.ok(catalog.files[file],`${key}: ${file}`);
 }
});

test('isolated Japanese vowels have enough audible duration for character lessons',()=>{
 for(const file of ['a','i','u','e','o','wo'].map(id=>`assets/audio/kana/${id}.wav`).concat(Array.from({length:5},(_,i)=>`assets/audio/katakana/katakana.11.${i}.wav`))){
  // About 0.2 s of total silence surrounds the sustained vowel. Old clips were <0.31 s total.
  assert.ok(catalog.files[file].duration>=.45,`${file} is too short for a pronunciation example`);
 }
});

test('isolated kana keep character readings instead of particle readings',()=>{
 assert.equal(catalog.files['assets/audio/kana/ha.wav'].pronunciation,"ハ'");
 assert.equal(catalog.files['assets/audio/kana/he.wav'].pronunciation,"ヘ'");
 assert.equal(catalog.files['assets/audio/kana/n.wav'].pronunciation,"ン'");
 for(const [file,clip]of Object.entries(catalog.files))if(clip.pronunciation)assert.ok(clip.duration>=.45,`${file} has a clipped character example`);
});
