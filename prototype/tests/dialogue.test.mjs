import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';import {valid,load} from '../src/storage.js';
import {dialogueAudio} from '../src/dialogue-content.js';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
test('level 4 learning, wrong answers, retry, save, back navigation, completion and replay are isolated',()=>{
 let s=freshState();const episode=structuredClone(s.episode);s=reduce(s,{type:'level',value:4});s=reduce(s,{type:'dialogue-start'});
 s=reduce(s,{type:'dialogue-next'});assert.equal(s.dialogue.phase,'learn');s=reduce(s,{type:'dialogue-previous'});assert.equal(s.dialogue.phase,'intro');
 for(let i=0;i<4;i++)s=reduce(s,{type:'dialogue-next'});assert.equal(s.dialogue.phase,'practice');assert.equal(s.dialogue.index,0);assert.deepEqual(s.dialogue.learned,[0,1,2]);
 s=reduce(s,{type:'dialogue-check'});assert.equal(s.dialogue.index,0);
 for(let i=0;i<3;i++){
  s=reduce(s,{type:'dialogue-select',id:'1'});s=reduce(s,{type:'dialogue-check'});assert.equal(s.dialogue.index,i);assert.ok(s.dialogue.feedback);
  assert.ok(valid(s));assert.deepEqual(load({getItem:()=>JSON.stringify(s)}).state.dialogue,s.dialogue);
  s=reduce(s,{type:'dialogue-select',id:'0'});s=reduce(s,{type:'dialogue-check'});
 }
 assert.equal(s.dialogue.completed,true);assert.equal(s.dialogue.phase,'done');assert.equal(s.onboardingLevel,4);assert.deepEqual(s.episode,episode);assert.ok(s.history.completed.includes('dialogue'));
 const count=Object.values(s.history.days).reduce((n,d)=>n+d.cases,0);s=reduce(s,{type:'dialogue-start'});assert.equal(s.dialogue.phase,'intro');assert.equal(s.dialogue.completed,true);assert.equal(Object.values(s.history.days).reduce((n,d)=>n+d.cases,0),count);
});
test('every level 4 question and response has bundled matching audio',()=>{
 const manifest=JSON.parse(readFileSync('assets/audio/dialogue/manifest.json'));
 for(const [id,a] of Object.entries(dialogueAudio)){const m=manifest.files[id];assert.equal(m.text,a.text);const b=readFileSync(a.audioFile);assert.equal(createHash('sha256').update(b).digest('hex'),m.sha256);assert.equal(b.toString('ascii',0,4),'RIFF');}
});
