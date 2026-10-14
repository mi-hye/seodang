import {webkit,expect} from '@playwright/test';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {freshState} from '../src/engine.js';
const b=await webkit.launch();try{for(const [width,height,scale] of [[320,568,1],[390,844,1],[390,844,1.2]]){
 const p=await b.newPage({viewport:{width,height},isMobile:true,hasTouch:true}),errors=[],requests=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
 await p.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.jpg')?'image/jpeg':f.endsWith('.wav')?'audio/wav':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 const s=freshState();s.onboarded=true;s.onboardingLevel=4;s.settings.textScale=scale;s.settings.sound=true;
 await p.addInitScript(s=>{if(!sessionStorage.seeded){localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));sessionStorage.seeded='1';}window.played=[];window.Audio=class{constructor(src){this.src=src;}pause(){}async play(){window.played.push(this.src);queueMicrotask(()=>this.onended?.());}};},s);
 await p.goto('https://seodang.test/playable.html');await expect(p.locator('.home')).toContainText('4단계');assert.ok(!requests.some(x=>x.endsWith('/dialogue.js')));
 const click=async(a,id)=>{await p.locator(`[data-action=${a}]${id===undefined?'':`[data-id="${id}"]`}`).first().click();await p.waitForTimeout(460);};
 await click('dialogue');await expect(p.locator('h1')).toHaveText('카페에서 주문해요');await click('dialogue-next');
 for(let i=0;i<3;i++){await expect(p.locator('h1')).toHaveText('질문에 답해 봐요');if(i===1)await p.screenshot({path:`/tmp/seodang-level4-learn-${width}-${scale}.png`});await click('dialogue-next');}
 for(let i=0;i<3;i++){
  await expect(p.locator('[data-action=dialogue-check]')).toBeDisabled();await click('dialogue-select','1');await click('dialogue-check');await expect(p.locator('[role=status]')).toBeVisible();
  if(i===1){await p.reload();await click('dialogue');await expect(p.locator('[data-action=dialogue-select][data-id="1"]')).toHaveAttribute('aria-pressed','true');}
  await click('dialogue-select','0');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:`/tmp/seodang-level4-practice-${width}-${scale}.png`});await click('dialogue-check');
 }
 await expect(p.locator('.learning-map')).toContainText('1개 완료');assert.ok((await p.evaluate(()=>window.played)).some(x=>x.includes('/dialogue/')));
 await click('my');await expect(p.locator('.record-overview')).toContainText('1개');await click('home');await click('dialogue');await expect(p.locator('h1')).toHaveText('카페에서 주문해요');
 await click('settings');await p.locator('[data-setting=difficulty]').selectOption('3');await p.keyboard.press('Escape');await expect(p.locator('.home')).toContainText('3단계');
 assert.deepEqual(errors,[]);await p.close();console.log(`Level 4 ${width}px scale ${scale}: passed`);
}}finally{await b.close();}
