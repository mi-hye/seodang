import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pronunciationRecords,finalPronunciation} from '../src/korean-pronunciation-data.js';
import {pronunciationAudio} from '../src/korean-pronunciation.js';
const root=new URL('../',import.meta.url);
const list=(url)=>readdirSync(url,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(new URL(`${e.name}/`,url)):[new URL(e.name,url)]);
test('every shipped WAV is covered by a verified selected-voice manifest',()=>{
 const paths=list(new URL('assets/audio/',root)),files=new Map();
 for(const path of paths.filter(p=>p.pathname.endsWith('manifest.json'))){
  const manifest=JSON.parse(readFileSync(path));
  assert.equal(manifest.license,'Apache-2.0');
  assert.equal(manifest.provider,'Qwen3-TTS (MLX Audio)');
  assert.ok(manifest.modelRevision);
  for(const entry of Object.values(manifest.files)){
   assert.ok((entry.locale==='ko-KR'?['Sohee','Supertonic 3 M1']:['Ono_Anna','VOICEVOX Nemo 男声1']).includes(entry.voiceId));
   const raw=readFileSync(new URL(entry.file,root));
   assert.equal(createHash('sha256').update(raw).digest('hex'),entry.sha256,entry.file);
   assert.ok(entry.rms>50&&entry.peak<32768&&entry.duration>.15,entry.file);
   files.set(new URL(entry.file,root).href,entry);
  }
 }
 for(const path of paths.filter(p=>p.pathname.endsWith('.wav')))assert.ok(files.has(path.href),path.pathname);
});
test('all Korean pronunciation samples, including finals, use bundled selected voices',()=>{
 for(const record of Object.values(pronunciationRecords))for(const text of [record.sample,finalPronunciation(record.glyph)?.sample].filter(Boolean)){
  const audio=pronunciationAudio(text);assert.equal(audio.status,'ready',text);
  const bytes=readFileSync(new URL(audio.audioFile,root));if(audio.bundled){const clip=JSON.parse(readFileSync(new URL('docs/asset-provenance/korean-basic-order-20261027.json',root))).files.find(x=>x.file===audio.audioFile);assert.equal(clip.text,text);assert.equal(createHash('sha256').update(bytes).digest('hex'),clip.sha256);assert.equal(bytes.toString('ascii',4,8),'ftyp');}else assert.equal(bytes.toString('ascii',0,4),'RIFF');
 }
});
