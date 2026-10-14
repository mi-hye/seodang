import {webkit} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
const browser=await webkit.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://seodang.test/**',route=>{
  const file=new URL(route.request().url()).pathname.slice(1);requests.push(file);
  try{return route.fulfill({body:readFileSync(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.wav')?'audio/wav':file.endsWith('.jpg')?'image/jpeg':'image/png'});}catch{return route.fulfill({status:404,body:''});}
 });
 const seed=freshState();seed.onboarded=true;seed.uiGuideSeenVersion=2;seed.onboardingLevel=2;
 await page.addInitScript(seed=>{
  if(!localStorage.getItem('seodang.web-prototype.v1'))localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(seed));
  window.played=[];window.Audio=class{constructor(src){this.src=src;}pause(){}async play(){window.played.push(this.src);queueMicrotask(()=>this.onended?.());}};
 },seed);
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));
 const click=async(action,extra='')=>{await page.locator(`[data-action="${action}"]${extra}`).first().click();await page.waitForTimeout(460);};
 await page.goto('https://seodang.test/playable.html#home');
 assert.ok(!requests.includes('src/sentences.js'));
 await click('settings');await page.locator('[data-setting="difficulty"]').selectOption('3');await page.keyboard.press('Escape');
 assert.ok((await page.locator('.home').innerText()).includes('3단계'));
 await click('home');assert.equal(await page.locator('.map-choice:disabled').count(),2);await click('sentence');
 assert.ok(requests.includes('src/sentences.js'));assert.ok(requests.includes('src/sentences.css'));
 assert.equal(await page.locator('.sentence-intro h1').innerText(),'손님의 가방을 찾아요');
 assert.ok((await page.evaluate(()=>window.played)).some(src=>src.includes('level3.intro')));
 await click('sentence-next');
 await page.screenshot({path:'/tmp/seodang-level3-learn.png',fullPage:true});
 assert.ok((await page.evaluate(()=>window.played)).some(src=>src.includes('level3.owner')));
 for(let i=0;i<3;i++) {
  assert.equal((await saved()).sentence.index,i);
  assert.ok(await page.locator('.sentence-learn').count());
  assert.equal(await page.locator('.sentence-step').innerText(),`${i*2+1}/6`);
  assert.equal(await page.locator('.sentence-step').evaluate(el=>getComputedStyle(el).textAlign),'right');
  assert.equal(await page.locator('.sentence-heading h2').count(),1);
  await click('sentence-next');
  assert.equal(await page.locator('[data-action="sentence-check"]').isDisabled(),true);
  assert.equal(await page.locator('.sentence-step').innerText(),`${i*2+2}/6`);
  assert.equal(await page.locator('.sentence-answer').innerText(),'말을 순서대로 골라주세요');
  assert.equal(await page.getByText('말을 순서대로 골라주세요',{exact:true}).count(),1);
  for(const width of [320,390]){
   await page.setViewportSize({width,height:844});
   const previous=await page.locator('.sentence-actions [data-action=sentence-previous]').boundingBox(),check=await page.locator('.sentence-actions [data-action=sentence-check]').boundingBox();
   assert.ok(Math.abs(previous.y-check.y)<1&&previous.x+previous.width<check.x);
   assert.equal(await page.locator('.sentence-actions').innerText(),'이전\n확인');
  }
  if(i===0)await page.screenshot({path:'/tmp/seodang-sentence-actions.png',fullPage:true});
  const count=i===2?2:3;
  for(let n=count-1;n>=0;n--)await page.locator(`.sentence-choices [data-id="${n}"]`).click();
  await click('sentence-check');assert.equal((await saved()).sentence.checked,false);assert.ok(await page.locator('[role="status"]').count());
  assert.equal(await page.locator('[data-action=sentence-clear]').count(),0);
  for(let n=count-1;n>=0;n--)await page.locator(`.sentence-answer [data-id="${n}"]`).click();
  await page.locator('.sentence-choices [data-id="0"]').click();
  if(i===0){
   await page.reload();await click('sentence');
   assert.deepEqual((await saved()).sentence.tokens,[0]);assert.ok(await page.locator('.sentence-arrange').count());
  }
  for(let n=1;n<count;n++)await page.locator(`.sentence-choices [data-id="${n}"]`).click();
  await click('sentence-check');assert.equal((await saved()).sentence.checked,true);
  await click('sentence-next');
 }
 await page.screenshot({path:'/tmp/seodang-level3-solve.png',fullPage:true});
 await click('sentence-select','[data-id="window-red"]');await click('sentence-submit');assert.equal((await saved()).sentence.completed,false);
 await click('sentence-select','[data-id="door-blue"]');await click('sentence-submit');assert.equal((await saved()).sentence.completed,false);
 await click('sentence-select','[data-id="window-blue"]');await click('sentence-submit');assert.equal((await saved()).sentence.completed,true);
 assert.equal(await page.locator('.sentence-summary h1').innerText(),'학습 완료');
 assert.equal(await page.locator('.sentence-summary [data-action=sentence-review]').count(),0);await click('home');
 await click('my');assert.ok((await page.locator('.record-overview').innerText()).includes('1개'));
 await click('settings');await page.locator('[data-setting="difficulty"]').selectOption('2');await page.keyboard.press('Escape');assert.equal((await saved()).episode.started,false);
 await click('settings');await page.locator('[data-setting="difficulty"]').selectOption('3');await page.keyboard.press('Escape');await click('sentence-review');assert.equal(await page.locator('.sentence-review-item').count(),3);
 assert.deepEqual(errors,[]);
 await page.close();
 console.log('Level 3 WebKit: full case, both wrong answers, sentence retry, reload/resume, lazy load, audio dispatch, review, records, difficulty isolation passed.');
} finally {await browser.close();}
