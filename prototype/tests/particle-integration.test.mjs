import {comparisonAttachment,resumedComparison} from '../src/comparison-attachments.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {valid,load} from '../src/storage.js';
import {levelsFor,displayLevel,courseName,courseGroup} from '../src/curriculum.js';
import {particleCourseCatalog,isParticleCourse,particleContentVersion,legacyParticleChoices} from '../src/particle-course-catalog.js';
import {koreanLessons,koreanProgress,koreanCase,koreanQuizOnly,koreanUnlocked,nextKorean} from '../src/korean-state.js';
import {studyCatalog} from '../src/study-catalog.js';
import {mapNextLesson,mapCourseLessons,mapCurrentLesson} from '../src/learning-map.js';
import {lessonPercent,restartLesson,shouldOfferResume} from '../src/lesson-session.js';
import {prepareContent,interceptCompletion} from '../src/practice-content.js';
import {renderPanel} from '../src/panels.js';
import {recordStudyCompletion,scheduledReviews} from '../src/study-state.js';
import {learningSnapshot,checkedAnswer} from '../src/analytics-learning.js';
import {isAdvancingCorrectAnswer} from '../src/lesson-answer-feedback.js';
import {createAnalytics} from '../src/analytics-core.js';
const state=()=>({...freshState(),courseDirection:'ja-ko',onboarded:true,onboardingLevel:9});
const act=(s,type,id)=>reduce(s,['course','level'].includes(type)?{type,value:id}:{type,id},new Date('2026-10-29T12:00:00+09:00'));
const restore=s=>{assert.ok(valid(s));const r=load({getItem:()=>JSON.stringify(s)});assert.equal(r.blocked,false);return r.state;};
await prepareContent('korean');

test('replaced particle material restarts safely while completed lessons and history survive',()=>{
 for(const lesson of particleCourseCatalog.filter(l=>legacyParticleChoices[l.id])){
  const id=lesson.id,s=act(state(),'korean-start',id);
  const old={...s.korean.lessons[id],index:2,phase:'review',selected:legacyParticleChoices[id].answers[2]};
  delete old.contentVersion;
  const history={version:1,startedOn:'2026-10-29',days:{'2026-10-29':{letters:0,expressions:0,sentences:3,cases:1}}};
  const legacy={...s,korean:{...s.korean,history,lessons:{...s.korean.lessons,[id]:old}}};
  const migrated=restore(legacy),p=koreanProgress(migrated,id);
  assert.equal(p.contentVersion,particleContentVersion);assert.equal(p.phase,'learn');assert.equal(p.index,0);
  assert.equal(p.selected,null);assert.equal(p.retry,false);assert.equal(p.started,true);assert.equal(p.completed,false);
  assert.deepEqual(migrated.korean.history,history);assert.equal(legacy.korean.lessons[id].phase,'review');
  const done=restore({...legacy,korean:{...legacy.korean,lessons:{[id]:{...old,phase:'done',completed:true}}}});
  assert.equal(koreanProgress(done,id).completed,true);assert.equal(koreanProgress(done,id).phase,'done');
  assert.deepEqual(done.korean.history,history);
  const replay=restore({...legacy,korean:{...legacy.korean,lessons:{[id]:{...old,completed:true}}}});
  assert.equal(koreanProgress(replay,id).phase,'learn');assert.equal(koreanProgress(replay,id).completed,true);
  assert.deepEqual(restore(migrated).korean,migrated.korean);
 }
});

test('particle supplements preserve IDs as normal lessons without adding a level',()=>{
 assert.deepEqual(levelsFor('ja-ko'),[0,8,2,4,5,7]);assert.deepEqual(levelsFor('ko-ja'),[0,2,4,5,7]);
 const s=restore(state()),ko=studyCatalog(s),ja=studyCatalog({...s,courseDirection:'ko-ja',onboardingLevel:0});
 assert.equal(ko.filter(l=>l.level===0).length,10);assert.equal(ja.filter(l=>l.level===0).length,30);
 assert.equal(ko.filter(l=>String(l.id).startsWith('25-')).length,13);assert.equal(ja.filter(l=>l.optional).length,0);
 assert.equal(s.onboardingLevel,2);assert.ok(particleCourseCatalog.every(l=>!koreanCase(l.id)&&!koreanQuizOnly(l)&&isParticleCourse(l.id)));
 assert.doesNotMatch(renderPanel('settings',s,'learning'),/value="(?:9|10)"/);
 for(const level of [0,8,2,4,5,7])assert.equal(restore({...s,onboardingLevel:level}).onboardingLevel,level);
 const last=mapCourseLessons(s).at(-1),next=mapNextLesson(s,last.action,last.id);
 assert.equal(next.id,'4-1');assert.equal(next.level,4);
 assert.equal(mapNextLesson(s,'korean','25-10').id,'hospital-appreciation');
 assert.equal(mapNextLesson(s,'korean','25-13').id,'6-1');
});

for(const lesson of particleCourseCatalog)test(`${lesson.id} learns first, retries, persists explanations and completes after the final Next`,()=>{
 let s=act(state(),'korean-start',lesson.id);const values=[],key=`ja-ko:korean:${lesson.id}`;
 assert.equal(shouldOfferResume(s,'korean'),false);
 for(let index=0;index<lesson.count;index++){
  let p=koreanProgress(s,lesson.id);assert.equal(p.index,index);assert.equal(p.phase,'learn');values.push(lessonPercent(s,'korean'));
  assert.deepEqual(act(s,'korean-check').korean,s.korean);assert.deepEqual(act(s,'korean-select','0').korean,s.korean);
  s=act(s,'korean-next');assert.equal(koreanProgress(s,lesson.id).phase,'quiz');values.push(lessonPercent(s,'korean'));
  assert.equal(shouldOfferResume(s,'korean'),true);assert.equal(koreanProgress(act(s,'korean-next'),lesson.id).phase,'quiz');
  assert.equal(koreanProgress(act(s,'korean-previous'),lesson.id).phase,'learn');
  const wrong=lesson.answers[index]===0?1:0;s=act(s,'korean-select',String(wrong));
  const selected=s;s=act(s,'korean-check');assert.equal(checkedAnswer(learningSnapshot(selected,'korean'),learningSnapshot(s,'korean'),'korean-check'),false);
  p=koreanProgress(s,lesson.id);assert.equal(p.phase,'quiz');assert.equal(p.index,index);assert.equal(p.retry,true);assert.equal(p.completed,false);
  const retry=restore(s);assert.equal(koreanProgress(act(retry,'korean-start',lesson.id),lesson.id).retry,true);
  s=act(retry,'korean-select',String(wrong));assert.equal(koreanProgress(s,lesson.id).selected,null);assert.equal(koreanProgress(s,lesson.id).retry,false);
  s=act(s,'korean-select',String(lesson.answers[index]));const before=s;assert.equal(isAdvancingCorrectAnswer(s,'korean','korean-check'),false);s=act(s,'korean-check');
  p=koreanProgress(s,lesson.id);assert.equal(p.phase,'review');assert.equal(p.completed,false);assert.equal(p.index,index);assert.equal(p.retry,false);
  assert.equal(checkedAnswer(learningSnapshot(before,'korean'),learningSnapshot(s,'korean'),'korean-check'),true);
  assert.equal(lessonPercent(s,'korean'),values.at(-1));assert.deepEqual(act(s,'korean-check').korean,s.korean);assert.deepEqual(act(s,'korean-select',String(wrong)).korean,s.korean);
  s=act(restore(s),'korean-start',lesson.id);assert.equal(koreanProgress(s,lesson.id).phase,'review');assert.equal(koreanProgress(s,lesson.id).selected,lesson.answers[index]);
  const previous=s,after=act(s,'korean-next');s=interceptCompletion(previous,after,'korean',{type:'korean-next'});assert.equal(s,after);assert.equal(s.practices,undefined);
  s=recordStudyCompletion(s,learningSnapshot(previous,'korean'),learningSnapshot(s,'korean'),new Date('2026-10-29T12:00:00+09:00'));
  assert.equal(Boolean(s.studyTools?.['ja-ko']?.lessons[key]),index===lesson.count-1);
 }
 assert.equal(lessonPercent(s,'korean'),100);assert.deepEqual(values,[0,16,33,50,66,83]);assert.equal(koreanProgress(restore(s),lesson.id).completed,true);
 assert.deepEqual(act(s,'korean-next').korean,s.korean);assert.equal(s.korean.history.days['2026-10-29'].sentences,3);assert.equal(s.korean.history.days['2026-10-29'].cases,1);
 const review=scheduledReviews(s,studyCatalog(s),new Date('2026-11-01T12:00:00+09:00')).find(l=>l.key===key);assert.equal(review.due,true);assert.equal(review.optional,undefined);assert.match(review.position,/^[234]-\d+$/);
 const restarted=restartLesson(s,'korean'),replay=act(restarted,'korean-start',lesson.id);assert.equal(koreanProgress(replay,lesson.id).phase,'learn');assert.equal(koreanProgress(replay,lesson.id).completed,true);assert.deepEqual(replay.studyTools,s.studyTools);
});

test('completed comparisons count in main map progress',()=>{
 let s=state();for(const lesson of particleCourseCatalog){s=act(s,'korean-start',lesson.id);for(const answer of lesson.answers){s=act(s,'korean-next');s=act(s,'korean-select',String(answer));s=act(s,'korean-check');s=act(s,'korean-next');}}
 assert.ok(mapCurrentLesson(s));assert.equal(mapCourseLessons(s).filter(l=>l.complete).length,4);assert.ok(valid(s));
 assert.equal(mapNextLesson(s,'korean','25-13').level,5);
});

test('supplements preserve progress without recommending unfinished optional lessons',()=>{
 let s=state();
 for(const lesson of particleCourseCatalog.slice(0,10)){
  s=act(s,'korean-start',lesson.id);
  for(const answer of lesson.answers){s=act(s,'korean-next');s=act(s,'korean-select',String(answer));s=act(s,'korean-check');s=act(s,'korean-next');}
 }
 const restored=restore(s);
 assert.deepEqual(restored.korean,s.korean);
 assert.equal(resumedComparison(restored),null);assert.ok(!isParticleCourse(mapCurrentLesson(restored).id));assert.ok(!isParticleCourse(nextKorean(restored).id));
 let ongoing=act(s,'korean-start','25-4');ongoing=act(ongoing,'korean-next');
 assert.deepEqual(restore(ongoing).korean,ongoing.korean);
 for(const id of ['25-11','25-12','25-13']){
  const started=act(s,'korean-start',id),p=started.korean.lessons[id];
  const corrupt={...started,korean:{...started.korean,lessons:{...started.korean.lessons,[id]:{...p,contentVersion:undefined,phase:'review',selected:0}}}};
  assert.equal(valid(corrupt),false,'new IDs have no legacy schema; invalid saves must not throw');
 }
});

test('particle snapshots keep the parent level in optional analytics without transmitting selected answers',async()=>{
 const s=act(state(),'korean-start','25-1'),snap=learningSnapshot(s,'korean');assert.equal(snap.level,2);assert.equal(snap.lesson_id,'ja-ko:korean:25-1');
 const values=new Map(),batches=[];let n=0;const a=createAnalytics({storage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},send:async b=>{batches.push(b);return {ok:true};},uuid:()=>`00000000-0000-4000-8000-${String(++n).padStart(12,'0')}`});
 a.setConsent(true);a.capture('learning_progress',{...snap,answer:'은'});await a.flush();const event=batches.flat().find(e=>e.event==='learning_progress');assert.equal(event.properties.level,2);assert.equal(event.properties.answer,undefined);
});


test('particle saves and actions reject nonexistent choices and malformed correct-feedback states',()=>{
 let s=act(state(),'korean-start','25-1');s=act(s,'korean-next');
 for(const id of [-1,2,3,100,'bad'])assert.deepEqual(act(s,'korean-select',id).korean,s.korean);
 const withProgress=(selected,phase='quiz',retry=false)=>({...s,korean:{...s.korean,lessons:{...s.korean.lessons,'25-1':{...s.korean.lessons['25-1'],selected,phase,retry}}}});
 assert.equal(valid(withProgress(2)),false);assert.equal(valid(withProgress(-1)),false);
 assert.equal(valid(withProgress(null,'quiz',true)),false);assert.equal(valid(withProgress(1,'learn',true)),false);assert.equal(valid(withProgress(null,'review')),false);assert.equal(valid(withProgress(1,'review')),false);
 assert.equal(valid(withProgress(0,'review',true)),false);assert.ok(valid(withProgress(0,'review')));
});
