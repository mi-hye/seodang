import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
const browser=await webkit.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.json')?'application/json':f.endsWith('.wav')?'audio/wav':f.endsWith('.svg')?'image/svg+xml':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 const state=freshState();state.onboarded=true;state.onboardingLevel=1;state.settings.sound=false;
 state.kana={version:7,active:1,learned:['a','o','i','ki','ku'],lessons:[{started:true,phase:'summary',index:0,answered:false,feedback:'',completed:true,caseSolved:true},{started:true,phase:'learn',index:1,answered:false,feedback:'',completed:false,caseSolved:false},{started:false,phase:'intro',index:0,answered:false,feedback:'',completed:false,caseSolved:false}]};
 await page.addInitScript(s=>{if(!sessionStorage.seeded){localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));sessionStorage.seeded='1';}},state);
 await page.goto('https://seodang.test/playable.html');await expect(page.locator('.home')).toContainText('히라가나 1/3');await expect(page.locator('.kana-cover')).toHaveText('あ い う え お');
 await page.screenshot({path:'/tmp/seodang-thirds-home.png'});
 await page.locator('.tabs [data-action=my]').click();await expect(page.locator('.record-overview')).toContainText('1개');await expect(page.locator('.record-cases')).toHaveCount(0);
 await page.locator('.tabs [data-action=home]').click();await page.locator('[data-action=kana][data-id="0"]').click();await expect(page.locator('h1')).toHaveText('あ · い · う · え · お');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));assert.equal(saved.kana.version,8);assert.deepEqual(saved.kana.previousCourse,state.kana);assert.deepEqual(saved.kana.learned,state.kana.learned);
 await page.locator('[data-action=kana-next]').click();await expect(page.locator('canvas')).toBeVisible();await expect.poll(()=>page.locator('.kana-memory-card img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);await page.screenshot({path:'/tmp/seodang-thirds-writing.png'});
 await page.locator('[data-action=home]').first().click();await page.locator('.tabs [data-action=home]').click();await expect(page.locator('.map-choice:disabled')).toHaveCount(4);await page.screenshot({path:'/tmp/seodang-thirds-map.png'});
 assert.deepEqual(errors,[]);console.log('v7 migration: original save, learned glyphs and completion preserved; expanded lessons start at 1/3 with correct locks.');
}finally{await browser.close();}
