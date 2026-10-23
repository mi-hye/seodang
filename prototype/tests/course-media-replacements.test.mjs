import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
import {valid,load} from '../src/storage.js';
import {courseGroup} from '../src/curriculum.js';
import {courseVideos} from '../src/course-video-catalog.js';
import {courseSongs} from '../src/course-song-catalog.js';
import {songLessons} from '../src/song-state.js';
import {studyCatalog} from '../src/study-catalog.js';
import {mapCourseLessons,mapCurrentLesson,mapNextLesson} from '../src/learning-map.js';
import {freshScenario} from '../src/scenario-state.js';
import {scheduledReviews} from '../src/study-state.js';
import {orderLessons,lessonNumberWithSpecials} from '../src/lesson-order.js';

function preview(enabled,fn){const flags=songLessons.map(l=>l.released);try{songLessons.forEach(l=>{l.released=enabled;});return fn();}finally{songLessons.forEach((l,i)=>{l.released=flags[i];});}}
for(const direction of ['ko-ja','ja-ko'])for(const level of [4,5,7])for(const dev of [false,true])test(`${direction}/${level} ${dev?'preview':'production'} preserves 17 positions and matching map/review/next destinations`,()=>preview(dev,()=>{
 const state={...freshState(),courseDirection:direction,onboardingLevel:level},before=structuredClone(state);
 const list=studyCatalog(state).filter(l=>courseGroup(l.level)===level),map=mapCourseLessons(state);
 assert.equal(list.length,17);assert.equal(map.length,17);
 assert.equal(new Set(list.map(l=>l.key)).size,17);
 assert.deepEqual(list.filter(l=>l.kind==='video').map(l=>+l.position.split('-')[1]),[3,6,9,12]);
 assert.deepEqual(list.filter(l=>l.kind==='song').map(l=>+l.position.split('-')[1]),dev?[5,10,15]:[]);
 assert.deepEqual(map.map(l=>`${l.action}:${l.id??0}`),list.map(l=>`${l.kind}:${l.id}`));
 for(const l of [...courseVideos,...courseSongs].filter(l=>l.direction===direction&&l.level===level)){
  const at=list[l.number-1],active=l.mode==='scene'||dev;
  assert.equal(at.id,active?l.id:l.replaces.id===String(3)&&l.replaces.kind==='expert'?3:l.replaces.id);
  assert.equal(at.kind,active?l.mode==='scene'?'video':'song':l.replaces.kind);
  const prior=map[l.number-2],next=mapNextLesson(state,prior.action,prior.id);
  assert.equal(next.id,at.id);assert.equal(next.action,at.kind);
 }
 assert.deepEqual(state,before);
}));

for(const direction of ['ko-ja','ja-ko'])test(`${direction} old replaced records survive storage but cannot become current or scheduled review`,()=>preview(true,()=>{
 const key=`${direction}:scenario:course3-9`;
 let state={...freshState(),courseDirection:direction,onboardingLevel:4,scenarioActive:'course3-9',scenarios:{[key]:{...freshScenario(),started:true}},studyTools:{[direction]:{lessons:{[key]:{completedOn:'2026-10-01'}}}}};
 assert.ok(valid(state));const saved=structuredClone(state);state=load({getItem:()=>JSON.stringify(state)}).state;
 assert.deepEqual(state.scenarios,saved.scenarios);assert.deepEqual(state.studyTools,saved.studyTools);
 assert.notEqual(mapCurrentLesson(state)?.id,'course3-9');
 const list=studyCatalog(state);assert.ok(!list.some(l=>l.key===key));assert.ok(!scheduledReviews(state,list).some(l=>l.key===key));
}));

test('replacement order is stable, immutable, and never inserts a missing target',()=>{
 const regular=[{kind:'scenario',id:'a'},{kind:'expert',id:3},{kind:'scenario',id:'b'}];
 const specials=[{kind:'video',id:'v',number:2},{kind:'song',id:'s',number:3,replaces:{kind:'expert',id:'3'}}];
 const before=structuredClone({regular,specials});
 assert.deepEqual(orderLessons(regular,specials).map(l=>l.id),['a','v','s','b']);
 assert.deepEqual(orderLessons(regular,[...specials].reverse()),orderLessons(regular,specials));
 assert.equal(lessonNumberWithSpecials(3,specials),4);assert.deepEqual({regular,specials},before);
 assert.equal(orderLessons(regular,[{...specials[1],replaces:{kind:'scenario',id:'missing'}}]).length,3);
});

for(const direction of ['ko-ja','ja-ko'])for(const dev of [false,true])test(`${direction} level three original order keeps identities, progress and sequential destinations (${dev})`,()=>preview(dev,()=>{
 const state={...freshState(),courseDirection:direction,onboardingLevel:4};
 const map=mapCourseLessons(state),base=direction==='ko-ja'?['dialogue',undefined]:['korean','4-1'];
 const positions=[[13,'scenario','course3-13'],[14,'scenario','course3-14'],[16,'scenario','course3-16'],[1,...base],[2,'scenario','3'],[4,'scenario','6']];
 for(const [number,action,id]of positions)assert.deepEqual([map[number-1].action,map[number-1].id],[action,id]);
 assert.deepEqual([mapCurrentLesson(state).action,mapCurrentLesson(state).id],base);
 for(let i=0;i<16;i++)assert.deepEqual(mapNextLesson(state,map[i].action,map[i].id),{...map[i+1],level:4});
 const key=`${direction}:scenario:3`,progress={...freshScenario('3'),started:true};
 const started={...state,scenarioActive:'3',scenarios:{[key]:progress}};
 const restored=load({getItem:()=>JSON.stringify(started)}).state;
 assert.deepEqual(restored.scenarios,started.scenarios);assert.equal(mapCurrentLesson(restored).id,'3');
 const completed={...restored,scenarios:{[key]:{...progress,phase:'done',completed:true}}};
 assert.equal(mapCourseLessons(completed)[1].complete,true);assert.equal(mapCourseLessons(completed)[13].complete,false);
}));
