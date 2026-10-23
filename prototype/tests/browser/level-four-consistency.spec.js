import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {openMapLesson,collectMapLessons} from './learning-map-fixture.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`level four common lesson layout ${direction} ${width}`,async({page},info)=>{
 test.setTimeout(90000);await page.setViewportSize({width,height:844});
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));window.Audio=class{play(){queueMicrotask(()=>this.onended?.());return Promise.resolve()}pause(){}};},{...freshState(),onboarded:true,onboardingLevel:5,courseDirection:direction,koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');
 const lessons=await collectMapLessons(page);expect(lessons).toHaveLength(17);
 for(const l of lessons.filter(l=>!['video','song'].includes(l.kind))){
  await openMapLesson(page,{kind:l.kind,id:l.id});await expect(page.locator('.learning-map')).toHaveCount(0);
  const main=page.locator('main');await expect(main).toHaveClass(/level-four-lesson/);
  await expect(main.locator(`:scope>[data-action="${l.kind}-next"]`)).toHaveText(direction==='ko-ja'?'학습 시작하기':'学習を始める');
  // The shared legacy advance guard intentionally ignores taps within 450ms.
  await page.waitForTimeout(470);await main.locator(`:scope>[data-action="${l.kind}-next"]`).click();
  await expect(main.locator('.button-pair').last().locator('button').last()).toHaveText(direction==='ko-ja'?'연습하기':'練習する');
  for(const stage of ['learn','quiz']){
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   await expect(page.locator('[role="progressbar"]')).toHaveCount(1);
   const buttons=main.locator(':scope>.button-pair>button'),boxes=await buttons.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));expect(boxes).toHaveLength(2);expect(Math.abs(boxes[0].top-boxes[1].top)).toBeLessThan(2);expect(Math.abs(boxes[0].width-boxes[1].width)).toBeLessThan(2);
   if([1,4,7,8,13].includes(l.number))await page.screenshot({path:`output/level-four-${direction}-${l.number}-${stage}-${width}-${info.project.name}.png`,fullPage:true});
   if(stage==='learn'){await page.waitForTimeout(470);await buttons.last().click();}
  }
  await page.locator('.app-header [data-action="home"]').click();
 }
});
for(const direction of ['ko-ja','ja-ko'])test(`level four reading playback controls ${direction}`,async({page})=>{
 await page.setViewportSize({width:320,height:844});
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));window.Audio=class{play(){queueMicrotask(()=>this.onended?.());return Promise.resolve()}pause(){}};},{...freshState(),onboarded:true,onboardingLevel:5,courseDirection:direction,koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');const kind=direction==='ko-ja'?'reading':'korean';await openMapLesson(page,{kind,id:kind==='reading'?5:'5-1'});await page.locator(`[data-action="${kind}-next"]`).click();
 const row=page.locator('.reading-document .audio-text-row'),sound=row.locator('button');await expect(sound).toHaveCount(1);await expect(sound).toHaveAttribute('data-action',`${kind}-audio`);
 const boxes=await row.evaluate(e=>({label:e.querySelector('h2').getBoundingClientRect().right,sound:e.querySelector('button').getBoundingClientRect().left}));expect(boxes.sound).toBeGreaterThanOrEqual(boxes.label);
 const speed=page.locator('.reading-playback input');await expect(speed).toBeHidden();await page.locator('.reading-playback summary').click();await expect(speed).toBeVisible();await speed.fill('0.8');await speed.dispatchEvent('change');
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')).settings.audioRate)).toBe(0.8);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
