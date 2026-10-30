// Saved missions from the retired writing screen remain readable. A ready
// sentence still reaches the community composer when the learner inserts it.
import {studyDay} from './study-state.js';

const MISSION_MAX_LENGTH=300;
const STATUSES=['draft','ready','shared'];
const object=x=>Boolean(x&&typeof x==='object'&&!Array.isArray(x));
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&studyDay(new Date(`${x}T12:00:00`))===x;

export function validMissions(m){
 if(m===undefined)return true;
 return object(m)&&m.version===1&&object(m.items)&&Object.entries(m.items).every(([direction,x])=>['ko-ja','ja-ko'].includes(direction)&&object(x)&&
  typeof x.lessonKey==='string'&&x.lessonKey.startsWith(direction+':')&&x.lessonKey.length<160&&date(x.lessonOn)&&
  typeof x.text==='string'&&x.text.length<=MISSION_MAX_LENGTH&&STATUSES.includes(x.status)&&(x.status==='draft'||x.text.trim())&&date(x.updatedOn));
}

export const storedMission=(s,direction=s.courseDirection)=>s.missions?.items?.[direction]||null;

export const missionForCommunity=s=>{const m=storedMission(s);return m?.status==='ready'?{text:m.text,language:s.courseDirection==='ja-ko'?'ko':'ja'}:null;};

export function reduceMission(s,a,now=new Date()){
 const stored=storedMission(s);
 if(a.type!=='mission-shared'||stored?.status!=='ready')return s;
 return {...s,missions:{version:1,items:{...s.missions.items,[s.courseDirection]:{
  lessonKey:stored.lessonKey,lessonOn:stored.lessonOn,text:stored.text,status:'shared',updatedOn:studyDay(now),
 }}}};
}
