import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
import {load,valid} from '../src/storage.js';
import {freshSong,reduceSong,resumeSongLesson,songLessons,songProgress,songsForCourse,validSongs} from '../src/song-state.js';

const previewFor=s=>songLessons.filter(l=>l.level===s.onboardingLevel&&l.direction===s.courseDirection);
const stateFor=lesson=>({...freshState(),onboarded:true,onboardingLevel:2,courseDirection:lesson.direction});
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
 s=advance(choose(s,lesson.answers[0]));
 s=advance(s);
 s=advance(choose(s,lesson.answers[1]));
 return advance(s);
};

for(const lesson of songLessons){
 test(`${lesson.id} requires both correct answers, preserves replay state and completes after encore`,()=>{
  let s=start(lesson);
  assert.equal(songProgress(s).phase,'listen');
  s=advance(s);
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
  assert.equal(songProgress(s).phase,'learn');
  s=advance(s);
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
