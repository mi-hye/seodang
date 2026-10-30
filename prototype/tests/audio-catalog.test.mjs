import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareContent,practiceUnits} from '../src/practice-content.js';
import {freshState} from '../src/engine.js';
const catalog=JSON.parse(readFileSync(new URL('../assets/audio/catalog.json',import.meta.url)));
test('published packs cover every lesson practice clip and use verified immutable media',async()=>{
 const hashes=new Map();
 for(const [file,clip]of Object.entries(catalog.files)){
  assert.match(file,/^assets\/audio\/.+\.wav$/);assert.match(clip.sha256,/^[a-f0-9]{64}$/);assert.ok(clip.bytes>0&&clip.duration>0);
  assert.equal(clip.url,`https://jrmtfhmhcbkdzqzhbgfv.supabase.co/storage/v1/object/public/seodang-audio/voices-v1/${clip.sha256}.m4a`);
  assert.ok(['VOICEVOX Nemo 男声1','Supertonic 3 M1','Google Cloud Chirp 3 HD Kore'].includes(clip.voice));
  if(hashes.has(clip.sha256))assert.equal(clip.bytes,hashes.get(clip.sha256));hashes.set(clip.sha256,clip.bytes);
 }
 for(const [key,pack]of Object.entries(catalog.packs)){
  const [courseDirection,kind,id]=key.split(':');if(kind==='expert'){const article=JSON.parse(readFileSync(new URL('../src/expert-content.json',import.meta.url)))[courseDirection][id];assert.deepEqual(pack.files,article.discussion?[...article.discussion.perspectives,...article.discussion.expressions].map(s=>s.audioFile):[article.audio.audioFile,...article.sentences.map(s=>s.audioFile)]);for(const file of pack.files)assert.ok(catalog.files[file]);continue;}await prepareContent(kind);
  const s={...freshState(),courseDirection,onboardingLevel:pack.level,scenarioActive:id,sentenceActive:Number(id),basics:{active:Number(id)},kana:{active:Number(id)},korean:{active:id}};
  for(const unit of practiceUnits(s,kind)){if(unit.audio.bundled){const files=['batchim-expansion-20261027','korean-basic-order-20261027'].flatMap(name=>JSON.parse(readFileSync(new URL(`../docs/asset-provenance/${name}.json`,import.meta.url))).files);const clip=files.find(x=>x.file===unit.audio.audioFile);assert.ok(clip,unit.audio.audioFile);assert.equal(clip.text,unit.audio.text);assert.equal(createHash('sha256').update(readFileSync(new URL('../'+clip.file,import.meta.url))).digest('hex'),clip.sha256);continue;}assert.ok(pack.files.includes(unit.audio.audioFile),`${key}: ${unit.audio.audioFile}`);if(kind==='scenario')assert.equal(catalog.files[unit.audio.audioFile].text,unit.audio.text);}
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


test('all eight level-five packs use the approved Kore voice with matching text',()=>{
 const content=JSON.parse(readFileSync(new URL('../src/expert-content.json',import.meta.url)));
 for(const [direction,lessons] of Object.entries(content))for(const [id,lesson] of lessons.entries()){
  const lines=[...lesson.discussion.perspectives,...lesson.discussion.expressions],pack=catalog.packs[`${direction}:expert:${id}`];
  assert.equal(pack.files.length,4);assert.deepEqual(pack.files,lines.map(line=>line.audioFile));
  for(const line of lines){const clip=catalog.files[line.audioFile];assert.equal(clip.voice,'Google Cloud Chirp 3 HD Kore');assert.equal(clip.text,line.text);assert.equal(clip.locale,direction==='ko-ja'?'ja-JP':'ko-KR');}
 }
});

test('hotel speaking packs include target-only example audio in both languages',async()=>{
 const {scenarioContent,scenarioAudio}=await import('../src/scenario-content.js');
 for(const id of ['6','7','9','11'])for(const direction of ['ko-ja','ja-ko'])for(const [i,item]of scenarioContent[direction][id].items.entries()){
  const audio=scenarioAudio(direction,id,i,true);
  assert.ok(catalog.packs[`${direction}:scenario:${id}`].files.includes(audio.audioFile));
  assert.equal(catalog.files[audio.audioFile].text,item.answer);
  assert.notEqual(audio.audioFile,scenarioAudio(direction,id,i).audioFile);
 }
});

test('roleplay packs provide separate staff, learner and response recordings',async()=>{
 const {scenarioRoleAudio}=await import('../src/scenario-content.js');
 for(const direction of ['ko-ja','ja-ko'])for(let i=0;i<3;i++)for(const part of ['prompt','answer','reply']){
  const a=scenarioRoleAudio(direction,i,part);assert.ok(catalog.packs[`${direction}:scenario:8`].files.includes(a.audioFile));assert.equal(catalog.files[a.audioFile].text,a.text);
 }
});

test('level 4-7 listening packs include the exact prompt audio for both languages',async()=>{
 const {scenarioAudio}=await import('../src/scenario-content.js');
 for(const direction of ['ko-ja','ja-ko']){const pack=catalog.packs[`${direction}:scenario:10`];assert.equal(pack.files.length,3);for(let i=0;i<3;i++){const a=scenarioAudio(direction,'10',i);assert.ok(pack.files.includes(a.audioFile));assert.equal(catalog.files[a.audioFile].text,a.text);assert.equal(catalog.files[a.audioFile].locale,a.locale);}}
});

test('proposal lesson download packs include every tappable clause with matching text',async()=>{
 const {scenarioTokenAudio}=await import('../src/scenario-content.js');
 for(const direction of ['ko-ja','ja-ko'])for(let i=0;i<3;i++)for(let token=0;token<3;token++){
  const a=scenarioTokenAudio(direction,'12',i,token);assert.ok(catalog.packs[`${direction}:scenario:12`].files.includes(a.audioFile));assert.equal(catalog.files[a.audioFile].text,a.text);assert.equal(catalog.files[a.audioFile].locale,a.locale);
 }
});

test('choice audio packs contain all selectable sentences for chat and order repair',async()=>{
 const {scenarioAudio,scenarioChoiceAudio}=await import('../src/scenario-content.js');
 for(const direction of ['ko-ja','ja-ko'])for(const id of ['14','15','16','17'])for(let i=0;i<3;i++)for(const a of [scenarioAudio(direction,id,i),...[0,1,2].map(c=>scenarioChoiceAudio(direction,id,i,c))]){
  if(a.bundled){
   const repair=JSON.parse(readFileSync(new URL('../docs/asset-provenance/lost-item-pronunciation-20261023.json',import.meta.url)));
   assert.equal(a.audioFile,repair.file);assert.equal(a.text,repair.text);assert.equal(a.locale,'ja-JP');
   assert.equal(createHash('sha256').update(readFileSync(new URL(`../${a.audioFile}`,import.meta.url))).digest('hex'),repair.sha256);
  }else{assert.ok(catalog.packs[`${direction}:scenario:${id}`].files.includes(a.audioFile));assert.equal(catalog.files[a.audioFile].text,a.text);assert.equal(catalog.files[a.audioFile].locale,a.locale);}
 }
});

test('audio pack generation covers live remote clips without entering retired or app-bundled courses',async()=>{
 const {mkdtempSync,mkdirSync,writeFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const {fileURLToPath}=await import('node:url');const {execFileSync}=await import('node:child_process');
 const {scenarioLessons,scenarioAvailable}=await import('../src/scenario-state.js');
 const dir=mkdtempSync(join(tmpdir(),'seodang-audio-pack-test-'));
 try{
  const out=join(dir,'output/final-voices');mkdirSync(out,{recursive:true});
  writeFileSync(join(out,'jobs.json'),JSON.stringify(Object.keys(catalog.files).map(file=>({file}))));
  execFileSync(process.execPath,[fileURLToPath(new URL('../scripts/build-audio-packs.mjs',import.meta.url))],{cwd:dir,stdio:'pipe'});
  const packs=JSON.parse(readFileSync(join(out,'packs.json')));
  for(const [key,pack]of Object.entries(packs)){
   assert.ok(pack.files.length,key);for(const file of pack.files)assert.ok(catalog.files[file],file);
   const [direction,kind,id]=key.split(':');if(kind!=='scenario')continue;
   const lesson=scenarioLessons.find(l=>l.id===id);assert.ok(scenarioAvailable({courseDirection:direction},lesson));assert.equal(Boolean(lesson.extended),false);
  }
  for(const direction of ['ko-ja','ja-ko']){
   assert.ok(packs[`${direction}:scenario:8`].files.length,'hotel roleplay keeps its downloadable speech');
   assert.equal(packs[`${direction}:scenario:course3-8`],undefined,'expanded course speech is already app-bundled');
  }
  assert.equal(packs['ja-ko:korean:15-1'],undefined,'pronunciation sentences are already app-bundled');
  for(let n=1;n<=10;n++)assert.equal(packs[`ja-ko:korean:25-${n}`],undefined,'particle examples and answers are already app-bundled');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
