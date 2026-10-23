import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
import {load,valid} from '../src/storage.js';
import {freshSong,nextSongStage,reduceSong,resumeSongLesson,songLessons,songProgress,songsForCourse,songStageIndex,songStages,songStagesFor,validSongs} from '../src/song-state.js';

const previewFor=s=>songLessons.filter(l=>l.level===s.onboardingLevel&&l.direction===s.courseDirection);
const stateFor=lesson=>({...freshState(),onboarded:true,onboardingLevel:lesson.level,courseDirection:lesson.direction});
const act=(state,action)=>{
 const before=structuredClone(state),next=reduceSong(state,action,previewFor(state));
 assert.deepEqual(state,before,'a song action must not mutate saved progress');
 assert.ok(validSongs(next));
 return next;
};
const roundTrip=state=>{
 assert.ok(valid(state));
 const result=load({getItem:()=>JSON.stringify(state)});
 assert.equal(result.blocked,false);
 assert.deepEqual(result.state.songs,state.songs);
 assert.equal(result.state.songActive,state.songActive);
 return result.state;
};
const start=lesson=>act(stateFor(lesson),{type:'song-start',id:lesson.id});
const choose=(state,answer)=>act(act(state,{type:'song-select',id:String(answer)}),{type:'song-check'});
const advance=state=>act(state,{type:'song-next'});
const finish=lesson=>{
 let s=advance(start(lesson));
 if((lesson.number===15||lesson.learnFirst))s=advance(s);
 s=advance(choose(s,lesson.answers[0]));
 if(!(lesson.number===15||lesson.learnFirst))s=advance(s);
 s=advance(choose(s,lesson.answers[1]));
 return advance(s);
};

for(const lesson of songLessons){
 test(`${lesson.id} requires both correct answers, preserves replay state and completes after encore`,()=>{
  let s=start(lesson);
  assert.equal(songProgress(s).phase,'listen');
  s=advance(s);
  if((lesson.number===15||lesson.learnFirst)){assert.equal(songProgress(s).phase,'learn');s=advance(s);}
  assert.equal(songProgress(s).phase,'gap');
  assert.equal(advance(s),s,'a question without an answer cannot advance');
  s=choose(s,(lesson.answers[0]+1)%3);
  assert.equal(songProgress(s).retry,true);
  assert.equal(advance(s),s,'an incorrect answer cannot advance');
  s=roundTrip(s);
  const wrong=songProgress(s).selected;
  s=act(s,{type:'song-replay'});
  assert.equal(songProgress(s).phase,'listen');
  assert.equal(songProgress(s).resume,'gap');
  assert.equal(songProgress(s).selected,wrong);
  s=advance(roundTrip(s));
  assert.equal(songProgress(s).phase,'gap');
  assert.equal(songProgress(s).retry,true);
  s=choose(s,lesson.answers[0]);
  assert.equal(songProgress(s).checked,true);
  assert.equal(songProgress(s).retry,false);
  assert.equal(act(s,{type:'song-select',id:String((lesson.answers[0]+1)%3)}),s,'a checked answer stays locked');
  s=act(s,{type:'song-replay'});
  s=advance(roundTrip(s));
  assert.equal(songProgress(s).phase,'gap');
  assert.equal(songProgress(s).selected,lesson.answers[0]);
  assert.equal(songProgress(s).checked,true);
  s=advance(s);
  if(!(lesson.number===15||lesson.learnFirst)){assert.equal(songProgress(s).phase,'learn');s=advance(s);}
  assert.equal(songProgress(s).phase,'apply');
  s=choose(s,(lesson.answers[1]+1)%3);
  assert.equal(songProgress(s).retry,true);
  assert.equal(advance(s),s);
  s=choose(s,lesson.answers[1]);
  s=act(s,{type:'song-replay'});
  s=advance(roundTrip(s));
  assert.equal(songProgress(s).phase,'apply');
  assert.equal(songProgress(s).selected,lesson.answers[1]);
  assert.equal(songProgress(s).checked,true);
  s=advance(s);
  assert.equal(songProgress(s).phase,'encore');
  assert.equal(songProgress(s).completed,false);
  s=advance(roundTrip(s));
  assert.equal(songProgress(s).phase,'done');
  assert.equal(songProgress(s).completed,true);
  assert.equal(advance(s),s,'completion cannot be emitted again by next');
  roundTrip(s);
 });
}

test('restart clears only the selected song attempt and preserves completed lessons',()=>{
 const lesson=songLessons[0],other=songLessons[1];
 let s=finish(lesson);
 s={...s,songs:{...s.songs,[other.id]:{...freshSong(),started:true,phase:'gap',selected:other.answers[0],checked:true}}};
 const otherBefore=structuredClone(s.songs[other.id]);
 for(const action of [{type:'song-start',id:lesson.id},{type:'song-start',id:lesson.id,restart:true}]){
  s=act(s,action);
  assert.deepEqual(songProgress(s),{...freshSong(),started:true,completed:true});
  assert.deepEqual(s.songs[other.id],otherBefore);
 }
 s=act(s,{type:'song-start',id:other.id});
 assert.deepEqual(songProgress(s),otherBefore,'ordinary entry resumes a checked answer');
 s=act(s,{type:'song-start',id:other.id,restart:true});
 assert.deepEqual(songProgress(s),{...freshSong(),started:true});
 assert.equal(s.songs[lesson.id].completed,true);
});

test('previous and replay navigation never grants a correct answer or completes a lesson',()=>{
 const lesson=songLessons[0];
 let s=advance(start(lesson));
 s=choose(s,lesson.answers[0]);
 s=advance(s);
 s=act(s,{type:'song-previous'});
 assert.equal(songProgress(s).phase,'gap');
 assert.equal(songProgress(s).checked,false);
 assert.equal(songProgress(s).selected,null);
 assert.equal(advance(s),s);
 s=act(s,{type:'song-previous'});
 assert.equal(songProgress(s).phase,'listen');
 assert.equal(songProgress(s).completed,false);
 assert.equal(act(s,{type:'song-previous'}),s);
 assert.equal(act(s,{type:'song-replay'}),s);
});

test('unreleased songs remain inaccessible in production even when a local preview save exists',()=>{
 for(const lesson of songLessons){
  const s=finish(lesson);
  assert.deepEqual(songsForCourse(s),[]);
  assert.equal(resumeSongLesson({...s,songs:{[lesson.id]:{...freshSong(),started:true}}}),undefined);
  assert.equal(reduceSong(s,{type:'song-start',id:lesson.id,restart:true}),s);
  assert.equal(reduceSong(s,{type:'song-next'}),s);
  assert.ok(validSongs(s),'production must continue to read preview saves');
  roundTrip(s);
 }
});

test('unknown and unstarted song actions leave all progress unchanged',()=>{
 const lesson=songLessons[0],s=stateFor(lesson);
 assert.equal(act(s,{type:'song-start',id:'not-a-song'}),s);
 const unstarted={...s,songActive:lesson.id,songs:{[lesson.id]:freshSong()}};
 for(const type of ['song-next','song-check','song-previous','song-replay','song-select'])assert.equal(act(unstarted,{type,id:'0'}),unstarted);
});

test('song save validation rejects malformed progress without discarding the stored payload',()=>{
 const lesson=songLessons[0],s=start(lesson);
 const malformed=[
  {...s,songActive:'unknown'},
  {...s,songs:[]},
  {...s,songs:null},
  {...s,songs:{unknown:freshSong()}},
  ...[
   {version:2},{phase:'unknown'},{phase:'done',completed:false},{selected:3},
   {checked:true,selected:null},{checked:true,selected:0,retry:true},
   {phase:'learn',resume:'gap'},{resume:'done'},{started:'yes'},{completed:1}
  ].map(p=>({...s,songs:{[lesson.id]:{...freshSong(),...p}}}))
 ];
 for(const bad of malformed){
  assert.equal(validSongs(bad),false);
  assert.equal(valid(bad),false,'storage must call song validation');
  const raw=JSON.stringify(bad),storage={getItem:()=>raw,setItem:()=>assert.fail('invalid saves must remain untouched')};
  const result=load(storage);
  assert.equal(result.blocked,true);
  assert.equal(storage.getItem(),raw);
 }
});

test('only lesson 2-15 learns the expression before its gap question',()=>{
 for(const lesson of songLessons)assert.deepEqual(songStagesFor(lesson.id),(lesson.number===15||lesson.learnFirst)?['listen','learn','gap','apply','encore','done']:['listen','gap','learn','apply','encore','done']);
 assert.deepEqual(songStages,['listen','gap','learn','apply','encore','done']);
});

for(const lesson of songLessons.filter(l=>(l.number===15||l.learnFirst))){
 const old=p=>({...stateFor(lesson),songActive:lesson.id,songs:{[lesson.id]:{...freshSong(lesson.revision),started:true,...p}}});

 test(`${lesson.id}: a legacy unfinished gap learns once while a new gap keeps its selected answer`,()=>{
  const legacy=old({phase:'gap',selected:1,retry:true}),before=structuredClone(legacy);
  let s=act(roundTrip(legacy),{type:'song-start',id:lesson.id});
  assert.deepEqual(legacy,before);assert.equal(songProgress(s).phase,'learn');assert.equal(songProgress(s).learningVersion,1);
  assert.equal(songProgress(s).selected,null);assert.equal(songProgress(s).retry,false);
  s=advance(s);s=choose(s,(lesson.answers[0]+1)%3);
  const saved=structuredClone(songProgress(s));s=act(roundTrip(s),{type:'song-start',id:lesson.id});assert.deepEqual(songProgress(s),saved);
  const invalid={...s,songs:{[lesson.id]:{...songProgress(s),learningVersion:2}}};assert.equal(validSongs(invalid),false);
 });

 test(`${lesson.id}: a checked legacy gap keeps its answer and learns before application`,()=>{
  const checked=old({phase:'gap',selected:lesson.answers[0],checked:true});
  let s=act(roundTrip(checked),{type:'song-start',id:lesson.id});
  assert.deepEqual(songProgress(s),{...songProgress(checked),learningVersion:1,learningPending:true});
  assert.equal(nextSongStage(lesson.id,songProgress(s)),'learn');
  assert.equal(songStageIndex(lesson.id,songProgress(s)),1);
  const saved=structuredClone(songProgress(s));
  s=act(roundTrip(s),{type:'song-start',id:lesson.id});assert.deepEqual(songProgress(s),saved);
  s=advance(s);assert.equal(songProgress(s).phase,'learn');assert.equal(songProgress(s).learningPending,true);
  assert.equal(songProgress(s).checked,false);assert.equal(songProgress(s).selected,null);
  assert.equal(nextSongStage(lesson.id,songProgress(s)),'apply');
  assert.equal(songStageIndex(lesson.id,songProgress(s)),2);
  s=advance(roundTrip(s));assert.equal(songProgress(s).phase,'apply');assert.equal(songProgress(s).learningPending,undefined);
  assert.equal(songStageIndex(lesson.id,songProgress(s)),3);
 });

 test(`${lesson.id}: existing learning pages continue to the new gap without pending legacy state`,()=>{
  let s=act(roundTrip(old({phase:'learn'})),{type:'song-start',id:lesson.id});
  assert.equal(songProgress(s).phase,'learn');assert.equal(songProgress(advance(s)).phase,'gap');
  assert.equal(songProgress(s).learningPending,undefined);
 });

 test(`${lesson.id}: an unchecked legacy replay stays on the video but returns to learning once`,()=>{
  const legacy=old({phase:'listen',resume:'gap',selected:2,retry:true});
  let s=act(roundTrip(legacy),{type:'song-start',id:lesson.id});
  assert.deepEqual(songProgress(s),{...songProgress(legacy),learningVersion:1,resume:'learn',selected:null,retry:false});
  assert.equal(nextSongStage(lesson.id,songProgress(s)),'learn');
  const saved=structuredClone(songProgress(s));
  s=act(roundTrip(s),{type:'song-start',id:lesson.id});assert.deepEqual(songProgress(s),saved);
  s=advance(s);assert.equal(songProgress(s).phase,'learn');assert.equal(songProgress(s).resume,null);
  s=advance(s);assert.equal(songProgress(s).phase,'gap');
  s=choose(s,(lesson.answers[0]+1)%3);s=act(s,{type:'song-replay'});
  const replay=structuredClone(songProgress(s));
  s=act(roundTrip(s),{type:'song-start',id:lesson.id});assert.deepEqual(songProgress(s),replay,'a new replay keeps its gap choice');
  s=advance(s);assert.equal(songProgress(s).phase,'gap');assert.equal(songProgress(s).retry,true);
 });

 test(`${lesson.id}: checked legacy replay and learning replay preserve the required learning page`,()=>{
  const legacy=old({phase:'listen',resume:'gap',selected:lesson.answers[0],checked:true});
  let s=act(roundTrip(legacy),{type:'song-start',id:lesson.id});
  assert.deepEqual(songProgress(s),{...songProgress(legacy),learningVersion:1,learningPending:true});
  assert.equal(nextSongStage(lesson.id,songProgress(s)),'gap');
  assert.equal(songStageIndex(lesson.id,songProgress(s)),1);
  s=advance(roundTrip(s));assert.equal(songProgress(s).phase,'gap');assert.equal(songProgress(s).checked,true);
  assert.equal(songProgress(s).selected,lesson.answers[0]);assert.equal(nextSongStage(lesson.id,songProgress(s)),'learn');
  s=advance(s);s=act(s,{type:'song-replay'});
  assert.equal(songProgress(s).resume,'learn');assert.equal(songProgress(s).learningPending,true);
  assert.equal(nextSongStage(lesson.id,songProgress(s)),'learn');assert.equal(songStageIndex(lesson.id,songProgress(s)),2);
  const saved=structuredClone(songProgress(s));
  s=act(roundTrip(s),{type:'song-start',id:lesson.id});assert.deepEqual(songProgress(s),saved);
  s=advance(s);assert.equal(songProgress(s).phase,'learn');
  s=advance(s);assert.equal(songProgress(s).phase,'apply');assert.equal(songProgress(s).learningPending,undefined);
 });

 test(`${lesson.id}: other legacy replay return points survive migration`,()=>{
  for(const phase of ['learn','apply','encore']){
   const legacy=old({phase:'listen',resume:phase,...(phase==='apply'?{selected:lesson.answers[1],checked:true}:{})});
   let s=act(roundTrip(legacy),{type:'song-start',id:lesson.id});
   assert.deepEqual(songProgress(s),{...songProgress(legacy),learningVersion:1});
   s=advance(roundTrip(s));assert.equal(songProgress(s).phase,phase);assert.equal(songProgress(s).resume,null);
   assert.equal(songProgress(s).selected,songProgress(legacy).selected);assert.equal(songProgress(s).checked,songProgress(legacy).checked);
  }
 });

 test(`${lesson.id}: previous and restart remove legacy pending state without removing completion`,()=>{
  const checked=old({phase:'gap',selected:lesson.answers[0],checked:true,completed:true});
  let s=act(checked,{type:'song-start',id:lesson.id});
  for(const learning of [false,true]){
   const at=learning?advance(s):s;
   const back=act(at,{type:'song-previous'});
   assert.equal(songProgress(back).phase,learning?'listen':'learn');
   assert.equal(songProgress(back).learningPending,undefined);assert.equal(songProgress(back).completed,true);
   assert.equal(songProgress(back).checked,false);assert.equal(songProgress(back).selected,null);
   roundTrip(back);
   for(const replay of [false,true]){
    const before=replay?act(at,{type:'song-replay'}):at;
    const restarted=act(roundTrip(before),{type:'song-start',id:lesson.id,restart:true});
    assert.deepEqual(songProgress(restarted),{...freshSong(lesson.revision,lesson.id),started:true,completed:true});
   }
  }
 });

 test(`${lesson.id}: previous follows the new learning order and replay preserves completion records`,()=>{
  let s=advance(start(lesson));assert.equal(songProgress(s).phase,'learn');
  s=advance(s);assert.equal(songProgress(s).phase,'gap');
  s=act(s,{type:'song-select',id:'0'});s=act(s,{type:'song-previous'});assert.equal(songProgress(s).phase,'learn');assert.equal(songProgress(s).selected,null);
  s=act(s,{type:'song-previous'});assert.equal(songProgress(s).phase,'listen');
  const done=old({phase:'done',completed:true});
  done.studyTools={[lesson.direction]:{lessons:{[`${lesson.direction}:song:${lesson.id}`]:{completedOn:'2026-10-21'}}}};
  s=act(roundTrip(done),{type:'song-start',id:lesson.id});assert.equal(songProgress(s).phase,'listen');assert.equal(songProgress(s).completed,true);assert.equal(songProgress(s).learningVersion,1);assert.deepEqual(s.studyTools,done.studyTools);
  const completedGap=old({phase:'gap',selected:1,completed:true});
  completedGap.studyTools=done.studyTools;
  s=act(roundTrip(completedGap),{type:'song-start',id:lesson.id});
  assert.deepEqual(songProgress(s),{...songProgress(completedGap),learningVersion:1,phase:'learn',selected:null});
  assert.deepEqual(s.studyTools,done.studyTools);
 });
}

test('legacy learning markers are limited to outstanding 2-15 gap or learning pages',()=>{
 for(const lesson of songLessons){
  const make=p=>({...stateFor(lesson),songActive:lesson.id,songs:{[lesson.id]:{...freshSong(lesson.revision,lesson.id),started:true,...p}}});
  for(const phase of ['gap','learn']){
   const p={phase,selected:phase==='gap'?lesson.answers[0]:null,checked:phase==='gap',learningPending:true};
   assert.equal(validSongs(make(p)),Boolean(lesson.number===15||lesson.learnFirst));
   assert.equal(validSongs(make({...p,phase:'listen',resume:phase})),Boolean(lesson.number===15||lesson.learnFirst));
  }
  for(const p of [
   {phase:'learn',learningPending:false},{phase:'learn',learningPending:true,learningVersion:undefined},
   {phase:'gap',learningPending:true},{phase:'listen',learningPending:true},
   {phase:'apply',learningPending:true},{phase:'encore',learningPending:true},{phase:'done',completed:true,learningPending:true},
  ])assert.equal(validSongs(make(p)),false);
 }
});
