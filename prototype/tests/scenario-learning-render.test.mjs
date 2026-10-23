import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
import {freshScenario} from '../src/scenario-state.js';
import {scenarioContent,scenarioChoiceAudio,scenarioAudio} from '../src/scenario-content.js';
import {renderScenario,currentScenarioAudio} from '../src/scenario.js';
import {esc} from '../src/ui.js';

for(const direction of ['ko-ja','ja-ko'])for(const id of ['14','15','16','17'])test(`learned replies and their exact audio stay aligned: ${direction}/${id}`,()=>{
 const c=scenarioContent[direction][id];
 for(const [index,x] of c.items.entries()){
  const s={...freshState(),onboardingLevel:2,courseDirection:direction,scenarioActive:id,scenarios:{[`${direction}:scenario:${id}`]:{...freshScenario(id),started:true,phase:'learn',index}}};
  const html=renderScenario(s,title=>`<header>${esc(title)}</header>`);
  assert.match(html,/class="page case-lesson scenario-learning"/);
  assert.match(html,new RegExp(`lang="${direction==='ko-ja'?'ja':'ko'}"`));
  assert.ok(html.includes(esc(x.answerMeaning)));assert.ok(x.learnNote?.length>10);
  assert.equal((html.match(/role="progressbar"/g)||[]).length,1);
  assert.ok(!html.includes('data-action="scenario-select"'));
  assert.ok(!html.includes('data-action="scenario-check"'));
  assert.ok(!html.includes('data-choice-audio'));
  assert.equal((html.match(/class="case-lesson-image"/g)||[]).length,0);
  const audio=scenarioChoiceAudio(direction,id,index,0);
  assert.equal(audio.text,x.answer);
  assert.deepEqual(currentScenarioAudio(s),scenarioAudio(direction,id,index));
  assert.deepEqual(currentScenarioAudio(s,'answer'),audio);
  assert.deepEqual(currentScenarioAudio(s,'prompt'),scenarioAudio(direction,id,index));
  assert.match(html,/data-model-prompt/);assert.match(html,/data-model-answer/);
  assert.equal((html.match(/data-action="scenario-audio"/g)||[]).length,2);
  for(const hidden of ['reply','choice:0','choice:1','choice:2','0:answer','2:reply'])assert.equal(currentScenarioAudio(s,hidden),null);
 }
});
