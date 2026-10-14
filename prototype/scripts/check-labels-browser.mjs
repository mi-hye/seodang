import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
import {freshKana} from '../src/kana-state.js';
const browser=await webkit.launch();
try{for(const [width,height,scale] of [[320,568,1],[390,844,1],[390,844,1.2]]){
 const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.jpg')?'image/jpeg':f.endsWith('.wav')?'audio/wav':'application/json'});}catch{return r.fulfill({status:404,body:''});}});
 const s=freshState();s.onboarded=true;s.onboardingLevel=1;s.settings.sound=false;s.settings.textScale=scale;s.kana=freshKana();s.kana.lessons.forEach(l=>{l.completed=l.caseSolved=true;l.phase='summary';});
 await page.addInitScript(s=>{if(!sessionStorage.seeded){localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));sessionStorage.seeded='1';}},s);
 await page.goto('https://seodang.test/playable.html');
 assert.equal(await page.locator('link[href="src/labels.css"]').count(),0);
 await page.locator('[data-action=labels]').click();await expect(page.locator('h1')).toHaveText('그림에 이름표를 붙여요');
 const next=async()=>{await page.locator('[data-action=labels-next]').click();await page.waitForTimeout(460);};
 await next();
 for(const word of ['かさ','くつ','はな','ねこ']){
  await expect(page.locator('.labels-word strong')).toHaveText(word);assert.ok(await page.locator('.labels-picture img').evaluate(i=>i.complete&&i.naturalWidth>0));
  await next();
  if(word==='かさ'){await page.locator('[data-action=labels-tile][data-id="0"]').click();await page.locator('[data-action=labels-tile][data-id="1"]').click();await page.locator('[data-action=labels-check]').click();await expect(page.locator('[role=status]')).toContainText('다시 확인');await page.waitForTimeout(460);await expect(page.locator('[data-action=labels-undo]')).toHaveCount(0);await page.locator('[data-action=labels-tile][data-id="0"]').click();await expect(page.locator('.label-slots').locator('> *').nth(0)).toHaveText('');await expect(page.locator('.label-slots').locator('> *').nth(1)).toHaveText('か');await expect(page.locator('[data-action=labels-check]')).toBeDisabled();await page.locator('[data-action=labels-remove][data-id="1"]').click();}
  await page.locator('[data-action=labels-tile][data-id="1"]').click();await page.locator('[data-action=labels-tile][data-id="0"]').click();await page.locator('[data-action=labels-check]').click();await page.waitForTimeout(460);
  await expect(page.locator('h1')).toHaveText(word==='ねこ'?'그림과 이름표를 이어요':'단어를 읽어 봐요');
  if(word==='かさ')await page.screenshot({path:`/tmp/seodang-labels-build-${width}-${scale}.png`});
 }
 await expect(page.locator('h1')).toHaveText('그림과 이름표를 이어요');
 await page.screenshot({path:`/tmp/seodang-labels-match-${width}-${scale}.png`});
 for(const id of ['kasa','kutsu','hana','neko']){
  const a=await page.locator(`[data-match-side=glyph][data-match-id=${id}]`).boundingBox(),b=await page.locator(`[data-match-side=reading][data-match-id=${id}]`).boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();
  if(id!=='neko')await expect(page.locator(`[data-match-side=glyph][data-match-id=${id}]`)).toBeDisabled();
  if(id==='kasa'){await page.reload();await page.locator('[data-action=labels]').click();await expect(page.locator('[data-match-lines] path')).toHaveCount(1);}
 }
 await expect(page.locator('.view-listening')).toBeVisible();await expect(page.locator('h1')).toHaveText('듣고 사진을 골라요');
 await page.screenshot({path:`/tmp/seodang-listening-${width}-${scale}.png`});
 await expect(page.locator('main')).not.toContainText('네 단어를 읽었어요');await expect(page.locator('[data-action=labels-next]')).toHaveCount(0);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));assert.equal(saved.onboardingLevel,1);assert.equal(saved.labels.completed,true);assert.equal(saved.labels.matches.length,4);assert.ok(saved.history.completed.includes('labels'));
 await page.reload();await expect(page.locator('.home')).toContainText('1단계 · 듣고 사진 고르기');
 await page.locator('[data-action=my]').click();await expect(page.locator('.record-overview')).toContainText('4개');await expect(page.locator('.record-entry')).toHaveCount(0);
 await page.locator('[data-action=home]').first().click();await page.locator('[data-action=listening]').click();
 await page.locator('[data-action=listening-answer][data-id=kasa]').click();await expect(page.locator('[role=status]')).toContainText('다시 듣고');await page.waitForTimeout(460);
 for(const id of ['hana','kutsu','neko','kasa']){
  await page.locator(`[data-action=listening-answer][data-id=${id}]`).click();await page.waitForTimeout(460);
  if(id==='hana'){await page.reload();await page.locator('[data-action=listening]').click();}
 }
 await expect(page.locator('.learning-map')).toBeVisible();await expect(page.locator('.map-overview')).toContainText('5개 완료');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')).onboardingLevel),1);
 assert.deepEqual(errors,[]);console.log(`Labels ${width}x${height} scale ${scale}: passed`);await page.close();
}}finally{await browser.close();}
