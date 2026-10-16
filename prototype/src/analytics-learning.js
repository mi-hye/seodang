import {displayLevel} from './curriculum.js';
// Pure snapshots keep analytics independent of large lesson/content modules.
export function learningSnapshot(s,kind){
 if(!['kana','basic','korean','sentence','reading','dialogue','labels','listening','play'].includes(kind))return null;
 const id=kind==='basic'?s.basics?.active:kind==='korean'?s.korean?.active:kind==='kana'?s.kana?.active:kind==='reading'?s.onboardingLevel:kind==='sentence'?(s.sentenceActive??0):0;
 const key=`${s.courseDirection}:${kind}:${id}`;
 const p=kind==='basic'?s.basics?.lessons?.[id]:kind==='korean'?s.korean?.lessons?.[id]:kind==='kana'?s.kana?.lessons?.[id]:kind==='reading'?s.readings?.[id]:kind==='sentence'?(id?s.sentenceLessons?.[id]:s.sentence):s[kind==='play'?'episode':kind];
 if(!p)return null;
 const practice=s.practices?.[key],phase=practice?'practice':p.phase||p.step||(kind==='listening'?'listen':undefined);
 return {lesson_id:key,course_direction:s.courseDirection,level:displayLevel(s.onboardingLevel??0),phase,item_index:practice?practice.index:p.index??p.lesson??0,round_index:practice?.round??0,mode_index:practice?.mode??0,match_count:p.matches?.length??0,_selected:p.selected!==null&&p.selected!==undefined,_attempts:(p.attempts??0)+(p.transferAttempts??0),_retry:Boolean(p.retry||p.feedback),_checked:Boolean(p.checked||p.answered),_tiles:p.tiles?.filter(x=>x!==null).length??0,done:!practice&&(['done','summary'].includes(phase)||(kind==='listening'&&p.index===4)),position:JSON.stringify(practice?[practice.round,practice.mode,practice.index]:[phase,p.index??p.lesson??0,p.solved?.length??p.matches?.length??0]),practice:Boolean(practice)};
}
// Only booleans and numeric positions leave the reducer; no answers or feedback text.
export function checkedAnswer(before,after,action=''){
 if(!before||!after||before.practice||before.done)return null;
 if(after._attempts>before._attempts)return !after._retry;
 const checks={'basic-check':'quiz','korean-check':'quiz','reading-check':'read','dialogue-check':'practice'};
 if(checks[action]===before.phase&&before._selected)return !after._retry;
 if(action==='listening-answer'&&before.phase==='listen')return after.item_index>before.item_index;
 if(action==='labels-check'&&before.phase==='build'&&before._tiles===2)return !after._retry;
 if(['kana-match','labels-match'].includes(action)&&['quiz','match'].includes(before.phase)&&!before._checked)return after.match_count>before.match_count;
 return null;
}
export function createLearningTracker(analytics,uuid=()=>crypto.randomUUID(),now=()=>performance.now()){
 let active=null,visible=true,last=now(),engaged=last;
 function tick(){
  if(analytics.consent===false||analytics.consent===null||active&&active.installation!==analytics.installationId)active=null;
  const time=now();
  if(active&&!active.finished&&visible){
   const ms=Math.round(Math.max(0,Math.min(time,engaged+60000)-last));
   if(ms)analytics.capture('step_time',{...active.snapshot,attempt_id:active.id,active_ms:Math.min(ms,60000)});
  }
  last=time;
 }
 function activity(){tick();engaged=now();}
 function visibility(value){tick();visible=value;last=now();if(value)engaged=last;}
 function leave(reason='navigation'){
  tick();if(active&&!active.finished)analytics.capture('lesson_exited',{...active.snapshot,attempt_id:active.id,exit_reason:reason});active=null;
 }
 function enter(snapshot){
  leave();if(!snapshot||snapshot.done||analytics.consent===false||analytics.consent===null)return;
  let id;try{id=uuid();}catch{return;}
  active={key:snapshot.lesson_id,id,finished:false,snapshot,installation:analytics.installationId};last=engaged=now();
  analytics.capture('lesson_started',{...snapshot,attempt_id:id});
 }
 function answer(correct){if(active&&!active.finished&&typeof correct==='boolean')analytics.capture('answer_checked',{...active.snapshot,attempt_id:active.id,correct});}
 function transition(before,after,action='',judged=after){
  if(!before||!after||before.lesson_id!==after.lesson_id)return;
  if(['restart','kana-restart','labels-restart','sentence-restart'].includes(action)){leave('restart');return;}
  if(/(?:^|-)start$/.test(action))return;
  if(!active||active.key!==after.lesson_id||active.installation!==analytics.installationId)enter(before);
  if(!active||before.done||active.finished)return;
  const result=checkedAnswer(before,judged,action);if(result!==null)answer(result);
  if(before.position!==after.position){
   tick();if(!active)return;active.snapshot=after;engaged=now();
   analytics.capture('learning_progress',{...after,attempt_id:active.id});
   if(after.done){analytics.capture('lesson_completed',{...after,attempt_id:active.id});active.finished=true;}
  }else active.snapshot=after;
 }
 // Capture context at playback start so delayed failures cannot attach to another lesson.
 function audio(source){
  if(!active||active.finished)return ()=>{};
  const context={...active.snapshot,attempt_id:active.id,audio_source:source,playback_id:uuid()};
  return result=>analytics.capture('audio_playback',{...context,audio_result:result});
 }
 return {enter,transition,answer,audio,tick,activity,visibility,leave};
}
