import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';

for(const width of [320,390])test(`batchim screenshot retry accepts ㄴ and advances at ${width}px`,async({page})=>{
 const key='seodang.web-prototype.v1',errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width,height:width===320?640:844});
 const state={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:'ja-ko',onboardingLevel:0,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1},korean:{version:4,active:'1-10',lessons:{'1-10':{index:3,phase:'quiz',selected:0,retry:true,started:true,completed:false}}}};
 await page.addInitScript(({key,state})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
  localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
 },{key,state});
 const open=async()=>{
  await page.locator('[data-action="korean"][data-id="1-10"]').first().click();
  await page.locator('[data-choice="resume"]').click();
 };
 await page.goto('/playable.html');await open();
 const choices=page.locator('[data-action="korean-select"]');
 await expect(choices).toHaveText(['ㄹ','ㅇ','ㄱ','ㄴ']);
 await expect(page.locator('.korean-assembly strong')).toHaveText('물');
 await expect(page.locator('.korean-feedback')).toHaveText('音が違うよ。もう一度聞いて選ぼう。');
 await expect(choices.first()).toHaveClass(/incorrect/);
 await expect(choices.first().locator('.korean-wrong-mark')).toBeVisible();
 await expect(choices.first()).toHaveAttribute('aria-describedby','korean-answer-feedback');
 expect(await page.locator('.korean-assembly strong').evaluate(e=>getComputedStyle(e).color)).toBe(await choices.first().evaluate(e=>getComputedStyle(e).color));
 const tops=await page.locator('.korean-phase-quiz>.button-pair>button').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));expect(Math.abs(tops[0]-tops[1])).toBeLessThan(2);
 await page.locator('[data-action="korean-check"]').click();
 await expect(page.locator('.korean-phase-quiz')).toBeVisible();
 expect((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).korean.lessons['1-10'].index).toBe(3);
 await page.screenshot({path:`output/batchim-retry-${width}-${test.info().project.name}.png`,fullPage:true});
 await expect(page.locator('[data-action="korean-check"]')).toBeInViewport();
 await choices.first().click();
 await expect(page.locator('.korean-wrong-mark')).toHaveCount(0);
 await expect(page.locator('.korean-assembly strong')).toHaveText('？');
 await expect(page.locator('[data-action="korean-check"]')).toBeDisabled();
 await choices.getByText('ㄴ',{exact:true}).click();
 await expect(page.locator('.korean-assembly strong')).toHaveText('문');
 await expect(page.locator('.korean-feedback')).toBeEmpty();
 await expect(page.locator('.korean-wrong-mark,.korean-choice.incorrect')).toHaveCount(0);
 await expect(page.locator('.korean-answer-retry')).toHaveCount(0);
 // The app deliberately ignores advance taps within 450ms of the previous check.
 await page.waitForTimeout(500);
 await page.locator('[data-action="korean-check"]').click();
 await expect(page.locator('.korean-phase-learn .korean-zero-glyph')).toContainText('물');
 const saved=(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).korean.lessons['1-10'];
 expect(saved).toMatchObject({index:4,phase:'learn',selected:null,retry:false});
 await page.reload();await open();
 await expect(page.locator('.korean-phase-learn .korean-zero-glyph')).toContainText('물');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(errors).toEqual([]);
});
