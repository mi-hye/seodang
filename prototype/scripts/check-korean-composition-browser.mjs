import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
import {koreanLessons,freshKoreanProgress} from '../src/korean-state.js';
const browser=await webkit.launch();
try{for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:740}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://seodang.test/**',route=>{const f=new URL(route.request().url()).pathname.slice(1);try{return route.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.wav')?'audio/wav':'image/png'});}catch{return route.fulfill({status:404,body:''});}});
 const lessons=Object.fromEntries(koreanLessons.filter(l=>l.level===1).map(l=>[l.id,{...freshKoreanProgress(),completed:true}]));
 lessons['1-2']=freshKoreanProgress();
 lessons['1-1']={...freshKoreanProgress(),index:9,phase:'quiz',started:true};
 await page.addInitScript(state=>{if(!sessionStorage.seed){localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(state));sessionStorage.seed='yes';}},{...freshState(),courseDirection:'ja-ko',onboarded:true,koreanGuideSeenVersion:1,onboardingLevel:1,settings:{sound:false,textScale:1.2,motion:'off'},korean:{version:2,active:'1-1',lessons}});
 await page.goto('https://seodang.test/playable.html');await page.locator('button.home-start-card[data-action]').click();
 const check=async()=>{await page.waitForTimeout(470);await page.locator('[data-action=korean-check]').click();};
 await page.locator('[data-action=korean-select][data-id="0"]').click();await check();
 await expect(page.locator('.korean-assembly')).toBeVisible();await expect(page.locator('.korean-count')).toHaveCount(0);
 await page.locator('[data-action=korean-select][data-id="1"]').click();await expect(page.locator('.korean-assembly strong')).toHaveText('어');await check();await expect(page.locator('.korean-feedback')).not.toBeEmpty();
 await page.locator('[data-action=korean-select][data-id="0"]').click();await expect(page.locator('.korean-assembly strong')).toHaveText('아');
 await page.reload();await page.locator('button.home-start-card[data-action]').click();await expect(page.locator('.korean-assembly strong')).toHaveText('아');await check();
 for(let i=1;i<10;i++){await page.locator(`[data-action=korean-select][data-id="${i%3}"]`).click();await check();}
 await expect(page.locator('canvas')).toBeVisible();await expect(page.locator('.app-header-title')).toContainText('1-3');
 for(const id of ['1-4','1-6','1-8','1-10']){
  await page.locator('[data-action=home]').first().click();await page.locator(`[data-action=korean][data-id="${id}"]`).click();
  await expect(page.locator('.korean-assembly')).toBeVisible();await expect(page.locator('canvas')).toHaveCount(0);
  await page.locator('[data-action=korean-select][data-id="0"]').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const buttons=await page.locator('.button-pair').last().locator('button').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top));assert.equal(buttons[0],buttons[1]);
  if(id==='1-10')await page.screenshot({path:`/tmp/seodang-composition-${width}.png`});
 }
 assert.deepEqual(errors,[]);await page.close();
}console.log('Composition: learn/use handoffs, correct and wrong assembly, resume, five practice lessons, 320/390px large-text layouts passed.');}finally{await browser.close();}
