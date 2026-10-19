import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
for(const level of [5,6])test(`reading ${level} keeps scroll after an incorrect answer`,async({page})=>{
 await page.setViewportSize({width:390,height:700});
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,onboardingLevel:level,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
 await page.route('**/assets/audio/catalog.json',async r=>{const response=await r.fetch(),c=await response.json();await r.fulfill({json:{...c,packs:{}}});});
 await page.goto('/playable.html');await page.locator('[data-action="reading"]').first().click();
 for(let i=0;i<2;i++){await page.waitForTimeout(500);await page.locator('[data-action="reading-next"]').click();}
 await page.locator('[data-action="reading-select"][data-id="0"]').click();
 const check=page.locator('[data-action="reading-check"]');await check.scrollIntoViewIfNeeded();
 const before=await page.evaluate(()=>scrollY);expect(before).toBeGreaterThan(100);
 await page.waitForTimeout(500);await check.click();await expect(page.locator('.reading-feedback')).toBeVisible();
 expect(Math.abs(await page.evaluate(()=>scrollY)-before)).toBeLessThan(3);
});
