import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {openMapLesson,collectMapLessons} from './learning-map-fixture.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
const key='seodang.web-prototype.v1';
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`level three restored lessons and top images ${direction} ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:width===320?640:844});
 const state={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:direction,onboardingLevel:4,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}};
 await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{key,state});
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');
 await expect(page.locator('.home-start-card')).toHaveAttribute('data-action',direction==='ko-ja'?'dialogue':'korean');
 const lessons=await collectMapLessons(page);
 expect(lessons).toHaveLength(17);
 for(const [number,id]of [[13,'course3-13'],[14,'course3-14'],[16,'course3-16'],[2,'3'],[4,'6']])expect(lessons[number-1]).toMatchObject({number,kind:'scenario',id});
 expect(lessons[0]).toMatchObject(direction==='ko-ja'?{kind:'dialogue'}:{kind:'korean',id:'4-1'});
 for(const [number,id]of [[14,'course3-14'],[16,'course3-16'],[17,'course3-17']]){
  await openMapLesson(page,{kind:'scenario',id});
  const main=page.locator('main.course-expansion'),image=main.locator('img.scenario-image');
  await expect(main).toHaveClass(/scenario-illustrated/);
  await expect(page.locator('.app-header')).toContainText(`${number}.`);
  await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
  const geometry=await main.evaluate(el=>({top:el.getBoundingClientRect().top,imageTop:el.querySelector('img').getBoundingClientRect().top,align:getComputedStyle(el).justifyContent,first:el.firstElementChild.tagName,overflow:document.documentElement.scrollWidth>innerWidth+1}));
  expect(geometry.align).toBe('flex-start');expect(geometry.first).toBe('IMG');expect(geometry.imageTop-geometry.top).toBeLessThanOrEqual(13);expect(geometry.overflow).toBe(false);
  if(number===17)await page.screenshot({path:`output/level3-top-${direction}-${width}-${info.project.name}.png`});
  await page.locator('[data-action="scenario-next"]').click();await expect(main).not.toHaveClass(/scenario-illustrated/);
  await page.locator('[data-action="home"]').first().click();
 }
 for(const [number,kind,id]of [[1,direction==='ko-ja'?'dialogue':'korean',direction==='ko-ja'?undefined:'4-1'],[2,'scenario','3'],[4,'scenario','6']]){
  await openMapLesson(page,{kind,id});
  await expect(page.locator('.app-header')).toContainText(`${number}.`);
  const main=page.locator('main'),image=main.locator('img').first();
  await expect(image).toBeVisible();
  const gap=await image.evaluate(el=>el.getBoundingClientRect().top-el.closest('main').getBoundingClientRect().top);
  expect(gap).toBeLessThanOrEqual(13);
  expect(await main.evaluate(el=>getComputedStyle(el).justifyContent)).toBe('flex-start');
  await page.locator('[data-action="home"]').first().click();
 }
});
