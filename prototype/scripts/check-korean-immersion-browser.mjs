import {webkit,expect} from '@playwright/test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {freshState} from '../src/engine.js';import {freshKoreanProgress} from '../src/korean-state.js';
const browser=await webkit.launch();
try{for(const width of [320,390]){
const page=await browser.newPage({viewport:{width,height:width===320?667:844}});
await page.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
const state={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:'ja-ko',onboardingLevel:7,levelGuideSeen:{'ja-ko:7':true,'ja-ko:5':true},settings:{sound:false,textScale:1.2,motion:'off'},korean:{version:4,active:'7-1',lessons:{'7-1':freshKoreanProgress('7-1')}}};
await page.addInitScript(s=>localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s)),state);
const check=async()=>{assert.doesNotMatch(await page.locator('body').evaluate(el=>{const copy=el.cloneNode(true);copy.querySelectorAll('.case-words dd[lang=ja]').forEach(node=>node.remove());return copy.textContent;}),/[ぁ-ゖァ-ヺ一-龯]/u);assert.equal(await page.locator('html').getAttribute('lang'),'ko');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));};
await page.goto('https://seodang.test/playable.html');await expect(page.locator('.learning-map')).toBeVisible();await check();
await page.locator('.app-header-settings').click();await check();await page.locator('[data-setting=difficulty]').selectOption('5');await expect(page.locator('html')).toHaveAttribute('lang','ja');await page.locator('[data-setting=difficulty]').selectOption('7');await expect(page.locator('html')).toHaveAttribute('lang','ko');await check();await page.keyboard.press('Escape');
await page.locator('.learning-map [data-id="7-1"]').click();await expect(page.locator('.case-intro')).toBeVisible();await check();
for(let i=0;i<3;i++){
 await page.waitForTimeout(500);await page.locator('[data-action=korean-next]').click();await expect(page.locator('.case-words')).toBeVisible();await check();
 await page.waitForTimeout(500);await page.locator('[data-action=korean-next]').click();await expect(page.locator('.korean-question')).toBeVisible();await check();
 await page.locator(`[data-action=korean-select][data-id="${(i+1)%3}"]`).click();await page.waitForTimeout(500);await page.locator('[data-action=korean-check]').click();await expect(page.locator('.korean-feedback')).not.toBeEmpty();await check();
 await page.locator(`[data-action=korean-select][data-id="${i%3}"]`).click();await page.waitForTimeout(500);await page.locator('[data-action=korean-check]').click();
 if(i<2){await expect(page.locator('.case-intro')).toBeVisible();await check();}
}
await expect(page.locator('.case-practice')).toBeVisible();await check();await page.screenshot({path:`/tmp/korean-immersion-${width}.png`,fullPage:true});await page.close();
}console.log('Korean immersion home/settings switch, all three essays, hints and practice passed at 320/390.');}finally{await browser.close();}
