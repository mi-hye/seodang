import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
const browser=await webkit.launch();
try{for(const width of [320,390])for(const direction of ['ja-ko','ko-ja']){
 const page=await browser.newPage({viewport:{width,height:width===320?667:844}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);if(f==='src/build-config.js')return r.fulfill({body:'export const developmentMode=false;',contentType:'text/javascript'});try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 await page.addInitScript(s=>localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s)),{...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:direction,onboardingLevel:0,settings:{sound:false,motion:'off',textScale:1.2}});
 await page.goto('https://seodang.test/playable.html');const trigger=page.locator('[data-action=kana-chart]');await expect(trigger).toBeVisible();assert.ok(!requests.some(url=>url.endsWith('/korean-chart.js')));
 await trigger.click();const panel=page.locator('dialog[open]');await expect(panel).toBeVisible();
 if(direction==='ja-ko'){
  await expect(trigger).toHaveText('文字');await expect(panel.locator('td span[lang=ko]')).toHaveCount(21);
  assert.equal(new Set(await panel.locator('td span[lang=ko]').allTextContents()).size,21);
  await panel.getByRole('tab',{name:'母音',exact:true}).press('ArrowRight');await expect(panel.getByRole('tab',{name:'子音',exact:true})).toBeFocused();await expect(panel.locator('td span[lang=ko]')).toHaveCount(19);
  assert.equal(new Set(await panel.locator('td span[lang=ko]').allTextContents()).size,19);
  await page.screenshot({path:`/tmp/seodang-korean-chart-consonants-${width}.png`});
  await panel.getByRole('tab',{name:'子音',exact:true}).press('Home');await expect(panel.locator('td span[lang=ko]')).toHaveCount(21);
  await page.screenshot({path:`/tmp/seodang-korean-chart-vowels-${width}.png`});
 }else{await expect(panel.getByRole('tab',{name:'히라가나',exact:true})).toHaveAttribute('aria-selected','true');await panel.getByRole('tab',{name:'가타카나',exact:true}).click();await expect(panel.getByRole('tab',{name:'가타카나',exact:true})).toHaveAttribute('aria-selected','true');}
 assert.ok(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth),'No horizontal overflow');await panel.locator('[data-action=close]').click();await expect(trigger).toBeFocused();assert.deepEqual(errors,[]);await page.close();
}console.log('Letter charts: Korean 40 letters, Japanese tabs, lazy loading, keyboard navigation, close/focus and 320/390px large text passed.');}finally{await browser.close();}
