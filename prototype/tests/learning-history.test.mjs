import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {freshKana} from '../src/kana-state.js';
import {freshSentence} from '../src/sentence-state.js';
import {valid,load,save,STORAGE_KEY} from '../src/storage.js';
import {completedCases,validHistory,localDateKey} from '../src/learning-history.js';
import {activityMonth} from '../src/records.js';
const now=new Date(2026,9,13,12);
test('old completions stay undated and survive replay, save and load',()=>{
 const old=freshState();old.episode.step='summary';
 const next=reduce(old,{type:'restart'},now);
 assert.deepEqual(completedCases(next),['cafe']);assert.deepEqual(next.history.days,{});assert.equal(old.history,undefined);
 const storage={value:null,setItem(k,v){this.value=v},getItem(){return this.value}};save(storage,next);assert.deepEqual(completedCases(load(storage).state),['cafe']);
});
test('calendar tracks actual learned steps across levels and dates, never views or blocked advances',()=>{
 let s=freshState();s=reduce(s,{type:'start'},now);s=reduce(s,{type:'next'},now);assert.deepEqual(s.history.days,{});
 s=reduce(s,{type:'next'},now);assert.equal(s.history.days['2026-10-13'].expressions,1);
 s.kana=freshKana();s=reduce(s,{type:'kana-start'},now);s=reduce(s,{type:'kana-next'},now);s=reduce(s,{type:'kana-help'},now);s=reduce(s,{type:'kana-next'},now);assert.equal(s.history.days['2026-10-13'].letters,1);
 s.sentence={...freshSentence(),started:true,phase:'arrange',checked:false};s=reduce(s,{type:'sentence-next'},now);assert.equal(s.history.days['2026-10-13'].sentences,0);
 s.sentence.checked=true;s=reduce(s,{type:'sentence-next'},new Date(2026,9,14,0,1));assert.equal(s.sentence.phase,'speak');s=reduce(s,{type:'sentence-speak-next'},new Date(2026,9,14,0,1));assert.equal(s.history.days['2026-10-14'].sentences,1);assert.equal(valid(s),true);
 assert.equal(activityMonth(s.history,now).activeDays,2);
});
test('completion is counted once; invalid history does not overwrite saved data',()=>{
 let s=freshState();s.episode.step='transfer';s.episode.transfer='passed';s=reduce(s,{type:'next'},now);s=reduce(s,{type:'next'},now);assert.equal(s.history.days['2026-10-13'].cases,1);
 s=reduce(s,{type:'restart'},now);assert.deepEqual(completedCases(s),['cafe']);
 s.history.days['2026-02-31']={letters:1,expressions:0,sentences:0,cases:0};assert.equal(validHistory(s.history),false);
 const raw=JSON.stringify(s),storage={getItem:()=>raw};assert.equal(load(storage).blocked,true);assert.equal(storage.getItem(STORAGE_KEY),raw);
 assert.equal(localDateKey(new Date(2026,0,1,0,1)),'2026-01-01');assert.equal(activityMonth(undefined,new Date(2024,1,1)).days.length,29);
});
