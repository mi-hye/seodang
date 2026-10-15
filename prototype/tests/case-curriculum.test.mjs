import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';import {load,valid} from '../src/storage.js';
import {courseLevels,displayLevel} from '../src/curriculum.js';
import {freshKoreanProgress} from '../src/korean-state.js';
import {koreanCases} from '../src/korean-cases.js';import {koreanContent} from '../src/korean-content.js';
test('five displayed levels migrate old selections and archive pending retired practice without deleting history',()=>{
 assert.deepEqual(courseLevels.map(displayLevel),[1,2,3,4,5]);
 const practice={version:1,round:0,mode:0,index:1,count:4,action:{type:'labels-next'}};
 const old={...freshState(),onboarded:true,levelLayoutVersion:2,onboardingLevel:3,courseLevels:{'ko-ja':3,'ja-ko':7},practices:{'ko-ja:labels:0':practice},korean:{version:4,active:'7-1',lessons:{'7-1':{...freshKoreanProgress('7-1'),started:true,phase:'quiz'}}}};
 const result=load({getItem:()=>JSON.stringify(old)});assert.equal(result.blocked,false);const s=result.state;
 assert.equal(s.onboardingLevel,2);assert.deepEqual(s.courseLevels,{'ko-ja':2,'ja-ko':7});assert.equal(s.korean.active,'7-1');assert.deepEqual(s.korean.lessons,old.korean.lessons);assert.deepEqual(s.archivedPractices['ko-ja:labels:0'],practice);assert.deepEqual(s.history,old.history);assert.equal(s.practices['ko-ja:labels:0'],undefined);assert.deepEqual(load({getItem:()=>JSON.stringify(s)}).state,s);
});
test('Korean existing question resumes behind scene introduction without losing its answer',()=>{
 let s={...freshState(),courseDirection:'ja-ko',onboardingLevel:2,korean:{version:4,active:'3-1',lessons:{'3-1':{...freshKoreanProgress('3-1'),started:true,index:2,phase:'quiz',selected:1,retry:true}}}};
 s=reduce(s,{type:'korean-start',id:'3-1'});assert.equal(s.korean.lessons['3-1'].phase,'scenario');assert.ok(valid(s));s=reduce(s,{type:'korean-next'});assert.equal(s.korean.lessons['3-1'].phase,'quiz');assert.equal(s.korean.lessons['3-1'].selected,1);assert.equal(s.korean.lessons['3-1'].index,2);
});
test('every Korean case teaches words actually used in its sentence, and later passages start a new scene',()=>{
 for(const [id,c] of Object.entries(koreanCases))c.words.forEach((words,i)=>{assert.ok(words.length>0);for(const [word] of words)assert.ok(koreanContent[id][i].text.includes(word),`${id}/${i}/${word}`);});
 for(const id of ['5-1','6-1']){let s={...freshState(),courseDirection:'ja-ko',onboardingLevel:Number(id[0])};s=reduce(s,{type:'korean-start',id});for(let i=0;i<3;i++){assert.equal(s.korean.lessons[id].phase,'scenario');s=reduce(s,{type:'korean-next'});assert.equal(s.korean.lessons[id].phase,'learn');s=reduce(s,{type:'korean-next'});s=reduce(s,{type:'korean-select',id:String(i)});s=reduce(s,{type:'korean-check'});assert.ok(valid(s));}assert.equal(s.korean.lessons[id].phase,'done');}
});
