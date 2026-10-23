import {openMapLesson} from './learning-map-fixture.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
import {test,expect} from '@playwright/test';
import {levelTwoReviews} from '../../src/level-two-review-state.js';import {levelTwoReview} from '../../src/level-two-review-content.js';import {reviewFixture} from '../level-two-review-fixtures.mjs';
// The conversation rehearsals have their own three-turn and migration coverage.
const regularKeys=Object.keys(levelTwoReviews).filter(key=>!/:scenario:(14|15|16|17)$/.test(key));
for(const [n,key]of regularKeys.entries())test(`level two full review ${key}`,async({page})=>{
 const {s,kind,id}=reviewFixture(key),tasks=levelTwoReview(key),width=n%2?390:320;
 await page.setViewportSize({width,height:width===320?640:844});await page.addInitScript(s=>{if(!localStorage.getItem('seodang.web-prototype.v1'))localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));window.Audio=class{play(){queueMicrotask(()=>this.onended?.());return Promise.resolve();}pause(){}};},s);
 await useCatalogWithoutPacks(page);await page.route('https://www.youtube.com/**',r=>r.fulfill({body:''}));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const enter=async()=>{await openMapLesson(page,{kind:kind,id:id});if(kind!=='video')await page.locator('[data-choice="resume"]').click();};
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));
 await page.goto('/playable.html');await enter();await page.locator(kind==='video'?'[data-action="video-next"]':kind==='sentence'?'[data-action="sentence-submit"]':kind==='korean'||s.scenarios?.[key].phase==='speak'?'[data-speaking-skip]':'[data-action="scenario-next"]').click();
 await expect(page.locator('.introduction-review')).toBeVisible();
 const before=await saved();expect(before.practices[key].count).toBe(tasks.length);expect(before.studyTools?.[s.courseDirection]?.lessons?.[key]).toBeUndefined();
 for(const [i,t]of tasks.entries()){
  const confirm=page.locator('[data-review-confirm]');await expect(page.locator('.review-result')).toBeHidden();expect((await saved()).practices[key].index).toBe(i);await expect(page.locator('.lesson-progress')).toHaveCount(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  if(t.type==='word'){const cards=page.locator('.review-word-grid>button');await expect(cards).toHaveCount(4);const p=await cards.evaluateAll(bs=>bs.map(b=>({x:b.offsetLeft,y:b.offsetTop,loaded:b.querySelector('img').complete&&b.querySelector('img').naturalWidth>0})));expect(p.every(x=>x.loaded)).toBe(true);expect(p[0].y).toBe(p[1].y);expect(p[2].y).toBe(p[3].y);expect(p[2].y).toBeGreaterThan(p[0].y);}
  if(i===0)await page.screenshot({path:`output/level2-${key.replaceAll(':','-')}-${test.info().project.name}.png`,fullPage:true});
  if(t.type==='listen'){await page.locator('[data-review-transcript] summary').click();}
  if(t.type==='order'){await page.locator('[data-review-token="0"]').click();await page.locator('[data-review-remove="0"]').click();await expect(page.locator('[data-review-token="0"]')).toBeEnabled();for(let j=0;j<t.answerLength;j++)await page.locator(`[data-review-token="${j}"]`).click();}
  else {await page.locator(`[data-review-choice="${(t.answer+1)%t.options.length}"]`).click();await confirm.click();await expect(page.locator('.review-result')).toBeHidden();await page.locator(`[data-review-choice="${t.answer}"]`).click();}
  await confirm.click();await expect(page.locator('.review-result')).toBeVisible();await expect(page.locator('.review-result .audio-text-row p')).toHaveText(t.unit.text);
  await confirm.click();
  if(i===1){await page.reload();await enter();await expect(page.locator('.introduction-review')).toBeVisible();expect((await saved()).practices[key].index).toBe(2);}
 }
 await expect(page.locator('.practice-complete')).toBeVisible();expect((await saved()).practices[key]).toBeUndefined();expect((await saved()).studyTools[s.courseDirection].lessons[key]).toBeTruthy();expect(errors).toEqual([]);
});
