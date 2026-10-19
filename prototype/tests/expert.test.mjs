import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {freshState,reduce} from '../src/engine.js';import {valid} from '../src/storage.js';import {expertCatalog,expertProgress,validExperts} from '../src/expert-state.js';
import {learningSnapshot,checkedAnswer} from '../src/analytics-learning.js';
const content=JSON.parse(readFileSync('src/expert-content.json'));
for(const direction of ['ko-ja','ja-ko'])test(`${direction}: each article completes only after questions and sentence review`,()=>{
 let s={...freshState(),onboarded:true,onboardingLevel:7,courseDirection:direction};
 for(let id=0;id<4;id++){
  const c=expertCatalog[direction][id],article=content[direction][id];assert.equal(article.sentences.length,c.sentences);assert.deepEqual(article.questions.map(q=>q.correct),c.answers);
  const run=(type,id)=>{s=reduce(s,{type,id});assert.ok(valid(s));};run('expert-start',id);run('expert-next');run('expert-next');
  for(const [i,answer]of c.answers.entries()){
   run('expert-next');assert.equal(expertProgress(s).phase,'quiz');assert.equal(expertProgress(s).index,i);
   run('expert-select',(answer+1)%c.choices);const before=learningSnapshot(s,'expert');run('expert-check');assert.equal(checkedAnswer(before,learningSnapshot(s,'expert'),'expert-check'),false);assert.equal(expertProgress(s).retry,true);
   run('expert-select',answer);run('expert-check');run('expert-next');
  }
  assert.equal(expertProgress(s).phase,'review');assert.equal(expertProgress(s).completed,false);
  for(const sentence of article.sentences){assert.ok(sentence.translation);assert.ok(sentence.audioFile);if(direction==='ko-ja')assert.ok(sentence.kanjiKey);run('expert-next');}
  assert.equal(expertProgress(s).phase,'done');assert.equal(expertProgress(s).completed,true);
  const snapshot=structuredClone(s);run('expert-next');assert.deepEqual(s,snapshot);
 }
 const h=direction==='ko-ja'?s.history:s.korean.history;assert.equal(Object.values(h.days)[0].cases,4);
});
test('legacy records remain valid and do not skip review for unfinished courses',()=>{
 const old={...freshState(),onboardingLevel:7,readings:{7:{version:1,started:true,index:2,selected:null,retry:false,completed:false,phase:'read',solved:[0,1]}}};
 assert.ok(valid(old));const next=reduce(old,{type:'expert-start',id:0});assert.deepEqual(next.readings,old.readings);assert.equal(expertProgress(next).phase,'intro');
 const active=reduce(old,{type:'expert-start',id:1});assert.equal(expertProgress(active).phase,'intro');assert.ok(valid(active));const continued=reduce(active,{type:'expert-next'});assert.equal(expertProgress(continued).phase,'read');assert.ok(valid(continued));
 assert.equal(validExperts({...next,expertActive:99}),false);assert.equal(validExperts({...next,experts:{...next.experts,'ko-ja:expert:0':{...expertProgress(next),sentence:999}}}),false);
});
test('each article audio pack includes its exact sentences and translations stay paired',()=>{
 const audio=JSON.parse(readFileSync('assets/audio/catalog.json'));
 for(const [direction,articles]of Object.entries(content))articles.forEach((article,id)=>{
  const files=[article.audio.audioFile,...article.sentences.map(s=>s.audioFile)];assert.deepEqual(audio.packs[`${direction}:expert:${id}`].files,files);
  assert.equal(article.paragraphs.join('').replace(/\s/g,''),article.sentences.map(s=>s.text).join('').replace(/\s/g,''));
  for(const sentence of article.sentences){const clip=audio.files[sentence.audioFile];assert.equal(clip.text,sentence.text);assert.equal(clip.locale,direction==='ko-ja'?'ja-JP':'ko-KR');assert.ok(clip.duration>.2);assert.ok(clip.bytes>1000);}
 });
});
test('restart clears only the selected expert attempt and preserves completion records',()=>{
 let s={...freshState(),onboarded:true,onboardingLevel:7,courseDirection:'ja-ko'};
 s=reduce(s,{type:'expert-start',id:0});s=reduce(s,{type:'expert-next'});
 const other=structuredClone(s.experts['ja-ko:expert:0']);
 s=reduce(s,{type:'expert-start',id:1});s=reduce(s,{type:'expert-next'});
 const resumed=reduce(s,{type:'expert-start',id:1});assert.equal(expertProgress(resumed).phase,'read');
 s.experts['ja-ko:expert:1'].completed=true;
 const restarted=reduce(s,{type:'expert-start',id:1,restart:true});
 assert.equal(expertProgress(restarted).phase,'intro');assert.equal(expertProgress(restarted).completed,true);assert.deepEqual(expertProgress(restarted).solved,[]);
 assert.deepEqual(restarted.experts['ja-ko:expert:0'],other);assert.deepEqual(restarted.history,s.history);assert.ok(valid(restarted));
});
