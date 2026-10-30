import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {prepareCourseAudioJobs} from '../scripts/prepare-course-expansion-audio.mjs';
import {courseVoicePath} from '../src/course-voice-path.js';

const root=new URL('../',import.meta.url);
const sha=data=>createHash('sha256').update(data).digest('hex');

test('course speech covers all 74 lessons and deduplicates only identical language/text pairs',async()=>{
 const {jobs,packs}=await prepareCourseAudioJobs();
 assert.equal(Object.keys(packs).length,74);
 assert.ok(jobs.length>0);
 assert.equal(new Set(jobs.map(x=>x.file)).size,jobs.length);
 assert.equal(new Set(jobs.map(x=>`${x.locale}:${x.text}`)).size,jobs.length);
 const byFile=new Map(jobs.map(x=>[x.file,x]));
 for(const job of jobs){
  assert.match(job.file,/^assets\/course-voices\/(ja-JP|ko-KR)-[a-f0-9]{16}\.m4a$/);
  assert.equal(job.file,courseVoicePath(job.locale,job.text));
  assert.ok(job.text.trim());
  assert.ok(!job.text.includes('|'));
 }
 for(const [key,pack] of Object.entries(packs)){
  // Letter lessons intentionally reuse the same word across several turns.
  assert.ok(pack.files.length>=3&&pack.files.length<=21,key);
  assert.equal(new Set(pack.files).size,pack.files.length,key);
  assert.ok(pack.title.trim(),key);
  for(const file of pack.files){
   assert.ok(byFile.has(file),`${key}: missing speech`);
   assert.equal(byFile.get(file).locale,key.startsWith('ko-ja:')?'ja-JP':'ko-KR',`${key}: wrong language`);
  }
 }
});

test('bundled AAC bytes, exact text, local pack membership and verification provenance agree',async()=>{
 const {jobs,packs}=await prepareCourseAudioJobs();
 const provenance=JSON.parse(await readFile(new URL('docs/asset-provenance/course-expansion-20261022.json',root),'utf8'));
 assert.equal(provenance.clips,jobs.length);
 assert.equal(provenance.lessons,Object.keys(packs).length);
 assert.deepEqual(provenance.packs,packs);
 assert.equal(provenance.audioVerification.humanListening,false);
 assert.equal(provenance.audioVerification.devicePlayback,false);
 assert.equal(provenance.audioVerification.summary.initialPrompt,null);
 assert.equal(provenance.audioVerification.summary.verified,jobs.length);
 assert.equal(provenance.audioVerification.summary.complete,true);
 assert.deepEqual(provenance.audioVerification.summary.acousticIssues,[]);
 const entries=new Map(provenance.files.map(x=>[x.file,x]));
 assert.equal(entries.size,jobs.length);
 for(const job of jobs){
  const entry=entries.get(job.file);
  assert.ok(entry,job.file);
  assert.equal(entry.text,job.text,job.file);
  assert.equal(entry.locale,job.locale,job.file);
  assert.ok(entry.duration>.2,job.file);
  assert.ok(entry.transcript.length>0,job.file);
  const bytes=await readFile(new URL(job.file,root));
  assert.equal(bytes.length,entry.bytes,job.file);
  assert.equal(sha(bytes),entry.sha256,job.file);
  assert.equal(bytes.subarray(4,8).toString('ascii'),'ftyp',job.file);
 }
 assert.equal(provenance.bytes,provenance.files.reduce((sum,x)=>sum+x.bytes,0));
});
