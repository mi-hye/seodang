import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
for(const direction of ['ja-ko','ko-ja'])test(`${direction} keeps interface language when switching to level 5`,async({page})=>{
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,courseDirection:direction,onboardingLevel:5,koreanGuideSeenVersion:1});
 await page.goto('/playable.html');const locale=direction==='ja-ko'?'ja':'ko';await expect(page.locator('html')).toHaveAttribute('lang',locale);
 await page.locator('.app-header [data-action="settings"]').click();await page.locator('[data-setting="difficulty"]').selectOption('7');
 await expect(page.locator('html')).toHaveAttribute('lang',locale);await expect(page.locator('.map-heading h1')).toHaveText(direction==='ja-ko'?'考えを伝える':'생각 나누기');
 await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',locale);
});
