import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await webkit.launch();
try{for(const [width,height] of [[320,667],[390,844]])for(const language of ['ja','ko'])for(const scale of [1,1.2]){
 const page=await browser.newPage({viewport:{width,height}});
 await page.route('https://seodang.test/**',route=>{
  const file=new URL(route.request().url()).pathname.slice(1),types={js:'text/javascript',css:'text/css',html:'text/html',wasm:'application/wasm',png:'image/png',json:'application/json'};
  try{return route.fulfill({body:readFileSync(file),contentType:types[file.split('.').at(-1)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
 });
 await page.goto('https://seodang.test/setup.html');
 await page.addStyleTag({content:`:root{--text-scale:${scale}}.app-header{padding-top:47px!important}.actions{padding-bottom:34px!important}`});
 await page.locator(`input[name=language][value=${language}]`).check();
 await page.locator('button[type=submit]').click();
 await page.locator('button[type=submit]').click();
 const pages=language==='ko'?5:4;
 for(let i=0;i<pages;i++){
  await expect(page.locator('.dog-guide')).toHaveAttribute('data-guide-page',String(i));
  const sizes=await page.evaluate(()=>{
   const scroll=document.querySelector('.step-content'),scene=document.querySelector('.guide-scene'),mascot=document.querySelector('.guide-mascot');
   return {w:scroll.clientWidth,sw:scroll.scrollWidth,h:scroll.clientHeight,sh:scroll.scrollHeight,scene:scene.getBoundingClientRect().height,mascot:mascot.getBoundingClientRect().height,doc:document.documentElement.scrollWidth};
  });
  assert.ok(sizes.sw<=sizes.w+1&&sizes.sh<=sizes.h+1,JSON.stringify({width,language,scale,i,...sizes}));
  assert.ok(sizes.scene>0&&sizes.mascot<=sizes.scene+1,JSON.stringify(sizes));assert.ok(sizes.doc<=width);
  await page.screenshot({path:`/tmp/guide-fit-${width}-${language}-${scale}-${i}.png`});
  if(i<pages-1)await page.locator('button[type=submit]').click();
 }
 await page.close();
}console.log('PASS: all 36 onboarding screens fit at 320/390, both languages, normal/large text and safe-area spacing.');}finally{await browser.close();}
