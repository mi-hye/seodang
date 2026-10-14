import {webkit,expect} from '@playwright/test';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {freshState} from '../src/engine.js';import {basicContent} from '../src/basics.js';
const browser=await webkit.launch();try{for(const id of [9,10])for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:width===320?667:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://seodang.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);if(file==='src/build-config.js')return r.fulfill({body:'export const developmentMode=true;',contentType:'text/javascript'});try{return r.fulfill({body:readFileSync(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'image/png'});}catch{return r.fulfill({status:404,body:''});}});


 const words=basicContent[id].filter(([text])=>id!==10||text.length>2),meanings=new Map(words.map(([text,meaning])=>[text,meaning]));
 for(const mode of [0,2])for(let index=0;index<words.length;index++){
 const seed={...freshState(),onboarded:true,onboardingLevel:0,settings:{sound:false,motion:'off',textScale:1.2},basics:{version:7,active:id,lessons:{[id]:{started:true,index:basicContent[id].length-1,phase:id===10?'learn':'quiz',selected:2,retry:false,completed:false}}},practices:{[`ko-ja:basic:${id}`]:{version:1,round:0,mode,index,count:words.length,action:{type:id===10?'basic-next':'basic-check'}}}};
 await page.addInitScript(s=>localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s)),seed);
 await page.goto('https://seodang.test/playable.html');await page.locator('.map-choice').nth(id-2).click();await page.locator('[data-choice=resume]').click();await expect(page.locator('.practice-with-meanings')).toBeVisible();
 await page.addStyleTag({content:'.app-header{padding-top:55px!important}'});
 if(mode===0){for(const option of await page.locator('.practice-choices button').all()){const text=await option.locator('.practice-choice-text').textContent();await expect(option.locator('.practice-choice-meaning')).toHaveText(meanings.get(text));}}
 else await expect(page.locator('.practice-writing-meaning')).toHaveText(words[index][1]);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),`${id}/${mode}/${index}/${width} vertical overflow`);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(index===0)await page.screenshot({path:`/tmp/seodang-meaning-${id}-${mode}-${width}.png`});
 }
 assert.deepEqual(errors,[]);await page.close();
}console.log('Lessons 8–9 meanings: every listening choice and writing prompt correct, no overflow.');}finally{await browser.close();}
