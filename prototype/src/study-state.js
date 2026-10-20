// Review dates belong to whole lessons; old expression-review data remains readable.
export const studyDay=(now=new Date())=>`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
export const REVIEW_INTERVAL_DAYS=3;
export const studyData=s=>s.studyTools?.[s.courseDirection]||{};
const object=x=>Boolean(x&&typeof x==='object'&&!Array.isArray(x));
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&studyDay(new Date(`${x}T12:00:00`))===x;
export function validStudy(data){
 if(data===undefined)return true;
 return object(data)&&Object.entries(data).every(([direction,d])=>['ko-ja','ja-ko'].includes(direction)&&object(d)&&(d.lessons===undefined||object(d.lessons)&&Object.entries(d.lessons).every(([key,r])=>key.startsWith(direction+':')&&key.length<160&&object(r)&&date(r.completedOn))));
}
export function recordStudyCompletion(s,before,after,now=new Date()){
 if(!before||!after||before.lesson_id!==after.lesson_id||before.done||!after.done)return s;
 const direction=after.course_direction,d=s.studyTools?.[direction]||{};
 return {...s,studyTools:{...s.studyTools,[direction]:{...d,lessons:{...d.lessons,[after.lesson_id]:{completedOn:studyDay(now)}}}}};
}
export function reviewDueOn(completedOn){
 if(!date(completedOn))return null;
 const day=new Date(`${completedOn}T12:00:00`);day.setDate(day.getDate()+REVIEW_INTERVAL_DAYS);return studyDay(day);
}
export function scheduledReviews(s,lessons,now=new Date()){
 const today=studyDay(now),dates=studyData(s).lessons||{};
 return lessons.filter(l=>l.completed).map(l=>{const completedOn=dates[l.key]?.completedOn||null,dueOn=reviewDueOn(completedOn);return {...l,completedOn,dueOn,due:!dueOn||dueOn<=today};}).sort((a,b)=>(a.dueOn||'').localeCompare(b.dueOn||'')||a.position.localeCompare(b.position,undefined,{numeric:true}));
}
