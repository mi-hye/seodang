import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
const browser=await webkit.launch();
try{for(const [width,height,scale] of [[320,568,1],[390,844,1],[390,844,1.2]]){
 const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.json')?'application/json':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.wav')?'audio/wav':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 const s=freshState();s.onboarded=true;s.onboardingLevel=2;s.settings.sound=false;s.settings.motion='off';s.settings.textScale=scale;
 await page.addInitScript(s=>{if(!sessionStorage.seeded){localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));sessionStorage.seeded='1';}},s);
 await page.goto('https://seodang.test/playable.html');await page.locator('.home [data-action=play]').click();
 await expect(page.locator('h2')).toContainText('색과 위치 표현');
 const next=async()=>{await page.waitForTimeout(460);await page.locator('[data-action=next]').click();};
 for(let i=0;i<3;i++)await next();
 await expect(page.locator('.guest-request')).toContainText('손님이 찾는 가방');await expect(page.locator('.guest-request')).toContainText('あおい かばん');await expect(page.locator('.guest-request')).toContainText('まどの そば');
 await expect(page.locator('.memo-row')).toHaveCount(0);await expect(page.locator('[data-action=submit]')).toBeDisabled();
 const target=page.locator('.window-red [data-id=bag-window-blue]');await expect(target).toBeVisible();await expect(page.locator('.room > img')).toHaveAttribute('src','assets/cafe-dusk-v2.jpg');await expect(page.locator('.cafe-layout')).toHaveCount(0);await expect(page.locator('.door-blue [data-id=bag-door-blue]')).toBeVisible();await expect(page.locator('.window-blue [data-id=bag-window-red]')).toBeVisible();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // Optional meanings no longer gate solving. Only open the help in the large-text run.
 if(scale>1){await page.locator('[data-action=clue][data-id=position]').click();await expect(page.locator('#panel-title')).toHaveText('가방의 위치');await page.locator('dialog [data-action=close]').click();}
 await page.locator('[data-action=select][data-id=bag-window-red]').click();await page.locator('[data-action=submit]').click();await expect(page.locator('.feedback')).toContainText('색');
 await page.locator('[data-action=select][data-id=bag-door-blue]').click();await page.locator('[data-action=submit]').click();await expect(page.locator('.feedback')).toContainText('위치');
 await page.reload();await page.locator('.home [data-action=play]').click();await expect(page.locator('[data-id=bag-door-blue]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-id=bag-window-blue]').click();if(width===390&&scale===1)await page.screenshot({path:'/tmp/seodang-level2-request.png',fullPage:true});
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')).episode);if(scale===1)assert.deepEqual(before.clues,[]);
 await page.locator('[data-action=submit]').click();await expect(page.locator('h1')).toContainText('가방이 주인을');
 await next();await page.locator('[data-action=transfer][data-id=book]').click();await expect(page.locator('.feedback')).toContainText('다시 골라');await page.locator('[data-action=transfer][data-id=cup]').click();await next();await expect(page.locator('h1')).toHaveText('학습 완료');
 assert.deepEqual(errors,[]);await page.close();console.log(`Level 2: ${width}x${height}, scale ${scale}: visible request, clear zones, optional help, both errors, reload and complete passed`);
}}finally{await browser.close();}
