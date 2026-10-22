import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
import {test,expect} from '@playwright/test';import {freshState} from '../../src/engine.js';import {expertCatalog} from '../../src/expert-state.js';
for(const direction of ['ko-ja','ja-ko'])for(const id of [1,2,3])test(`expert ${direction} ${id} daily story resume`,async({page})=>{
 await page.setViewportSize({width:id%2?320:390,height:844});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,koreanGuideSeenVersion:1,onboardingLevel:7,courseDirection:direction,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
 await useCatalogWithoutPacks(page);
 await page.goto('/playable.html');await expect(page.locator('.map-choice[data-action="expert"]')).toHaveCount(4);
 const enter=()=>page.locator(`[data-action="expert"][data-id="${id}"]`).last().click();await enter();
 const next=async()=>{await page.waitForTimeout(500);await page.locator('[data-action="expert-next"]').click();};
 await next();await next();await expect(page.locator('.reading-count')).toHaveCount(0);
 await page.locator('[data-action="home"]').first().click();await enter();await page.locator('[data-choice="resume"]').click();await expect(page.locator('.reading-count')).toHaveCount(0);expect(errors).toEqual([]);
});
test('expert final reflection uses shared completion and returns to map',async({page})=>{
 const p={discussionVersion:2,part:0,phase:'reflection',index:0,sentence:0,selected:null,retry:false,checked:false,attempts:0,started:true,completed:false,solved:[]};
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,koreanGuideSeenVersion:1,onboardingLevel:7,courseDirection:'ja-ko',expertActive:1,experts:{'ja-ko:expert:1':p},settings:{sound:false,motion:'off',textScale:1,audioRate:1}});
 await useCatalogWithoutPacks(page);
 await page.goto('/playable.html');await page.locator('[data-action="expert"][data-id="1"]').first().click();await page.locator('[data-choice="resume"]').click();await page.locator('[data-action="expert-next"]').click();await expect(page.locator('.practice-complete')).toBeVisible();await page.locator('[data-action="completed-next"]').click();await expect(page.locator('.view-home')).toBeVisible();
});

test('expert onboarding enters the daily discussion flow',async({page})=>{
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));},{...freshState(),onboarded:true,onboardingLevel:7,courseDirection:'ko-ja',settings:{sound:false,motion:'off',textScale:1,audioRate:1}});
 await useCatalogWithoutPacks(page);
 await page.goto('/playable.html#case');await expect(page.locator('.view-expert')).toBeVisible();await page.locator('[data-action="expert-next"]').click();await expect(page.locator('.expert-discussion h1')).toHaveText('새 맛집이 궁금한 친구');
});

for(const direction of ['ko-ja','ja-ko'])test(`expert ${direction} restart and cancel resume dialog`,async({page})=>{
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,koreanGuideSeenVersion:1,onboardingLevel:7,courseDirection:direction,settings:{sound:false,motion:'off',textScale:1,audioRate:1}});
 await useCatalogWithoutPacks(page);
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
 await useCatalogWithoutPacks(page);
 await page.goto('/playable.html');await page.locator('[data-action="expert"][data-id="0"]').first().click();await expect(page.locator('.reading-intro')).toBeVisible();await page.locator('[data-action="expert-next"]').click();await expect(page.locator('.expert-discussion h1')).toHaveText(direction==='ja-ko'?'新しいお店が気になる友達':'새 맛집이 궁금한 친구');
});
