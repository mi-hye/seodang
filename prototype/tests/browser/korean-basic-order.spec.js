import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
for(const width of [320,390])test(`basic consonants stay in order with separate name and example sounds ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===320?640:844});
 const state={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:'ja-ko',onboardingLevel:0,settings:{sound:false,motion:'off',textScale:1.2},korean:{version:4,active:'1-1',lessons:{'1-1':{contentVersion:1,index:6,phase:'learn',selected:null,retry:false,started:true,completed:false}}}};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(state=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(state));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));window.clips=[];window.Audio=class{constructor(src){this.src=src;}play(){window.clips.push(this.src);queueMicrotask(()=>this.onended?.());return Promise.resolve();}pause(){}};},state);
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');await page.locator('.home-start-card').click();
 const chars=Array.from('ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'),syllables=Array.from('가나다라마바사아자차카타파하');
 for(const [i,char]of chars.entries()){
  await expect(page.locator('.korean-zero-glyph>span')).toHaveText(char);await expect(page.locator('.korean-letter-equation strong')).toHaveText(syllables[i]);
  if(char==='ㅁ'){
   await page.locator('[data-action=korean-audio]').click();await expect.poll(()=>page.evaluate(()=>window.clips.length)).toBeGreaterThan(0);const count=await page.evaluate(()=>window.clips.length);
   await page.locator('[data-action=korean-example-audio]').click();await expect.poll(()=>page.evaluate(()=>window.clips.length)).toBeGreaterThan(count);expect(await page.evaluate(()=>window.clips.at(-1))).toContain('ko-KR-4c4cc0773cb41a79.m4a');
   await page.screenshot({path:`output/basic-order-ma-${width}-${test.info().project.name}.png`});
   await page.locator('[data-action=pronunciation]').click();await expect(page.locator('.pronunciation-sample span')).toHaveText('마');await expect(page.locator('.pronunciation-note')).toContainText('すぐ口を開き');await page.locator('[data-pronunciation=audio]').click();await expect(page.locator('[data-pronunciation=audio]')).toBeEnabled();expect(await page.evaluate(()=>window.clips.at(-1))).toContain('ko-KR-4c4cc0773cb41a79.m4a');await page.locator('[data-pronunciation=close]').click();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.waitForTimeout(470);await page.locator('[data-action=korean-next]').click();
  if(await page.locator('.korean-zero-intro').count()){await page.waitForTimeout(470);await page.locator('[data-action=korean-next]').click();}
 }
 await expect(page.locator('.practice-complete')).toBeVisible();await page.locator('[data-action=completed-next]').click();await expect(page.locator('.korean-zero-glyph>span')).toHaveText('아');expect(errors).toEqual([]);
});
