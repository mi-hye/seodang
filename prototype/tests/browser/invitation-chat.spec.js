import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {scenarioContent} from '../../src/scenario-content.js';
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`invitation chat ${direction} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===320?640:844});
 await page.addInitScript(s=>{if(!localStorage.getItem('seodang.web-prototype.v1'))localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,courseDirection:direction,onboardingLevel:2,koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
 await useCatalogWithoutPacks(page);
 await page.goto('/playable.html');await page.locator('.map-choice[data-action="scenario"][data-id="14"]').click();await expect(page.locator('.app-header-title')).toContainText('13.');await page.locator('[data-action="scenario-next"]').click();
 const active=page.locator('.chat-page>section.roleplay-conversation');
 const check=async()=>{expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);const tops=await page.locator('.chat-page>.button-pair>button').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().top));expect(Math.abs(tops[0]-tops[1])).toBeLessThan(2);for(const row of await active.locator('.audio-text-row').all()){const b=await row.evaluate(el=>({t:el.querySelector('p').getBoundingClientRect().right,b:el.querySelector('button').getBoundingClientRect()}));expect(b.b.left).toBeGreaterThanOrEqual(b.t-1);expect(b.b.width).toBeGreaterThanOrEqual(44);}};
 for(let i=0;i<3;i++){
  const x=scenarioContent[direction]['14'].items[i],answer=[2,0,1][i];
  await expect(active.locator('.audio-text-row p')).toHaveText(x.text);await expect(active.locator('small')).toHaveText(direction==='ko-ja'?'친구':'友達');await check();
  await expect(page.locator('.scenario-choices [data-action="scenario-audio"]')).toHaveCount(0);
  for(let choice=0;choice<3;choice++){
   const option=page.locator(`[data-action="scenario-select"][data-id="${choice}"]`);await option.click();await expect(option).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-action="scenario-check"]')).toBeEnabled();await expect(active.locator('.roleplay-self')).toHaveCount(0);
  }
  await page.locator('.chat-choice-meanings>summary').click();await expect(page.locator('.chat-choice-meanings li')).toHaveCount(3);await expect(page.locator('.chat-choice-meanings li').nth(answer)).toHaveText(x.answerMeaning);
  await page.locator(`[data-action="scenario-select"][data-id="${(answer+1)%3}"]`).click();await page.locator('[data-action="scenario-check"]').click();await expect(active.locator('.roleplay-self')).toHaveCount(0);
  await page.locator(`[data-action="scenario-select"][data-id="${answer}"]`).click();await page.locator('[data-action="scenario-check"]').click();await expect(active.locator('.roleplay-self .audio-text-row p')).toHaveText(x.answer);await expect(active.locator('[role="status"] .audio-text-row p')).toHaveText(x.reply);await check();
  if(i===0){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`output/chat210-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});await page.reload();await page.locator('.map-choice[data-action="scenario"][data-id="14"]').click();await page.locator('[data-choice="resume"]').click();await expect(active.locator('.roleplay-self .audio-text-row p')).toHaveText(x.answer);}
  if(i===2){const history=page.locator('.chat-history').last();await history.locator(':scope>summary').click();await expect(history.locator('.roleplay-bubble')).toHaveCount(9);await expect(history.locator('[data-id="0:answer"]')).toBeVisible();await check();}
  await page.locator('[data-action="scenario-next"]').click();
 }
 // The full review and final completion are covered by level-two-review.spec.js.
 // This lesson-specific test verifies the hand-off preserves the unfinished lesson on reload.
 await expect(page.locator('.introduction-review')).toBeVisible();await expect(page.locator('.practice-complete')).toHaveCount(0);
 const key=`${direction}:scenario:14`;
 const saved=()=>page.evaluate(key=>{const s=JSON.parse(localStorage.getItem('seodang.web-prototype.v1'));return {lesson:s.scenarios[key],review:s.practices[key],record:s.studyTools?.[s.courseDirection]?.lessons?.[key]};},key);
 const pending=await saved();expect(pending.lesson).toMatchObject({phase:'quiz',index:2,checked:true,completed:false});expect(pending.review).toMatchObject({index:0,count:12,action:{type:'scenario-next'}});expect(pending.record).toBeUndefined();
 await page.reload();await page.locator('.map-choice[data-action="scenario"][data-id="14"]').click();await page.locator('[data-choice="resume"]').click();
 await expect(page.locator('.introduction-review')).toBeVisible();expect(await saved()).toEqual(pending);
});
