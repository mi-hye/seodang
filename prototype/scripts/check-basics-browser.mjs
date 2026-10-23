import {webkit,expect} from '@playwright/test';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {freshState} from '../src/engine.js';import {freshListening} from '../src/listening-state.js';import {basicLessons} from '../src/basics-state.js';
const browser=await webkit.launch();try{
 const p=await browser.newPage({viewport:{width:320,height:844}}),errors=[],requests=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
 await p.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html'});}catch{return r.fulfill({status:404,body:''});}});
 await p.addInitScript(s=>{if(!sessionStorage.seeded){localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));sessionStorage.seeded='1';}},{...freshState(),onboarded:true,onboardingLevel:1,settings:{sound:false,motion:'off',textScale:1.2},listening:{...freshListening(),completed:true,index:4}});
 await p.goto('https://seodang.test/playable.html');assert.ok(!requests.some(r=>r.endsWith('/basics.js')));await expect(p.locator('.map-choice')).toHaveCount(10);await p.locator('button.home-start-card[data-action]').click();
 const click=async a=>{await p.waitForTimeout(460);await p.locator(`[data-action=${a}]`).click();};
 for(const l of basicLessons){
  for(let i=0;i<l.count;i++){
   await expect(p.locator('.basic-count')).toHaveText(`${i*2+1}/${l.count*2}`);await click('basic-next');
   if(l.id===6&&i===0){await p.locator('[data-action=basic-select][data-id="1"]').click();await click('basic-check');await expect(p.locator('.basic-feedback')).not.toBeEmpty();await p.reload();await p.locator('button.home-start-card[data-action]').click();await expect(p.locator('.basic-count')).toHaveText('2/12');await p.screenshot({path:'/tmp/seodang-basic-6.png'});}
   await p.locator(`[data-action=basic-select][data-id="${i%3}"]`).click();
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await p.locator('.button-pair').evaluate(el=>getComputedStyle(el).flexDirection),'row');await click('basic-check');
  }
 }
 await expect(p.locator('.learning-map')).toBeVisible();const s=await p.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));assert.equal(s.onboardingLevel,1);assert.equal(Object.values(s.basics.lessons).filter(l=>l.completed).length,5);assert.deepEqual(errors,[]);console.log('1-6 through 1-10: lazy entry, wrong answer, reload resume, 41 exercises, automatic progression and narrow layout passed');
}finally{await browser.close();}
