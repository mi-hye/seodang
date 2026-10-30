import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {freshState,reduce} from '../src/engine.js';
import {valid,load} from '../src/storage.js';
import {levelsFor,displayLevel,courseName} from '../src/curriculum.js';
import {pronunciationCourseCatalog} from '../src/pronunciation-course-catalog.js';
import {pronunciationCourseContent} from '../src/pronunciation-course-content.js';
import {koreanProgress} from '../src/korean-state.js';
import {studyCatalog} from '../src/study-catalog.js';
import {mapNextLesson} from '../src/learning-map.js';
import {lessonPercent} from '../src/lesson-session.js';
import {prepareContent,interceptCompletion} from '../src/practice-content.js';
import {renderKorean,koreanAudio} from '../src/korean.js';
import {renderPanel} from '../src/panels.js';
import {recordStudyCompletion} from '../src/study-state.js';
import {learningSnapshot} from '../src/analytics-learning.js';
const state=()=>({...freshState(),courseDirection:'ja-ko',onboarded:true,onboardingLevel:8});
const act=(s,type,id)=>reduce(s,{type,id});
const restore=s=>{assert.ok(valid(s));const r=load({getItem:()=>JSON.stringify(s)});assert.equal(r.blocked,false);return r.state;};
await prepareContent('korean');
test('Korean-only 1.5 is between unchanged alphabet and level two with compatible storage',()=>{
 assert.deepEqual(levelsFor('ja-ko'),[0,8,2,4,5,7]);assert.deepEqual(levelsFor('ko-ja'),[0,2,4,5,7]);assert.equal(displayLevel(8),1.5);assert.equal(displayLevel(2),2);assert.equal(courseName(8,true),'発音を集中練習する');
 const s=state(),ko=studyCatalog(s),ja=studyCatalog({...s,courseDirection:'ko-ja',onboardingLevel:0});
 assert.equal(ko.filter(l=>l.level===0).length,10);assert.equal(ja.filter(l=>l.level===0).length,30);assert.equal(ko.filter(l=>l.level===8).length,10);assert.equal(ja.filter(l=>l.level===8).length,0);
 assert.deepEqual(ko.filter(l=>l.level===8).map(l=>l.position),Array.from({length:10},(_,i)=>`1.5-${i+1}`));
 assert.equal(mapNextLesson({...s,onboardingLevel:0},'korean','1-10').id,'15-1');assert.equal(mapNextLesson(s,'korean','15-10').id,'3-1');
 const japanese=reduce(s,{type:'course',value:'ko-ja'});assert.equal(japanese.onboardingLevel,0);assert.ok(valid(japanese));assert.equal(reduce(restore(japanese),{type:'course',value:'ja-ko'}).onboardingLevel,8);
 assert.equal(reduce(japanese,{type:'level',value:8}).onboardingLevel,0);assert.equal(valid({...japanese,onboardingLevel:8}),false);
 assert.match(renderPanel('settings',s,'learning'),/value="8" selected>1.5/);assert.doesNotMatch(renderPanel('settings',japanese,'learning'),/value="8"/);
 for(const level of [2,4,5,7])assert.equal(restore({...s,onboardingLevel:level}).onboardingLevel,level);
});
for(const lesson of pronunciationCourseCatalog)test(`${lesson.id} learns without quizzes, records practice, resumes and completes once`,()=>{
 let s=act(state(),'korean-start',lesson.id);const values=[];
 assert.equal(lesson.titleParts.join(''),lesson.title);
 const items=pronunciationCourseContent[lesson.id];assert.equal(items.length,lesson.count);
 for(let index=0;index<items.length;index++){
  assert.equal(items[index].cueParts.join(''),items[index].cue);
  assert.equal(koreanProgress(s,lesson.id).phase,'learn');values.push(lessonPercent(s,'korean'));
  const audio=koreanAudio(s);assert.equal(audio.text,items[index].text);assert.ok(existsSync(new URL('../'+audio.audioFile,import.meta.url)));
  const html=renderKorean(s,()=> '');assert.doesNotMatch(html,/korean-select|korean-check/);assert.match(html,/言ってみる/);
  assert.equal((html.match(/<article/g)||[]).length,index<3?1:3);
  assert.deepEqual(act(s,'korean-check').korean,s.korean);
  s=act(s,'korean-next');assert.equal(koreanProgress(s,lesson.id).phase,'speak');values.push(lessonPercent(s,'korean'));
  const back=act(s,'korean-previous');assert.equal(koreanProgress(back,lesson.id).phase,'learn');assert.equal(koreanProgress(back,lesson.id).index,index);
  s=act(restore(s),'korean-start',lesson.id);assert.equal(koreanProgress(s,lesson.id).phase,'speak');
  assert.match(renderKorean(s,()=>''),/pronunciation-speaking/);assert.match(renderKorean(s,()=>''),/data-speaking-record/);assert.match(renderKorean(s,()=>''),/data-optional-recording/);
  const before=s,after=act(s,'korean-speak-next');s=interceptCompletion(before,after,'korean',{type:'korean-speak-next'});assert.equal(s,after);assert.equal(s.practices,undefined);
  s=recordStudyCompletion(s,learningSnapshot(before,'korean'),learningSnapshot(s,'korean'));
 }
 assert.equal(lessonPercent(s,'korean'),100);assert.deepEqual(values,Array.from({length:12},(_,i)=>Math.floor(i/12*100)));
 const key=`ja-ko:korean:${lesson.id}`;assert.ok(s.studyTools['ja-ko'].lessons[key]);assert.equal(koreanProgress(restore(s),lesson.id).completed,true);
 const replay=act(s,'korean-start',lesson.id);assert.equal(koreanProgress(replay,lesson.id).phase,'learn');assert.equal(koreanProgress(replay,lesson.id).completed,true);assert.deepEqual(replay.studyTools,s.studyTools);
});
test('all targets are sentences with exact bundled audio, meaning and valid focus ranges',()=>{
 const provenance=JSON.parse(readFileSync(new URL('../docs/asset-provenance/course-expansion-20261022.json',import.meta.url)));
 for(const l of pronunciationCourseCatalog){const items=pronunciationCourseContent[l.id];assert.equal(new Set(items.map(x=>x.text)).size,3);
  for(const x of items){
   assert.match(x.text,/[.?]$/);assert.ok(x.text.length>=5);assert.ok(x.meaning);assert.ok(x.cue);
   assert.ok(x.focus.start>=0&&x.focus.end>x.focus.start&&x.focus.end<=x.text.length);
   assert.equal(x.audio.text,x.text);assert.equal(x.spoken,x.text);assert.equal(x.audio.bundled,true);
   const clip=provenance.files.find(f=>f.file===x.audio.audioFile);assert.equal(clip.text,x.text);assert.equal(clip.asrMatch,'normalized-exact');
   assert.equal(createHash('sha256').update(readFileSync(new URL('../'+x.audio.audioFile,import.meta.url))).digest('hex'),clip.sha256);
   assert.equal(x.answer,undefined);assert.equal(x.learnAudio,undefined);
  }
 }
});
test('legacy syllable practice restarts the new sentences while completion and history survive',()=>{
 for(const phase of ['learn','quiz','speak','done']){
  let s=act(state(),'korean-start','15-8');
  s.korean.lessons['15-8']={index:4,phase,selected:2,retry:true,started:true,completed:true};
  const history={version:1,startedOn:'2026-10-28',days:{'2026-10-28':{letters:3,expressions:0,sentences:0,cases:1}}};s.korean.history=history;
  s=restore(s);const p=koreanProgress(s,'15-8');
  assert.equal(p.index,phase==='done'?4:0);assert.equal(p.phase,phase==='done'?'done':'learn');assert.equal(p.selected,null);assert.equal(p.retry,false);assert.equal(p.completed,true);assert.equal(p.contentVersion,2);assert.deepEqual(s.korean.history,history);
  assert.deepEqual(restore(s).korean,s.korean);
 }
});
test('unchanged linking lesson preserves its in-progress position',()=>{
 let s=act(state(),'korean-start','15-10');s.korean.lessons['15-10']={index:4,phase:'speak',selected:null,retry:false,started:true,completed:false};
 const p=koreanProgress(restore(s),'15-10');assert.equal(p.index,4);assert.equal(p.phase,'speak');assert.equal(p.contentVersion,2);
});
