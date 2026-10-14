import {webkit,expect} from '@playwright/test';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const browser=await webkit.launch();
try{
 for(const slow of ['src/onboarding-guide.js','src/onboarding-guide.css','assets/mascot/seodang-cartoon-atlas-v1.png','cancel','failure']){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
  let release;const gate=new Promise(r=>release=r);let failed=false;
  await page.route('https://seodang.test/**',async r=>{const file=new URL(r.request().url()).pathname.slice(1);requests.push(file);
   if(file===slow||(slow==='cancel'&&file==='src/onboarding-guide.css'))await gate;
   if(slow==='failure'&&file.endsWith('seodang-cartoon-atlas-v1.png')&&!failed){await gate;failed=true;return r.fulfill({status:404,body:''});}
   try{return r.fulfill({body:readFileSync(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'image/png'});}catch{return r.fulfill({status:404,body:''});}
  });
  await page.goto('https://seodang.test/setup.html');assert.ok(!requests.includes('src/onboarding-guide.js'),'guide is not an initial dependency');
  await page.locator('form .primary').click();await page.locator('form .primary').click();
  if(slow==='failure'){
   release();
   await expect(page.locator('#feedback')).toContainText('다시 시도');await expect(page.locator('[data-step="2"]')).toBeVisible();await expect(page.locator('[data-step="3"]')).toBeHidden();await page.locator('form .primary').click();
  }else{
   await page.waitForTimeout(150);await expect(page.locator('[data-step="2"]')).toBeVisible();await expect(page.locator('[data-step="3"]')).toBeHidden();await expect(page.locator('.primary')).toBeDisabled();assert.equal(await page.locator('.progress').getAttribute('aria-valuenow'),'2');
   assert.doesNotMatch(await page.locator('body').innerText(),/안내를 불러오는 중/);
   // Accidental duplicate submit cannot skip the guide or save onboarding.
   await page.locator('form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
   if(slow==='cancel')await page.locator('[data-action="previous"]').click();
   release();
   if(slow==='cancel'){await page.waitForTimeout(200);await expect(page.locator('[data-step="1"]')).toBeVisible();await page.locator('form .primary').click();await page.locator('input[value="3"]').check();await page.locator('form .primary').click();}
  }
  await expect(page.locator('[data-step="3"]')).toBeVisible();await expect(page.locator('.guide-coach p')).toContainText('소리를 듣고');await expect(page.locator('.guide-demo')).toBeVisible();
  assert.equal(await page.locator('.guide-mascot').evaluate(el=>getComputedStyle(el).width),'88px');
  assert.equal(await page.evaluate(()=>localStorage.getItem('seodang.web-prototype.v1')),null);
  await page.evaluate(async()=>{const image=new Image();image.src='assets/mascot/seodang-cartoon-atlas-v1.png';await image.decode();if(!image.naturalWidth)throw Error('not decoded');});
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Guide transition passed: delayed JS/CSS/image never reveals partial guide, duplicate submit is ignored, back cancels transition, image failure retries, assets remain deferred.');
}finally{await browser.close();}
