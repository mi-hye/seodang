import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
import {readingAnswers} from '../src/reading-state.js';
const browser=await webkit.launch();
try{for(const [level,width,scale] of [[5,320,1.2],[6,390,1],[7,320,1.2],[7,390,1]]){
 const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'image/jpeg'});}catch{return r.fulfill({status:404,body:''});}});
 await page.addInitScript(s=>{if(!sessionStorage.seeded){localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));sessionStorage.seeded='1';}window.played=[];window.paused=[];window.Audio=class{constructor(src){this.src=src;}pause(){window.paused.push(this.src);}async play(){window.played.push(this.src);}};},{...freshState(),onboarded:true,onboardingLevel:level,settings:{sound:level===7,motion:'off',textScale:scale}});
 await page.goto('https://seodang.test/playable.html');await expect(page.locator('.home-start-card [data-action=reading]')).toBeVisible();assert.ok(!requests.some(r=>/reading(?:-content)?\.js|reading\.css/.test(r)));
 const click=async(a,id)=>{await page.locator(`[data-action="${a}"]${id===undefined?'':`[data-id="${id}"]`}`).first().click();await page.waitForTimeout(460);};
 await click('reading');if(level===6)await click('reading-next');
 if(level===7){assert.equal(await page.locator('.reading-passage').count(),0);assert.ok(requests.some(r=>r.endsWith('/reading-advanced.js')));await expect.poll(()=>page.evaluate(()=>window.played.length)).toBe(1);await click('reading-stop');await click('reading-audio');assert.equal(await page.evaluate(()=>window.played.length),2);}
 for(let i=0;i<6;i++){
  await expect(page.locator('.reading-count')).toHaveCount(0);await expect(page.locator('[data-action=reading-check]')).toBeDisabled();
  await click('reading-select',(readingAnswers[level][i]+1)%3);await click('reading-check');await expect(page.locator('.reading-feedback')).toBeVisible();
  if(i===1){await page.reload();await click('reading');await expect(page.locator('.reading-count')).toHaveCount(0);await expect(page.locator('.reading-feedback')).toBeVisible();await click('reading-previous');await expect(page.locator('.reading-count')).toHaveCount(0);await click('reading-select',readingAnswers[level][0]);await click('reading-check');}
  if(level>=6)assert.doesNotMatch(await page.locator('.shell').innerText(),/[가-힣]/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const pair=await page.locator('.button-pair').evaluateAll(nodes=>nodes.every(n=>{const style=getComputedStyle(n);const rects=[...n.children].map(n=>n.getBoundingClientRect());return style.display==='flex'&&style.flexDirection==='row'&&style.flexWrap==='nowrap'&&Math.abs(rects[0].y-rects[1].y)<1;}));assert.ok(pair);
  if(i===0||i===4)await page.screenshot({path:`/tmp/seodang-level${level}-${width}-${scale}-${i}.png`,fullPage:true});
  await click('reading-select',readingAnswers[level][i]);await click('reading-check');
 }
 await expect(page.locator('.learning-map')).toContainText(level>=6?'1件 完了':'1개 완료');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));assert.equal(stored.onboardingLevel,level);assert.equal(stored.readings[level].completed,true);assert.equal(Object.values(stored.history.days)[0].sentences,6);
 await click('home');await click('reading');await expect(page.locator(level===6?'[data-action=reading-next]':'[data-action=reading-check]')).toBeVisible();await click('home');await click('settings');await page.locator('[data-setting=difficulty]').selectOption(String(level===5?6:5));await page.keyboard.press('Escape');await click('reading');await expect(page.locator(level===5?'[data-action=reading-next]':'.reading-count')).toBeVisible();
 assert.deepEqual(errors,[]);await page.close();console.log(`Reading level ${level}, ${width}px scale ${scale}: passed`);
}}finally{await browser.close();}
