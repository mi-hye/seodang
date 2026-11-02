import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnalytics} from '../src/analytics-core.js';
import {createLearningTracker,learningSnapshot} from '../src/analytics-learning.js';
import {videoLessons,reduceVideo} from '../src/video-lesson-state.js';
import {songLessons,reduceSong} from '../src/song-state.js';
import {freshState,reduce} from '../src/engine.js';

// Exercise the actual capture filter and its serialized transport, without HTTP.
function fixture(kind,lesson,{consent=true}={}){
 const saved=new Map(),sent=[];
 let elapsed=0,sequence=0;
 const uuid=()=>`00000000-0000-4000-8000-${String(++sequence).padStart(12,'0')}`;
 const analytics=createAnalytics({
  storage:{getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)},
  uuid,now:()=>Date.parse('2026-11-02T00:00:00Z')+elapsed,
  environment:'development',platform:'ios',appVersion:'test',
  send:async batch=>{sent.push(...JSON.parse(JSON.stringify(batch)));return {ok:true};}
 });
 if(consent!==null)analytics.setConsent(consent);
 const tracker=createLearningTracker(analytics,uuid,()=>elapsed);
 let state={courseDirection:lesson.direction,onboardingLevel:lesson.level,[`${kind}Active`]:lesson.id};
 // Song previews are tested through their real reducer's explicit catalog input;
 // production availability and global catalog objects remain unchanged.
 const reduce=(current,action)=>kind==='video'?reduceVideo(current,action):reduceSong(current,action,[lesson]);
 const snapshot=()=>learningSnapshot(state,kind);
 const act=(type,id,extra={})=>{
  const before=snapshot(),action={type,id,...extra};
  state=reduce(state,action);
  tracker.transition(before,snapshot(),action);
 };
 function enter(){state=reduce(state,{type:`${kind}-start`,id:lesson.id});tracker.enter(snapshot());}
 function finish(){
  let steps=0;
  while(!snapshot().done&&steps++<50){
   const current=snapshot();
   if(['meaning','use','infer','clue','gap','apply'].includes(current.phase)){
    const answerIndex=kind==='song'?(current.phase==='gap'?0:1):current.item_index*2+(['meaning','infer'].includes(current.phase)?0:1);
    const answer=lesson.answers[answerIndex];
    assert.ok(Number.isInteger(answer),`${lesson.id}: answer for ${current.phase}`);
    act(`${kind}-select`,(answer+1)%3);act(`${kind}-check`);
    act(`${kind}-select`,answer);act(`${kind}-check`);
   }
   elapsed+=100;act(`${kind}-next`);
  }
  assert.equal(snapshot().done,true,`${lesson.id}: reducer reached completion`);
 }
 async function drain(){
  let batches=0;
  while(analytics.pending&&batches++<100)await analytics.flush();
  assert.equal(analytics.pending,0,'all queued batches flushed');
  return sent.filter(event=>event.event!=='analytics_enabled');
 }
 return {analytics,tracker,sent,snapshot,act,enter,finish,drain,advance:ms=>elapsed+=ms};
}

for(const [kind,lessons] of [['video',videoLessons],['song',songLessons]]){
 test(`every registered ${kind} ID survives snapshots, capture and serialized flush`,async()=>{
  assert.deepEqual(new Set(lessons.map(lesson=>lesson.direction)),new Set(['ko-ja','ja-ko']));
  for(const lesson of lessons){
   const f=fixture(kind,lesson);f.enter();f.advance(1000);f.tracker.tick();f.tracker.leave();
   const events=await f.drain(),key=`${lesson.direction}:${kind}:${lesson.id}`;
   assert.deepEqual(events.map(event=>event.event),['lesson_started','step_time','lesson_exited'],key);
   const attempt=events[0].properties.attempt_id;
   for(const event of events){
    assert.equal(event.properties.lesson_id,key,key);
    assert.equal(event.properties.course_direction,lesson.direction,key);
    assert.equal(event.properties.phase,kind==='video'?'watch':'listen',key);
    assert.equal(event.properties.attempt_id,attempt,key);
    assert.equal(event.distinct_id,events[0].distinct_id,key);
   }
   assert.equal(events.at(-1).properties.exit_reason,'navigation');
  }
 });
}

const lifecycles=[
 ['video','scene',videoLessons.find(lesson=>lesson.mode==='scene'&&lesson.count>1),['watch','meaning','learn','use','done']],
 ['video','detective',videoLessons.find(lesson=>lesson.mode==='detective'),['watch','infer','clue','learn','done']],
 ['video','basic',videoLessons.find(lesson=>!lesson.mode&&lesson.count>1),['watch','learn','done']],
 ['song','normal',songLessons.find(lesson=>lesson.number!==15&&!lesson.learnFirst),['listen','gap','learn','apply','encore','done']],
 ['song','learn-first',songLessons.find(lesson=>lesson.number===15||lesson.learnFirst),['listen','learn','gap','apply','encore','done']]
];
for(const [kind,mode,lesson,phases] of lifecycles){
 test(`${kind} ${mode}: complete transport keeps phases, answers, timing and playback joined to its start`,async()=>{
  assert.ok(lesson,`${mode} catalog fixture exists`);
  const f=fixture(kind,lesson);f.enter();
  const audio=f.tracker.audio('file');audio('started');
  f.advance(1200);f.tracker.visibility(false);
  f.advance(150000);f.tracker.visibility(true);
  f.advance(66000);f.tracker.tick();
  f.finish();audio('completed');f.act(`${kind}-next`);f.tracker.leave();
  const events=await f.drain(),starts=events.filter(event=>event.event==='lesson_started');
  assert.equal(starts.length,1);
  assert.equal(events.filter(event=>event.event==='lesson_completed').length,1);
  assert.equal(events.filter(event=>event.event==='lesson_exited').length,0);
  const observedPhases=[...new Set(events.filter(event=>['lesson_started','learning_progress'].includes(event.event)).map(event=>event.properties.phase))];
  assert.deepEqual(observedPhases,phases);
  for(const event of events){
   assert.equal(event.properties.lesson_id,`${lesson.direction}:${kind}:${lesson.id}`);
   assert.equal(event.properties.attempt_id,starts[0].properties.attempt_id);
   assert.equal(event.distinct_id,starts[0].distinct_id);
   assert.equal(event.properties.client,'seodang-capacitor');
   assert.equal(event.properties.environment,'development');
   for(const privateKey of ['_selected','_attempts','_retry','_checked','position','done','practice','answers','lyrics','target'])assert.equal(event.properties[privateKey],undefined);
  }
  const durations=events.filter(event=>event.event==='step_time').map(event=>event.properties.active_ms);
  assert.deepEqual(durations.slice(0,2),[1200,60000],'background excluded and idle capped at 60 seconds');
  assert.ok(durations.every(duration=>duration>0&&duration<=60000));
  const answers=events.filter(event=>event.event==='answer_checked').map(event=>event.properties.correct);
  const questionCount=kind==='song'?2:lesson.mode?lesson.count*2:0;
  assert.deepEqual(answers,Array.from({length:questionCount},()=>[false,true]).flat());
  const playback=events.filter(event=>event.event==='audio_playback');
  assert.deepEqual(playback.map(event=>event.properties.audio_result),['started','completed']);
  assert.equal(playback[0].properties.playback_id,playback[1].properties.playback_id);
  assert.equal(playback[0].properties.audio_source,'file');
 });
}

test('media allowlist rejects unknown IDs, swapped directions and private text',async()=>{
 const f=fixture('video',videoLessons[0]);
 for(const [kind,lesson] of [['video',videoLessons[0]],['song',songLessons[0]]]){
  const opposite=lesson.direction==='ko-ja'?'ja-ko':'ko-ja';
  for(const id of [`${lesson.direction}:${kind}:unknown-private-answer`,`${opposite}:${kind}:${lesson.id}`,`${lesson.direction}:${kind}:${lesson.id}:extra`,`${lesson.direction}:${kind}:undefined`]){
   f.analytics.capture('learning_progress',{lesson_id:id,phase:'private answer',lyrics:'private lyrics',answer:'private answer',transcript:'private transcript',name:'private name'});
  }
 }
 const events=await f.drain();assert.equal(events.length,8);
 for(const event of events)for(const key of ['lesson_id','phase','lyrics','answer','transcript','name'])assert.equal(event.properties[key],undefined);
 assert.equal(JSON.stringify(events).includes('private'),false);
});

test('media learning without consent never creates an installation ID or sends data',async()=>{
 for(const consent of [null,false])for(const [kind,lesson] of [['video',videoLessons[0]],['song',songLessons[0]]]){
  const f=fixture(kind,lesson,{consent});f.enter();f.advance(2000);f.tracker.tick();f.finish();f.tracker.leave();await f.drain();
  assert.deepEqual(f.sent,[]);assert.equal(f.analytics.installationId,null);
 }
});

test('a course without a video produces no fabricated video snapshot or event',async()=>{
 const f=fixture('video',videoLessons[0]);
 const snapshot=learningSnapshot({courseDirection:'ko-ja',onboardingLevel:0},'video');
 assert.equal(snapshot,null);f.tracker.enter(snapshot);f.advance(1000);f.tracker.leave();
 assert.deepEqual(await f.drain(),[]);
});

test('full action objects keep non-media answer tracking working through the app commit path',async()=>{
 const f=fixture('video',videoLessons[0]);
 let state=reduce({...freshState(),listening:{completed:true}},{type:'basic-start',id:6});
 f.tracker.enter(learningSnapshot(state,'basic'));
 for(const action of [{type:'basic-next'},{type:'basic-next'},{type:'basic-check'},{type:'basic-select',id:1},{type:'basic-check'},{type:'basic-select',id:0},{type:'basic-check'}]){
  const before=learningSnapshot(state,'basic');state=reduce(state,action);
  f.tracker.transition(before,learningSnapshot(state,'basic'),action);
 }
 const events=await f.drain(),start=events.find(event=>event.event==='lesson_started');
 assert.deepEqual(events.filter(event=>event.event==='answer_checked').map(event=>event.properties.correct),[false,true]);
 for(const event of events){
  assert.equal(event.properties.lesson_id,'ko-ja:basic:6');
  assert.equal(event.properties.attempt_id,start.properties.attempt_id);
 }
});

for(const [kind,lesson] of [['video',videoLessons[0]],['song',songLessons[0]]]){
 test(`${kind}: in-place completed and unfinished restarts create independent attempts`,async()=>{
  const f=fixture(kind,lesson);f.enter();f.finish();
  f.act(`${kind}-start`,undefined,{restart:true});f.advance(500);f.tracker.tick();
  f.act(`${kind}-next`);
  f.act(`${kind}-start`,undefined,{restart:true});f.finish();
  const events=await f.drain(),starts=events.filter(event=>event.event==='lesson_started');
  assert.equal(starts.length,3);
  assert.equal(new Set(starts.map(event=>event.properties.attempt_id)).size,3);
  const completions=events.filter(event=>event.event==='lesson_completed');
  assert.deepEqual(completions.map(event=>event.properties.attempt_id),[starts[0],starts[2]].map(event=>event.properties.attempt_id));
  const exits=events.filter(event=>event.event==='lesson_exited');
  assert.equal(exits.length,1);assert.equal(exits[0].properties.exit_reason,'restart');
  assert.equal(exits[0].properties.attempt_id,starts[1].properties.attempt_id);
  for(const event of events)assert.equal(event.properties.lesson_id,starts[0].properties.lesson_id);
 });
 test(`${kind}: ordinary start waits for navigation and does not duplicate its attempt`,async()=>{
  const f=fixture(kind,lesson);
  f.act(`${kind}-start`,lesson.id);f.tracker.enter(f.snapshot());
  const events=await f.drain();assert.deepEqual(events.map(event=>event.event),['lesson_started']);
 });
}
