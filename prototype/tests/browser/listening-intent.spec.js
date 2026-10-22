import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
import {test,expect} from '@playwright/test';import {freshState} from '../../src/engine.js';import {scenarioContent} from '../../src/scenario-content.js';
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`4-7 listening intent retry resume evidence completion ${direction} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===320?640:844});await page.addInitScript(s=>{if(!localStorage.getItem('seodang.web-prototype.v1'))localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,courseDirection:direction,onboardingLevel:5,koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
 await useCatalogWithoutPacks(page);
 const enter=()=>page.locator('.map-choice[data-id="10"][data-action="scenario"]').click();await page.goto('/playable.html');await expect(page.locator('.map-choice[data-action]')).toHaveCount(7);await enter();await expect(page.locator('.app-header-title')).toContainText('7.');await expect(page.locator('main')).toHaveClass(/lesson-top/);await page.locator('[data-action="scenario-next"]').click();
 const layout=async()=>{expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);for(const row of await page.locator('.intent-page .audio-text-row:visible').all()){const b=await row.evaluate(e=>({text:e.querySelector('p').getBoundingClientRect().right,speaker:e.querySelector('button').getBoundingClientRect().left}));expect(b.speaker).toBeGreaterThanOrEqual(b.text-1);}const tops=await page.locator('.intent-page>.button-pair>button').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));expect(Math.abs(tops[0]-tops[1])).toBeLessThan(2);};
 for(let i=0;i<3;i++){
  const x=scenarioContent[direction]['10'].items[i];await expect(page.locator('.intent-transcript>.audio-text-row')).toBeHidden();await expect(page.locator('[data-action="scenario-check"]')).toBeDisabled();await layout();
  if(i===0)await page.screenshot({path:`output/intent-listen-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
  await page.locator(`[data-action="scenario-select"][data-id="${(i+1)%3}"]`).click();
  if(i===0){await page.reload();await enter();await page.locator('[data-choice="resume"]').click();await expect(page.locator('[data-action="scenario-select"][data-id="1"]')).toHaveAttribute('aria-pressed','true');}
  await page.locator('[data-action="scenario-check"]').click();await expect(page.locator('.scenario-feedback')).toBeVisible();await expect(page.locator('.intent-result')).toHaveCount(0);
  await page.locator('.intent-transcript>summary').click();await expect(page.locator('.intent-transcript>.audio-text-row p')).toHaveText(x.text);await layout();
  await page.locator(`[data-action="scenario-select"][data-id="${i}"]`).click();await page.locator('[data-action="scenario-check"]').click();await expect(page.locator('.intent-result .audio-text-row p')).toHaveText(x.text);await expect(page.locator('.intent-result .scenario-feedback')).toHaveText(x.hint);await page.locator('.intent-result details summary').click();await expect(page.locator('.intent-result details p')).toHaveText(x.meaning);await layout();
  if(i===0)await page.screenshot({path:`output/intent-result-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
  await page.locator('[data-action="scenario-next"]').click();
 }
 await expect(page.locator('.practice-fireworks svg')).toBeVisible();await page.locator('[data-action="completed-next"]').click();await expect(page.locator('.view-home')).toBeVisible();
});
