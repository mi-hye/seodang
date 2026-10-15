import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {freshState} from '../src/engine.js';import {freshReading} from '../src/reading-state.js';import {currentReadingAudio,renderReading} from '../src/reading.js';import {displayLevel} from '../src/curriculum.js';
for(const level of [5,6])test(`visible level ${displayLevel(level)} has full passage recordings in learning and question phases`,()=>{
 assert.equal(displayLevel(level),4);
 const manifest=JSON.parse(readFileSync('assets/audio/reading/manifest.json'));
 for(let index=0;index<6;index++)for(const phase of ['intro','learn','read','done']){
  const s={...freshState(),onboarded:true,onboardingLevel:level,readings:{[level]:{...freshReading(),index,phase}}};const audio=currentReadingAudio(s);
  if(['intro','done'].includes(phase)){assert.equal(audio,null);continue;}
  const meta=manifest.files[audio.id];assert.equal(audio.text,meta.text);assert.equal(audio.voiceId,meta.voiceId);assert.ok(!audio.text.includes('|'));
  assert.equal(createHash('sha256').update(readFileSync(audio.audioFile)).digest('hex'),meta.sha256);
  assert.match(renderReading(s),/passage-audio/);assert.match(renderReading(s),/data-action="reading-audio"/);
 }
});
