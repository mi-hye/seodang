import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';import {load,valid} from '../src/storage.js';
import {freshKana} from '../src/kana-state.js';import {freshBasic} from '../src/basics-state.js';
import {koreanLessons,nextKorean} from '../src/korean-state.js';import {renderAllLearningMap} from './map-pagination-fixtures.mjs';
import {guidePages} from '../src/onboarding-guide.js';
test('zero and word stages are separate in both directions, zero survives language switching',()=>{
 for(const courseDirection of ['ko-ja','ja-ko']){
  let s={...freshState(),onboarded:true,courseDirection,onboardingLevel:0};assert.ok(valid(s));const letters=renderAllLearningMap(s),words=renderAllLearningMap({...s,onboardingLevel:2});
  if(courseDirection==='ko-ja'){assert.match(letters,/data-action="kana"/);assert.doesNotMatch(letters,/data-action="sentence"/);assert.match(words,/data-action="sentence"/);assert.doesNotMatch(words,/data-action="kana"/);}
  else{assert.equal(nextKorean(s).level,0);assert.equal(nextKorean({...s,onboardingLevel:2}).id,'3-1');assert.equal(koreanLessons.filter(l=>l.level===0).length,10);}
  s=reduce(s,{type:'course',value:courseDirection==='ko-ja'?'ja-ko':'ko-ja'});s=reduce(s,{type:'level',value:4});s=reduce(s,{type:'course',value:courseDirection});assert.equal(s.onboardingLevel,0);
 }
});
test('old stage-one saves migrate membership without losing lessons, history or practice',()=>{
 for(const [courseDirection,active,expected] of [['ko-ja',undefined,0],['ko-ja',6,2],['ko-ja',7,0],['ja-ko',undefined,0]]){
  const s={...freshState(),courseDirection,onboarded:true,onboardingLevel:1,kana:freshKana(),courseLevels:{[courseDirection]:1},practices:{'ko-ja:kana:0':{version:1,round:2,mode:2,index:4,count:15,action:{type:'kana-next'}}}};delete s.levelLayoutVersion;
  if(active)s.basics={version:2,active,lessons:{[active]:{...freshBasic(),started:true,index:2}}};
  const restored=load({getItem:()=>JSON.stringify(s)});assert.equal(restored.blocked,false);assert.equal(restored.state.onboardingLevel,expected);assert.equal(restored.state.courseLevels[courseDirection],expected);assert.deepEqual(restored.state.practices,s.practices);assert.deepEqual(restored.state.basics,s.basics?{...s.basics,version:7}:undefined);assert.deepEqual(restored.state.kana,s.kana);
  assert.deepEqual(load({getItem:()=>JSON.stringify(restored.state)}).state,restored.state);
 }
});
test('the common welcome does not depend on the selected learning stage',()=>{
 for(const direction of ['ko-ja','ja-ko'])for(const level of [0,2,4,5,7]){
  assert.deepEqual(guidePages(level,direction),guidePages(0,direction));
 }
});

test('all stage-zero lessons can start and resume out of order in production',async()=>{
 const {kanaLessons}=await import('../src/kana-state.js');
 const {basicLessons,basicLevel,basicUnlocked}=await import('../src/basics-state.js');
 const {koreanLessons,koreanUnlocked}=await import('../src/korean-state.js');
 const {developmentMode}=await import('../src/build-config.js');assert.equal(developmentMode,false);
 for(const [direction,kind,ids] of [['ko-ja','kana',kanaLessons.map(l=>l.id)],['ko-ja','basic',basicLessons.filter(l=>basicLevel(l.id)===0).map(l=>l.id)],['ja-ko','korean',koreanLessons.filter(l=>l.level===0).map(l=>l.id)]]){
  for(const id of ids){const base={...freshState(),courseDirection:direction,onboarded:true,onboardingLevel:0};
   const s=reduce(base,{type:`${kind}-start`,...(kind==='kana'?{lesson:id}:{id})});const key=kind==='basic'?'basics':kind;
   assert.equal(s[key].active,id);const restored=load({getItem:()=>JSON.stringify(s)});assert.equal(restored.blocked,false);assert.equal(restored.state[key].active,id);assert.deepEqual(restored.state[key],s[key]);
  }
 }
 assert.equal(basicUnlocked(freshState(),6),false);assert.equal(basicUnlocked(freshState(),999),false);assert.equal(koreanUnlocked(freshState(),'1-999'),false);
});
