import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
const browser=await webkit.launch();
try{
 for(const [width,height,scale]of [[320,568,1],[390,844,1],[390,844,1.2],[430,932,1]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{let body=readFileSync(f);if(f.endsWith('.css'))body=body.toString().replace(/env\(safe-area-inset-top(?:,\s*0px)?\)/g,'47px').replace(/env\(safe-area-inset-bottom(?:,\s*0px)?\)/g,'34px');return r.fulfill({body,contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.wav')?'audio/wav':f.endsWith('.svg')?'image/svg+xml':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
  const s=freshState();s.onboarded=true;s.onboardingLevel=1;s.uiGuideSeenVersion=2;s.settings.sound=false;s.settings.textScale=scale;
  await page.addInitScript(s=>{if(!localStorage.getItem('seodang.web-prototype.v1'))localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));},s);
  await page.goto('https://seodang.test/playable.html#home');await page.locator('[data-action="kana"]').first().click();await page.waitForSelector('.kana-bags');
  assert.equal(await page.locator('.kana-bags img').count(),3);assert.match(await page.locator('h1').innerText(),/아오이/);
  if(width===390&&scale===1)await page.screenshot({path:'/tmp/seodang-aoi-intro.png'});
  await page.waitForTimeout(470);await page.locator('[data-action="kana-next"]').click();
  for(const [i,text]of ['あ','お','い'].entries()){
   await expect(page.locator('.kana-name-progress .current')).toHaveText(text);assert.match(await page.locator('.kana-learn-heading').innerText(),new RegExp(`${i+1}/3`));
   await page.waitForSelector('.has-strokes');
   assert.equal(await page.locator('.stroke-credit').count(),0);
   const canvas=page.locator('canvas'),box=await canvas.boundingBox();
   if(i===0){
    await expect(page.locator('.kana-writing')).toHaveAttribute('data-stroke-demo','true');
    await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.mouse.move(box.x+80,box.y+80);await page.mouse.up();
    assert.equal(await canvas.evaluate(el=>el.getContext('2d').getImageData(0,0,el.width,el.height).data.some((v,i)=>i%4===3&&v>0)),false,'writing waits for initial demonstration');
   }
   await expect(page.locator('.kana-writing')).toHaveAttribute('data-stroke-demo','false',{timeout:10000});
   await expect(page.locator('.stroke-status')).toHaveText('따라 써보세요');
await page.mouse.move(box.x+box.width*.3,box.y+box.height*.3);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.7,{steps:5});await page.mouse.up();
   assert.ok(await canvas.evaluate(el=>{const data=el.getContext('2d').getImageData(0,0,el.width,el.height).data;return data.some((v,i)=>i%4===3&&v>0)}),'writing must draw');
   if(i===1){await page.reload();await page.locator('[data-action="kana"]').first().click();await page.waitForSelector('.kana-name-progress');await expect(page.locator('.kana-name-progress .current')).toHaveText('お');await page.waitForTimeout(470);await page.locator('[data-action="kana-previous"]').click();await expect(page.locator('.kana-name-progress .current')).toHaveText('あ');await page.waitForTimeout(470);await page.locator('[data-action="kana-next"]').click();}
   await page.locator('.kana-memory-card img').evaluate(async el=>{await el.decode();if(!el.naturalWidth)throw Error('Missing mnemonic art');});
   await page.waitForSelector('.has-strokes');
   assert.equal(await page.locator('.stroke-paths path').count(),i===2?2:3);
   if(width===390&&scale===1&&i===0){
    const before=await canvas.evaluate(el=>el.toDataURL());
    await page.locator('[data-writing="strokes"]').click();await expect(page.locator('.stroke-status')).toHaveText('1 / 3획');
    await expect(page.locator('.stroke-status')).toHaveText('2 / 3획',{timeout:5000});
    assert.equal(await canvas.evaluate(el=>el.toDataURL()),before,'demonstration must not erase writing');
    await page.screenshot({path:'/tmp/seodang-stroke-demo.png'});
    await page.locator('[data-writing="strokes"]').click();
    await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-writing="strokes"]').click();await expect(page.locator('.stroke-status')).toHaveText('1 / 3획');await page.locator('[data-writing="strokes"]').click();await expect(page.locator('.stroke-status')).toHaveText('2 / 3획');
    await page.emulateMedia({reducedMotion:'no-preference'});
   }
   if(width===390&&scale===1&&i===0)await page.screenshot({path:'/tmp/seodang-aoi-writing.png'});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
   await page.waitForTimeout(470);await page.locator('[data-action="kana-next"]').click();
  }
  await page.waitForSelector('[data-action="kana-solve"]');assert.equal(await page.locator('[data-action="kana-solve"]').count(),3);assert.equal(await page.locator('[data-action="kana-answer"]').count(),0);
  await page.locator('[data-action="kana-solve"][data-id="reverse"]').click();assert.equal(await page.locator('[data-action="kana-next"]').count(),0);assert.match(await page.locator('.kana-feedback').innerText(),/다시/);
  if(width===390&&scale===1)await page.screenshot({path:'/tmp/seodang-aoi-find.png'});
  await page.locator('[data-action="kana-solve"][data-id="match"]').click();await page.waitForTimeout(470);await page.locator('[data-action="kana-next"]').click();await expect(page.locator('h1')).toContainText('가방을 찾았어요');
  const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));assert.deepEqual(record.kana.learned,['a','o','i']);assert.equal(record.kana.lessons[0].caseSolved,true);
  await page.locator('[data-action="kana-continue"]').click();await page.waitForTimeout(470);await page.locator('[data-action="kana-next"]').click();assert.match(await page.locator('.kana-learn-heading').innerText(),/1\/3/);
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Aoi story passed on four mobile layouts: live name tags, canvas, previous/reload, three-letter immediate application, wrong/correct answers, persistence and next chapter.');
}finally{await browser.close();}
