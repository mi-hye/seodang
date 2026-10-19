import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {freshState,reduce} from '../src/engine.js';import {valid,load} from '../src/storage.js';
import {sentenceProgress,sentenceId,nextSentence} from '../src/sentence-state.js';import {sentenceCourse} from '../src/sentence-content.js';
import {koreanLessons,followingKorean} from '../src/korean-state.js';import {renderLearningMap} from '../src/learning-map.js';
import {prepareContent,practiceKey,caseTasks,interceptCompletion} from '../src/practice-content.js';import {entryState,shouldOfferResume,restartLesson} from '../src/lesson-session.js';
const act=(s,type,id)=>reduce(s,{type,id});
test('level two offers four lessons per course, preserving original saved progress',()=>{
 const s={...freshState(),onboardingLevel:2,sentence:{version:1,started:true,phase:'learn',index:1,learned:[0],tokens:[],checked:false,selected:null,feedback:'',completed:false,attempts:2}};
 assert.equal(load({getItem:()=>JSON.stringify(s)}).blocked,false);
 assert.equal(nextSentence(freshState()),3);assert.equal(sentenceId(s),0);assert.equal(nextSentence(s),0);
 assert.equal((renderLearningMap(s).match(/data-action="sentence"/g)||[]).length,4);
 assert.equal(koreanLessons.filter(l=>!l.retired&&l.level===2).length,4);assert.equal(followingKorean('3-1').id,'3-4');assert.equal(followingKorean('3-2').id,'3-3');
 let next=act(s,'sentence-start',1);assert.deepEqual(next.sentence,s.sentence);assert.equal(shouldOfferResume(next,'sentence'),false);
 next=act(next,'sentence-next');assert.equal(shouldOfferResume(next,'sentence'),true);
 assert.equal(sentenceId(entryState(next,'sentence','2')),2);
 const restarted=restartLesson(next,'sentence');assert.equal(sentenceProgress(restarted).phase,'intro');assert.deepEqual(restarted.sentence,s.sentence);
 assert.equal(valid({...next,sentenceActive:99}),false);assert.equal(valid({...next,sentenceLessons:{bad:sentenceProgress(next)}}),false);
});
test('each added Japanese lesson completes its own questions and contextual practice without changing other records',async()=>{
 await prepareContent('sentence');let s={...freshState(),onboarded:true,onboardingLevel:2};
 for(const id of [1,2]){
  s=act(s,'sentence-start',id);const original=structuredClone(s.sentence),other=structuredClone(s.sentenceLessons?.[id===1?2:1]);
  s=act(s,'sentence-next');const c=sentenceCourse(s);
  for(let i=0;i<c.sentences.length;i++){
   s=act(s,'sentence-next');s=act(s,'sentence-token',1);s=act(s,'sentence-token',0);s=act(s,'sentence-check');assert.equal(sentenceProgress(s).checked,false);
   s=act(s,'sentence-clear');for(let n=0;n<c.sentences[i].parts.length;n++)s=act(s,'sentence-token',n);
   s=act(s,'sentence-check');assert.equal(sentenceProgress(s).checked,true);s=act(s,'sentence-next');assert.equal(sentenceProgress(s).phase,'speak');s=act(s,'sentence-speak-next');assert.ok(valid(s));
  }
  s=act(s,'sentence-select',String((c.solve.answer+1)%3));s=act(s,'sentence-submit');assert.equal(sentenceProgress(s).completed,false);
  s=act(s,'sentence-select',String(c.solve.answer));const action={type:'sentence-submit'},finished=reduce(s,action),intercepted=interceptCompletion(s,finished,'sentence',action);
  assert.equal(practiceKey(s,'sentence'),`ko-ja:sentence:${id}`);assert.equal(caseTasks(s,'sentence').length,3);assert.equal(intercepted.practices[practiceKey(s,'sentence')].count,3);assert.equal(sentenceProgress(intercepted).completed,false);
  const replay=act(finished,'sentence-start',id);assert.equal(sentenceProgress(replay).phase,'intro');assert.equal(sentenceProgress(replay).completed,true);
  s=finished;assert.ok(valid(s));assert.equal(load({getItem:()=>JSON.stringify(s)}).blocked,false);assert.deepEqual(s.sentence,original);assert.deepEqual(s.sentenceLessons[id===1?2:1],other);
 }
 assert.ok(s.history.completed.includes('sentence-1'));assert.ok(s.history.completed.includes('sentence-2'));
});
test('new clips match lesson text and each Korean case has independent contextual tasks',async()=>{
 const manifest=JSON.parse(readFileSync('assets/audio/level-two/manifest.json'));await prepareContent('korean');
 for(const id of [3,1,2])for(const audio of Object.values(sentenceCourse({sentenceActive:id}).audio))assert.equal(manifest.files[audio.id].text,audio.text);
 for(const id of ['3-2','3-3']){const s={...freshState(),courseDirection:'ja-ko',onboardingLevel:2,korean:{active:id}};assert.equal(caseTasks(s,'korean').length,3);assert.equal(practiceKey(s,'korean'),`ja-ko:korean:${id}`);}
 assert.equal(Object.keys(manifest.files).length,24);
});

test('level two transfer answers use learned sentences, including replacement vocabulary',async()=>{
 const {extraSentenceCases,extraKoreanCases}=await import('../src/level-two-content.js');
 const normalize=s=>s.replace(/[\s。.!?？]/g,'');
 for(const course of Object.values(extraSentenceCases)){
  const taught=course.sentences.map(x=>normalize(x.text));
  for(const task of course.tasks){
   const answer=task.type==='order'?task.tokens.join(''):task.type==='replace'?task.prompt.split('\n').at(-1).replace('___',task.options[task.answer]):task.options[task.answer];
   assert.ok(taught.includes(normalize(answer)),answer);
  }
 }
 for(const course of Object.values(extraKoreanCases)){
  const taught=course.items.map(x=>normalize(x.text));
  for(const task of course.tasks){
   const answer=task.type==='order'?task.tokens.join(''):task.type==='replace'?task.prompt.split('\n').at(-1).replace('___',task.options[task.answer]):task.options[task.answer];
   if(/[가-힣]/.test(answer))assert.ok(taught.includes(normalize(answer)),answer);
  }
 }
});

test('Japanese introduction follows the Korean learn-choice sequence and six matching transfer tasks',async()=>{
 await prepareContent('sentence');await prepareContent('korean');
 let ja=act({...freshState(),onboardingLevel:2},'sentence-start',3);
 let ko=act({...freshState(),courseDirection:'ja-ko',onboardingLevel:2},'korean-start','3-1');
 ja=act(ja,'sentence-next');ko=act(ko,'korean-next');const course=sentenceCourse(ja);
 assert.equal(course.interaction,'choice');assert.equal(course.solve,undefined);
 for(let index=0;index<6;index++){
  assert.equal(sentenceProgress(ja).phase,'learn');assert.equal(ko.korean.lessons['3-1'].phase,'learn');
  assert.equal(sentenceProgress(ja).index,index);assert.equal(ko.korean.lessons['3-1'].index,index);
  ja=act(ja,'sentence-next');ko=act(ko,'korean-next');
  assert.equal(sentenceProgress(ja).phase,'arrange');assert.equal(ko.korean.lessons['3-1'].phase,'quiz');
  ja=act(ja,'sentence-select',String((index+1)%3));ja=act(ja,'sentence-check');assert.ok(sentenceProgress(ja).feedback);
  ja=act(ja,'sentence-select',String(index%3));ko=act(ko,'korean-select',index%3);
  const before=ja;ja=act(ja,'sentence-check');ko=act(ko,'korean-check');assert.ok(valid(ja));assert.equal(ko.korean.lessons['3-1'].phase,'speak');ko=act(ko,'korean-speak-next');ja=act(ja,'sentence-speak-next');
  if(index===5){const intercepted=interceptCompletion(before,ja,'sentence',{type:'sentence-check'});assert.equal(intercepted.practices['ko-ja:sentence:3'].count,6);assert.ok(valid(intercepted));assert.equal(load({getItem:()=>JSON.stringify(intercepted)}).blocked,false);}
 }
 assert.equal(sentenceProgress(ja).phase,'summary');assert.equal(ko.korean.lessons['3-1'].phase,'done');
 assert.deepEqual(caseTasks(ja,'sentence').map(x=>x.type),caseTasks(ko,'korean').map(x=>x.type));
 assert.deepEqual(caseTasks(ja,'sentence').map(x=>x.answer),caseTasks(ko,'korean').map(x=>x.answer));
 assert.equal(caseTasks(ja,'sentence').length,6);
});
test('old introduction solve and three-task practice saves resume in the aligned course',()=>{
 const old={...freshState(),onboardingLevel:2,sentenceActive:3,sentenceLessons:{3:{version:1,started:true,phase:'solve',index:5,learned:[0,1,2,3,4,5],tokens:[],checked:false,selected:'2',feedback:'',completed:false,attempts:6}}};
 const resumed=act(old,'sentence-start',3);assert.equal(sentenceProgress(resumed).phase,'arrange');assert.equal(sentenceProgress(resumed).selected,null);assert.ok(valid(resumed));
 old.practices={'ko-ja:sentence:3':{version:1,caseVersion:1,round:0,mode:0,index:2,count:3,action:{type:'sentence-submit'}}};
 const practice=act(old,'sentence-start',3);assert.equal(practice.practices['ko-ja:sentence:3'].count,6);assert.equal(practice.practices['ko-ja:sentence:3'].index,0);assert.ok(valid(practice));
 const completed=act(practice,'sentence-speak-next');assert.equal(sentenceProgress(completed).phase,'summary');
});
