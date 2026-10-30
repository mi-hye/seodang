// Keep validating saved writing from the retired growth screen so existing
// learner data remains readable even though the app no longer creates it.
import {studyDay} from './study-state.js';

const GROWTH_MAX_LENGTH=600;
const MAX_ANSWERS=12;
const object=x=>Boolean(x&&typeof x==='object'&&!Array.isArray(x));
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&studyDay(new Date(`${x}T12:00:00`))===x;
const text=x=>typeof x==='string'&&x.length<=GROWTH_MAX_LENGTH;

export function validGrowth(g){
 if(g===undefined)return true;
 return object(g)&&g.version===1&&object(g.entries)&&Object.entries(g.entries).every(([key,e])=>/^(?:(ko-ja|ja-ko):(0|2|4|5|7)|ja-ko:8)$/.test(key)&&object(e)&&Array.isArray(e.answers)&&e.answers.length<=MAX_ANSWERS&&
  e.answers.every(a=>object(a)&&text(a.text)&&a.text.trim()&&date(a.on)&&Number.isInteger(a.completed)&&a.completed>=0)&&
  (e.draft===undefined||object(e.draft)&&text(e.draft.text)&&date(e.draft.on)));
}
