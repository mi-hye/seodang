import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';import {freshSentence,sentenceProgress} from '../src/sentence-state.js';import {load,valid,STORAGE_KEY} from '../src/storage.js';
const legacy=()=>({...freshState(),onboarded:true,onboardingLevel:2,sentenceActive:3,sentenceLessons:{3:{...freshSentence(),started:true,phase:'solve',index:2,selected:'3'}},practices:{'ko-ja:sentence:3':{version:1,caseVersion:1,round:0,mode:0,index:1,count:6,action:{type:'sentence-submit'}}}});
const memory=state=>{const data=new Map([[STORAGE_KEY,JSON.stringify(state)]]);return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('known iPhone dev-navigation record is recovered with original backup and practice position intact',()=>{
 const original=legacy(),storage=memory(original),raw=storage.getItem(STORAGE_KEY),result=load(storage);
 assert.equal(result.blocked,false);assert.ok(valid(result.state));assert.equal(result.state.onboarded,true);
 assert.ok(valid(JSON.parse(storage.getItem(STORAGE_KEY))));assert.equal(storage.getItem(STORAGE_KEY+'.backup.introduction-v2'),raw);
 assert.deepEqual(result.state.episode,original.episode);assert.equal(result.state.practices['ko-ja:sentence:3'].index,0);
 assert.equal(result.state.practices['ko-ja:sentence:3'].action.type,'sentence-speak-next');
 const completed=reduce(result.state,{type:'sentence-speak-next'});assert.equal(sentenceProgress(completed).phase,'summary');
 storage.setItem(STORAGE_KEY,JSON.stringify(result.state));assert.equal(load(storage).blocked,false);assert.equal(storage.getItem(STORAGE_KEY+'.backup.introduction-v2'),raw);
});
test('unknown damage is not silently reset or treated as the known legacy defect',()=>{
 for(const mutation of [s=>s.sentenceLessons[3].selected='99',s=>s.settings.textScale=99]){
  const state=legacy();mutation(state);const storage=memory(state),raw=storage.getItem(STORAGE_KEY);assert.equal(load(storage).blocked,true);assert.equal(storage.getItem(STORAGE_KEY),raw);assert.equal(storage.getItem(STORAGE_KEY+'.backup.introduction-v2'),null);
 }
});
