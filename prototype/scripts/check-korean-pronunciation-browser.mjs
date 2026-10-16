import {webkit,expect} from '@playwright/test';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';import {pronunciationRecords} from '../src/korean-pronunciation-data.js';
const browser=await webkit.launch();
try{for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:width===320?667:844}}),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);if(f==='src/build-config.js')return r.fulfill({body:'export const developmentMode=false;',contentType:'text/javascript'});try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.wav')?'audio/wav':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));window.audioPlays=[];window.audioStops=0;window.Audio=class{constructor(src){this.src=src;this.duration=.01;}load(){}pause(){window.audioStops++;}play(){window.audioPlays.push(this.src);queueMicrotask(()=>window.audioFails?this.onerror?.():this.onended?.());return Promise.resolve();}};},{...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:'ja-ko',onboardingLevel:0,settings:{sound:false,motion:'off',textScale:1.2}});
 await page.goto('https://seodang.test/playable.html');await page.locator('[data-action=kana-chart]').click();assert.ok(!requests.some(url=>url.includes('korean-pronunciation')));
 for(const category of ['vowels','consonants']){
  await page.locator(`[data-action=kana-chart-switch][data-id=${category}]`).click();const glyphs=await page.locator('.korean-chart-letter').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
  if(category==='consonants')assert.ok(!glyphs.includes('ㅇ'));
  for(const glyph of glyphs){
   const trigger=page.locator(`.korean-chart-letter[data-id="${glyph}"]`);await trigger.click();const dialog=page.locator('.pronunciation-sheet');await expect(dialog).toBeVisible();await expect(dialog.locator('.pronunciation-glyph')).toHaveText(glyph);await expect(dialog.locator('svg[role=img]')).toBeVisible();
   assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth),`${glyph}/${width} overflow`);
   if(pronunciationRecords[glyph].poses.length===2){const first=await dialog.locator('.tongue-fill').getAttribute('d');await dialog.locator('[data-pronunciation=step][data-value="1"]').click();assert.notEqual(await dialog.locator('.tongue-fill').getAttribute('d'),first);}
   await dialog.locator('[data-pronunciation=audio]').click();await expect(dialog.locator('[data-pronunciation=audio]')).toBeEnabled();
   if(['ㅏ','ㅑ','ㄱ','ㅇ'].includes(glyph))await page.screenshot({path:`/tmp/seodang-pronunciation-${glyph}-${width}.png`});
   await dialog.locator('[data-pronunciation=close]').click();await expect(trigger).toBeFocused();await expect(page.locator('#panel')).toBeVisible();
  }
 }
 assert.equal((await page.evaluate(()=>audioPlays)).length,39);
 await page.locator('#panel [data-action=close]').click();assert.equal(await page.evaluate(()=>document.body.style.position),'');
 await page.locator('.map-choice[data-id="1-1"]').click();await page.locator('[data-action=korean-next]').click();const lesson=await page.evaluate(()=>localStorage.getItem('seodang.web-prototype.v1'));
 await page.locator('.korean-pronunciation-link').click();await page.evaluate(()=>window.audioFails=true);await page.locator('.pronunciation-sheet [data-pronunciation=audio]').click();await expect(page.locator('.pronunciation-status')).toContainText('再生できませんでした');await page.keyboard.press('Escape');await expect(page.locator('.korean-pronunciation-link')).toBeFocused();assert.equal(await page.evaluate(()=>localStorage.getItem('seodang.web-prototype.v1')),lesson);
 await page.evaluate(async()=>{const {openPronunciation}=await import('/src/korean-pronunciation.js');await openPronunciation('강',{play:async()=>{},stop:()=>{}});});await page.locator('[data-pronunciation=part][data-value="2"]').click();await expect(page.locator('.pronunciation-glyph')).toHaveText('ㅇ');await expect(page.locator('.pronunciation-sample span')).toHaveText('강');await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);await page.close();
}console.log('Pronunciation: 39 pronounced letters/audio, glides, final consonants, nested chart/lesson focus, audio failure, saved progress and 320/390px large text passed.');}finally{await browser.close();}
