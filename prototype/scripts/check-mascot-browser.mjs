import {webkit} from '@playwright/test';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const b=await webkit.launch();
try {
 const p=await b.newPage({viewport:{width:390,height:844},isMobile:true});
 await p.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 await p.goto('https://seodang.test/setup.html');await p.locator('form .primary').click();await p.locator('form .primary').click();await p.waitForSelector('.mascot-sprite');
 const bounds=await p.evaluate(async()=>{const img=new Image();img.src='assets/mascot/seodang-cartoon-atlas-v1.png';await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const frames=[];for(let i=0;i<6;i++){const d=ctx.getImageData(i%3*512,Math.floor(i/3)*512,512,512).data;let l=512,r=0,t=512,b=0,clear=0;for(let y=0;y<512;y++)for(let x=0;x<512;x++){const a=d[(y*512+x)*4+3];if(a===0)clear++;if(a>30){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}}frames.push({l,r,t,b,clear});}return frames;});
 for(const f of bounds){assert.ok(f.l>8&&f.r<504&&f.t>8&&f.b<504,JSON.stringify(f));assert.ok(f.clear>10000);}
 const positions=[];
 for(const [name,time] of [['idle',0],['blink',2450],['wave',4000]]) {
  positions.push(await p.locator('.mascot-sprite').evaluate((el,time)=>{const a=el.getAnimations()[0];a.pause();a.currentTime=time;return getComputedStyle(el).backgroundPosition;},time));
  await p.screenshot({path:`/tmp/seodang-cartoon-${name}.png`});
 }
 assert.equal(new Set(positions).size,3);
 await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('.mascot-sprite').evaluate(el=>getComputedStyle(el).animationName),'none');
 await p.emulateMedia({reducedMotion:'no-preference'});
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await p.locator('.mascot-sprite').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await p.locator('.mascot-sprite').evaluate(el=>getComputedStyle(el).animationPlayState),'running');
 await p.locator('[data-action="previous"]').click();assert.equal(await p.locator('#onboarding-guide').evaluate(el=>el.classList.contains('guide-paused')),true);
 console.log('Sprite QA passed: all six frames transparent and unclipped; actual blink/wave frame changes; reduced motion, hidden-page pause, dispose cleanup. Bounds:',bounds);
}finally{await b.close();}
