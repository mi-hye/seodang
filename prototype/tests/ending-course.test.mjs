import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {freshState,reduce} from '../src/engine.js';
import {valid,load} from '../src/storage.js';
import {levelsFor,displayLevel,courseName} from '../src/curriculum.js';
import {endingCourseCatalog} from '../src/ending-course-catalog.js';
import {endingCourseContent} from '../src/ending-course-content.js';
import {koreanProgress,koreanCase,koreanUnlocked,nextKorean} from '../src/korean-state.js';
import {mapCourseLessons,mapNextLesson,mapCurrentLesson} from '../src/learning-map.js';
import {studyCatalog} from '../src/study-catalog.js';
import {prepareContent,interceptCompletion} from '../src/practice-content.js';
import {lessonPercent,restartLesson} from '../src/lesson-session.js';
import {learningSnapshot,checkedAnswer} from '../src/analytics-learning.js';
import {recordStudyCompletion,scheduledReviews} from '../src/study-state.js';
import {renderPanel} from '../src/panels.js';
import {particleAudio} from '../src/particle-course.js';
import {createAnalytics} from '../src/analytics-core.js';
import {prepareEndingAudioJobs} from '../scripts/prepare-ending-audio.mjs';
const base=()=>({...freshState(),courseDirection:'ja-ko',onboarded:true,onboardingLevel:10});
const act=(s,type,id)=>reduce(s,{type,id},new Date('2026-10-30T12:00:00+09:00'));
const restore=s=>{assert.ok(valid(s));const r=load({getItem:()=>JSON.stringify(s)});assert.equal(r.blocked,false);return r.state;};
await prepareContent('korean');

test('ending supplements are Korean-only and follow their parent in the main path',()=>{
 const s=restore(base());assert.deepEqual(levelsFor('ja-ko'),[0,8,2,4,5,7]);
 assert.equal(s.onboardingLevel,4);assert.equal(koreanCase('35-1'),false);
 assert.equal(mapCourseLessons(s).filter(l=>String(l.id).startsWith('35-')).length,3);
 const last=mapCourseLessons(s).at(-1);assert.equal(mapNextLesson(s,last.action,last.id).id,'5-1');
 assert.equal(mapNextLesson(s,'korean','35-1').id,'course3-8');
 assert.equal(mapNextLesson(s,'korean','35-4').id,'7');
 assert.match(studyCatalog(s).find(x=>x.id==='35-1').position,/^3-\d+$/);
 assert.doesNotMatch(renderPanel('settings',s,'learning'),/value="10"/);
 const ja=reduce(s,{type:'course',value:'ko-ja'});assert.ok(valid(ja));
 assert.equal(koreanUnlocked(ja,'35-1'),false);assert.equal(studyCatalog(ja).some(x=>x.id==='35-1'),false);
 assert.equal(valid({...ja,onboardingLevel:10}),false);
 assert.equal(studyCatalog(s).filter(x=>x.level===0).length,10);
 assert.equal(studyCatalog(ja).filter(x=>x.level===0).length,30);
});

test('ending comparisons teach complete examples without forcing a false spontaneous/planned split',()=>{
 for(const l of endingCourseCatalog){const units=endingCourseContent[l.id];assert.equal(l.count,units.length);
 assert.deepEqual(l.answers,units.map(u=>u.question.answer));assert.deepEqual(l.choiceCounts,units.map(u=>u.question.choices.length));
 assert.equal(l.titleParts.join(''),l.title);
 for(const u of units){
  assert.equal(u.examples.length,2);assert.equal(u.question.kind,'meaning');assert.equal(u.question.choices.length,2);
  assert.ok(u.explanation.join('').length<=150);
  for(const text of [u.heading,...u.explanation,u.question.context,...u.question.choices.flatMap(c=>[c.text,c.feedback])])assert.match(text,/[ぁ-んァ-ヶ]/);
  for(const e of [...u.examples,u.question]){assert.equal(e.audio.text,e.text);assert.equal(e.audio.bundled,true);assert.equal(e.audio.locale,'ko-KR');assert.ok(e.text.slice(e.focus.start,e.focus.end).length>0);assert.ok(e.focus.end<e.text.length);}
 }
 }
 const units=endingCourseContent['35-1'];
 assert.match(units[0].explanation.join(''),/も自分の意思/);
 assert.match(units[1].explanation.join(''),/必ず前からの計画、と分けるわけではない/);
 assert.match(units[1].question.choices[1].feedback,/約束として伝わることも/);
 assert.match(units[2].explanation.join(''),/見込み/);
});

for(const {id} of endingCourseCatalog)test(`ending ${id} retries, resumes, uses shared progress and completes exactly once after review`,()=>{
 let s=act(base(),'korean-start',id);const percentages=[];
 for(const [index,u] of endingCourseContent[id].entries()){
  assert.equal(koreanProgress(s,id).phase,'learn');assert.equal(koreanProgress(s,id).index,index);percentages.push(lessonPercent(s,'korean'));
  for(const e of u.examples)assert.equal(particleAudio(s,e.text).audioFile,e.audio.audioFile);
  s=act(s,'korean-next');percentages.push(lessonPercent(s,'korean'));
  assert.equal(particleAudio(s,u.examples[0].text),undefined);
  s=act(s,'korean-select',String(1-u.question.answer));s=act(s,'korean-check');assert.equal(koreanProgress(s,id).retry,true);
  s=restore(s);assert.equal(koreanProgress(s,id).phase,'quiz');
  s=act(s,'korean-select',String(u.question.answer));const before=s;s=act(s,'korean-check');
  assert.equal(checkedAnswer(learningSnapshot(before,'korean'),learningSnapshot(s,'korean'),'korean-check'),true);
  assert.equal(koreanProgress(s,id).phase,'review');assert.equal(koreanProgress(s,id).completed,false);
  s=restore(s);assert.equal(particleAudio(s,u.question.text).text,u.question.text);
  const previous=s,next=act(s,'korean-next');assert.equal(interceptCompletion(previous,next,'korean',{type:'korean-next'}),next);
  s=recordStudyCompletion(next,learningSnapshot(previous,'korean'),learningSnapshot(next,'korean'),new Date('2026-10-30T12:00:00+09:00'));
 }
 assert.deepEqual(percentages,[0,16,33,50,66,83]);assert.equal(lessonPercent(s,'korean'),100);
 assert.notEqual(mapCurrentLesson(s)?.id,id);assert.ok(valid(s));assert.equal(s.practices,undefined);
 assert.equal(s.korean.history.days['2026-10-30'].cases,1);assert.deepEqual(act(s,'korean-next').korean,s.korean);
 const key=`ja-ko:korean:${id}`;assert.ok(s.studyTools['ja-ko'].lessons[key]);
 assert.equal(scheduledReviews(s,studyCatalog(s),new Date('2026-11-02T12:00:00+09:00')).find(l=>l.key===key).due,true);
 const replay=act(restartLesson(s,'korean'),'korean-start',id);assert.equal(koreanProgress(replay,id).phase,'learn');assert.equal(koreanProgress(replay,id).completed,true);
 assert.deepEqual(restore(s).korean,s.korean);
});

test('ending saves reject invalid choices, wrong review answers and unknown content versions',()=>{
 let s=act(base(),'korean-start','35-1');s=act(s,'korean-next');
 for(const id of [-1,2,3,100])assert.deepEqual(act(s,'korean-select',id).korean,s.korean);
 for(const patch of [{selected:2},{phase:'review',selected:1},{phase:'review',selected:null},{contentVersion:undefined},{contentVersion:2}]){
  assert.equal(valid({...s,korean:{...s.korean,lessons:{'35-1':{...s.korean.lessons['35-1'],...patch}}}}),false);
 }
});

test('completed ending lessons stay completed as normal map stops',()=>{
 let s=act(base(),'korean-start','35-1');
 for(const u of endingCourseContent['35-1']){
  s=act(s,'korean-next');s=act(s,'korean-select',u.question.answer);s=act(s,'korean-check');s=act(s,'korean-next');
 }
 const previous=structuredClone(s.korean);s=restore(s);
 assert.deepEqual(s.korean,previous);assert.equal(s.korean.lessons['35-1'].contentVersion,1);
 assert.equal(nextKorean(s).id,'4-1');assert.ok(!mapCurrentLesson(s).id.startsWith('35-'));
 assert.equal(mapCourseLessons(s).filter(l=>l.complete).length,1);
 assert.equal(mapNextLesson(s,'korean','35-2').id,'15');assert.equal(mapNextLesson(s,'korean','35-3').id,'course3-14');
});

test('all ending examples have exact-text ASR-checked audio and matching bundled bytes',async()=>{
 const p=JSON.parse(await readFile(new URL('../docs/asset-provenance/ending-audio-20261030.json',import.meta.url))),{jobs,packs}=prepareEndingAudioJobs();
 assert.equal(jobs.length,24);assert.equal(p.clips,24);assert.equal(p.lessons,4);assert.deepEqual(p.packs,packs);
 const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(p.jobsSha256,sha(JSON.stringify(jobs,null,2)+'\n'));
 assert.equal(p.audioVerification.summary.complete,true);assert.deepEqual(p.audioVerification.summary.mismatches,[]);assert.deepEqual(p.audioVerification.summary.acousticIssues,[]);
 assert.equal(p.audioVerification.humanListening,false);assert.equal(p.audioVerification.devicePlayback,false);
 for(const job of jobs){const f=p.files.find(f=>f.file===job.file),bytes=await readFile(new URL('../'+job.file,import.meta.url));assert.equal(f.text,job.text);assert.equal(sha(bytes),f.sha256);assert.equal(bytes.length,f.bytes);assert.ok(['normalized-exact','korean-number-spelling'].includes(f.asrMatch)||f.repeatMatch==='normalized-exact');}
});


test('optional analytics uses the parent display level without answer text',async()=>{
 const values=new Map(),sent=[];let n=0;const a=createAnalytics({storage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},send:async b=>{sent.push(...b);return {ok:true};},uuid:()=>`00000000-0000-4000-8000-${String(++n).padStart(12,'0')}`});
 a.setConsent(true);const s=act(base(),'korean-start','35-1');a.capture('learning_progress',{...learningSnapshot(s,'korean'),answer:'할게요'});await a.flush();
 const event=sent.find(e=>e.event==='learning_progress');assert.equal(event.properties.level,3);assert.equal(event.properties.answer,undefined);
});
