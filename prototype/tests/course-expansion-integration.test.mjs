import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, reduce } from '../src/engine.js';
import { courseExpansionCatalog, expansionReview } from '../src/course-expansion-state.js';
import { expandedCourseContent, courseVoice } from '../src/course-expansion-content.js';
import { courseVoicePath } from '../src/course-voice-path.js';
import { courseExpansionReview } from '../src/course-expansion-review.js';
import { prepareScenario } from '../src/scenario.js';
import { currentCourseAudio } from '../src/course-expansion.js';
import { scenarioKey, scenarioProgress, scenarioAvailable } from '../src/scenario-state.js';
import { prepareContent, caseTasks, practiceUnits, interceptCompletion } from '../src/practice-content.js';
import { expressionReviewCount, advancePractice, normalizeCasePractice, validPractices } from '../src/practice-state.js';
import { lessonPercent, restartLesson } from '../src/lesson-session.js';
import { learningSnapshot } from '../src/analytics-learning.js';
import { recordStudyCompletion } from '../src/study-state.js';
import { studyCatalog } from '../src/study-catalog.js';
import { lessonNumberWithVideo } from '../src/video-lesson-state.js';
import { courseGroup } from '../src/curriculum.js';
import { valid, load } from '../src/storage.js';
import { levelTwoReviews } from '../src/level-two-review-state.js';

const now = new Date(2026, 9, 23, 12);
const directions = ['ko-ja', 'ja-ko'];
const entries = courseExpansionCatalog.flatMap(meta => (meta.directions || directions).map(direction => ({meta, direction, key:`${direction}:scenario:${meta.id}`})));
const act = (state, type, id) => reduce(state, {type, ...(id === undefined ? {} : {id})}, now);
const fixture = (direction, meta) => ({...freshState(), onboarded:true, koreanGuideSeenVersion:1, courseDirection:direction, onboardingLevel:meta.level, settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
const restore = state => {assert.ok(valid(state));const result=load({getItem:()=>JSON.stringify(state)});assert.equal(result.blocked,false);return result.state;};
const cases = s => Object.values((s.courseDirection==='ja-ko'?s.korean?.history:s.history)?.days||{}).reduce((sum,day)=>sum+(day.cases||0),0);
await prepareContent('scenario');
for (const meta of courseExpansionCatalog) await prepareScenario(meta.id);

test('63 added lessons have supported content and six complete review steps', () => {
 assert.equal(entries.length,63);
 assert.equal(new Set(entries.map(x=>x.key)).size,63);
 const pending={};
 for (const {meta,direction,key} of entries) {
  const state=act(fixture(direction,meta),'scenario-start',meta.id),content=expandedCourseContent(direction,meta.id),tasks=caseTasks(state,'scenario');
  assert.ok(content,key);assert.equal(content.items.length,3,key);
  assert.deepEqual(expansionReview(key),{count:6,version:1},key);
  assert.equal(tasks.length,expressionReviewCount(key),key);
  assert.deepEqual(tasks,courseExpansionReview(key),key);
  const recallType=meta.level===0&&meta.id!=='course1-16'?'listen':'order';
  assert.deepEqual(tasks.map(t=>t.type),[recallType,recallType,recallType,'apply','apply','apply'],key);
  assert.deepEqual(tasks.slice(0,3).map(t=>t.unitIndex),[1,2,0],key);
  assert.deepEqual(tasks.slice(3).map(t=>t.unitIndex),[2,0,1],key);
  for(const task of tasks){
   const source=content.items[task.unitIndex];
   assert.equal(task.unit.audio.text,task.unit.text,key);assert.equal(task.unit.audio.bundled,true,key);
   assert.equal(task.unit.audio.audioFile,courseVoicePath(direction==='ko-ja'?'ja-JP':'ko-KR',task.unit.text),key);
   if(task.type==='order'){
    assert.equal(task.tokens.join(''),source.answer,key);assert.equal(task.unit.text,source.answer,key);assert.equal(task.unit.meaning,source.answerMeaning,key);
    assert.deepEqual([...task.tokenOrder].sort((a,b)=>a-b),task.tokens.map((_,i)=>i),key);
    assert.notDeepEqual(task.tokenOrder,task.tokens.map((_,i)=>i),key+' should not show the answer in order');
   }else if(task.type==='listen'){
    const words=content.activity==='words';
    assert.equal(task.unit.text,words?source.text:source.answer,key);assert.equal(task.unit.meaning,words?source.meaning:source.answerMeaning,key);
    assert.equal(task.options[task.answer],task.unit.meaning,key);assert.equal(new Set(task.options).size,3,key);assert.equal(task.optionAudio,undefined,'meaning options must not play target-language audio');
   }else{
    assert.equal(task.unit.text,source.transfer.options[source.transfer.answer],key);assert.equal(task.answer,source.transfer.answer,key);
    task.options.forEach((option,i)=>{assert.equal(task.optionAudio[i].text,option,key);assert.equal(task.optionAudio[i].bundled,true,key);});
   }
  }
  const units=practiceUnits(state,'scenario');
  assert.equal(units.length,3,key);
  units.forEach((unit,i)=>{assert.equal(unit.text,content.items[i].answer,key);assert.equal(unit.meaning,content.items[i].answerMeaning,key);assert.equal(unit.audio.audioFile,courseVoicePath(direction==='ko-ja'?'ja-JP':'ko-KR',unit.text),key);});
  pending[key]={version:1,caseVersion:1,count:6,index:5,round:0,mode:0,action:{type:'scenario-next'}};
 }
 assert.equal(validPractices(pending),true,'all 63 new pending reviews coexist');
 for(const [key,meta] of Object.entries(levelTwoReviews))pending[key]={version:1,caseVersion:meta.version,count:meta.count,index:0,round:0,mode:0,action:{type:'scenario-next'}};
 assert.ok(Object.keys(pending).length>64);assert.equal(validPractices(pending),true,'existing and new pending reviews coexist beyond the former limit');
});

for(const {meta,direction,key} of entries)test(`expansion learning, storage, deferred completion and replay ${key}`,()=>{
 let state=act(fixture(direction,meta),'scenario-start',meta.id);
 const source=expandedCourseContent(direction,meta.id),progress=[];
 assert.equal(scenarioProgress(state).phase,'intro');assert.equal(lessonPercent(state,'scenario'),0);
 state=act(state,'scenario-next');
 for(let index=0;index<3;index++){
  const p=scenarioProgress(state);assert.equal(p.phase,'learn',key);assert.equal(p.index,index);
  assert.equal(act(state,'scenario-select',meta.answers[index]),state,'choices must not skip learning');
  progress.push(lessonPercent(state,'scenario'));
  for(const part of ['prompt','answer'])assert.deepEqual(currentCourseAudio(state,part),courseVoice(direction,meta.id,`${index}.${part}`,source.items[index][part==='prompt'?'text':'answer']));
  assert.equal(currentCourseAudio(state,'choice:0'),null);
  state=act(restore(state),'scenario-start',meta.id);assert.equal(scenarioProgress(state).phase,'learn');
  state=act(state,'scenario-next');progress.push(lessonPercent(state,'scenario'));
  assert.equal(scenarioProgress(state).phase,'quiz');assert.equal(currentCourseAudio(state,'answer'),null,'do not expose answer audio before checking');
  for(let option=0;option<3;option++)assert.equal(currentCourseAudio(state,`choice:${option}`).text,[source.items[index].answer,...source.items[index].others][option]);
  const wrong=(meta.answers[index]+1)%3;
  state=act(state,'scenario-select',wrong);state=act(state,'scenario-check');assert.equal(scenarioProgress(state).retry,true);
  assert.equal(act(state,'scenario-next'),state,'wrong answer does not advance');
  state=act(state,'scenario-select',meta.answers[index]);state=act(state,'scenario-check');assert.equal(scenarioProgress(state).checked,true);
  const saved=structuredClone(state);state=act(restore(state),'scenario-start',meta.id);assert.deepEqual(scenarioProgress(state),scenarioProgress(saved));
  assert.equal(currentCourseAudio(state,'choice:0'),null,'checked choices do not replay a stale selection');
  const before=structuredClone(state),completed=act(state,'scenario-next'),held=interceptCompletion(state,completed,'scenario',{type:'scenario-next'});
  assert.deepEqual(state,before,'prospective completion must not mutate source history');
  if(index<2){assert.equal(held,completed);state=held;continue;}
  assert.equal(scenarioProgress(held).completed,false);assert.equal(scenarioProgress(held).phase,'quiz');assert.equal(scenarioProgress(held).checked,true);
  assert.equal(cases(held),0);assert.equal(learningSnapshot(held,'scenario').done,false);
  assert.deepEqual(held.practices[key],{version:1,caseVersion:1,count:6,index:0,round:0,mode:0,action:{type:'scenario-next'}});
  state=restore(held);progress.push(lessonPercent(state,'scenario'));assert.equal(lessonPercent(state,'scenario'),50);
 }
 for(let index=0;index<6;index++){
  assert.equal(state.practices[key].index,index);assert.equal(learningSnapshot(state,'scenario').done,false);assert.equal(cases(state),0);
  state=act(restore(state),'scenario-start',meta.id);assert.equal(state.practices[key].index,index,'resume keeps review step');
  const next=advancePractice(state.practices[key],1,false);
  if(next){state={...state,practices:{...state.practices,[key]:next}};progress.push(lessonPercent(state,'scenario'));}
  else{
   const snapshot=learningSnapshot(state,'scenario'),{[key]:held,...rest}=state.practices;
   state=act({...state,practices:rest},held.action.type);state=recordStudyCompletion(state,snapshot,learningSnapshot(state,'scenario'),now);progress.push(lessonPercent(state,'scenario'));
  }
 }
 assert.deepEqual(progress,[0,8,16,25,33,41,50,58,66,75,83,91,100]);
 assert.equal(scenarioProgress(state).phase,'done');assert.equal(scenarioProgress(state).completed,true);assert.equal(cases(state),1);assert.equal(learningSnapshot(state,'scenario').done,true);
 assert.equal(state.practices[key],undefined);assert.equal(state.studyTools[direction].lessons[key].completedOn,'2026-10-23');
 assert.ok(valid(state));const recorded=structuredClone(state),restarted=restartLesson(restore(state),'scenario');
 assert.equal(scenarioProgress(restarted).phase,'intro');assert.equal(scenarioProgress(restarted).completed,true,'completion badge survives restart');
 assert.deepEqual(restarted.studyTools,recorded.studyTools);assert.deepEqual(restarted.history,recorded.history);assert.deepEqual(restarted.korean?.history,recorded.korean?.history);
 const entry=act(restarted,'scenario-start',meta.id);assert.equal(scenarioProgress(entry).phase,'intro');assert.equal(scenarioProgress(entry).completed,true);
 const stale={version:1,caseVersion:0,count:3,index:2,round:0,mode:0,action:{type:'scenario-next'}};
 assert.deepEqual(normalizeCasePractice(stale,key),{...stale,caseVersion:1,count:6,index:0});
});

const oldPrefixes={
 'ko-ja':{4:['dialogue:0','scenario:3','video:frieren','scenario:6','scenario:7','video:frieren-permission','scenario:8'],5:['reading:5','reading:6','video:frieren-uncertainty','scenario:4','scenario:9','video:frieren-realization','scenario:10'],7:['expert:0','expert:1','video:frieren-opinion','expert:2','expert:3','video:frieren-inference','scenario:11','scenario:12','video:frieren-subtext']},
 'ja-ko':{4:['korean:4-1','scenario:3','video:blackdog-help','scenario:6','scenario:7','video:blackdog-confirmation','scenario:8'],5:['korean:5-1','korean:6-1','video:queen-condition','scenario:4','scenario:9','video:queen-belief','scenario:10'],7:['expert:0','expert:1','video:misaeng','expert:2','expert:3','video:blackdog-nuance','scenario:11','scenario:12','video:misaeng-subtext']}
};
for(const direction of directions)test(`catalog order and completion identity remain stable ${direction}`,()=>{
 const state={...freshState(),courseDirection:direction},catalog=studyCatalog(state);
 for(const level of [4,5,7]){
  const lessons=catalog.filter(l=>courseGroup(l.level)===level),old=oldPrefixes[direction][level];
  assert.equal(lessons.length,17);assert.deepEqual(lessons.slice(0,old.length).map(l=>`${l.kind}:${l.id}`),old);
  assert.deepEqual(lessons.map(l=>Number(l.position.split('-')[1])),Array.from({length:17},(_,i)=>i+1));
  for(const meta of courseExpansionCatalog.filter(l=>l.level===level)){
   const listed=lessons.find(l=>l.id===meta.id);
   if(!listed){assert.ok(lessons.some(l=>l.replaces?.kind==='scenario'&&l.replaces.id===meta.id));continue;}
   assert.equal(Number(listed.position.split('-')[1]),lessonNumberWithVideo({...state,onboardingLevel:level},meta.number[direction]));
  }
 }
 const alphabet=catalog.filter(l=>l.level===0);
 if(direction==='ko-ja'){
  assert.equal(alphabet.length,30);assert.equal(alphabet.some(l=>l.id.startsWith?.('course1-')),false);
  for(const meta of courseExpansionCatalog.filter(l=>l.level===0)){
   assert.equal(scenarioAvailable(state,meta),false);assert.equal(expansionReview(`ko-ja:scenario:${meta.id}`),null);
   assert.equal(act({...state,onboardingLevel:0},'scenario-start',meta.id).scenarios?.[`ko-ja:scenario:${meta.id}`],undefined);
  }
 }else{
  assert.equal(alphabet.length,17);assert.deepEqual(alphabet.slice(0,10).map(l=>l.key),Array.from({length:10},(_,i)=>`ja-ko:korean:1-${i+1}`));
  assert.deepEqual(alphabet.slice(10).map(l=>l.id),Array.from({length:7},(_,i)=>`course1-${i+11}`));
 }
});

test('invalid extended lesson IDs and Korean-only lesson direction do not enter persistence',()=>{
 const base=fixture('ko-ja',courseExpansionCatalog.find(l=>l.level===4));
 const p={version:1,caseVersion:1,count:6,index:0,round:0,mode:0,action:{type:'scenario-next'}};
 for(const key of ['ko-ja:scenario:course3-999','ko-ja:scenario:course1-11','ja-ko:scenario:course3-8:extra','en-ja:scenario:course3-8']){assert.equal(expansionReview(key),null,key);assert.equal(validPractices({[key]:p}),false,key);assert.equal(valid({...base,practices:{[key]:p}}),false,key);}
});
