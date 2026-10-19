import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';import {freshKoreanProgress} from '../src/korean-state.js';import {valid,load} from '../src/storage.js';import {matchesSpeakingTarget} from '../src/korean-speaking.js';
const start=()=>({...freshState(),onboarded:true,courseDirection:'ja-ko',onboardingLevel:2,korean:{version:4,active:'3-1',lessons:{'3-1':{...freshKoreanProgress('3-1'),phase:'quiz',started:true,caseSeen:true,selected:0}}}});
test('first exchange answer opens persisted speaking step before counting the sentence',()=>{
 let s=reduce(start(),{type:'korean-check'});assert.equal(s.korean.lessons['3-1'].phase,'speak');assert.equal(s.korean.lessons['3-1'].index,0);assert.equal(s.korean.history,undefined);assert.ok(valid(s));
 s=load({getItem:()=>JSON.stringify(s)}).state;assert.equal(s.korean.lessons['3-1'].phase,'speak');
 s=reduce(s,{type:'korean-speak-next'});assert.equal(s.korean.lessons['3-1'].index,1);assert.equal(s.korean.lessons['3-1'].phase,'learn');assert.equal(Object.values(s.korean.history.days)[0].expressions,1);
 assert.deepEqual(reduce(s,{type:'korean-speak-next'}),s);
});
test('wrong answers stay in quiz; back from speech resets selection; later phrases also use speech',()=>{
 let s=start();s.korean.lessons['3-1'].selected=1;s=reduce(s,{type:'korean-check'});assert.equal(s.korean.lessons['3-1'].phase,'quiz');
 s=reduce(reduce(s,{type:'korean-select',id:'0'}),{type:'korean-check'});s=reduce(s,{type:'korean-previous'});assert.equal(s.korean.lessons['3-1'].phase,'quiz');assert.equal(s.korean.lessons['3-1'].selected,null);
 s.korean.lessons['3-1'].index=1;s.korean.lessons['3-1'].selected=1;s=reduce(s,{type:'korean-check'});assert.equal(s.korean.lessons['3-1'].phase,'speak');s=reduce(s,{type:'korean-speak-next'});assert.equal(s.korean.lessons['3-1'].index,2);
});
test('recognition match ignores spacing and punctuation but never substitutes different words',()=>{
 for(const t of ['저는 학생이에요.','저는학생이에요','저는 학생이에요!'])assert.equal(matchesSpeakingTarget(t),true);
 for(const t of ['',null,'저는 회사원이에요','학생이에요','저는 학생이에요 아니요'])assert.equal(matchesSpeakingTarget(t),false);
});

test('speech matching uses the current sentence instead of the first sentence',()=>{
 assert.equal(matchesSpeakingTarget('커피를 좋아해요!', '커피를 좋아해요.'),true);
 assert.equal(matchesSpeakingTarget('저는 학생이에요.', '커피를 좋아해요.'),false);
 assert.equal(matchesSpeakingTarget('', ''),false);
});
test('all twelve exchange sentences persist speaking then advance once, including final practice handoff',async()=>{
 const {sentenceProgress}=await import('../src/sentence-state.js');
 const {prepareContent,interceptCompletion}=await import('../src/practice-content.js');
 for(const kind of ['korean','sentence']){
  await prepareContent(kind);
  let s=kind==='korean'?start():reduce({...freshState(),onboarded:true,onboardingLevel:2},{type:'sentence-start',id:3});
  for(let index=0;index<6;index++){
   const p=kind==='korean'?s.korean.lessons['3-1']:sentenceProgress(s);p.index=index;p.phase=kind==='korean'?'quiz':'arrange';p.selected=kind==='korean'?index%3:String(index%3);
   s=reduce(s,{type:`${kind}-check`});assert.equal((kind==='korean'?s.korean.lessons['3-1']:sentenceProgress(s)).phase,'speak');assert.ok(valid(s));
   s=load({getItem:()=>JSON.stringify(s)}).state;
   const action={type:`${kind}-speak-next`},next=reduce(s,action);
   if(index===5){const pending=interceptCompletion(s,next,kind,action);assert.ok(pending.practices);assert.ok(valid(pending));assert.ok(valid(load({getItem:()=>JSON.stringify(pending)}).state));}
   s=next;assert.equal((kind==='korean'?s.korean.lessons['3-1']:sentenceProgress(s)).phase,index===5?(kind==='korean'?'done':'summary'):'learn');
  }
 }
});
test('every active level-two Korean lesson persists speech, returns to quiz and migrates pending completion',async()=>{
 const {koreanLessons,koreanHasSpeaking}=await import('../src/korean-state.js');
 let count=0;
 for(const lesson of koreanLessons.filter(l=>koreanHasSpeaking(l.id))){
  for(let index=0;index<lesson.count;index++){
   const initial={...start(),korean:{version:4,active:lesson.id,lessons:{[lesson.id]:{...freshKoreanProgress(lesson.id),index,phase:'quiz',selected:index%3,started:true,caseSeen:true}}}};
   const spoken=reduce(initial,{type:'korean-check'});assert.equal(spoken.korean.lessons[lesson.id].phase,'speak');assert.equal(load({getItem:()=>JSON.stringify(spoken)}).blocked,false);
   const back=reduce(spoken,{type:'korean-previous'});assert.equal(back.korean.lessons[lesson.id].phase,'quiz');assert.equal(back.korean.lessons[lesson.id].selected,null);
   const next=reduce(spoken,{type:'korean-speak-next'});assert.equal(next.korean.lessons[lesson.id].phase,index===lesson.count-1?'done':'learn');count++;
  }
  const p={...freshKoreanProgress(lesson.id),index:lesson.count-1,phase:'quiz',selected:(lesson.count-1)%3,started:true,caseSeen:true};
  const old={...start(),korean:{version:4,active:lesson.id,lessons:{[lesson.id]:p}},practices:{[`ja-ko:korean:${lesson.id}`]:{version:1,caseVersion:1,round:0,mode:0,index:0,count:lesson.count,action:{type:'korean-check'}}}};
  const restored=load({getItem:()=>JSON.stringify(old)});assert.equal(restored.blocked,false);assert.equal(restored.state.practices[`ja-ko:korean:${lesson.id}`].action.type,'korean-speak-next');
 }
 assert.equal(count,15);assert.equal(koreanHasSpeaking('4-1'),false);assert.equal(koreanHasSpeaking('2-1'),false);
});
