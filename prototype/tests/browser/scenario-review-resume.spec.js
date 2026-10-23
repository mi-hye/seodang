import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
import {test,expect} from '@playwright/test';
import {reduce} from '../../src/engine.js';
import {prepareContent,interceptCompletion} from '../../src/practice-content.js';
import {scenarioLessons,scenarioTitle} from '../../src/scenario-state.js';
import {reviewFixture} from '../level-two-review-fixtures.mjs';

await prepareContent('scenario');
for(const direction of ['ko-ja','ja-ko'])test(`completed scenario review survives home and reload ${direction}`,async({page})=>{
 const key=`${direction}:scenario:13`,{s,action}=reviewFixture(key);
 s.scenarios[key].completed=true;
 const state=interceptCompletion(s,reduce(s,action),'scenario',action),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:320,height:844});
 await page.addInitScript(s=>{if(!localStorage.getItem('seodang.web-prototype.v1'))localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},state);
 await useCatalogWithoutPacks(page);
 await page.goto('/playable.html');
 for(let i=0;i<2;i++){
  await expect(page.locator('.view-home')).toBeVisible();
  await expect(page.locator('#app')).toContainText(scenarioTitle(s,scenarioLessons.find(l=>l.id==='13')));
  await page.locator('[data-action="practice-resume"]').click();
  await expect(page.locator('.introduction-review')).toBeVisible();
  await expect(page.locator('.lesson-resume')).toHaveCount(0);
  await page.locator('.app-header [data-action="home"]').click();
  await page.reload();
 }
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));
 expect(saved.scenarios[key].completed).toBe(true);
 expect(saved.practices[key].index).toBe(0);
 expect(errors).toEqual([]);
});
