import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {scenarioContent,scenarioAudio,scenarioChoiceAudio,scenarioRoleAudio} from '../src/scenario-content.js';
import {levelTwoReviewData} from '../src/level-two-review-data.js';
import {scenarioRehearsal,isScenarioRehearsal} from '../src/scenario-rehearsal-content.js';
import {levelTwoReview,expandedReviewWords} from '../src/level-two-review-content.js';
import {prepareContent,practiceUnits} from '../src/practice-content.js';

const keys=['ko-ja','ja-ko'].flatMap(direction=>['14','15','16','17'].map(id=>`${direction}:scenario:${id}`));
const catalog=JSON.parse(readFileSync(new URL('../assets/audio/catalog.json',import.meta.url)));
const repairedPrompt=JSON.parse(readFileSync(new URL('../docs/asset-provenance/lost-item-pronunciation-20261023.json',import.meta.url)));

for(const key of keys)test(`rehearsal preserves all three original conversation turns and media: ${key}`,async()=>{
 const [direction,,id]=key.split(':'),source=scenarioContent[direction][id],data=levelTwoReviewData[key];
 const original=JSON.stringify({source,data}),tasks=scenarioRehearsal(key);
 assert.equal(tasks.length,3);
 assert.deepEqual(tasks.map(t=>t.unitIndex),[0,1,2]);
 assert.deepEqual(tasks,levelTwoReview(key));
 assert.deepEqual(tasks,scenarioRehearsal(key),'resuming keeps the same token positions');
 assert.ok(existsSync(new URL(`../${source.image}`,import.meta.url)));
 for(const [index,task]of tasks.entries()){
  const item=source.items[index],unit=data.units[index];
  assert.equal(task.review,true);assert.equal(task.rehearsal,true);
  assert.equal(task.type,'order');assert.equal(task.stage,0);
  assert.equal(task.index,index);assert.equal(task.stageIndex,index);
  assert.equal(task.sceneContent,source);assert.equal(task.item,item);assert.equal(task.unit,unit);
  assert.equal(task.scene,source.scene);assert.equal(task.prompt,item.prompt);
  assert.equal(unit.text,item.answer);assert.equal(unit.meaning,item.answerMeaning);
  assert.deepEqual(task.tokens,[...unit.tokens,unit.distractor]);
  assert.notEqual(task.tokens,unit.tokens);
  assert.equal(task.tokens.slice(0,task.answerLength).join(''),item.answer);
  assert.equal(task.answerLength,unit.tokens.length);
  assert.equal(new Set(task.tokens).size,task.tokens.length);
  assert.deepEqual([...task.tokenOrder].sort((a,b)=>a-b),task.tokens.map((_,i)=>i));
  assert.notDeepEqual(task.tokenOrder,task.tokens.map((_,i)=>i));
  assert.deepEqual(task.promptAudio,scenarioAudio(direction,id,index));
  assert.deepEqual(task.answerAudio,scenarioChoiceAudio(direction,id,index,0));
  assert.deepEqual(task.answerAudio,unit.audio);
  assert.deepEqual(task.replyAudio,item.reply?scenarioRoleAudio(direction,index,'reply',id):null);
  for(const [audio,text]of [[task.promptAudio,item.text],[task.answerAudio,item.answer],...(item.reply?[[task.replyAudio,item.reply]]:[])]){
   assert.equal(audio.text,text);
   if(audio.bundled){
    assert.equal(audio.audioFile,repairedPrompt.file);
    assert.equal(text,repairedPrompt.text);
    assert.equal(audio.locale,'ja-JP');
    assert.ok(existsSync(new URL(`../${audio.audioFile}`,import.meta.url)));
    continue;
   }
   assert.equal(catalog.files[audio.audioFile]?.text,text);
   assert.equal(catalog.files[audio.audioFile]?.locale,direction==='ko-ja'?'ja-JP':'ko-KR');
   assert.ok(catalog.packs[key].files.includes(audio.audioFile),audio.audioFile);
  }
  assert.equal(task.previous.length,index);
  assert.deepEqual(task.previous.map(t=>t.item),source.items.slice(0,index));
  for(const [previousIndex,previous]of task.previous.entries()){
   assert.equal(previous.index,previousIndex);assert.equal(previous.unitIndex,previousIndex);
   assert.equal(previous.item,source.items[previousIndex]);assert.equal(previous.unit,data.units[previousIndex]);
   for(const field of ['promptAudio','answerAudio','replyAudio'])assert.deepEqual(previous[field],tasks[previousIndex][field]);
  }
 }
 assert.deepEqual(expandedReviewWords(key),[]);
 await prepareContent('scenario');
 assert.deepEqual(practiceUnits({courseDirection:direction,scenarioActive:id},'scenario'),data.units);
 assert.equal(JSON.stringify({source,data}),original,'generation does not alter source text, meanings, tokens, photos or audio');
});

test('only the eight requested scenarios use rehearsal; other reviews retain their twelve tasks and four words',()=>{
 const untouched=Object.keys(levelTwoReviewData).filter(key=>!keys.includes(key));
 assert.equal(untouched.length,8);
 for(const key of untouched){
  assert.equal(isScenarioRehearsal(key),false);assert.equal(scenarioRehearsal(key),null);
  const tasks=levelTwoReview(key);
  assert.equal(tasks.length,12);assert.ok(tasks.every(t=>!t.rehearsal));
  assert.deepEqual(tasks.map(t=>t.type),['word','word','word','listen','listen','listen','order','order','order','apply','apply','apply']);
  assert.equal(expandedReviewWords(key).length,4);
 }
 for(const key of ['ko-ja:scenario:6','ja-ko:scenario:8','ko-ja:scenario:114','ko-ja:scenario:14:extra','ko-ja:video:frieren','ja-ko:song:ko-love-lee','ko-ja:song:jp-marigold','xx:scenario:14',undefined,null]){
  assert.equal(isScenarioRehearsal(key),false);assert.equal(scenarioRehearsal(key),null);
 }
 const firstPositions=new Set(keys.flatMap(key=>scenarioRehearsal(key).map(task=>task.tokenOrder[0])));
 assert.ok(firstPositions.size>=3,'the token bank does not teach one fixed first position');
});
