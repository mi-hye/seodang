import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
import {kanaLessons,kanaRound} from '../src/kana-state.js';
const browser=await webkit.launch();
try{for(const [width,height,scale,full] of [[320,568,1,false],[390,844,1,true],[390,844,1.2,false]]){
 const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.json')?'application/json':f.endsWith('.wav')?'audio/wav':f.endsWith('.svg')?'image/svg+xml':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 const state=freshState();state.onboarded=true;state.onboardingLevel=1;state.settings.sound=false;state.settings.motion='off';state.settings.textScale=scale;
 await page.addInitScript(s=>{if(!sessionStorage.seeded){localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));sessionStorage.seeded='1';}},state);
 await page.goto('https://seodang.test/playable.html');
 await expect(page.locator('.home')).toContainText('히라가나 1/3');await expect(page.locator('.home')).toContainText('あ〜そ · 15자');
 if(full)await page.screenshot({path:'/tmp/seodang-thirds-home.png'});
 await page.locator('.tabs [data-action=home]').click();
 for(const text of ['あ〜そ · 15자','た〜ほ · 15자','ま〜ん · 16자'])await expect(page.locator('.learning-map')).toContainText(text);
 await expect(page.locator('.map-choice:disabled')).toHaveCount(4);
 await page.locator('.map-choice[data-id="0"]').click();
 const click=async action=>{await page.locator(`[data-action="${action}"]`).last().click();await page.waitForTimeout(460);};
 for(let chapter=0;chapter<(full?3:1);chapter++){
  const lesson=kanaLessons[chapter];
  for(let start=0;start<(full?lesson.letters.length:5);){
   const row=kanaRound(lesson,start);
   await expect(page.locator('h1')).toHaveText(row.letters.map(l=>l.text).join(' · '));await click('kana-next');
   for(const letter of row.letters){
    await expect(page.locator('canvas')).toBeVisible();await expect(page.locator('[data-writing-letter]')).toHaveAttribute('data-writing-letter',letter.id);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(full&&chapter===0&&letter.id==='a')await page.screenshot({path:'/tmp/seodang-thirds-writing.png'});
    await click('kana-next');
   }
   for(const letter of row.letters){
    await expect(page.locator('h1')).toHaveText('읽기 연습');await expect(page.locator('.kana-letter')).toHaveText(letter.text);await click('kana-next');
   }
   await expect(page.locator('h1')).toHaveText('글자와 발음을 이어요');
   await expect(page.locator('.kana-match-node')).toHaveCount(row.letters.length*2);
   for(const letter of row.letters){
    await page.locator(`[data-match-side=glyph][data-match-id="${letter.id}"]`).tap();
    await page.locator(`[data-match-side=reading][data-match-id="${letter.id}"]`).tap();
   }
   await expect(page.locator('[data-match-lines] path')).toHaveCount(row.letters.length);
   if(full&&chapter===0&&start===0)await page.screenshot({path:'/tmp/seodang-thirds-matching.png'});
   await click('kana-next');
   start=row.end;
   if(full&&chapter===0&&start===5){
    await page.reload();await page.locator('.home-start-card [data-action=kana]').click();await expect(page.locator('h1')).toHaveText('か · き · く · け · こ');
   }
  }
  if(full){
   await expect(page.locator('h1')).toHaveText(`${chapter+1}/3 학습을 마쳤어요`);
   console.log(`${chapter+1}/3 complete: ${lesson.letters.length} letters written, read and matched`);
   if(chapter<2)await click('kana-continue');
  }
 }
 if(full){
  await expect(page.locator('[data-action=labels]')).toBeVisible();await click('home');await page.locator('.tabs [data-action=home]').click();await expect(page.locator('.map-overview')).toContainText('3개 완료');
  await page.reload();await page.locator('.tabs [data-action=my]').click();await expect(page.locator('.record-overview')).toContainText('3개');
  await expect(page.locator('.record-entry')).toHaveCount(0);
  await page.locator('.tabs [data-action=home]').click();await page.locator('[data-action=kana][data-id="1"]').click();await expect(page.locator('h1')).toHaveText('た · ち · つ · て · と');
 }
 assert.deepEqual(errors,[]);await page.close();console.log(`Mobile ${width}x${height}, text scale ${scale}: passed`);
}}finally{await browser.close();}
