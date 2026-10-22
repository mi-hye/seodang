import {test,expect} from '@playwright/test';import {freshState} from '../../src/engine.js';import {scenarioContent} from '../../src/scenario-content.js';
import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../../assets/audio/catalog.json',import.meta.url),'utf8'));
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`2-16 weather retry resume evidence review hand-off ${direction} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===320?640:844});await page.addInitScript(s=>{if(!localStorage.getItem('seodang.web-prototype.v1'))localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,courseDirection:direction,onboardingLevel:2,koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
 // Serve the real catalog locally so response parsing cannot outlive a reload or test teardown.
 await page.route('**/assets/audio/catalog.json',r=>r.fulfill({json:{...catalog,packs:{}}}));
 const enter=()=>page.locator('.map-choice[data-id="16"][data-action="scenario"]').click();await page.goto('/playable.html');await expect(page.locator('.map-choice[data-action]')).toHaveCount(17);await enter();await expect(page.locator('.app-header-title')).toContainText('16.');await expect(page.locator('main')).toHaveClass(/lesson-top/);await page.locator('[data-action="scenario-next"]').click();
 const layout=async()=>{expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);for(const row of await page.locator('.intent-page .audio-text-row:visible').all()){const b=await row.evaluate(e=>({text:e.querySelector('p').getBoundingClientRect().right,speaker:e.querySelector('button').getBoundingClientRect().left}));expect(b.speaker).toBeGreaterThanOrEqual(b.text-1);}const tops=await page.locator('.intent-page>.button-pair>button').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));expect(Math.abs(tops[0]-tops[1])).toBeLessThan(2);};
 for(let i=0;i<3;i++){
  const answer=[2,0,1][i],x=scenarioContent[direction]['16'].items[i];await expect(page.locator('.scenario-image')).toBeVisible();await expect(page.locator('.intent-transcript .message-meaning')).toHaveCount(0);await expect(page.locator('.scenario-choices .icon-button')).toHaveCount(0);await expect(page.locator('.intent-transcript>.audio-text-row')).toBeHidden();await expect(page.locator('[data-action="scenario-check"]')).toBeDisabled();await layout();
  if(i===0)await page.screenshot({path:`output/weather213-listen-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
  await page.locator(`[data-action="scenario-select"][data-id="${(answer+1)%3}"]`).click();
  if(i===0){await page.reload();await enter();await page.locator('[data-choice="resume"]').click();await expect(page.locator('[data-action="scenario-select"][data-id="0"]')).toHaveAttribute('aria-pressed','true');}
  await page.locator('[data-action="scenario-check"]').click();await expect(page.locator('.scenario-feedback')).toBeVisible();await expect(page.locator('.intent-result')).toHaveCount(0);
  await page.locator('.intent-transcript>summary').click();await expect(page.locator('.intent-transcript>.audio-text-row p')).toHaveText(x.text);await layout();
  await page.locator(`[data-action="scenario-select"][data-id="${answer}"]`).click();await page.locator('[data-action="scenario-check"]').click();await expect(page.locator('.intent-result .audio-text-row p').last()).toHaveText(x.text);await expect(page.locator('.intent-result .scenario-feedback')).toHaveText(x.hint);await expect(page.locator('.intent-answer')).toHaveText(x.answer);await expect(page.locator('.scenario-image')).toHaveCount(0);await page.locator('.intent-result details summary').last().click();await expect(page.locator('.intent-result details p').last()).toHaveText(x.meaning);await layout();
  if(i===0)await page.screenshot({path:`output/weather213-result-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
  await page.locator('[data-action="scenario-next"]').click();
 }
 // The full review and final completion are covered by level-two-review.spec.js.
 // This lesson-specific test verifies the hand-off preserves the unfinished lesson on reload.
 await expect(page.locator('.introduction-review')).toBeVisible();await expect(page.locator('.practice-complete')).toHaveCount(0);
 const key=`${direction}:scenario:16`;
 const saved=()=>page.evaluate(key=>{const s=JSON.parse(localStorage.getItem('seodang.web-prototype.v1'));return {lesson:s.scenarios[key],review:s.practices[key],record:s.studyTools?.[s.courseDirection]?.lessons?.[key]};},key);
 const pending=await saved();expect(pending.lesson).toMatchObject({phase:'quiz',index:2,checked:true,completed:false});expect(pending.review).toMatchObject({index:0,count:12,action:{type:'scenario-next'}});expect(pending.record).toBeUndefined();
 await page.reload();await page.locator('.map-choice[data-action="scenario"][data-id="16"]').click();await page.locator('[data-choice="resume"]').click();
 await expect(page.locator('.introduction-review')).toBeVisible();expect(await saved()).toEqual(pending);
});
