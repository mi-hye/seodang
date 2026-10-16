import {displayLevel} from './curriculum.js';
// Pure snapshots keep analytics independent of large lesson/content modules.
export function learningSnapshot(s,kind){
 if(!['kana','basic','korean','sentence','reading','dialogue','labels','listening','play'].includes(kind))return null;
 const id=kind==='basic'?s.basics?.active:kind==='korean'?s.korean?.active:kind==='kana'?s.kana?.active:kind==='reading'?s.onboardingLevel:kind==='sentence'?(s.sentenceActive??0):0;
 const key=`${s.courseDirection}:${kind}:${id}`;
 const p=kind==='basic'?s.basics?.lessons?.[id]:kind==='korean'?s.korean?.lessons?.[id]:kind==='kana'?s.kana?.lessons?.[id]:kind==='reading'?s.readings?.[id]:kind==='sentence'?(id?s.sentenceLessons?.[id]:s.sentence):s[kind==='play'?'episode':kind];
 if(!p)return null;
 const practice=s.practices?.[key],phase=practice?'practice':p.phase||p.step;
 return {lesson_id:key,course_direction:s.courseDirection,level:displayLevel(s.onboardingLevel??0),phase,done:!practice&&(['done','summary'].includes(phase)||(kind==='listening'&&p.index===4)),position:JSON.stringify(practice?[practice.round,practice.mode,practice.index]:[phase,p.index??p.lesson??0,p.solved?.length??0]),practice:Boolean(practice)};
}
export function createLearningTracker(analytics,uuid=()=>crypto.randomUUID()){
 let active=null;
 function enter(snapshot){
  if(!snapshot){active=null;return;}
  let id;try{id=uuid();}catch{return;}
  active={key:snapshot.lesson_id,id,finished:false};
  if(!snapshot.done)analytics.capture('lesson_started',{...snapshot,attempt_id:id});
 }
 function transition(before,after,action=''){
  if(!before||!after||before.lesson_id!==after.lesson_id||/start|restart/.test(action))return;
  if(!active||active.key!==after.lesson_id)enter(before);
  if(!active||before.done||active.finished)return;
  if(before.position!==after.position){
   analytics.capture('learning_progress',{...after,attempt_id:active.id});
   if(after.done){analytics.capture('lesson_completed',{...after,attempt_id:active.id});active.finished=true;}
  }
 }
 return {enter,transition};
}
