import {webkit,expect} from '@playwright/test';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {freshState} from '../src/engine.js';
const browser=await webkit.launch();
try{for(const level of [5,6])for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:844}}),played=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://seodang.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);try{return r.fulfill({body:readFileSync(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.wav')?'audio/wav':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 await page.exposeFunction('recordAudio',src=>played.push(src));
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.recordAudio(this.src);return play.call(this);};},{...freshState(),onboarded:true,onboardingLevel:level,settings:{sound:false,textScale:1.2,motion:'off'}});
 await page.goto('https://seodang.test/playable.html');await page.locator('.learning-map [data-action="reading"]').click();await page.locator('[data-action="reading-next"]').click();
 const sound=page.locator('[data-action="reading-audio"]');await expect(sound).toBeVisible();await expect(page.locator('.case-words')).toBeVisible();await sound.click();
 await expect.poll(()=>played.some(s=>s.endsWith(`/assets/audio/reading/reading.${level}.0.wav`))).toBe(true);
 await expect.poll(()=>page.evaluate(level=>performance.getEntriesByType('resource').some(r=>r.name.endsWith(`/assets/audio/reading/reading.${level}.0.wav`)),level)).toBe(true);
 assert.ok(await page.locator('.audio-text-row').evaluate(row=>{const text=row.firstElementChild.getBoundingClientRect(),b=row.lastElementChild.getBoundingClientRect();return b.x>=text.right&&b.width>=44&&b.height>=44&&b.right<=innerWidth;}));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.waitForTimeout(500); // App ignores repeated navigation within 450 ms.
 await page.locator('[data-action="reading-next"]').click();await expect(page.locator('.reading-options')).toBeVisible();await page.waitForTimeout(500);await page.locator('[data-action="reading-previous"]').click();await expect(page.locator('.case-words')).toBeVisible();
 await page.screenshot({path:`output/level${level-1}-audio-${width}.png`});assert.deepEqual(errors,[]);await page.close();
}console.log('320/390px, large text, right-hand speakers, actual audio requests and next/previous: passed.');}finally{await browser.close();}
