import {chooseAudioRate} from './audio-rate-fixture.js';
import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {collectMapLessons,openMapLesson} from './learning-map-fixture.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
const key='seodang.web-prototype.v1';
for(const direction of ['ko-ja','ja-ko'])for(const level of [0,2,4,5,7])test(`shared listening speed ${direction} level ${level}`,async({page},info)=>{
 await page.setViewportSize({width:320,height:844});
 await page.addInitScript(({state,key})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
  localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
  window.rates=[];window.Audio=class{play(){window.rates.push(this.playbackRate);queueMicrotask(()=>this.onended?.());return Promise.resolve();}pause(){}};
 },{key,state:{...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:direction,onboardingLevel:level,settings:{sound:true,motion:'off',textScale:1.2,audioRate:2}}});
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');
 const lessons=await collectMapLessons(page),seen=new Set();
 for(const lesson of lessons.filter(l=>!['video','song'].includes(l.kind)).filter(l=>!seen.has(l.kind)&&seen.add(l.kind))){
  await openMapLesson(page,{...lesson,id:lesson.id??undefined});
  const speed=page.locator('.app-header [data-audio-rate]');await expect(speed).toHaveCount(1);
  await expect(speed).toHaveAttribute('data-audio-rate',seen.selected?'0.3':'1');await chooseAudioRate(page,speed,.3);seen.selected=true;
  await expect(speed).toHaveText('');
  const bounds=await speed.boundingBox();expect(bounds.height).toBeGreaterThanOrEqual(44);expect(bounds.x+bounds.width).toBeLessThanOrEqual(320);expect(await speed.evaluate(el=>getComputedStyle(el).color)).toBe(await page.locator('.app-header-title').evaluate(el=>getComputedStyle(el).color));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await expect(page.locator('.passage-speed')).toHaveCount(0);
  // Intro pages have no sound yet. Enter the first learning page if needed.
  let sound=page.locator('main button[data-action$="-audio"],main button[data-action="audio"],main [data-speaking-example]').first();
  if(!await sound.count()){
   const next=page.locator(`main [data-action="${lesson.kind}-next"]`).last();
   if(await next.count()){await next.click();sound=page.locator('main button[data-action$="-audio"],main button[data-action="audio"],main [data-speaking-example]').first();}
  }
  if(await sound.count()){await sound.click();await expect.poll(()=>page.evaluate(()=>window.rates.at(-1))).toBe(.3);}
  await page.screenshot({path:`output/global-speed-${direction}-${level}-${lesson.kind}-${info.project.name}.png`});
  await page.locator('.app-header [data-action="home"]').click();
 }
 expect(seen.size).toBeGreaterThan(0);
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).settings.audioRate,key)).toBe(.3);
});
