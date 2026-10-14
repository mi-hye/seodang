import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
import {load} from '../src/storage.js';
const browser=await webkit.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{return r.fulfill({body:readFileSync('dist/'+f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.wav')?'audio/wav':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 const s=freshState();s.onboarded=true;s.onboardingLevel=1;s.settings.sound=false;
 await page.addInitScript(s=>{if(!sessionStorage.seeded){localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));sessionStorage.seeded='1';}},s);
 await page.goto('https://seodang.test/playable.html');await page.locator('.tabs [data-action=home]').click();
 await expect(page.locator('.map-choice')).toHaveCount(10);await expect(page.locator('.map-choice:disabled')).toHaveCount(0);await expect(page.locator('.map-badge')).toHaveCount(0);
 await page.screenshot({path:'/tmp/seodang-development-map.png'});
 await page.locator('[data-action=kana][data-id="2"]').click();await expect(page.locator('h1')).toHaveText('ま · み · む · め · も');
 await page.locator('[data-action=kana-next]').click();await expect(page.locator('canvas')).toBeVisible();
 await page.reload();await expect(page.locator('.storage-warning')).toHaveCount(0);await page.locator('.home-start-card [data-action=kana]').click();await expect(page.locator('canvas')).toBeVisible();
 let raw=await page.evaluate(()=>localStorage.getItem('seodang.web-prototype.v1')),saved=JSON.parse(raw);
 assert.equal(saved.kana.active,2);assert.equal(saved.kana.lessons[0].started,false);assert.equal(saved.kana.lessons.filter(l=>l.completed).length,0);assert.deepEqual(saved.history.completed,[]);
 // A regular build accepts the record but restores the first eligible lesson.
 const regular=load({getItem:()=>raw});assert.equal(regular.blocked,false);assert.equal(regular.state.kana.active,0);assert.equal(regular.state.kana.lessons[2].started,true);
 await page.locator('[data-action=home]').click();await page.locator('.tabs [data-action=home]').click();await page.locator('[data-action=labels]').click();await expect(page.locator('h1')).toHaveText('그림에 이름표를 붙여요');
 await page.locator('[data-action=labels-next]').click();await expect(page.locator('.labels-word strong')).toHaveText('かさ');
 await page.reload();await expect(page.locator('.storage-warning')).toHaveCount(0);await page.locator('.tabs [data-action=home]').click();await page.locator('[data-action=labels]').click();await expect(page.locator('.labels-word strong')).toHaveText('かさ');
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));assert.deepEqual(saved.history.completed,[]);assert.equal(saved.labels.completed,false);
 assert.deepEqual(errors,[]);console.log('Development map: all ten lessons unlocked, direct entry, saved resume and regular-build compatibility passed.');
}finally{await browser.close();}
