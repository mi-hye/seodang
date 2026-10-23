import {openMapLesson} from './learning-map-fixture.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';import {scenarioLessons} from '../../src/scenario-state.js';
// Interactive roleplay, message, listening-intent and reply-repair flows have dedicated specs.
for(const width of [320,390])for(const direction of ['ko-ja','ja-ko'])for(const lesson of scenarioLessons.filter(l=>['2','3','4','6','7','13'].includes(l.id)))test(`${direction} new level ${lesson.id} at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===320?640:844});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const state={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:direction,onboardingLevel:lesson.level,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}};
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},state);
 // Exercise local UI independently of the CDN; real audio download is checked separately.
 await useCatalogWithoutPacks(page);
 await page.goto('/playable.html');
 await openMapLesson(page,{kind:'scenario',id:lesson.id});
 const click=async a=>page.locator(`[data-action="${a}"]`).click();
 const check=async()=>{if(['2','3','6','7'].includes(lesson.id)&&!await page.locator('.practice-complete, .introduction-review').count()){const image=page.locator('.scenario-image, .case-lesson-image');await expect(image).toBeVisible();expect(await image.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);const gap=await page.evaluate(()=>{const img=document.querySelector('.scenario-image, .case-lesson-image').getBoundingClientRect(),progress=document.querySelector('.lesson-progress, .scenario-progress').getBoundingClientRect();return img.top-progress.bottom;});expect(gap).toBeLessThan(72);}expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);const pair=page.locator('.scenario-page .button-pair, .case-lesson .button-pair, .reading-page>.button-pair');if(await pair.count()){const b=await pair.locator('button').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().top));expect(Math.abs(b[0]-b[1])).toBeLessThan(2);}};
 await expect(page.locator('.scenario-page h1, .reading-page h1')).toContainText(lesson.titles[direction==='ja-ko'?1:0]);await check();await click('scenario-next');
 for(let i=0;i<3;i++){
  await expect(page.locator('.scenario-text, .reading-passage')).toBeVisible();await check();
  if(lesson.id==='3'&&direction==='ko-ja'&&i===0){
   const spans=page.locator('.scenario-text .text-phrase');
   await expect(spans.first()).toHaveText('お名前を');
   const boxes=await spans.evaluateAll(xs=>xs.map(x=>({text:x.textContent,top:x.getBoundingClientRect().top,bottom:x.getBoundingClientRect().bottom})));
   expect(boxes[0].top).toBeLessThanOrEqual(boxes[1].top+1);
   expect(boxes[2].top).toBeGreaterThanOrEqual(boxes[1].bottom-1);
   await expect(page.locator('.case-lesson')).toContainText('お名前（おなまえ·오나마에）');
  }

  if(lesson.id==='4'){expect(await page.locator('.passage-player').evaluate(el=>el.getBoundingClientRect().top>=document.querySelector('.reading-passage').getBoundingClientRect().bottom)).toBe(true);}else{const pos=await page.locator('.audio-text-row').evaluate(el=>{const text=el.querySelector('.scenario-text').getBoundingClientRect(),button=el.querySelector('[data-action="scenario-audio"]').getBoundingClientRect();return button.x>=text.right-1;});expect(pos).toBe(true);}
  if(i===0&&['6','7','13'].includes(lesson.id))await page.screenshot({path:`output/scenario${lesson.id}-learn-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
  if(i===1&&lesson.id!=='4'){await click('home');await openMapLesson(page,{kind:'scenario',id:lesson.id});await page.locator('[data-choice="resume"]').click();await expect(page.locator('.scenario-count, .case-lesson-count, .reading-count')).toHaveCount(0);}
  if(lesson.id==='5'&&direction==='ja-ko')expect(await page.locator('.scenario-page').getAttribute('lang')).toBe('ko');
  await click('scenario-next');await check();
  if(lesson.id==='2'){for(const n of [2,1,0])await page.locator(`.token-builder-choices [data-id="${n}"]`).click();}
  else await page.locator(`[data-action="scenario-select"][data-id="${(i+1)%3}"]`).click();
  await click('scenario-check');await expect(page.locator('.scenario-page [role="status"], .reading-page [role="status"]')).toBeVisible();
  if(lesson.id==='2'){for(const n of [2,1,0])await page.locator(`.token-builder-answer [data-id="${n}"]`).click();for(const n of [0,1,2])await page.locator(`.token-builder-choices [data-id="${n}"]`).click();}
  else await page.locator(`[data-action="scenario-select"][data-id="${i}"]`).click();
  await click('scenario-check');await check();await click('scenario-next');if(['2','6','7','13'].includes(lesson.id)){await expect(page.locator('[data-speaking-record]')).toBeVisible();await page.locator('[data-speaking-skip]').click();}
 }
 if(lesson.level===2){
  // The dedicated level-two-review spec completes all twelve review steps.
  // This spec verifies that finishing the source lesson hands off without credit.
  await expect(page.locator('.introduction-review')).toBeVisible();
  await expect(page.locator('.practice-complete')).toHaveCount(0);
  await expect(page.locator('.lesson-progress')).toHaveCount(1);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1'))),key=`${direction}:scenario:${lesson.id}`;
  expect(saved.practices[key]).toMatchObject({index:0,count:12,action:{type:'scenario-speak-next'}});
  expect(saved.scenarios[key].completed).toBe(false);expect(saved.scenarios[key].phase).toBe('speak');
  expect(saved.studyTools?.[direction]?.lessons?.[key]).toBeUndefined();
  const history=direction==='ja-ko'?saved.korean?.history:saved.history;
  expect(Object.values(history?.days||{}).reduce((n,d)=>n+d.cases,0)).toBe(0);
 }else{
  await expect(page.locator('.lesson-complete-shell .practice-complete')).toBeVisible();await expect(page.locator('.practice-fireworks svg')).toBeVisible();await expect(page.locator('[data-action="completed-next"]')).toBeInViewport();
 }
 await check();expect(errors).toEqual([]);
 await page.screenshot({path:`output/scenario-${direction}-${lesson.id}-${width}-${test.info().project.name}.png`,fullPage:true});
 await click(lesson.level===2?'home':'completed-next');await expect(page.locator('.view-home')).toBeVisible();
});
