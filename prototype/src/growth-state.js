// Growth answers: the learner's own text for one fixed situation per course level.
// No scores are derived; only the text, the date and the completed-lesson count at that time.
import {courseGroup} from './curriculum.js';
import {selectedLevel} from './kana-state.js';
import {studyDay} from './study-state.js';

export const GROWTH_MAX_LENGTH=600;
const MAX_ANSWERS=12;
const object=x=>Boolean(x&&typeof x==='object'&&!Array.isArray(x));
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&studyDay(new Date(`${x}T12:00:00`))===x;
const text=x=>typeof x==='string'&&x.length<=GROWTH_MAX_LENGTH;

export const growthKey=s=>`${s.courseDirection}:${courseGroup(selectedLevel(s))}`;
export const growthEntry=(s,key=growthKey(s))=>s.growth?.entries?.[key]||{answers:[]};

export function validGrowth(g){
 if(g===undefined)return true;
 return object(g)&&g.version===1&&object(g.entries)&&Object.entries(g.entries).every(([key,e])=>/^(ko-ja|ja-ko):(0|2|4|5|7)$/.test(key)&&object(e)&&Array.isArray(e.answers)&&e.answers.length<=MAX_ANSWERS&&
  e.answers.every(a=>object(a)&&text(a.text)&&a.text.trim()&&date(a.on)&&Number.isInteger(a.completed)&&a.completed>=0)&&
  (e.draft===undefined||object(e.draft)&&text(e.draft.text)&&date(e.draft.on)));
}

function withEntry(s,key,entry){
 const entries={...s.growth?.entries,[key]:entry};
 if(!entry.answers.length&&!entry.draft)delete entries[key];
 return {...s,growth:{version:1,entries}};
}

export function reduceGrowth(s,a,now=new Date()){
 const key=growthKey(s),entry=growthEntry(s,key);
 if(a.type==='growth-draft'){
  if(typeof a.text!=='string')return s;
  const value=a.text.slice(0,GROWTH_MAX_LENGTH);
  if(!value.trim()){if(!entry.draft)return s;const {draft,...rest}=entry;return withEntry(s,key,rest);}
  return withEntry(s,key,{...entry,draft:{text:value,on:studyDay(now)}});
 }
 if(a.type==='growth-save'){
  const value=typeof a.text==='string'?a.text.trim():'';
  if(!value||value.length>GROWTH_MAX_LENGTH||!Number.isInteger(a.completed)||a.completed<0)return s;
  const answers=[...entry.answers,{text:value,on:studyDay(now),completed:a.completed}];
  // Keep the first answer forever; trim the oldest later answers.
  const kept=answers.length>MAX_ANSWERS?[answers[0],...answers.slice(-(MAX_ANSWERS-1))]:answers;
  const {draft,...rest}=entry;
  return withEntry(s,key,{...rest,answers:kept});
 }
 return s;
}
