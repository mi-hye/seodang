import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';

const back=page=>page.evaluate(()=>!window.dispatchEvent(new Event('seodang:back',{cancelable:true})));
async function prepare(page,platform='android',onboarded=true){
 await page.addInitScript(({platform,state})=>{
  window.Capacitor={getPlatform:()=>platform,isNativePlatform:()=>false};
  localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(state));
  localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
 },{platform,state:{...freshState(),onboarded,courseDirection:'ko-ja',onboardingLevel:2,settings:{sound:false,motion:'off',textScale:1,audioRate:1}}});
}

test('Android Back closes settings, returns from lessons, then yields at home',async({page})=>{
 await prepare(page);await page.goto('/playable.html');
 await page.locator('.map-choice[data-action="sentence"]').first().click();
 await expect(page.locator('.view-sentence')).toBeVisible();
 await page.locator('.app-header [data-action=settings]').click();
 await expect(page.locator('#panel')).toBeVisible();
 expect(await back(page)).toBe(true);
 await expect(page.locator('#panel')).not.toBeVisible();
 await expect(page.locator('.view-sentence')).toBeVisible();
 expect(await back(page)).toBe(true);
 await expect(page.locator('.learning-map')).toBeVisible();
 expect(await back(page)).toBe(false);
 await page.locator('[data-action=my]').first().click();
 await page.locator('[data-action=study-review]').click();
 await expect(page.locator('.view-study')).toBeVisible();
 expect(await back(page)).toBe(true);
 await expect(page.locator('.view-my')).toBeVisible();
});

test('Android Back follows guide pages and difficulty before leaving setup',async({page})=>{
 await prepare(page,'android',false);await page.goto('/setup.html');
 expect(await back(page)).toBe(false);
 const next=page.locator('button[type=submit]');
 await next.click();await next.click();
 await expect(page.locator('.dog-guide')).toHaveAttribute('data-guide-page','0');
 await next.click();expect(await back(page)).toBe(true);
 await expect(page.locator('.dog-guide')).toHaveAttribute('data-guide-page','0');
 expect(await back(page)).toBe(true);
 await expect(page.locator('[data-step="2"]')).toBeVisible();
 expect(await back(page)).toBe(true);
 await expect(page.locator('[data-step="1"]')).toBeVisible();
 expect(await back(page)).toBe(false);
});

test('Android Back respects a sheet that cancels dismissal',async({page})=>{
 await prepare(page);await page.goto('/playable.html');
 await expect(page.locator('.learning-map')).toBeVisible();
 await page.evaluate(()=>{
  const dialog=document.createElement('dialog');dialog.id='busy-sheet';
  dialog.textContent='Busy';dialog.addEventListener('cancel',e=>e.preventDefault());
  document.body.append(dialog);dialog.showModal();
 });
 expect(await back(page)).toBe(true);
 await expect(page.locator('#busy-sheet')).toBeVisible();
});

test('web and iOS do not install the Android event handler',async({page})=>{
 await prepare(page,'ios');await page.goto('/playable.html');
 await page.locator('.map-choice[data-action="sentence"]').first().click();
 await expect(page.locator('.view-sentence')).toBeVisible();
 expect(await back(page)).toBe(false);
 await expect(page.locator('.view-sentence')).toBeVisible();
});
