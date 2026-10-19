import {test,expect} from '@playwright/test';import {freshState} from '../../src/engine.js';import {expertCatalog} from '../../src/expert-state.js';
for(const direction of ['ko-ja','ja-ko'])for(const id of [0,1,2,3])test(`expert ${direction} ${id} article quiz review resume`,async({page})=>{
 await page.setViewportSize({width:id%2?320:390,height:844});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,koreanGuideSeenVersion:1,onboardingLevel:7,courseDirection:direction,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
 await page.route('**/assets/audio/catalog.json',async r=>{const response=await r.fetch(),c=await response.json();await r.fulfill({json:{...c,packs:{}}});});
 await page.goto('/playable.html');await expect(page.locator('.map-choice[data-action="expert"]')).toHaveCount(4);
 const enter=()=>page.locator(`[data-action="expert"][data-id="${id}"]`).last().click();await enter();
 const next=async()=>{await page.waitForTimeout(500);await page.locator('[data-action="expert-next"]').click();};await next();await expect(page.locator('.reading-passage')).toHaveCount(1);await next();
 const c=expertCatalog[direction][id];for(const answer of c.answers){
  await page.locator(`[data-action="expert-select"][data-id="${(answer+1)%c.choices}"]`).click();const check=page.locator('[data-action="expert-check"]');await check.scrollIntoViewIfNeeded();const y=await page.evaluate(()=>scrollY);await check.click();await expect(page.locator('.reading-feedback')).toBeVisible();expect(Math.abs(await page.evaluate(()=>scrollY)-y)).toBeLessThan(3);
  await page.locator(`[data-action="expert-select"][data-id="${answer}"]`).click();await check.click();await next();
 }
 await expect(page.locator('.expert-translation')).toBeVisible();await expect(page.locator('[data-action="expert-audio"]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 if(direction==='ko-ja'){await page.locator('[data-action="lesson-kanji"]').click();await expect(page.locator('.kanji-definition')).toBeVisible();await page.locator('[data-kanji-close]').click();}else{await expect(page.locator('.expert-hanja')).toHaveCount(0);await expect(page.locator('[data-action="lesson-kanji"]')).toHaveCount(0);}
 await page.screenshot({path:`output/expert-${direction}-${id}-${test.info().project.name}.png`,fullPage:true});
 await next();await page.locator('[data-action="home"]').first().click();await enter();await page.locator('[data-choice="resume"]').click();await expect(page.locator('.reading-count')).toHaveText(`2 / ${c.sentences}`);expect(errors).toEqual([]);
});
test('expert final sentence uses shared completion and returns to map',async({page})=>{
 const p={phase:'review',index:0,sentence:4,selected:null,retry:false,checked:false,attempts:1,started:true,completed:false,solved:[0]};
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,koreanGuideSeenVersion:1,onboardingLevel:7,courseDirection:'ja-ko',expertActive:0,experts:{'ja-ko:expert:0':p},settings:{sound:false,motion:'off',textScale:1,audioRate:1}});
 await page.route('**/assets/audio/catalog.json',async r=>{const response=await r.fetch(),c=await response.json();await r.fulfill({json:{...c,packs:{}}});});
 await page.goto('/playable.html');await page.locator('[data-action="expert"][data-id="0"]').first().click();await page.locator('[data-choice="resume"]').click();await page.locator('[data-action="expert-next"]').click();await expect(page.locator('.practice-complete')).toBeVisible();await page.locator('[data-action="completed-next"]').click();await expect(page.locator('.view-home')).toBeVisible();
});

test('expert onboarding enters the single article flow',async({page})=>{
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));},{...freshState(),onboarded:true,onboardingLevel:7,courseDirection:'ko-ja',settings:{sound:false,motion:'off',textScale:1,audioRate:1}});
 await page.route('**/assets/audio/catalog.json',async r=>{const response=await r.fetch(),c=await response.json();await r.fulfill({json:{...c,packs:{}}});});
 await page.goto('/playable.html#case');await expect(page.locator('.view-expert')).toBeVisible();await page.locator('[data-action="expert-next"]').click();await expect(page.locator('.reading-passage')).toHaveCount(1);
});

for(const direction of ['ko-ja','ja-ko'])test(`expert ${direction} restart and cancel resume dialog`,async({page})=>{
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,koreanGuideSeenVersion:1,onboardingLevel:7,courseDirection:direction,settings:{sound:false,motion:'off',textScale:1,audioRate:1}});
 await page.route('**/assets/audio/catalog.json',async r=>{const response=await r.fetch(),c=await response.json();await r.fulfill({json:{...c,packs:{}}});});
 await page.goto('/playable.html');const enter=()=>page.locator('[data-action="expert"][data-id="0"]').first().click();
 await enter();await expect(page.locator('.lesson-resume')).toHaveCount(0);await page.locator('[data-action="expert-next"]').click();await page.locator('[data-action="home"]').first().click();
 await enter();await expect(page.locator('.lesson-resume')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.view-home')).toBeVisible();
 await enter();await page.locator('[data-choice="restart"]').click();await expect(page.locator('.reading-intro')).toBeVisible();
 await page.locator('[data-action="home"]').first().click();await enter();await expect(page.locator('.lesson-resume')).toHaveCount(0);
});
for(const direction of ['ko-ja','ja-ko'])test(`expert ${direction} legacy first lesson opens with guidance`,async({page})=>{
 const s={...freshState(),onboarded:true,koreanGuideSeenVersion:1,onboardingLevel:7,courseDirection:direction,settings:{sound:false,motion:'off',textScale:1,audioRate:1}};
 if(direction==='ko-ja')s.readings={7:{version:1,started:true,index:0,selected:null,retry:false,completed:false,phase:'read',solved:[]}};
 else s.korean={version:4,active:'7-1',lessons:{'7-1':{phase:'learn',index:0,selected:null,retry:false,started:true,completed:false}}};
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},s);
 await page.route('**/assets/audio/catalog.json',async r=>{const response=await r.fetch(),c=await response.json();await r.fulfill({json:{...c,packs:{}}});});
 await page.goto('/playable.html');await page.locator('[data-action="expert"][data-id="0"]').first().click();await expect(page.locator('.reading-intro')).toBeVisible();await page.locator('[data-action="expert-next"]').click();await expect(page.locator('.reading-passage')).toBeVisible();
});
