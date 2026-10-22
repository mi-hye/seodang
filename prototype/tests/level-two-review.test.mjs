import test from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';
import {levelTwoReviews} from '../src/level-two-review-state.js';import {levelTwoReviewData} from '../src/level-two-review-data.js';import {levelTwoReview,expandedReviewWords} from '../src/level-two-review-content.js';import {reviewFixture} from './level-two-review-fixtures.mjs';
import {reduce} from '../src/engine.js';import {prepareContent,interceptCompletion,caseTasks} from '../src/practice-content.js';import {normalizeCasePractice,advancePractice,expressionReviewCount,validPractices,hasExpressionReview} from '../src/practice-state.js';import {valid,load,STORAGE_KEY} from '../src/storage.js';import {learningSnapshot} from '../src/analytics-learning.js';import {recordStudyCompletion} from '../src/study-state.js';
for(const key of Object.keys(levelTwoReviews))test(`expanded review source, persistence and exact final action ${key}`,async()=>{
 const {s,kind,action}=reviewFixture(key);await prepareContent(kind);assert.ok(valid(s),key+' source');const tasks=caseTasks(s,kind);assert.equal(tasks.length,expressionReviewCount(key));assert.deepEqual(tasks,levelTwoReview(key));
 for(const t of tasks){assert.ok(t.unit.audio.audioFile);assert.equal(t.unit.audio.text,t.unit.text);if(t.type==='word'){assert.equal(new Set(t.options).size,4);for(const p of t.optionPictures)assert.ok(existsSync(p),p);assert.equal(t.optionAudio[t.answer].text,t.unit.text);}else if(t.type==='order'){assert.equal(t.tokens.slice(0,t.answerLength).join(''),t.unit.text);assert.equal(new Set(t.tokens).size,t.tokens.length);assert.deepEqual([...t.tokenOrder].sort((a,b)=>a-b),t.tokens.map((_,i)=>i));}else assert.equal(t.options[t.answer],t.type==='listen'?t.unit.meaning:t.unit.text);}
 assert.equal(expandedReviewWords(key).length,4);
 const done=reduce(s,action),pending=interceptCompletion(s,done,kind,action);assert.ok(pending.practices[key]);assert.ok(valid(pending),key+' pending');assert.equal(learningSnapshot(pending,kind).done,false);assert.equal(load({getItem:()=>JSON.stringify(pending)}).blocked,false);
 let p=pending.practices[key];for(let i=0;i<tasks.length-1;i++){p=advancePractice(p,1,false);assert.equal(p.index,i+1);}assert.equal(advancePractice(p,1,false),null);
 const entries={...pending.practices};delete entries[key];const final=reduce({...pending,practices:entries},p.action);assert.equal(learningSnapshot(final,kind).done,true);assert.ok(valid(final));assert.deepEqual(final.history,done.history);assert.deepEqual(final.korean?.history,done.korean?.history);
 const recorded=recordStudyCompletion(final,learningSnapshot(pending,kind),learningSnapshot(final,kind));assert.ok(recorded.studyTools[s.courseDirection].lessons[key]);
 const old={...pending.practices[key],caseVersion:0,count:3,index:2};const normalized=normalizeCasePractice(old,key);assert.equal(normalized.index,0);assert.equal(normalized.count,tasks.length);assert.deepEqual(normalized.action,action);
});
test('only the requested level-two lessons are extended and all pending reviews coexist',()=>{assert.equal(Object.keys(levelTwoReviews).length,16);for(const dir of ['ko-ja','ja-ko'])assert.deepEqual(Object.entries(levelTwoReviewData).filter(([k])=>k.startsWith(dir)).map(([,v])=>v.number).sort((a,b)=>a-b),[4,5,7,8,10,11,13,14]);const entries=Object.fromEntries(Object.keys(levelTwoReviews).map(key=>[key,{version:1,caseVersion:1,round:0,mode:0,index:0,count:levelTwoReviews[key].count,action:reviewFixture(key).action}]));assert.ok(validPractices(entries));assert.equal(levelTwoReview('ko-ja:scenario:6'),null);assert.equal(levelTwoReview('ko-ja:video:frieren'),null);});
test('shop review pairs the learner question with its meaning, not the shopkeeper reply',()=>{assert.equal(levelTwoReviewData['ko-ja:scenario:13'].units[0].meaning,'공책 있어요?');assert.equal(levelTwoReviewData['ja-ko:scenario:13'].units[0].meaning,'ノートはありますか。');});
test('answer and token positions are varied across stages and lessons',()=>{const tasks=Object.keys(levelTwoReviews).flatMap(levelTwoReview);for(const type of ['word','listen','apply'])assert.ok(new Set(tasks.filter(t=>t.type===type).map(t=>t.answer)).size>=3);const builds=tasks.filter(t=>t.type==='order');assert.ok(new Set(builds.map(t=>t.tokenOrder[0])).size>=3);assert.ok(new Set(builds.map(t=>t.tokens.at(-1))).size>20);});

const retiredVideoKeys=['ko-ja:video:frieren-reaction','ja-ko:video:hospital-reassurance','ko-ja:video:frieren-wait','ja-ko:video:hospital-effort','ko-ja:video:frieren-just-right','ja-ko:video:hospital-appreciation','ko-ja:video:chiikawa-offer','ja-ko:video:hospital-thanks'];
const legacyVideoReview=count=>({version:1,caseVersion:1,round:0,mode:0,index:3,count,action:{type:'video-next'}});
const memory=state=>{const data=new Map([[STORAGE_KEY,JSON.stringify(state)]]);return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('retired video reviews load without a generic gate and preserve clip progress and completed records',()=>{
 for(const completed of [false,true]){
  const {s}=reviewFixture('ko-ja:scenario:13');
  const other={version:1,caseVersion:1,round:0,mode:0,index:4,count:12,action:{type:'scenario-next'}};
  s.practices={'ko-ja:scenario:13':other};s.videoLessons={};
  s.history={version:1,startedOn:'2026-10-20',completed:['sentence-3'],days:{'2026-10-20':{letters:0,expressions:2,sentences:3,cases:1}}};
  s.korean={version:4,active:'3-1',lessons:{},history:{version:1,startedOn:'2026-10-20',days:{'2026-10-20':{letters:0,expressions:1,sentences:2,cases:1}}}};
  s.studyTools={'ko-ja':{lessons:{}},'ja-ko':{lessons:{}}};
  for(const [i,key]of retiredVideoKeys.entries()){
   const [direction,,id]=key.split(':');s.practices[key]=legacyVideoReview(i%2?7:8);
   s.videoLessons[id]={version:id==='frieren-just-right'?2:1,index:0,phase:'learn',started:true,completed};
   s.studyTools[direction].lessons[key]={completedOn:'2026-10-20',at:1792465200000};
   assert.equal(hasExpressionReview(key),false);assert.equal(levelTwoReview(key),null);assert.deepEqual(expandedReviewWords(key),[]);
  }
  assert.ok(valid(s));const storage=memory(s),raw=storage.getItem(STORAGE_KEY),result=load(storage);
  assert.equal(result.blocked,false);assert.ok(valid(result.state));assert.deepEqual(result.state.practices,{'ko-ja:scenario:13':other});
  for(const field of ['videoLessons','history','studyTools'])assert.deepEqual(result.state[field],s[field]);
  assert.deepEqual(result.state.korean.history,s.korean.history);assert.equal(storage.getItem(STORAGE_KEY),raw);
  storage.setItem(STORAGE_KEY,JSON.stringify(result.state));assert.deepEqual(load(storage).state.practices,result.state.practices);
 }
});
test('retired review migration does not discard unknown or malformed saves',()=>{
 for(const mutate of [s=>s.practices['ko-ja:video:frieren-reaction'].index=99,s=>s.practices['ko-ja:video:unknown']=legacyVideoReview(8),s=>s.settings.textScale=99]){
  const {s}=reviewFixture('ko-ja:scenario:13');s.practices={'ko-ja:video:frieren-reaction':legacyVideoReview(8)};mutate(s);
  const storage=memory(s),raw=storage.getItem(STORAGE_KEY);assert.equal(load(storage).blocked,true);assert.equal(storage.getItem(STORAGE_KEY),raw);
 }
});
