import {test,expect} from '@playwright/test';
import {reviewFixture} from '../level-two-review-fixtures.mjs';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';

async function openMap(page,{motion='system',reducedMotion='no-preference'}={}){
 const {s}=reviewFixture('ja-ko:scenario:14');s.settings.motion=motion;
 const errors=[],riveRequests=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(/\/assets\/(?:vendor\/rive\/|rive\/)/.test(request.url()))riveRequests.push(request.url());});
 await page.setViewportSize({width:320,height:640});
 await page.emulateMedia({reducedMotion});
 await page.addInitScript(state=>{
  localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(state));
  localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
 },s);
 await useCatalogWithoutPacks(page);
 await page.goto('/playable.html');
 await expect(page.locator('.map-mascot')).toBeVisible();
 return {errors,riveRequests};
}

async function openResume(page){
 await page.locator('.map-choice[data-action="scenario"][data-id="14"]').click();
 await expect(page.locator('.lesson-resume')).toBeVisible();
}

for(const settings of [{motion:'off'},{reducedMotion:'reduce'}])test(`map keeps its original still pose for ${JSON.stringify(settings)}`,async({page})=>{
 const {errors,riveRequests}=await openMap(page,settings);
 await expect(page.locator('.map-mascot')).toHaveAttribute('data-renderer','fallback');
 await expect(page.locator('.map-mascot-still')).toBeVisible();
 await openResume(page);
 await page.locator('[data-choice="resume"]').click();
 await expect(page.locator('.view-scenario')).toBeVisible();
 await page.locator('.app-header [data-action="home"]').click();
 await expect(page.locator('.map-mascot')).toHaveAttribute('data-renderer','fallback');
 await expect(page.locator('.map-mascot-still')).toBeVisible();
 await expect(page.locator('.guide-rive-canvas')).toHaveCount(0);
 expect(await page.evaluate(()=>Boolean(window.rive))).toBe(false);
 expect(riveRequests).toEqual([]);
 expect(errors).toEqual([]);
});

test('animated map survives resume sheet and lesson transitions',async({page})=>{
 const {errors,riveRequests}=await openMap(page);
 // Exercise the real runtime, including its own ResizeObserver, before each sheet.
 for(let round=0;round<4;round++){
  await expect(page.locator('.map-mascot')).toHaveAttribute('data-renderer','rive');
  await expect(page.locator('.map-mascot .guide-rive-canvas')).toHaveCount(1);
  await openResume(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('.lesson-resume')).toHaveCount(0);
  await expect(page.locator('.map-mascot')).toHaveAttribute('data-renderer','rive');
  await openResume(page);
  await page.locator('[data-choice="resume"]').click();
  await expect(page.locator('.view-scenario')).toBeVisible();
  await expect(page.locator('.guide-rive-canvas')).toHaveCount(0);
  await page.locator('.app-header [data-action="home"]').click();
 }
 await expect(page.locator('.map-mascot')).toHaveAttribute('data-renderer','rive');
 expect(riveRequests.some(url=>url.endsWith('/rive.js'))).toBe(true);
 expect(riveRequests.some(url=>url.endsWith('/rive.wasm'))).toBe(true);
 expect(riveRequests.some(url=>url.endsWith('/seodang-onboarding.riv'))).toBe(true);
 expect(errors).toEqual([]);
});
