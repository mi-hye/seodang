import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {openMapLesson,collectMapLessons} from './learning-map-fixture.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
const key='seodang.web-prototype.v1';
for(const direction of ['ko-ja','ja-ko'])for(const level of [1,2,4,5,7])for(const width of [320,390])test(`photo introduction ${direction} level ${level} width ${width}`,async({page},info)=>{
 test.setTimeout(60000);
 await page.setViewportSize({width,height:width===320?640:844});
 const state={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:direction,onboardingLevel:level,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}};
 await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));window.Audio=class{play(){queueMicrotask(()=>this.onended?.());return Promise.resolve()}pause(){}};},{key,state});
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');
 const lessons=await collectMapLessons(page),report=[];
 for(const lesson of lessons.filter(l=>l.kind&&!['video','song'].includes(l.kind)&&(level!==1||['sentence','korean'].includes(l.kind)))){
  const target={kind:lesson.kind,...(lesson.id===null?{}:{id:lesson.id})};
  await openMapLesson(page,target);
  await expect(page.locator('.learning-map')).toHaveCount(0);
  const main=page.locator('main');await expect(main).toBeVisible();
  const photo=main.locator('img.scenario-image,img.case-lesson-image,img.sentence-image,img.korean-scene-image,.kana-case-image,.scene img').first();
  if(level===4&&lesson.number>=7)await expect(photo,`Missing level 3-${lesson.number} photo`).toHaveCount(1);
  if(await photo.count()){
   await expect(photo).toBeVisible();await expect.poll(()=>photo.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
   const layout=await photo.evaluate(el=>{const main=el.closest('main'),bar=document.querySelector('.lesson-progress,.scenario-progress'),header=document.querySelector('.app-header'),r=el.getBoundingClientRect();return{className:main.className,photoY:r.top,mainGap:r.top-main.getBoundingClientRect().top,headerGap:r.top-(bar||header).getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth+1,justify:getComputedStyle(main).justifyContent};});
   report.push({...lesson,...layout});
   expect.soft(layout.mainGap,JSON.stringify({direction,level,...lesson,...layout})).toBeLessThanOrEqual(32);
   expect.soft(layout.headerGap,JSON.stringify({direction,level,...lesson,...layout})).toBeLessThanOrEqual(40);
   expect.soft(layout.overflow,JSON.stringify(lesson)).toBe(false);
   if(lesson.number>=13&&width===320)await page.screenshot({path:`output/image-audit-${direction}-${level}-${lesson.number}-${info.project.name}.png`});
  }else report.push({...lesson,photo:false});
  if(level===4&&lesson.number===7){await page.locator('[data-action="scenario-next"]').click();await expect(page.locator('main img.scenario-image')).toHaveCount(0);await page.locator('[data-action="scenario-select"][data-id="0"]').click();await page.locator('[data-action="scenario-check"]').click();await expect(page.locator('main img.scenario-image')).toHaveCount(0);}
  await page.locator('[data-action="home"]').first().click();
 }
 await info.attach('image-audit',{body:JSON.stringify(report,null,2),contentType:'application/json'});
});
