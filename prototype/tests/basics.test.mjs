import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {basicLessons,basicProgress,basicUnlocked,validBasics,freshBasic,basicSinglePass,basicHasIntro} from '../src/basics-state.js';
import {basicContent} from '../src/basics.js';
import {freshKana} from '../src/kana-state.js';
import {freshListening} from '../src/listening-state.js';
import {load,valid} from '../src/storage.js';
test('1-6 to 1-10 gate, resume, retry and complete independently without advancing difficulty',()=>{
 let s={...freshState(),onboarded:true,onboardingLevel:1};
 assert.equal(basicUnlocked(s,6),false);assert.equal(reduce(s,{type:'basic-start',id:10}).basics.active,10);
 s.listening={...freshListening(),completed:true,index:4};s.kana=freshKana();s.kana.lessons.forEach(l=>{l.completed=true;l.caseSolved=true;});const old=structuredClone(s.episode);
 for(const l of basicLessons){
  assert.equal(basicUnlocked(s,l.id),true);assert.equal(basicContent[l.id].length,l.count);
  s=reduce(s,{type:'basic-start',id:l.id});if(basicHasIntro(l.id)){assert.equal(basicProgress(s,l.id).phase,'intro');s=reduce(s,{type:'basic-next'});}
  for(let i=0;i<l.count;i++){
   if(basicProgress(s,l.id).phase==='intro')s=reduce(s,{type:'basic-next'});
   const [target,,distractors]=basicContent[l.id][i];assert.equal(new Set([target,...distractors]).size,3);
   s=reduce(s,{type:'basic-next'});if(l.id===10){assert.equal(basicProgress(s,l.id).phase,i===l.count-1?'done':'learn');continue;}if(basicSinglePass(l.id)){assert.equal(basicProgress(s,l.id).phase,'write');assert.equal(load({getItem:()=>JSON.stringify(s)}).state.basics.lessons[l.id].phase,'write');s=reduce(s,{type:'basic-next'});assert.equal(basicProgress(s,l.id).phase,'quiz');assert.ok(valid(s));}s=reduce(s,{type:'basic-select',id:String((i+1)%(basicSinglePass(l.id)?4:3))});s=reduce(s,{type:'basic-check'});assert.equal(basicProgress(s,l.id).index,i);assert.equal(basicProgress(s,l.id).retry,true);
   s=reduce(s,{type:'basic-select',id:String(i%(basicSinglePass(l.id)?4:3))});s=reduce(s,{type:'basic-check'});assert.ok(valid(s));
   const restored=load({getItem:()=>JSON.stringify(s)});assert.equal(restored.blocked,false);s=restored.state;
  }
  assert.equal(basicProgress(s,l.id).completed,true);
 }
 assert.equal(s.onboardingLevel,1);assert.deepEqual(s.episode,old);assert.equal(s.history.completed.filter(x=>x.startsWith('basic-')).length,basicLessons.length);
 s=reduce(s,{type:'basic-start',id:6});assert.equal(s.basics.lessons[6].index,0);assert.equal(s.basics.lessons[6].completed,true);assert.equal(s.history.completed.filter(x=>x==='basic-6').length,1);
 assert.equal(validBasics({...s.basics,active:99}),false);assert.equal(validBasics({...s.basics,lessons:{6:{...s.basics.lessons[6],index:99}}}),false);
});

test('old basic saves keep the same material and reopen completed lessons at new vocabulary',()=>{
 const progress={started:true,index:3,phase:'quiz',selected:0,retry:true,completed:false};
 const original={...freshState(),basics:{version:1,active:7,lessons:{7:progress,8:{...progress,index:4,phase:'done',completed:true}}}};
 const {state,blocked}=load({getItem:()=>JSON.stringify(original)});
 assert.equal(blocked,false);assert.equal(state.basics.version,7);assert.equal(state.basics.lessons[7].index,3);assert.equal(basicContent[7][3][0],'ず');assert.equal(state.basics.lessons[7].selected,null);
 assert.equal(state.basics.lessons[8].index,2);assert.equal(basicContent[8][2][0],'ぷ');assert.equal(state.basics.lessons[8].completed,false);assert.equal(state.basics.lessons[8].phase,'learn');assert.ok(valid(state));
 const again=load({getItem:()=>JSON.stringify(state)});assert.deepEqual(again.state.basics,state.basics);
});
test('new vocabulary is placed between sound groups, with no more than two sounds before a word',()=>{
 for(const id of [10]){let sounds=0,words=0;for(const [text,, ,cue] of basicContent[id]){
  const sound=text.length===1||(id===10&&text.length===2);
  if(sound){sounds++;assert.ok(sounds<=2);}else{sounds=0;words++;assert.ok(cue);}
 }assert.ok(words>=3);assert.equal(sounds,0);}
 assert.ok(basicContent[9].some(([word])=>word==='ねっこ'));assert.ok(basicContent[9].some(([word])=>word==='しっぽ'));
});

test('removed kagi moves saved lessons to za without shifting bundled audio',()=>{
 const progress={started:true,index:2,phase:'quiz',selected:2,retry:false,completed:false};
 const s={...freshState(),basics:{version:2,active:7,lessons:{7:progress}}};
 const restored=load({getItem:()=>JSON.stringify(s)});assert.equal(restored.blocked,false);assert.equal(basicContent[7][restored.state.basics.lessons[7].index][0],'ざ');assert.equal(restored.state.basics.lessons[7].phase,'learn');assert.ok(!basicContent[7].some(([text])=>text==='かぎ'));assert.deepEqual(load({getItem:()=>JSON.stringify(restored.state)}).state.basics,restored.state.basics);
});

test('dakuten contains only six glyphs and migrates removed vocabulary saves',()=>{
 assert.deepEqual(basicContent[7].map(([text])=>text),['が','ぎ','ざ','ず','だ','ば']);
 for(const index of [4,7]){const progress={started:true,index,phase:'quiz',selected:1,retry:true,completed:false};const s={...freshState(),basics:{version:3,active:7,lessons:{7:progress}}};const restored=load({getItem:()=>JSON.stringify(s)});assert.equal(restored.blocked,false);assert.equal(restored.state.basics.lessons[7].phase,'learn');assert.equal(restored.state.basics.lessons[7].index,index===4?4:5);assert.equal(restored.state.basics.lessons[7].selected,null);assert.ok(valid(restored.state));}
});

test('last dakuten choice completes without extra repetition',async()=>{
 const {prepareContent,interceptCompletion}=await import('../src/practice-content.js');await prepareContent('basic');
 const kana=freshKana();kana.lessons.forEach(l=>{l.completed=true;l.caseSolved=true;});
 const s={...freshState(),onboarded:true,onboardingLevel:0,kana,basics:{version:5,active:7,lessons:{7:{...freshBasic(),started:true,index:5,phase:'quiz',selected:1}}}};
 const action={type:'basic-check'},finished=interceptCompletion(s,reduce(s,action),'basic',action);
 assert.equal(finished.practices?.['ko-ja:basic:7'],undefined);assert.equal(finished.basics.lessons[7].phase,'done');assert.equal(finished.history.completed.filter(x=>x==='basic-7').length,1);
 const old={...s,practices:{'ko-ja:basic:7':{version:1,round:1,mode:0,index:2,count:6,action}}};const restored=load({getItem:()=>JSON.stringify(old)});assert.equal(restored.blocked,false);assert.equal(restored.state.practices['ko-ja:basic:7'],undefined);assert.equal(restored.state.basics.lessons[7].phase,'write');assert.equal(restored.state.basics.lessons[7].index,5);
});

test('handakuten removes vocabulary and restores legacy progress safely',()=>{
 assert.deepEqual(basicContent[8].map(([text])=>text),['ぱ','ぴ','ぷ','ぺ','ぽ']);
 for(let index=0;index<8;index++){
  const original={...freshState(),basics:{version:5,active:8,lessons:{8:{...freshBasic(),started:true,index,phase:'quiz',selected:2}}}};
  const restored=load({getItem:()=>JSON.stringify(original)});assert.equal(restored.blocked,false);
  const p=restored.state.basics.lessons[8];assert.equal(p.index,[0,1,2,2,3,3,4,4][index]);assert.equal(p.selected,null);assert.equal(p.phase,[2,4,7].includes(index)?'learn':'quiz');assert.ok(valid(restored.state));
  assert.deepEqual(load({getItem:()=>JSON.stringify(restored.state)}).state.basics,restored.state.basics);
 }
});

test('sound lessons restart at the introduction and can return to it',async()=>{
 const {restartLesson}=await import('../src/lesson-session.js');
 const kana=freshKana();kana.lessons.forEach(l=>{l.completed=true;l.caseSolved=true;});
 for(const id of [7,8,9,10]){
  let s={...freshState(),kana,basics:{version:6,active:id,lessons:{[id-1]:{...freshBasic(),completed:true},[id]:{...freshBasic(),started:true,index:2,phase:'quiz',completed:true}}}};
  s=restartLesson(s,'basic');assert.equal(s.basics.lessons[id].phase,'intro');assert.equal(s.basics.lessons[id].completed,true);
  s=reduce(s,{type:'basic-start',id});assert.equal(load({getItem:()=>JSON.stringify(s)}).state.basics.lessons[id].phase,'intro');
  s=reduce(s,{type:'basic-next'});assert.equal(s.basics.lessons[id].phase,'learn');
  s=reduce(s,{type:'basic-previous'});assert.equal(s.basics.lessons[id].phase,'intro');
 }
});
