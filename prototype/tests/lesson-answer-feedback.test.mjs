import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
import {freshDialogue} from '../src/dialogue-state.js';
import {freshReading,readingAnswers} from '../src/reading-state.js';
import {freshKoreanProgress} from '../src/korean-state.js';
import {isAdvancingCorrectAnswer,advancingQuestionKey} from '../src/lesson-answer-feedback.js';

test('legacy acknowledgement follows reducer grading without changing saved progress',()=>{
 for(const kind of ['dialogue','reading','korean'])for(const index of [0,2]){
  const s={...freshState(),onboardingLevel:kind==='reading'?5:4,courseDirection:kind==='korean'?'ja-ko':'ko-ja'};
  let p;if(kind==='dialogue')p=s.dialogue={...freshDialogue(),started:true,phase:'practice',index};
  if(kind==='reading')p=(s.readings={5:{...freshReading(),started:true,phase:'read',index}})[5];
  if(kind==='korean'){p={...freshKoreanProgress('4-1'),started:true,phase:'quiz',index};s.korean={version:4,active:'4-1',lessons:{'4-1':p}};}
  const answer=kind==='reading'?readingAnswers[5][index]:kind==='korean'?index%3:0;
  p.selected=(answer+1)%3;assert.equal(isAdvancingCorrectAnswer(s,kind,`${kind}-check`),false);
  p.selected=answer;const copy=structuredClone(s);assert.equal(isAdvancingCorrectAnswer(s,kind,`${kind}-check`),true);assert.deepEqual(s,copy);
  assert.equal(isAdvancingCorrectAnswer(s,kind,`${kind}-select`),false);
 }
});
test('existing pending reviews and difficulty two are not intercepted',()=>{
 const s={...freshState(),onboardingLevel:4,dialogue:{...freshDialogue(),started:true,phase:'practice',selected:0}};
 s.practices={'ko-ja:dialogue:0':{index:0}};assert.equal(isAdvancingCorrectAnswer(s,'dialogue','dialogue-check'),false);
 delete s.practices;s.onboardingLevel=2;assert.equal(isAdvancingCorrectAnswer(s,'dialogue','dialogue-check'),false);
});
test('acknowledgement identity survives settings but changes with the lesson question',()=>{
 const s={...freshState(),onboardingLevel:4,dialogue:{...freshDialogue(),started:true,phase:'practice',selected:0}};
 const key=advancingQuestionKey(s,'dialogue');s.settings.sound=false;s.settings.motion='off';assert.equal(advancingQuestionKey(s,'dialogue'),key);
 s.dialogue.index++;assert.notEqual(advancingQuestionKey(s,'dialogue'),key);
});
