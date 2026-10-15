import test from 'node:test';
import assert from 'node:assert/strict';
import {guidePages,guideMascot,prepareGuide} from '../src/onboarding-guide.js';
import {existsSync} from 'node:fs';
test('three short walkthrough pages with real, bundled course examples in both languages',async()=>{
 assert.ok(existsSync(guideMascot));
 for(const direction of ['ko-ja','ja-ko'])for(let level=0;level<=7;level++){
  const pages=guidePages(level,direction);assert.equal(pages.length,3);assert.equal(pages[0].flow.length,3);assert.ok(pages.every(page=>page.title.length>0));
  if(direction==='ja-ko'?level<7:level>=6)assert.doesNotMatch(pages.map(page=>page.title+page.text).join(''),/[가-힣]/);
  const units=await prepareGuide(level,direction);assert.equal(units.length,2);assert.equal(units.demo.type,pages[0].type);if(units.demo.audio)assert.ok(existsSync(units.demo.audio));assert.notEqual(units[0].meaning,units[1].meaning);
  for(const unit of units)assert.ok(existsSync(unit.audio.audioFile),unit.audio.audioFile);
 }
});
