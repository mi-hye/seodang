import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {particleCourseCatalog,isParticleCourse} from '../src/particle-course-catalog.js';
import {particleCourseContent} from '../src/particle-course-content.js';
import {courseVoicePath} from '../src/course-voice-path.js';
import {prepareParticleAudioJobs} from '../scripts/prepare-particle-audio.mjs';
const japanese=/[ぁ-んァ-ヶ]/;
const forms=new Set(['은','는','이','가','을','를','에','에서','하고','한테','한테서','께','에게','로','으로','도','만','부터','까지','밖에','보다','만큼','처럼']);
const focused=item=>item.text.slice(item.focus.start,item.focus.end);

test('thirteen stable comparison lessons teach paired situations before practice',()=>{
 assert.deepEqual(particleCourseCatalog.map(l=>l.id),Array.from({length:13},(_,i)=>`25-${i+1}`));
 assert.deepEqual(Object.keys(particleCourseContent),particleCourseCatalog.map(l=>l.id));
 assert.equal(isParticleCourse('25-14'),false);assert.equal(isParticleCourse('15-1'),false);
 let interpretations=0,gaps=0;
 for(const lesson of particleCourseCatalog){
  const units=particleCourseContent[lesson.id];
  assert.equal(lesson.level,9);assert.equal(lesson.count,3);assert.equal(units.length,3);
  assert.equal(lesson.titleParts.join(''),lesson.title);
  assert.deepEqual(lesson.answers,units.map(u=>u.question.answer));
  assert.deepEqual(lesson.choiceCounts,units.map(u=>u.question.choices.length));
  assert.ok(new Set(lesson.answers).size>1);
  for(const [index,u] of units.entries()){
   const id=`${lesson.id}/${index}`,q=u.question;
   assert.match(u.heading,japanese,id);assert.equal(u.examples.length,2,id);
   assert.notEqual(u.examples[0].text,u.examples[1].text,id);
   assert.notEqual(focused(u.examples[0]),focused(u.examples[1]),`${id}: compare distinct functions, not isolated forms`);
   assert.ok(u.explanation.length<=2,id);assert.ok(u.explanation.join('').length<=150,id);
   u.explanation.forEach(t=>assert.match(t,japanese,id));
   u.examples.forEach(e=>assert.match(e.scene,japanese,id));
   if(u.note)assert.match(u.note,japanese,id);
   assert.match(q.context,japanese,id);assert.equal(q.choices.length,2,id);
   assert.equal(new Set(q.choices.map(x=>x.text)).size,2,id);
   q.choices.forEach(c=>assert.match(c.feedback,japanese,id));
   assert.doesNotMatch(q.context,/パッチム|最後の文字|終わり方/,id);
   if(q.kind==='meaning'){
    interpretations++;q.choices.forEach(c=>assert.match(c.text,/[ぁ-んァ-ヶ一-龯]/,id));
    assert.ok(u.examples.some(e=>e.text===q.text),id);
   }else{
    gaps++;assert.equal(q.kind,'particle',id);q.choices.forEach(c=>assert.ok(forms.has(c.text),id));
    assert.equal(q.before+q.choices[q.answer].text+q.after,q.text,id);
    assert.equal(focused(q),q.choices[q.answer].text,id);
    assert.ok(!q.before.endsWith(' '));assert.ok(q.after.startsWith(' '));
    // Same-function allomorph drills do not teach the requested comparison.
    for(const pair of [['은','는'],['이','가'],['을','를'],['로','으로']])assert.ok(!pair.every(x=>q.choices.some(c=>c.text===x)),id);
    for(const [i,c] of q.choices.entries())if(i!==q.answer){
     assert.ok(!c.feedback.includes(`「${q.choices[q.answer].text}」`),id);
     assert.ok(!c.feedback.includes(q.text),id);
    }
   }
   for(const item of [...u.examples,q]){
    assert.ok(forms.has(focused(item)),`${id}: ${item.text}`);assert.match(item.meaning,japanese,id);
    assert.ok(item.focus.start>=0&&item.focus.start<item.focus.end&&item.focus.end<=item.text.length,id);
    assert.equal(item.audio.text,item.text);assert.equal(item.audio.locale,'ko-KR');assert.equal(item.audio.bundled,true);
    assert.equal(item.audio.audioFile,courseVoicePath('ko-KR',item.text));
   }
  }
 }
 assert.ok(interpretations>=10);assert.ok(gaps>=10);
});

test('all highlighted allomorphs match the noun while exercises compare functions',()=>{
 const pairs=new Map([['은',true],['이',true],['을',true],['는',false],['가',false],['를',false]]);
 for(const units of Object.values(particleCourseContent))for(const u of units)for(const item of [...u.examples,u.question]){
  const p=focused(item),last=item.text.codePointAt(item.focus.start-1),jong=(last-0xac00)%28;
  assert.ok(last>=0xac00&&last<=0xd7a3,item.text);
  if(pairs.has(p))assert.equal(jong!==0,pairs.get(p),item.text);
  if(p==='로'||p==='으로')assert.equal(p,jong===0||jong===8?'로':'으로',item.text);
 }
});

test('valid alternatives are compared without inventing strict grammatical oppositions',()=>{
 const c=particleCourseContent;
 assert.deepEqual(c['25-3'][2].examples.map(e=>e.text),['커피를 좋아해요.','커피가 좋아요.']);
 assert.match(c['25-3'][2].note,/どちらも好み/);assert.match(c['25-3'][2].question.context,/좋아해요/);
 assert.ok(c['25-1'].every(u=>u.question.kind==='meaning'));
 assert.ok(c['25-2'].every(u=>u.question.kind==='meaning'));
 assert.ok(c['25-9'].every(u=>u.question.kind==='meaning'));
 assert.equal(c['25-6'][0].question.kind,'meaning');assert.match(c['25-6'][0].explanation.join(''),/どちらも/);
 assert.deepEqual(c['25-8'][1].examples.map(e=>e.text),['친구한테 선물을 받았어요.','친구한테서 선물을 받았어요.']);
 assert.equal(c['25-8'][1].question.kind,'meaning');assert.match(c['25-8'][1].explanation.join(''),/どちらも自然/);
 assert.match(c['25-7'][2].explanation.join(''),/いつも横にいる人、とは限らない/);
 assert.match(c['25-10'][2].explanation.join(''),/ほかを飲むかどうかは決まらない/);
});

test('added comparisons explain deadlines, negative scope and overlapping similarity uses',()=>{
 const c=particleCourseContent;
 assert.deepEqual(c['25-11'][0].examples.map(e=>e.text),['두 시에 와요.','두 시까지 와요.']);
 assert.match(c['25-11'][0].explanation.join(''),/までに/);
 assert.match(c['25-11'][0].question.choices[c['25-11'][0].question.answer].text,/間に合う/);
 assert.match(c['25-11'][1].explanation.join(''),/「에」でも/);
 assert.deepEqual(c['25-12'][2].examples.map(e=>e.text),['물만 없어요.','물밖에 없어요.']);
 assert.match(c['25-12'][0].explanation.join(''),/否定/);
 assert.match(c['25-12'][1].explanation.join(''),/必ず不満になるわけではない/);
 assert.ok(c['25-12'].every(u=>u.question.kind==='meaning'));
 assert.match(c['25-13'][1].explanation.join(''),/速さの話になることもある/);
 assert.deepEqual(c['25-13'][2].examples.map(e=>e.text),['엄마만큼 요리를 잘해요.','엄마보다 요리를 잘해요.']);
});

test('every example and answer has exact-text, verified bundled AAC with matching file bytes',async()=>{
 const root=new URL('../',import.meta.url),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 const {jobs,packs}=prepareParticleAudioJobs();
 const provenance=JSON.parse(await readFile(new URL('docs/asset-provenance/particle-audio-20261029.json',root),'utf8'));
 assert.equal(jobs.length,72);
 assert.equal(new Set(jobs.map(x=>x.text)).size,jobs.length);
 assert.equal(new Set(jobs.map(x=>x.file)).size,jobs.length);
 assert.equal(provenance.clips,jobs.length);
 assert.equal(provenance.lessons,particleCourseCatalog.length);
 assert.equal(provenance.jobsSha256,sha(JSON.stringify(jobs,null,2)+'\n'));
 assert.deepEqual(provenance.packs,packs);
 assert.equal(provenance.audioVerification.humanListening,false);
 assert.equal(provenance.audioVerification.devicePlayback,false);
 assert.equal(provenance.audioVerification.summary.initialPrompt,null);
 assert.equal(provenance.audioVerification.summary.complete,true);
 assert.equal(provenance.audioVerification.summary.verified,jobs.length);
 assert.deepEqual(provenance.audioVerification.summary.mismatches,[]);
 assert.deepEqual(provenance.audioVerification.summary.acousticIssues,[]);
 const byFile=new Map(provenance.files.map(x=>[x.file,x]));
 assert.equal(byFile.size,jobs.length);
 for(const job of jobs){
  const entry=byFile.get(job.file);
  assert.ok(entry,job.file);
  assert.equal(entry.text,job.text,job.file);
  assert.equal(entry.locale,'ko-KR',job.file);
  assert.ok(entry.duration>0.2,job.file);
  assert.ok(entry.transcript.trim(),job.file);
  assert.ok(['normalized-exact','korean-number-spelling','repeat-match'].includes(entry.asrMatch),job.file);
  const bytes=await readFile(new URL(job.file,root));
  assert.equal(bytes.length,entry.bytes,job.file);
  assert.equal(sha(bytes),entry.sha256,job.file);
  assert.equal(bytes.subarray(4,8).toString('ascii'),'ftyp',job.file);
 }
 assert.equal(provenance.bytes,provenance.files.reduce((sum,x)=>sum+x.bytes,0));
 for(const [id,units] of Object.entries(particleCourseContent)){
  const wanted=new Set(units.flatMap(u=>[...u.examples,u.question].map(x=>x.audio.audioFile)));
  assert.deepEqual(new Set(packs[id].files),wanted,id);
 }
});
