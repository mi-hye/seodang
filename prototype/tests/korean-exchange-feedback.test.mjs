import test from 'node:test';import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
import {koreanContent} from '../src/korean-content.js';
import {renderKorean} from '../src/korean.js';
import {prepareContent,caseTasks} from '../src/practice-content.js';
import {freshKoreanProgress} from '../src/korean-state.js';
test('exchange explains all twelve original distractors in the selected answer order',()=>{
 const s={...freshState(),courseDirection:'ja-ko',onboardingLevel:2};
 for(const [index,item] of koreanContent['3-1'].entries()){
  const options=[...item.others];options.splice(index%3,0,item.text);
  for(const wrong of item.others){
   const reason=item.wrongFeedback[wrong];assert.ok(reason?.length>20);
   const p={...freshKoreanProgress('3-1'),started:true,phase:'quiz',index,selected:options.indexOf(wrong),retry:true};
   const html=renderKorean({...s,korean:{active:'3-1',lessons:{'3-1':p}}},()=> '');
   assert.ok(html.replace(/<[^>]+>/g,'').includes(reason),wrong);
  }
 }
});
test('exchange practice has explanations for every wrong choice and both reversed orders',async()=>{
 await prepareContent('korean');const tasks=caseTasks({...freshState(),courseDirection:'ja-ko',onboardingLevel:2,korean:{active:'3-1'}},'korean');
 assert.equal(tasks.length,6);
 for(const t of tasks)if(t.type==='order')assert.ok(t.orderFeedback);else{
  assert.equal(t.wrongFeedback[t.options[t.answer]],undefined);
  for(const [i,option] of t.options.entries())if(i!==t.answer)assert.ok(t.wrongFeedback[option]?.length>20);
 }
});
