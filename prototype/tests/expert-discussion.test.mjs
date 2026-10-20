import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {freshState,reduce} from '../src/engine.js';import {valid} from '../src/storage.js';import {expertCatalog,expertProgress,expertPercent} from '../src/expert-state.js';
for(const direction of ['ko-ja','ja-ko'])for(const lesson of [0,1,2,3])test(`${direction} ${lesson} daily discussion starts with the story and survives resume`,()=>{
 let s={...freshState(),onboarded:true,onboardingLevel:7,courseDirection:direction};
 const run=(type,id)=>{s=reduce(s,{type,id});assert.ok(valid(s));};run('expert-start',lesson);assert.equal(expertProgress(s).phase,'intro');run('expert-next');assert.equal(expertProgress(s).phase,'perspective');assert.equal(expertProgress(s).part,0);assert.equal(expertProgress(s).opinion,undefined);
 run('expert-next');assert.equal(expertProgress(s).part,1);const saved=structuredClone(expertProgress(s));run('expert-start',lesson);assert.deepEqual(expertProgress(s),saved);
 run('expert-next');assert.equal(expertProgress(s).phase,'expression');run('expert-next');run('expert-next');assert.equal(expertProgress(s).phase,'speak');run('expert-previous');assert.equal(expertProgress(s).part,1);run('expert-next');run('expert-next');assert.equal(expertProgress(s).phase,'reflection');run('expert-next');assert.equal(expertProgress(s).phase,'done');assert.equal(expertPercent(s),100);
 const h=direction==='ko-ja'?s.history:s.korean.history;assert.equal(Object.values(h.days)[0].cases,1);
});
test('previous essay attempts upgrade without removing earned completion credit',()=>{
 for(const completed of [false,true]){const s={...freshState(),onboardingLevel:7,courseDirection:'ko-ja',experts:{'ko-ja:expert:0':{phase:completed?'done':'review',index:1,sentence:17,selected:null,checked:false,retry:false,attempts:2,started:true,completed,solved:[0,1]}}};assert.ok(valid(s));const p=expertProgress(s,0);assert.equal(p.completed,completed);assert.equal(p.phase,completed?'done':'intro');assert.equal(s.experts['ko-ja:expert:0'].sentence,17);}
});

test('saved choice screens skip directly to the first friend without losing completion credit',()=>{
 const s={...freshState(),onboarded:true,onboardingLevel:7,courseDirection:'ja-ko',experts:{'ja-ko:expert:0':{discussionVersion:1,phase:'opinion',opinion:2,part:0,index:0,sentence:0,selected:null,checked:false,retry:false,attempts:0,started:true,completed:true,solved:[]}}};
 assert.ok(valid(s));const p=expertProgress(s,0);assert.equal(p.phase,'perspective');assert.equal(p.part,0);assert.equal(p.opinion,undefined);assert.equal(p.completed,true);const resumed=reduce(s,{type:'expert-start',id:0});assert.ok(valid(resumed));assert.equal(expertProgress(resumed).phase,'perspective');
});

test('every daily lesson has paired content, a photo and matching map titles',()=>{
 const content=JSON.parse(readFileSync('src/expert-content.json'));
 for(let id=0;id<4;id++){
  const ja=content['ko-ja'][id].discussion,ko=content['ja-ko'][id].discussion;
  assert.equal(ja.image,ko.image);assert.ok(existsSync(ja.image));assert.equal(ja.situation,ko.situation);
  for(const direction of ['ko-ja','ja-ko']){
   const d=content[direction][id].discussion;assert.equal(d.title,expertCatalog[direction][id].title);
   assert.equal(d.perspectives.length,2);assert.equal(d.expressions.length,2);
   for(const line of [...d.perspectives,...d.expressions]){assert.ok(line.translation);assert.ok(line.audioFile);if(direction==='ko-ja')assert.ok(line.kanjiKey);else assert.equal(line.kanjiKey,undefined);}
   const old={...freshState(),onboardingLevel:7,courseDirection:direction,experts:{[`${direction}:expert:${id}`]:{phase:'review',index:0,sentence:0,selected:null,checked:false,retry:false,attempts:1,started:true,completed:false,solved:expertCatalog[direction][id].answers.map((_,i)=>i)}}};
   assert.ok(valid(old));assert.equal(expertProgress(old,id).phase,'intro');assert.equal(expertProgress(old,id).completed,false);
  }
 }
});

 test('Japanese learners keep Korean interface at every level',async()=>{
 const {japaneseLessonUI}=await import('../src/curriculum.js');
 const {renderDiscussion}=await import('../src/expert-discussion.js');
 for(const level of [0,2,4,5,6,7])assert.equal(japaneseLessonUI({courseDirection:'ko-ja',onboardingLevel:level}),false);
 assert.equal(japaneseLessonUI({courseDirection:'ja-ko',onboardingLevel:4}),true);
 assert.equal(japaneseLessonUI({courseDirection:'ja-ko',onboardingLevel:7}),true);
 const content=JSON.parse(readFileSync('src/expert-content.json'));
 for(let id=0;id<4;id++){
  let s={...freshState(),onboardingLevel:7,courseDirection:'ko-ja'};
  s=reduce(s,{type:'expert-start',id});const d=content['ko-ja'][id].discussion;
  assert.equal(d.title,content['ja-ko'][id].discussion.title);
  assert.ok(renderDiscussion(s,d,x=>x).includes('친구들의 이야기'));
  s=reduce(s,{type:'expert-next'});const html=renderDiscussion(s,d,x=>x);
  assert.ok(html.includes('lang="ja"'));assert.ok(html.includes('번역'));assert.match(d.perspectives[0].text,/[ぁ-んァ-ン]/);
 }
});
