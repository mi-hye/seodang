import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';import {scenarioLessons} from '../../src/scenario-state.js';
for(const width of [320,390])for(const direction of ['ko-ja','ja-ko'])for(const lesson of scenarioLessons)test(`${direction} new level ${lesson.id} at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===320?640:844});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const state={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:direction,onboardingLevel:lesson.level,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}};
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},state);
 // Exercise local UI independently of the CDN; real audio download is checked separately.
 await page.route('**/assets/audio/catalog.json',async route=>{const r=await route.fetch();const c=await r.json();await route.fulfill({json:{...c,packs:{}}});});
 await page.goto('/playable.html');
 const entry=page.locator(`[data-action="scenario"][data-id="${lesson.id}"]`);await entry.first().click();
 const click=async a=>page.locator(`[data-action="${a}"]`).click();
 const check=async()=>{if(['2','3'].includes(lesson.id)&&!await page.locator('.practice-complete').count()){const image=page.locator('.scenario-image');await expect(image).toBeVisible();expect(await image.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);const gap=await page.evaluate(()=>{const img=document.querySelector('.scenario-image').getBoundingClientRect(),progress=document.querySelector('.scenario-progress').getBoundingClientRect();return img.top-progress.bottom;});expect(gap).toBeLessThan(60);}expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);const pair=page.locator('.scenario-page .button-pair');if(await pair.count()){const b=await pair.locator('button').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().top));expect(Math.abs(b[0]-b[1])).toBeLessThan(2);}};
 await expect(page.locator('.scenario-page h1')).toContainText(lesson.titles[direction==='ja-ko'?1:0]);await check();await click('scenario-next');
 for(let i=0;i<3;i++){
  await expect(page.locator('.scenario-text')).toBeVisible();await check();
  if(lesson.id==='3'&&direction==='ko-ja'&&i===0){
   const spans=page.locator('.scenario-text .text-phrase');
   await expect(spans.first()).toHaveText('お名前を');
   const boxes=await spans.evaluateAll(xs=>xs.map(x=>({text:x.textContent,top:x.getBoundingClientRect().top,bottom:x.getBoundingClientRect().bottom})));
   expect(boxes[0].top).toBeLessThanOrEqual(boxes[1].top+1);
   expect(boxes[2].top).toBeGreaterThanOrEqual(boxes[1].bottom-1);
   await expect(page.locator('.scenario-page')).toContainText('お名前（おなまえ·오나마에）');
  }

  const pos=await page.locator('.audio-text-row').evaluate(el=>{const text=el.querySelector('.scenario-text').getBoundingClientRect(),button=el.querySelector('[data-action="scenario-audio"]').getBoundingClientRect();return button.x>=text.right-1;});expect(pos).toBe(true);
  if(i===1){await click('home');await page.locator(`[data-action="scenario"][data-id="${lesson.id}"]`).first().click();await expect(page.locator('.scenario-count')).toHaveText('2 / 3');}
  if(lesson.id==='5'&&direction==='ja-ko')expect(await page.locator('.scenario-page').getAttribute('lang')).toBe('ko');
  await click('scenario-next');await check();
  if(lesson.id==='2'){for(const n of [2,1,0])await page.locator(`.token-builder-choices [data-id="${n}"]`).click();}
  else await page.locator(`[data-action="scenario-select"][data-id="${(i+1)%3}"]`).click();
  await click('scenario-check');await expect(page.locator('.scenario-page [role="status"]')).toBeVisible();
  if(lesson.id==='2'){for(const n of [2,1,0])await page.locator(`.token-builder-answer [data-id="${n}"]`).click();for(const n of [0,1,2])await page.locator(`.token-builder-choices [data-id="${n}"]`).click();}
  else await page.locator(`[data-action="scenario-select"][data-id="${i}"]`).click();
  await click('scenario-check');await check();await click('scenario-next');if(lesson.id==='2'){await expect(page.locator('[data-speaking-record]')).toBeVisible();await page.locator('[data-speaking-skip]').click();}
 }
 await expect(page.locator('.lesson-complete-shell .practice-complete')).toBeVisible();await expect(page.locator('.practice-fireworks svg')).toBeVisible();await expect(page.locator('[data-action="completed-next"]')).toBeInViewport();await check();expect(errors).toEqual([]);
 await page.screenshot({path:`output/scenario-${direction}-${lesson.id}-${width}-${test.info().project.name}.png`,fullPage:true});
 await click('completed-next');await expect(page.locator('.view-home')).toBeVisible();
});
