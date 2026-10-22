// Daily mission: one short sentence per course direction, tied to a completed lesson that has a task.
// The sentence only reaches the community composer when the learner inserts it there.
import {studyDay} from './study-state.js';

export const MISSION_MAX_LENGTH=300;
const STATUSES=['draft','ready','shared'];
const object=x=>Boolean(x&&typeof x==='object'&&!Array.isArray(x));
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&studyDay(new Date(`${x}T12:00:00`))===x;

export function validMissions(m){
 if(m===undefined)return true;
 return object(m)&&m.version===1&&object(m.items)&&Object.entries(m.items).every(([direction,x])=>['ko-ja','ja-ko'].includes(direction)&&object(x)&&
  typeof x.lessonKey==='string'&&x.lessonKey.startsWith(direction+':')&&x.lessonKey.length<160&&date(x.lessonOn)&&
  typeof x.text==='string'&&x.text.length<=MISSION_MAX_LENGTH&&STATUSES.includes(x.status)&&(x.status==='draft'||x.text.trim())&&date(x.updatedOn));
}

// Latest completion by date, then by recorded time; same-day records without a time keep their stored order.
export function latestCompletion(s,eligible=()=>true,direction=s.courseDirection){
 let latest=null;
 for(const [key,r] of Object.entries(s.studyTools?.[direction]?.lessons||{})){
  if(!eligible(key))continue;
  const at=r.at??0;
  if(!latest||r.completedOn>latest.on||r.completedOn===latest.on&&at>=latest.at)latest={key,on:r.completedOn,at};
 }
 return latest&&{key:latest.key,on:latest.on};
}

export const storedMission=(s,direction=s.courseDirection)=>s.missions?.items?.[direction]||null;
const unfinished=m=>Boolean(m&&m.status!=='shared'&&m.text.trim());

// An unfinished sentence is never replaced silently; a shared or empty one yields to a newer lesson.
export function currentMission(s,eligible){
 const stored=storedMission(s),latest=latestCompletion(s,eligible);
 if(unfinished(stored))return {...stored,stale:Boolean(latest&&(latest.key!==stored.lessonKey||latest.on!==stored.lessonOn))};
 if(!latest)return null;
 if(stored&&stored.lessonKey===latest.key&&stored.lessonOn===latest.on)return {...stored,stale:false};
 return {lessonKey:latest.key,lessonOn:latest.on,text:'',status:'draft',stale:false};
}

export const missionForCommunity=s=>{const m=storedMission(s);return m?.status==='ready'?{text:m.text,language:s.courseDirection==='ja-ko'?'ko':'ja'}:null;};

function put(s,item,now){
 const items={...s.missions?.items};
 if(item)items[s.courseDirection]={lessonKey:item.lessonKey,lessonOn:item.lessonOn,text:item.text,status:item.status,updatedOn:studyDay(now)};
 else delete items[s.courseDirection];
 return {...s,missions:{version:1,items}};
}

// Draft and save carry the lesson the screen showed, so the reducer never needs lesson content.
function target(s,a){
 const stored=storedMission(s);
 if(typeof a.lessonKey!=='string'||typeof a.lessonOn!=='string')return null;
 // The stored mission stays editable even if its lesson was retaken and the completion date moved.
 if(stored?.lessonKey===a.lessonKey&&stored.lessonOn===a.lessonOn)return stored.status==='draft'?stored:null;
 if(unfinished(stored))return null;
 // A new mission must point at a recorded completion.
 if(s.studyTools?.[s.courseDirection]?.lessons?.[a.lessonKey]?.completedOn!==a.lessonOn)return null;
 return {lessonKey:a.lessonKey,lessonOn:a.lessonOn,text:'',status:'draft'};
}

export function reduceMission(s,a,now=new Date()){
 const stored=storedMission(s);
 if(a.type==='mission-draft'||a.type==='mission-save'){
  const m=target(s,a);if(!m||typeof a.text!=='string')return s;
  if(a.type==='mission-draft')return put(s,{...m,text:a.text.slice(0,MISSION_MAX_LENGTH)},now);
  const value=a.text.trim();
  if(!value||value.length>MISSION_MAX_LENGTH)return s;
  return put(s,{...m,text:value,status:'ready'},now);
 }
 if(a.type==='mission-edit'&&stored?.status==='ready')return put(s,{...stored,status:'draft'},now);
 if(a.type==='mission-shared'&&stored?.status==='ready')return put(s,{...stored,status:'shared'},now);
 // Learners may drop an unfinished sentence to receive the mission for a newer lesson.
 if(a.type==='mission-discard'&&unfinished(stored))return put(s,null,now);
 return s;
}
