import {webkit,expect} from '@playwright/test';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {freshState} from '../src/engine.js';import {basicContent} from '../src/basics.js';
const browser=await webkit.launch();try{for(const id of [9,10])for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:width===320?667:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://seodang.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);if(file==='src/build-config.js')return r.fulfill({body:'export const developmentMode=true;',contentType:'text/javascript'});try{return r.fulfill({body:readFileSync(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'image/png'});}catch{return r.fulfill({status:404,body:''});}});

 for(const phase of id===10?['learn']:['learn','quiz'])for(let index=0;index<basicContent[id].length;index++){
  const seed={...freshState(),onboarded:true,onboardingLevel:0,settings:{sound:false,motion:'off',textScale:1.2},basics:{version:6,active:id,lessons:{[id]:{started:true,index,phase,selected:null,retry:false,completed:false}}}};
  await page.addInitScript(s=>localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s)),seed);
  await page.goto('https://seodang.test/playable.html');await page.locator('.map-choice').nth(id-2).click();await page.locator('[data-choice=resume]').click();await expect(page.locator('.basic-page')).toBeVisible();
  await page.addStyleTag({content:'.app-header{padding-top:55px!important}'});
  const metrics=await page.evaluate(()=>({height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,viewport:innerHeight}));
  assert.ok(metrics.height<=metrics.viewport,`lesson ${id-1}, ${phase} ${index}, width ${width}: ${JSON.stringify(metrics)}`);assert.ok(metrics.width<=width);
  const pair=await page.locator('.basic-page>.button-pair').boundingBox();assert.ok(pair.y+pair.height<=metrics.viewport);
  if(index===0)await page.screenshot({path:`/tmp/seodang-word-${id}-${phase}-${width}.png`});
 }
 assert.deepEqual(errors,[]);await page.close();
}console.log('Lessons 8–9: all word and quiz screens fit 320/390px with large text.');}finally{await browser.close();}
