import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await webkit.launch();
try{for(const width of [320,390])for(const reducedMotion of [false,true]){
 const page=await browser.newPage({viewport:{width,height:844}});
 await page.route('https://seodang.test/**',route=>{
  const file=new URL(route.request().url()).pathname.slice(1);
  if(file==='test.html')return route.fulfill({contentType:'text/html',body:'<link rel="stylesheet" href="src/style.css"><link rel="stylesheet" href="src/onboarding-guide.css"><div id="guide" style="height:650px"></div>'});
  const types={js:'text/javascript',css:'text/css',wasm:'application/wasm',png:'image/png'};
  try{return route.fulfill({body:readFileSync(file),contentType:types[file.split('.').at(-1)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
 });
 await page.goto('https://seodang.test/test.html');
 await page.evaluate(async reducedMotion=>{
  const {mountGuide}=await import('/src/onboarding-guide.js');
  window.disposeGuide=mountGuide(document.querySelector('#guide'),0,{reducedMotion});
  window.blankFrames=0;
  const inspect=()=>{
   const host=document.querySelector('.guide-scene');
   if(host.dataset.renderer==='rive'){
    const canvas=host.querySelector('canvas'),probe=document.createElement('canvas');probe.width=probe.height=32;
    const ctx=probe.getContext('2d');ctx.drawImage(canvas,0,0,32,32);
    if(!ctx.getImageData(0,0,32,32).data.some((v,i)=>i%4===3&&v>0))window.blankFrames++;
   }
   window.checkFrame=requestAnimationFrame(inspect);
  };inspect();
 },reducedMotion);
 await expect(page.locator('.guide-scene')).toHaveAttribute('data-renderer','rive',{timeout:20000});
 assert.equal(await page.evaluate(()=>window.blankFrames),0);
 const first=await page.locator('.guide-scene canvas').elementHandle();
 await page.evaluate(()=>window.disposeGuide.next());
 assert.equal(await first.evaluate(el=>el===document.querySelector('.guide-scene canvas')),true);
 await page.evaluate(()=>{cancelAnimationFrame(window.checkFrame);window.disposeGuide();});
 await expect(page.locator('.guide-scene canvas')).toHaveCount(0);
 await page.close();
}console.log('PASS: cold first frame has pixels before fallback hides; same canvas on next page; 320/390 and reduced motion.');}finally{await browser.close();}
