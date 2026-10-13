import {webkit} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await webkit.launch({headless:true});
try {
 for(const level of [1,2,3,4,5]) {
  const total=level<=3?3:2;
  const page=await browser.newPage({viewport:{width:level===1?320:390,height:level===1?568:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://seodang.test/**',route=>{
   const file=new URL(route.request().url()).pathname.slice(1);
   try {let body=readFileSync(file);if(file.endsWith('.css'))body=body.toString().replace(/env\(safe-area-inset-top(?:,\s*0px)?\)/g,'47px').replace(/env\(safe-area-inset-bottom(?:,\s*0px)?\)/g,'34px');return route.fulfill({body,contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.svg')?'image/svg+xml':'image/png'});}catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto('https://seodang.test/setup.html');
  await page.locator('form .primary').click();await page.locator(`input[name="level"][value="${level}"]`).check();await page.locator('form .primary').click();
  await page.waitForSelector('.guide-dialogue');assert.equal(await page.locator('[data-action="settings"]').count(),0);
  assert.equal(await page.locator('video,.guide-player').count(),0);
  assert.equal(await page.locator('.guide-count').innerText(),`1 / ${total}`);
  await page.evaluate(async()=>{const image=new Image();image.src='assets/mascot/seodang-cartoon-atlas-v1.png';await image.decode();});
  await page.locator('form .primary').click();assert.equal(await page.locator('.guide-count').innerText(),`2 / ${total}`);
  await page.locator('[data-action="previous"]').click();assert.equal(await page.locator('.guide-count').innerText(),`1 / ${total}`);
  await page.locator('[data-action="previous"]').click();assert.equal(await page.locator('[data-step="2"]').isVisible(),true);
  await page.locator('form .primary').click();await page.waitForSelector('.guide-dialogue');
  for(let i=1;i<total;i++)await page.locator('form .primary').click();
  assert.equal(await page.locator('.guide-count').innerText(),`${total} / ${total}`);
  assert.doesNotMatch(await page.locator('.guide-dialogue').innerText(),/풍월|버튼을 직접/);
  assert.equal(await page.locator('form .primary').innerText(),'학습 홈으로');
  assert.equal(await page.evaluate(()=>localStorage.getItem('seodang.web-prototype.v1')),null);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const action=await page.locator('form .primary').boundingBox();assert.ok(action.y+action.height<=(level===1?568:844)-34);
  if(level===2)await page.screenshot({path:'/tmp/seodang-dog-onboarding.png'});
  await page.locator('form .primary').click();await page.waitForURL('**/playable.html#home');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));assert.equal(saved.onboardingLevel,level);assert.equal(saved.onboarded,true);assert.equal(saved.episode.started,false);assert.equal(saved.sentence,undefined);assert.equal(saved.kana,undefined);
  assert.equal(await page.locator('.coach-tour').count(),0);assert.deepEqual(errors,[]);await page.close();
 }
 console.log('All 5 levels: manual mascot guide, back navigation, existing image, safe-area CTA, save only after guide, home without auto-start passed.');
} finally {await browser.close();}
