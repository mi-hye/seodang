import {webkit,expect} from '@playwright/test';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {freshState} from '../src/engine.js';
const b=await webkit.launch();try{for(const direction of ['ko-ja','ja-ko'])for(let level=0;level<=7;level++){
 const p=await b.newPage({viewport:{width:320,height:740}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.wav')?'audio/wav':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 await p.addInitScript(s=>{if(!sessionStorage.seeded){localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));sessionStorage.seeded='1';}},{...freshState(),onboarded:true,courseDirection:direction,onboardingLevel:level,koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1.2}});
 await p.goto('https://seodang.test/setup.html#guide');await expect(p.locator('.dog-guide')).toBeVisible();
 const jp=direction==='ja-ko'||level>=6;
 await expect(p.locator('.guide-coach h2')).toHaveText(jp?'ソダンは、こう進めます':'서당은 이렇게 진행돼요');
 await expect(p.locator('.guide-flow li')).toHaveCount(3);await p.screenshot({path:`/tmp/seodang-onboarding-start-${direction}-${level}.png`});
 await p.locator('.actions button').click();await expect(p.locator('[data-guide-page="1"]')).toBeVisible();
 await expect(p.locator('canvas,[data-guide-choice]')).toHaveCount(0);
 const placement=await p.locator('.guide-listen').evaluateAll(buttons=>buttons.every(b=>{const t=b.previousElementSibling.getBoundingClientRect(),r=b.getBoundingClientRect();return r.left>=t.right&&Math.abs(r.top+r.height/2-t.top-t.height/2)<2&&r.right<=innerWidth;}));assert.ok(placement,`${direction} ${level} guide audio placement`);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(level===7){await expect(p.locator('.guide-example')).toHaveCount(0);await expect(p.locator('.guide-wave')).toBeVisible();}
 await p.locator('[data-action="previous"]').click();await expect(p.locator('[data-guide-page="0"]')).toBeVisible();
 await p.locator('.actions button').click();await p.screenshot({path:`/tmp/seodang-onboarding-preview-${direction}-${level}.png`});
 await p.locator('.actions button').click();await expect(p.locator('[data-guide-page="2"]')).toBeVisible();
 await expect(p.locator('.guide-cycle>div')).toHaveCount(2);await expect(p.locator('.guide-cycle-count')).toHaveText('×3');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:`/tmp/seodang-stage-guide-${direction}-${level}.png`});
 await p.locator('.actions button').click();await p.waitForURL('**/playable.html#home');await expect(p.locator('.learning-map')).toBeVisible();assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')).onboardingLevel),level);
 if(level<=1){const nodes=p.locator('.map-choice');await expect(nodes).toHaveCount(direction==='ja-ko'?(level===0?10:1):(level===0?9:3));await p.screenshot({path:`/tmp/seodang-stage-map-${direction}-${level}.png`});}
 await p.locator('.tabs [data-action=settings]').click();await expect(p.locator('[data-setting=difficulty] option')).toHaveCount(8);await expect(p.locator('[data-setting=difficulty]')).toHaveValue(String(level));if(level===0){await p.locator('[data-setting=difficulty]').selectOption('1');await p.waitForURL('**/setup.html#guide');await expect(p.locator('[data-guide-type=word]')).toBeVisible();for(let i=0;i<3;i++)await p.locator('.actions button').click();await p.waitForURL('**/playable.html#home');await p.locator('.tabs [data-action=settings]').click();await p.locator('[data-setting=difficulty]').selectOption('0');await expect(p.locator('.learning-map')).toBeVisible();assert.ok(p.url().includes('playable.html'));}
 assert.deepEqual(errors,[]);await p.close();
}console.log('All 16 guides, three-page walkthroughs and back navigation, stage 0/1 maps, settings, localized narrow layouts passed');}finally{await b.close();}
