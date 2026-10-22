import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';import {freshSentence} from '../../src/sentence-state.js';import {freshKoreanProgress} from '../../src/korean-state.js';
import {prepareContent,caseTasks} from '../../src/practice-content.js';
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`2-2 review all stages audio retry resume completion ${direction} ${width}`,async({page})=>{
 const kind=direction==='ko-ja'?'sentence':'korean',id=kind==='sentence'?'0':'3-4',key=`${direction}:${kind}:${id}`;
 const s={...freshState(),onboarded:true,courseDirection:direction,onboardingLevel:2,koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1},sentenceActive:0,sentence:{...freshSentence(),started:true,index:2,phase:'solve',selected:'window-blue',learned:[0,1,2]},korean:{version:4,active:'3-4',lessons:{'3-4':{...freshKoreanProgress('3-4'),started:true,index:2,phase:'speak',caseSeen:true}}}};
 await prepareContent(kind);const tasks=caseTasks(s,kind);
 await page.setViewportSize({width,height:width===320?640:844});
 await page.addInitScript(s=>{if(!localStorage.getItem('seodang.web-prototype.v1'))localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));window.played=[];window.Audio=class{constructor(src){this.src=src;}play(){window.played.push(this.src);queueMicrotask(()=>this.onended?.());return Promise.resolve();}pause(){}};},s);
 await useCatalogWithoutPacks(page);
 const enter=async()=>{await page.locator(`.map-choice[data-action="${kind}"][data-id="${id}"]`).click();await page.locator('[data-choice="resume"]').click();};
 await page.goto('/playable.html');await enter();await page.locator(kind==='sentence'?'[data-action="sentence-submit"]':'[data-speaking-skip]').click();await expect(page.locator('.introduction-review')).toBeVisible();
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));
 const layout=async()=>{expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);for(const row of await page.locator('.introduction-review .audio-text-row:visible').all()){const b=await row.evaluate(el=>({text:el.querySelector('p,h2').getBoundingClientRect(),button:el.querySelector('button').getBoundingClientRect()}));expect(b.button.left).toBeGreaterThanOrEqual(b.text.right-1);expect(b.button.width).toBeGreaterThanOrEqual(44);}const pair=page.locator('.introduction-review .button-pair');if(await pair.count()){const y=await pair.locator('button').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().top));expect(Math.abs(y[0]-y[1])).toBeLessThan(2);}};
 for(let i=0;i<12;i++){
  const task=tasks[i],confirm=page.locator('[data-review-confirm]');await expect(page.locator('.case-task-count')).toHaveCount(0);expect((await state()).practices[key].index).toBe(i);await expect(page.locator('.review-result')).toBeHidden();await layout();
  if(i===0||i===3||i===6||i===9){await page.screenshot({path:`output/review22-${direction}-${width}-${i}-${test.info().project.name}.png`,fullPage:true});}
  if(task.type==='word'){const cards=page.locator('.review-word-grid>button');await expect(cards).toHaveCount(4);const boxes=await cards.evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y};}));expect(boxes[0].y).toBe(boxes[1].y);expect(boxes[2].y).toBe(boxes[3].y);expect(boxes[2].y).toBeGreaterThan(boxes[0].y);for(const img of await cards.locator('img').all())expect(await img.evaluate(x=>x.complete&&x.naturalWidth>0)).toBe(true);}
  if(task.type==='listen'){
   await expect(page.locator('[data-review-transcript] p')).toBeHidden();await page.locator(`[data-review-choice="${task.answer}"]`).click();await expect(confirm).toBeDisabled();
   const before=await page.evaluate(()=>window.played.length);await page.locator('.review-listen [data-review-audio]').click();await expect.poll(()=>page.evaluate(()=>window.played.length)).toBeGreaterThan(before);await expect(confirm).toBeEnabled();
  }
  if(task.type==='order'){
   const count=task.answerLength??task.tokens.length;
   await page.locator('[data-review-token="0"]').click();await page.locator('[data-review-token="1"]').click();await page.locator('[data-review-remove="0"]').click();await expect(page.locator('[data-review-remove]')).toHaveCount(1);await expect(page.locator('[data-review-remove="1"]')).toBeVisible();await expect(page.locator('[data-review-token="0"]')).toBeEnabled();await expect(confirm).toBeDisabled();await page.locator('[data-review-remove="1"]').click();

   for(let n=count-1;n>=0;n--)await page.locator(`[data-review-token="${n}"]`).click();await confirm.click();await expect(page.locator('.review-result')).toBeHidden();expect((await state()).practices[key].index).toBe(i);for(let n=0;n<count;n++)await page.locator('[data-review-undo]').click();for(let n=0;n<count;n++)await page.locator(`[data-review-token="${n}"]`).click();
  }else{await page.locator(`[data-review-choice="${(task.answer+1)%3}"]`).click();await confirm.click();await expect(page.locator('.practice-feedback')).not.toBeEmpty();await expect(page.locator('.review-result')).toBeHidden();await page.locator(`[data-review-choice="${task.answer}"]`).click();}
  await confirm.click();await expect(page.locator('.review-result')).toBeVisible();await expect(page.locator('.review-result .audio-text-row p')).toHaveText(task.unit.text);if(task.type==='order')for(const chip of await page.locator('[data-review-remove]').all())await expect(chip).toBeDisabled();await layout();
  if(i===7){await page.screenshot({path:`output/review22-result-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});}
  if(i===4){await page.reload();await enter();await expect(page.locator('.case-task-count')).toHaveCount(0);await expect(page.locator('.review-result')).toBeHidden();await page.locator('[data-review-transcript] summary').click();await page.locator(`[data-review-choice="${task.answer}"]`).click();await confirm.click();}
  await confirm.click();
 }
 await expect(page.locator('.practice-complete')).toBeVisible();await expect(page.locator('.practice-fireworks svg')).toBeVisible();expect((await state()).practices?.[key]).toBeUndefined();expect(kind==='sentence'?(await state()).sentence.completed:(await state()).korean.lessons['3-4'].completed).toBe(true);
});
