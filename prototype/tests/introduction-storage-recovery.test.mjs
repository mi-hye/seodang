import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {freshState,reduce} from '../src/engine.js';import {freshSentence,sentenceProgress} from '../src/sentence-state.js';import {load,valid,STORAGE_KEY} from '../src/storage.js';import {prepareContent,caseTasks} from '../src/practice-content.js';
const legacy=()=>({...freshState(),onboarded:true,onboardingLevel:2,sentenceActive:3,sentenceLessons:{3:{...freshSentence(),started:true,phase:'solve',index:2,selected:'3'}},practices:{'ko-ja:sentence:3':{version:1,caseVersion:1,round:0,mode:0,index:1,count:6,action:{type:'sentence-submit'}}}});
const memory=state=>{const data=new Map([[STORAGE_KEY,JSON.stringify(state)]]);return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('known iPhone dev-navigation record is recovered with original backup and practice position intact',()=>{
 const original=legacy(),storage=memory(original),raw=storage.getItem(STORAGE_KEY),result=load(storage);
 assert.equal(result.blocked,false);assert.ok(valid(result.state));assert.equal(result.state.onboarded,true);
 assert.ok(valid(JSON.parse(storage.getItem(STORAGE_KEY))));assert.equal(storage.getItem(STORAGE_KEY+'.backup.introduction-v2'),raw);
 assert.deepEqual(result.state.episode,original.episode);assert.equal(result.state.practices['ko-ja:sentence:3'].index,1);
 assert.equal(result.state.practices['ko-ja:sentence:3'].action.type,'sentence-check');
 const completed=reduce(result.state,{type:'sentence-check'});assert.equal(sentenceProgress(completed).phase,'summary');
 storage.setItem(STORAGE_KEY,JSON.stringify(result.state));assert.equal(load(storage).blocked,false);assert.equal(storage.getItem(STORAGE_KEY+'.backup.introduction-v2'),raw);
});
test('unknown damage is not silently reset or treated as the known legacy defect',()=>{
 for(const mutation of [s=>s.sentenceLessons[3].selected='99',s=>s.settings.textScale=99]){
  const state=legacy();mutation(state);const storage=memory(state),raw=storage.getItem(STORAGE_KEY);assert.equal(load(storage).blocked,true);assert.equal(storage.getItem(STORAGE_KEY),raw);assert.equal(storage.getItem(STORAGE_KEY+'.backup.introduction-v2'),null);
 }
});
test('development next/back covers every introduction screen and only writes reloadable progress',async()=>{
 const path=new URL('../src/dev-lesson-tools.js',import.meta.url);let source=await readFile(path,'utf8');source=source.replace("import {developmentMode} from './build-config.js';",'const developmentMode=true;').replace(/from '(\.\/[^']+)'/g,(_,file)=>`from '${new URL(file,path).href}'`);
 const {seekDevLesson,devLessonPosition}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 await prepareContent('sentence');
 for(const id of [0,1,2,3]){
  let s=reduce({...freshState(),onboarded:true,onboardingLevel:2},{type:'sentence-start',id});const position=devLessonPosition(s,'sentence');
  assert.equal(position.count,caseTasks(s,'sentence').length);
  if(id===3){assert.deepEqual(position.pages.filter(p=>p.phase==='learn').map(p=>p.index),[0,1,2,3,4,5]);assert.ok(!position.pages.some(p=>p.phase==='solve'));assert.equal(position.total,19);}
  for(let index=1;index<position.total;index++){s=seekDevLesson(s,'sentence',1);assert.ok(valid(s),`${id}:${index}`);assert.equal(load(memory(s)).blocked,false);assert.equal(devLessonPosition(s,'sentence').index,index);}
  const pending=s.practices[`ko-ja:sentence:${id}`];const finished=reduce(s,pending.action);assert.equal(sentenceProgress(finished).phase,'summary');
  for(let index=position.total-2;index>=0;index--){s=seekDevLesson(s,'sentence',-1);assert.ok(valid(s));assert.equal(devLessonPosition(s,'sentence').index,index);}
 }
});
