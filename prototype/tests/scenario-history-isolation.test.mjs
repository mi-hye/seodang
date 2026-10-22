import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {recordLearning} from '../src/learning-history.js';
import {prepareContent,interceptCompletion} from '../src/practice-content.js';
import {advancePractice} from '../src/practice-state.js';
import {learningSnapshot} from '../src/analytics-learning.js';
import {recordStudyCompletion} from '../src/study-state.js';
import {valid,load} from '../src/storage.js';
import {freshVideo} from '../src/video-lesson-state.js';
import {freshSong} from '../src/song-state.js';
import {freshExpert,expertKey} from '../src/expert-state.js';
import {reviewFixture} from './level-two-review-fixtures.mjs';

const now=new Date(2026,9,22,12),day='2026-10-22';
const history=()=>({version:1,startedOn:day,days:{[day]:{letters:0,expressions:2,sentences:4,cases:0}}});
const host=s=>s.courseDirection==='ja-ko'?s.korean:s;
const withHistory=s=>({...s,history:{...history(),completed:[]},korean:{version:4,active:'3-1',lessons:{},...s.korean,history:history()}});
const frozen=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(frozen);Object.freeze(value);}return value;};

for(const direction of ['ko-ja','ja-ko'])for(const id of ['2','13','14','15','16','17'])for(const completed of [false,true])test(`${direction} scenario ${id}: ${completed?'repeat':'first'} completion waits for review without changing source history`,async()=>{
 const key=`${direction}:scenario:${id}`,fixture=reviewFixture(key),s=withHistory(fixture.s);
 s.scenarios[key].completed=completed;
 if(completed&&direction==='ko-ja')s.history.completed.push(key);
 const baseline=structuredClone(s),expectedCases=completed?0:1,counter=id==='2'?'expressions':'sentences';
 frozen(s);await prepareContent('scenario');
 const done=reduce(s,fixture.action,now),pending=interceptCompletion(s,done,'scenario',fixture.action);
 assert.deepEqual(s,baseline,'reducer must not change the original state');
 assert.deepEqual(host(pending).history,host(baseline).history,'pending review must not count the held lesson action');
 assert.equal(learningSnapshot(pending,'scenario').done,false);
 assert.equal(pending.scenarios[key].completed,completed);
 assert.ok(valid(pending));
 const restored=load({getItem:()=>JSON.stringify(pending)});
 assert.equal(restored.blocked,false);
 assert.deepEqual(host(restored.state).history,host(baseline).history);
 let p=restored.state.practices[key];
 while(true){const next=advancePractice(p,1,false);if(!next)break;p=next;}
 const practices={...restored.state.practices};delete practices[key];
 const input={...restored.state,practices},inputBefore=structuredClone(input);
 frozen(input);
 let final=reduce(input,p.action,now);
 assert.deepEqual(input,inputBefore);
 assert.deepEqual(host(final).history,host(done).history);
 assert.equal(host(final).history.days[day][counter],host(baseline).history.days[day][counter]+1);
 assert.equal(host(final).history.days[day].cases,expectedCases);
 assert.deepEqual(direction==='ko-ja'?final.korean.history:final.history,direction==='ko-ja'?baseline.korean.history:baseline.history);
 final=recordStudyCompletion(final,learningSnapshot(pending,'scenario'),learningSnapshot(final,'scenario'),now);
 assert.equal(final.studyTools[direction].lessons[key].completedOn,day);
 assert.ok(valid(final));
 const repeated=reduce(frozen(final),p.action,now);
 assert.deepEqual(host(repeated).history,host(final).history,'repeated final action must not count again');
});

test('generic learning history does not mutate either input when they share history',()=>{
 const before=withHistory(freshState());before.episode.step='learn';
 const after={...before,episode:{...before.episode,lesson:1}};
 const originalBefore=structuredClone(before),originalAfter=structuredClone(after);
 const result=recordLearning(frozen(before),frozen(after),{type:'next'},now);
 assert.deepEqual(before,originalBefore);assert.deepEqual(after,originalAfter);
 assert.equal(result.history.days[day].expressions,3);
});

for(const direction of ['ko-ja','ja-ko'])for(const kind of ['video','song','expert'])test(`${direction} ${kind}: final history recording remains isolated`,()=>{
 let before=withHistory({...freshState(),courseDirection:direction,onboardingLevel:kind==='expert'?7:2}),after;
 if(kind==='video'){
  const id=direction==='ko-ja'?'frieren-reaction':'hospital-reassurance',p={...freshVideo(3,'scene'),started:true,phase:'use',selected:0,checked:true};
  before={...before,videoActive:id,videoLessons:{[id]:p}};after={...before,videoLessons:{[id]:{...p,phase:'done',completed:true}}};
 }else if(kind==='song'){
  const id=direction==='ko-ja'?'jp-arigatou':'ko-night-letter',p={...freshSong(),started:true,phase:'encore'};
  before={...before,songActive:id,songs:{[id]:p}};after={...before,songs:{[id]:{...p,phase:'done',completed:true}}};
 }else{
  before.expertActive=0;const key=expertKey(before),p={...freshExpert(),discussionVersion:2,part:0,started:true,phase:'reflection'};
  before.experts={[key]:p};after={...before,experts:{[key]:{...p,phase:'done',completed:true}}};
 }
 const originalBefore=structuredClone(before),originalAfter=structuredClone(after);
 const result=recordLearning(frozen(before),frozen(after),{type:`${kind}-next`},now);
 assert.deepEqual(before,originalBefore);assert.deepEqual(after,originalAfter);
 assert.equal(host(result).history.days[day].cases,1);
 assert.equal(host(result).history.days[day][kind==='expert'?'sentences':'expressions'],kind==='expert'?4:3);
});
