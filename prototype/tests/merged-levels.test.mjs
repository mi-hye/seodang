import {canonicalLevel} from '../src/curriculum.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';import {load} from '../src/storage.js';
import {freshKoreanProgress,followingKorean} from '../src/korean-state.js';import {freshBasic,basicLevel} from '../src/basics-state.js';import {renderAllLearningMap} from './map-pagination-fixtures.mjs';import {renderPanel} from '../src/panels.js';
test('merge moves current vocabulary saves and both remembered course levels without losing progress',()=>{
 for(const courseDirection of ['ko-ja','ja-ko'])for(const level of [0,1,2,3,7]){
 const old={...freshState(),levelLayoutVersion:1,courseDirection,onboarded:true,onboardingLevel:level,courseLevels:{'ko-ja':1,'ja-ko':2},korean:{version:4,active:'1-11',lessons:{'1-11':{...freshKoreanProgress('1-11'),started:true,index:3,phase:'quiz'}}},basics:{version:7,active:6,lessons:{6:{...freshBasic(6),started:true,index:2}}}};
 const result=load({getItem:()=>JSON.stringify(old)});assert.equal(result.blocked,false);const s=result.state;assert.equal(s.onboardingLevel,canonicalLevel(level));assert.deepEqual(s.courseLevels,{'ko-ja':2,'ja-ko':2});assert.deepEqual(s.korean.lessons,old.korean.lessons);assert.equal(s.korean.active,'3-1');assert.deepEqual(s.basics,old.basics);assert.deepEqual(load({getItem:()=>JSON.stringify(s)}).state,s);
 }
});
test('both maps enter a case instead of standalone vocabulary',()=>{
 for(const courseDirection of ['ko-ja','ja-ko']){const s={...freshState(),courseDirection,onboardingLevel:2},map=renderAllLearningMap(s);
 if(courseDirection==='ja-ko'){assert.match(map,/data-id="3-1"/);assert.doesNotMatch(map,/data-id="(?:1-11|2-1|7-1)"/);}
 else{assert.match(map,/data-action="sentence"/);assert.doesNotMatch(map,/data-action="(?:labels|listening|play)"/);}
 const panel=renderPanel('settings',s,'learning');assert.doesNotMatch(panel.match(/<select data-setting="difficulty">(.*?)<\/select>/)[1],/<option value="1" /);assert.equal(reduce(s,{type:'level',value:1}).onboardingLevel,2);
 }
});
