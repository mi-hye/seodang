import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {freshScenario,scenarioProgress,scenarioKey} from '../src/scenario-state.js';
import {valid} from '../src/storage.js';
import {renderScenario,currentScenarioAudio} from '../src/scenario.js';
import {scenarioContent} from '../src/scenario-content.js';
import {freshReading,reduceReading} from '../src/reading-state.js';
for(const direction of ['ko-ja','ja-ko'])for(const id of ['9','10','11','12'])test(`level four learn-first progression and old saves ${direction}/${id}`,()=>{
 const base={...freshState(),onboardingLevel:['11','12'].includes(id)?7:5,courseDirection:direction,scenarioActive:id};
 const act=(s,type,value)=>reduce(s,{type,id:value});
 let s=act(base,'scenario-start',id);s=act(s,'scenario-next');
 for(let index=0;index<3;index++){
  assert.equal(scenarioProgress(s).phase,'learn');assert.equal(scenarioProgress(s).index,index);
  const html=renderScenario(s,t=>`<header>${t}</header>`),x=scenarioContent[direction][id].items[index];
  assert.ok(!html.includes('data-action="scenario-check"'));assert.ok(!html.includes('undefined'));
  assert.equal(currentScenarioAudio(s,'prompt').text,x.text);
  assert.equal(currentScenarioAudio(s,'answer')?.text,id!=='10'?x.answer:undefined);
  s=act(s,'scenario-next');assert.equal(scenarioProgress(s).phase,'quiz');
  s=act(s,'scenario-previous');assert.equal(scenarioProgress(s).phase,'learn');assert.equal(scenarioProgress(s).index,index);
  s=act(s,'scenario-next');
  if(['9','12'].includes(id))for(const part of [0,1,2])s=act(s,'scenario-token',part);else s=act(s,'scenario-select',index);
  s=act(s,'scenario-check');assert.equal(scenarioProgress(s).checked,true);s=act(s,'scenario-next');assert.ok(valid(s));
 }
 assert.equal(scenarioProgress(s).completed,true);
 for(const checked of [false,true]){
  const old={...freshScenario(id),started:true,phase:'quiz',index:1,selected:1,checked};delete old.learningVersion;
  const legacy={...base,scenarios:{[scenarioKey(base)]:old}};assert.ok(valid(legacy));
  const resumed=act(legacy,'scenario-start',id);assert.equal(scenarioProgress(resumed).phase,checked?'quiz':'learn');assert.equal(scenarioProgress(resumed).index,1);assert.ok(valid(resumed));
  const completed={...legacy,scenarios:{[scenarioKey(base)]:{...old,completed:true,phase:'done'}}};
  assert.equal(scenarioProgress(act(completed,'scenario-start',id)).completed,true);
 }
});
for(const level of [5,6])test(`reading ${level} previous returns from learning without losing passage`,()=>{
 const p={...freshReading(),started:true,phase:'learn',index:2,solved:[0,1]};
 const prev=reduceReading(p,{type:'reading-previous'},level);assert.equal(prev.phase,'intro');assert.equal(prev.index,2);assert.deepEqual(prev.solved,[0,1]);
 assert.deepEqual(reduceReading(prev,{type:'reading-next'},level),p);
});
