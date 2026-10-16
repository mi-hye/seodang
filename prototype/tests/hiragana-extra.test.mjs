import test from 'node:test';
import assert from 'node:assert/strict';
import {basicContent} from '../src/basics.js';
import {basicLessons,followingBasic,freshBasic} from '../src/basics-state.js';
import {hiraganaExtraContent} from '../src/hiragana-extra.js';
import {lessonTitle} from '../src/lesson-title.js';
import {freshState,reduce} from '../src/engine.js';
import {load,valid} from '../src/storage.js';
test('hiragana covers all 20 voiced and 33 contracted sounds without duplicating existing lessons',()=>{
 const voiced=[...basicContent[7],...basicContent[27],...basicContent[28]].map(x=>x[0]);
 assert.deepEqual([...voiced].sort(),Array.from('がぎぐげござじずぜぞだぢづでどばびぶべぼ').sort());
 const contracted=[...basicContent[10].filter(([g])=>g.length===2),...basicContent[29],...basicContent[30],...basicContent[31]].map(x=>x[0]);
 assert.deepEqual(contracted.sort(),Array.from('きしちにひみりぎじびぴ').flatMap(c=>Array.from('ゃゅょ',y=>c+y)).sort());
 assert.equal(Object.values(hiraganaExtraContent).flat().length,41);
});
test('supplementary lessons preserve old saves and follow map order into katakana',()=>{
 let state={...freshState(),onboarded:true,onboardingLevel:0,basics:{version:7,active:10,lessons:{10:{...freshBasic(10),index:11,phase:'done',started:true,completed:true},11:{...freshBasic(11),index:3,phase:'write',started:true}}}};
 const old=structuredClone(state.basics.lessons);
 assert.equal(followingBasic(10),27);assert.equal(followingBasic(31),11);assert.equal(followingBasic(26),undefined);
 for(const id of [27,28,29,30,31]){
  state=reduce(state,{type:'basic-start',id});let actions=0;
  while(state.basics.lessons[id].phase!=='done'){
   const p=state.basics.lessons[id];state=reduce(state,p.phase==='quiz'?{type:p.selected===null?'basic-select':'basic-check',id:String(p.index%4)}:{type:'basic-next'});
   assert.ok(valid(state));state=load({getItem:()=>JSON.stringify(state)}).state;assert.ok(++actions<150);
  }
  const number=5+basicLessons.filter(l=>l.id!==6).findIndex(l=>l.id===id)+1;
  assert.ok(lessonTitle(state,'basic').startsWith(`${number}. `));
 }
 assert.deepEqual(state.basics.lessons[10],old[10]);assert.deepEqual(state.basics.lessons[11],old[11]);
});
