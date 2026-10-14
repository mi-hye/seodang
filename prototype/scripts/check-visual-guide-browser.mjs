import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
const b=await webkit.launch();try{for(const direction of ['ko-ja','ja-ko'])for(const level of [1,3,7]){
 const p=await b.newPage({viewport:{width:320,height:700}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.wav')?'audio/wav':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 await p.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));},{...freshState(),onboarded:true,courseDirection:direction,onboardingLevel:level,settings:{sound:false,textScale:1.2,motion:'off'}});
 await p.goto('https://seodang.test/setup.html#guide');await expect(p.locator('.guide-demo')).toBeVisible();await expect(p.locator('.guide-count')).toHaveCount(0);await expect(p.locator('.actions button')).toBeEnabled();
 const before=await p.evaluate(()=>localStorage.getItem('seodang.web-prototype.v1'));
 await p.locator('[data-guide-choice="0"]').click();await expect(p.locator('.guide-correct')).toHaveCount(0);
 await p.locator('[data-guide-choice="1"]').click();await expect(p.locator('.guide-correct')).toHaveCount(1);assert.equal(await p.evaluate(()=>localStorage.getItem('seodang.web-prototype.v1')),before);
 const bounds=await p.locator('.guide-options button').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().y));assert.equal(bounds[0],bounds[1]);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(level===7)await expect(p.locator('.guide-example')).toHaveCount(0);
 await p.locator('.guide-listen').click();await p.waitForTimeout(150);await expect(p.locator('.guide-feedback')).not.toContainText('눌러');
 await p.screenshot({path:`/tmp/seodang-visual-guide-${direction}-${level}.png`});assert.deepEqual(errors,[]);await p.close();
}console.log('Visual guide: both languages, beginner/sentence/listening levels, answer retry, no saved progress, narrow layout passed');}finally{await b.close();}
