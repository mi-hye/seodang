import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';import {load,valid} from '../src/storage.js';
import {freshKana} from '../src/kana-state.js';import {freshBasic} from '../src/basics-state.js';
import {koreanLessons,nextKorean} from '../src/korean-state.js';import {renderLearningMap} from '../src/learning-map.js';
import {guidePages,prepareGuide} from '../src/onboarding-guide.js';
test('zero and word stages are separate in both directions, zero survives language switching',()=>{
 for(const courseDirection of ['ko-ja','ja-ko']){
  let s={...freshState(),onboarded:true,courseDirection,onboardingLevel:0};assert.ok(valid(s));const letters=renderLearningMap(s),words=renderLearningMap({...s,onboardingLevel:1});
  if(courseDirection==='ko-ja'){assert.match(letters,/data-action="kana"/);assert.doesNotMatch(letters,/data-action="labels"/);assert.match(words,/data-action="labels"/);assert.doesNotMatch(words,/data-action="kana"/);}
  else{assert.equal(nextKorean(s).level,0);assert.equal(nextKorean({...s,onboardingLevel:1}).id,'1-11');assert.equal(koreanLessons.filter(l=>l.level===0).length,10);}
  s=reduce(s,{type:'course',value:courseDirection==='ko-ja'?'ja-ko':'ko-ja'});s=reduce(s,{type:'level',value:4});s=reduce(s,{type:'course',value:courseDirection});assert.equal(s.onboardingLevel,0);
 }
});
test('old stage-one saves migrate membership without losing lessons, history or practice',()=>{
 for(const [courseDirection,active,expected] of [['ko-ja',undefined,0],['ko-ja',6,1],['ko-ja',7,0],['ja-ko',undefined,0]]){
  const s={...freshState(),courseDirection,onboarded:true,onboardingLevel:1,kana:freshKana(),courseLevels:{[courseDirection]:1},practices:{'ko-ja:kana:0':{version:1,round:2,mode:2,index:4,count:15,action:{type:'kana-next'}}}};delete s.levelLayoutVersion;
  if(active)s.basics={version:2,active,lessons:{[active]:{...freshBasic(),started:true,index:2}}};
  const restored=load({getItem:()=>JSON.stringify(s)});assert.equal(restored.blocked,false);assert.equal(restored.state.onboardingLevel,expected);assert.equal(restored.state.courseLevels[courseDirection],expected);assert.deepEqual(restored.state.practices,s.practices);assert.deepEqual(restored.state.basics,s.basics?{...s.basics,version:7}:undefined);assert.deepEqual(restored.state.kana,s.kana);
  assert.deepEqual(load({getItem:()=>JSON.stringify(restored.state)}).state,restored.state);
 }
});
test('each stage has distinct guide copy and activity with valid answer/audio',async()=>{
 for(const direction of ['ko-ja','ja-ko']){
  const prompts=[],types=[];for(let level=0;level<=7;level++){const page=guidePages(level,direction)[0],units=await prepareGuide(level,direction);prompts.push(guidePages(level,direction)[1].title);types.push(page.type);assert.equal(units.demo.choices.length,2);assert.notEqual(units.demo.choices[0],units.demo.choices[1]);if(level===3)assert.ok(units.demo.parts.length>1);}
  assert.equal(new Set(prompts).size,8);assert.equal(new Set(types).size,8);
 }
});
