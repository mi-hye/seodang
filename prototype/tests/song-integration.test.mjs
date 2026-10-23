import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {load,valid,STORAGE_KEY} from '../src/storage.js';
import {songLessons,songProgress,songsForCourse,freshSong} from '../src/song-state.js';
import {learningSnapshot,checkedAnswer,createLearningTracker} from '../src/analytics-learning.js';
import {recordStudyCompletion,scheduledReviews} from '../src/study-state.js';

const firstDay=new Date(2026,9,22,12);
const reviewDay=new Date(2026,9,26,12);
const fixture=l=>({...freshState(),courseDirection:l.direction,onboardingLevel:l.level,songActive:l.id});
const host=s=>s.courseDirection==='ja-ko'?s.korean:s;
const reload=s=>{const result=load({getItem:()=>JSON.stringify(s)});assert.equal(result.blocked,false);return result.state;};
// Exercise the actual release gate and engine without changing generated build config.
function available(l,fn){const released=l.released;try{l.released=true;return fn();}finally{l.released=released;}}

for(const l of songLessons)test(`${l.id}: song progress, answers, replay and review dates survive storage`,()=>available(l,()=>{
 let s=fixture(l),now=firstDay;
 const key=`${l.direction}:song:${l.id}`;
 const act=(type,id)=>{
  const before=learningSnapshot(s,'song');s=reduce(s,{type,id},now);const after=learningSnapshot(s,'song');
  s=recordStudyCompletion(s,before,after,now);assert.ok(valid(s),`${type} must remain persistable`);return {before,after};
 };
 act('song-start',l.id);assert.equal(songProgress(s).started,true);act('song-next');
 if((l.number===15||l.learnFirst)){assert.equal(songProgress(s).phase,'learn');act('song-replay');s=reload(s);act('song-next');assert.equal(songProgress(s).phase,'learn');act('song-next');}
 for(const [index,phase]of ['gap','apply'].entries()){
  assert.equal(songProgress(s).phase,phase);
  act('song-next');assert.equal(songProgress(s).phase,phase);
  const empty=act('song-check');assert.equal(checkedAnswer(empty.before,empty.after,'song-check'),null);
  const wrong=(l.answers[index]+1)%3;
  act('song-select',wrong);const failed=act('song-check');assert.equal(checkedAnswer(failed.before,failed.after,'song-check'),false);
  s=reload(s);assert.equal(songProgress(s).selected,wrong);assert.equal(songProgress(s).retry,true);
  act('song-next');assert.equal(songProgress(s).phase,phase);
  act('song-select',l.answers[index]);const correct=act('song-check');assert.equal(checkedAnswer(correct.before,correct.after,'song-check'),true);
  const repeated=act('song-check');assert.equal(checkedAnswer(repeated.before,repeated.after,'song-check'),null);
  act('song-select',wrong);assert.equal(songProgress(s).selected,l.answers[index]);
  const saved=structuredClone(songProgress(s));act('song-replay');assert.equal(songProgress(s).phase,'listen');assert.equal(songProgress(s).resume,phase);
  s=reload(s);act('song-start',l.id);act('song-next');assert.deepEqual(songProgress(s),saved);
  assert.equal(host(s)?.history,undefined);assert.equal(s.studyTools,undefined);
  act('song-next');
  if(phase==='gap'&&!(l.number===15||l.learnFirst)){
   assert.equal(songProgress(s).phase,'learn');act('song-replay');s=reload(s);act('song-next');assert.equal(songProgress(s).phase,'learn');act('song-next');
  }
 }
 assert.equal(songProgress(s).phase,'encore');assert.equal(learningSnapshot(s,'song').done,false);assert.equal(host(s)?.history,undefined);
 act('song-replay');s=reload(s);act('song-next');assert.equal(songProgress(s).phase,'encore');assert.equal(host(s)?.history,undefined);
 act('song-next');assert.equal(songProgress(s).phase,'done');assert.equal(songProgress(s).completed,true);assert.equal(learningSnapshot(s,'song').done,true);
 assert.deepEqual(host(s).history.days['2026-10-22'],{letters:0,expressions:1,sentences:0,cases:1});
 assert.equal(s.studyTools[l.direction].lessons[key].completedOn,'2026-10-22');
 s=reload(s);const completed=structuredClone(s);act('song-next');assert.deepEqual(s,completed);

 // The completed badge is retained during a review, while completion is recorded
 // only after finishing the new run rather than merely reopening the lesson.
 now=reviewDay;act('song-start',l.id);assert.equal(songProgress(s).completed,true);assert.equal(learningSnapshot(s,'song').done,false);
 assert.equal(s.studyTools[l.direction].lessons[key].completedOn,'2026-10-22');
 act('song-next');if((l.number===15||l.learnFirst))act('song-next');act('song-select',l.answers[0]);act('song-check');act('song-next');if(!(l.number===15||l.learnFirst))act('song-next');
 act('song-select',l.answers[1]);act('song-check');act('song-next');act('song-next');
 assert.deepEqual(host(s).history.days['2026-10-26'],{letters:0,expressions:1,sentences:0,cases:0});
 assert.equal(s.studyTools[l.direction].lessons[key].completedOn,'2026-10-26');
 const reviews=scheduledReviews(s,[{key,position:`2-${l.number}`,completed:true}],reviewDay);
 assert.equal(reviews[0].dueOn,'2026-10-29');assert.equal(reviews[0].due,false);
 assert.equal(l.direction==='ko-ja'?s.korean?.history:s.history,undefined);
}));

test('production hides unapproved songs without invalidating or deleting local preview progress',()=>{
 for(const l of songLessons){
  assert.equal(l.released,false);
  const s={...fixture(l),songs:{[l.id]:{...freshSong(l.revision),started:true,phase:'listen',selected:1,retry:true,resume:'gap'}}};
  assert.deepEqual(songsForCourse(s),[]);assert.ok(valid(s));assert.deepEqual(reload(s).songs,s.songs);
  for(const action of [{type:'song-start',id:l.id},{type:'song-next'},{type:'song-check'}])assert.equal(reduce(s,action),s);
  assert.equal(learningSnapshot(s,'song').lesson_id,`${l.direction}:song:${l.id}`);
 }
});

test('malformed song progress is blocked without overwriting the stored record',()=>{
 const l=songLessons[0],s={...fixture(l),songs:{[l.id]:{...freshSong(l.revision),started:true}}};
 for(const mutation of [{version:99},{phase:'other'},{selected:3},{resume:'done'},{phase:'gap',resume:'apply'},{checked:true,selected:null},{checked:true,selected:0,retry:true},{phase:'done',completed:false}]){
  const malformed={...s,songs:{[l.id]:{...s.songs[l.id],...mutation}}},raw=JSON.stringify(malformed);
  assert.equal(valid(malformed),false);
  const storage=new Map([[STORAGE_KEY,raw]]);
  const loaded=load({getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)});
  assert.equal(loaded.blocked,true);assert.equal(storage.get(STORAGE_KEY),raw);
 }
 assert.equal(valid({...s,songActive:'unknown'}),false);
 assert.equal(valid({...s,songs:{unknown:s.songs[l.id]}}),false);
});

test('song snapshots use the lesson identity and accept answers only in its question phases',()=>{
 const l=songLessons[0],s={...fixture(l),songs:{[l.id]:{...freshSong(l.revision),started:true,phase:'gap',selected:0}}};
 const before=learningSnapshot(s,'song'),after={...before,_checked:true};
 assert.equal(before.level,2);assert.equal(before.item_index,0);assert.equal(before.practice,false);
 assert.equal(checkedAnswer(before,after,'song-check'),true);
 assert.equal(checkedAnswer({...before,phase:'listen'},after,'song-check'),null);
 assert.equal(checkedAnswer({...before,phase:'learn'},after,'song-check'),null);
 assert.equal(checkedAnswer(before,{...after,lesson_id:'ja-ko:song:ko-travel'},'song-check'),null);
 assert.equal(learningSnapshot({...s,songActive:'unknown'},'song'),null);
 assert.equal(learningSnapshot({...s,courseDirection:'ja-ko'},'song'),null);
 assert.equal(learningSnapshot(freshState(),'song'),null);
});

test('song analytics records answer attempts and exactly one completion per run',()=>available(songLessons[0],()=>{
 const l=songLessons[0],events=[];
 const tracker=createLearningTracker({capture:(name,data)=>events.push({name,data})},()=> 'song-attempt',()=>0);
 let s=reduce(fixture(l),{type:'song-start',id:l.id});tracker.enter(learningSnapshot(s,'song'));
 const act=(type,id)=>{const before=learningSnapshot(s,'song');s=reduce(s,{type,id},firstDay);tracker.transition(before,learningSnapshot(s,'song'),type);};
 act('song-next');act('song-check');act('song-select',(l.answers[0]+1)%3);act('song-check');act('song-select',l.answers[0]);act('song-check');act('song-check');
 act('song-replay');act('song-next');act('song-next');act('song-next');act('song-select',l.answers[1]);act('song-check');act('song-next');act('song-next');act('song-next');
 assert.deepEqual(events.filter(e=>e.name==='answer_checked').map(e=>e.data.correct),[false,true,true]);
 assert.equal(events.filter(e=>e.name==='lesson_completed').length,1);
 assert.equal(events.find(e=>e.name==='lesson_completed').data.lesson_id,'ko-ja:song:jp-arigatou');
 assert.equal(events.find(e=>e.name==='lesson_completed').data.phase,'done');
 assert.equal(events.some(e=>'answer' in e.data||'lyrics' in e.data||'target' in e.data),false);
}));
