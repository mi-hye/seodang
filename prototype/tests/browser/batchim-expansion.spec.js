import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {batchimExpansion} from '../../src/batchim-expansion-content.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
const key='seodang.web-prototype.v1';
async function start(page,id,width,phase='learn'){
 await page.setViewportSize({width,height:width===320?640:844});const state={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:'ja-ko',onboardingLevel:0,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1},korean:{version:4,active:id,lessons:{[id]:{index:6,phase,selected:null,retry:false,started:true,completed:false}}}};
 await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));window.clips=[];window.Audio=class{constructor(src){this.src=src;}play(){window.clips.push(this.src);queueMicrotask(()=>this.onended?.());return Promise.resolve();}pause(){}};},{key,state});
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');await page.locator('.home-start-card[data-action="korean"]').click();
}
const action=(page,name)=>page.locator(`[data-action="${name}"]`).first();
const advance=async(page,name)=>{await page.waitForTimeout(470);await action(page,name).click();};
for(const width of [320,390]){
 test(`batchim expansion learns each whole word and opens its final diagram ${width}`,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page,'1-9',width);
  for(const [n,item] of batchimExpansion.entries()){
   if(n===2||n===5)await advance(page,'korean-next');
   await expect(page.locator('.korean-zero-glyph')).toContainText(item.text);await expect(page.locator('.korean-letter-reading')).toContainText(`[${item.reading}]`);await expect(page.locator('.korean-batchim-sounds')).toContainText(item.glyph);
   await action(page,'pronunciation').click();await expect(page.locator('.pronunciation-glyph')).toHaveText(item.glyph);await expect(page.locator('.pronunciation-sample span')).toHaveText(item.text);await expect(page.locator('[data-pronunciation="position"]')).toHaveCount(0);await expect(page.locator('.pronunciation-diagram')).toBeVisible();
   await page.locator('[data-pronunciation="audio"]').click();await expect.poll(()=>page.evaluate(()=>window.clips.length)).toBeGreaterThan(n);
   if(n===3)await page.screenshot({path:`output/batchim-compound-diagram-${width}-${test.info().project.name}.png`});
   await page.locator('[data-pronunciation="close"]').click();await expect(action(page,'pronunciation')).toBeFocused();
   if(n===3)await page.screenshot({path:`output/batchim-compound-learn-${width}-${test.info().project.name}.png`});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await advance(page,'korean-next');
  }
  await expect(page.locator('.practice-complete')).toBeVisible();expect(errors).toEqual([]);
 });
 test(`batchim sound practice retries, resumes and completes ${width}`,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page,'1-10',width);
  for(const [n,item] of batchimExpansion.entries()){
   const index=n+6;await expect(page.locator('.korean-zero-glyph')).toContainText(item.text);await advance(page,'korean-next');await expect(page.locator('.korean-phase-quiz')).toBeVisible();await expect(page.locator('[data-korean-writing]')).toHaveCount(0);await expect(page.locator('.korean-batchim-word')).toContainText(item.text);await expect(page.locator('.korean-batchim-sounds')).toHaveCount(0);
   if(n===0){await advance(page,'korean-previous');await expect(page.locator('.korean-phase-learn')).toBeVisible();await advance(page,'korean-next');}
   const choices=page.locator('[data-action="korean-select"]');await expect(choices).toHaveCount(4);await choices.nth((index+1)%4).click();await page.waitForTimeout(470);await advance(page,'korean-check');await expect(page.locator('.incorrect')).toBeVisible();
   if(n===3){await page.reload();await page.locator('.home-start-card[data-action="korean"]').click();await expect(page.locator('.incorrect')).toBeVisible();await page.screenshot({path:`output/batchim-compound-retry-${width}-${test.info().project.name}.png`});}
   await choices.nth(index%4).click();await page.waitForTimeout(470);await advance(page,'korean-check');
  }
  await expect(page.locator('.korean-zero-finish')).toBeVisible();expect((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).korean.lessons['1-10']).toMatchObject({index:13,phase:'done',completed:true});await action(page,'completed-next').click();await expect(page.locator('.pronunciation-course')).toBeVisible();expect(errors).toEqual([]);
 });
}
