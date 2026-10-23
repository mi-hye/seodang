import {webkit} from '@playwright/test';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {freshState} from '../src/engine.js';
const b=await webkit.launch();
try {
 for(const [width,height,scale,level] of [[320,568,1,1],[320,568,1.2,2],[390,844,1,2],[390,844,1.2,3],[430,932,1,3],[390,844,1,4]]) {
  const p=await b.newPage({viewport:{width,height},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{let body=readFileSync(f);if(f.endsWith('.css'))body=body.toString().replace(/env\(safe-area-inset-top(?:,\s*0px)?\)/g,'47px').replace(/env\(safe-area-inset-bottom(?:,\s*0px)?\)/g,'34px');return r.fulfill({body,contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
  const state=freshState();state.onboarded=true;state.onboardingLevel=level;state.settings.sound=false;state.settings.textScale=scale;
  await p.addInitScript(s=>{if(!localStorage.getItem('seodang.web-prototype.v1'))localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));},state);
  await p.goto('https://seodang.test/playable.html#home');await p.waitForSelector('.coach-tour');
  const selectors=['.tabs [data-action=home]','.app-header-settings','button.case-card[data-action], .home .record-case button'];
  const original=await Promise.all(selectors.map(s=>p.locator(s).first().boundingBox()));
  for(let step=0;step<3;step++) {
   await p.waitForTimeout(100);
   const rect=await p.locator('.coach-card').boundingBox();const spot=await p.locator('.coach-spot').boundingBox();
   if(rect.y+rect.height>height-34){await p.screenshot({path:'/tmp/coach-fail.png'});console.log(await p.evaluate(()=>({h:innerHeight,v:visualViewport.height,style:getComputedStyle(document.querySelector('.coach-tour')).padding,card:document.querySelector('.coach-card').outerHTML})));}
   assert.ok(rect.x>=0&&rect.x+rect.width<=width,JSON.stringify(rect));assert.ok(rect.y+rect.height<=height-34,`${width}/${scale}/${step} card bottom ${rect.y+rect.height}`);
   assert.ok(rect.y+rect.height<=spot.y||rect.y>=spot.y+spot.height,`${width}/${scale}/${step} overlaps target: ${JSON.stringify({rect,spot})}`);
   for(let i=0;i<3;i++)assert.deepEqual(await p.locator(selectors[i]).first().boundingBox(),original[i],'Actual UI moved');
   assert.equal(await p.locator('.coach-arrow, .coach-pointer').count(),0);
   assert.equal(await p.evaluate(()=>window.scrollY),0);
   assert.equal(await p.locator('.coach-count').innerText(),`${step+1} / 3`);
   if(width===390&&scale===1&&level===2)await p.screenshot({path:`/tmp/seodang-ui-coach-${step}.png`});
   if(step===1){await p.locator('[data-coach="previous"]').click();assert.equal(await p.locator('.coach-count').innerText(),'1 / 3');await p.locator('[data-coach="next"]').click();}
   if(step===2)await p.locator(selectors[2]).first().click();else await p.locator('[data-coach="next"]').click();
  }
  await p.waitForSelector('.coach-tour',{state:'detached'});
  const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));assert.equal(saved.uiGuideSeenVersion,2);
  if(level===1)await p.waitForSelector('.kana-page');if(level===2)await p.waitForSelector('.play-intro');if(level===3)await p.waitForSelector('.sentence-intro');if(level===4)await p.waitForSelector('#panel[open]');
  await p.goto('https://seodang.test/playable.html#home');assert.equal(await p.locator('.coach-tour').count(),0);assert.equal(await p.evaluate(()=>document.body.style.position),'');assert.deepEqual(errors,[]);await p.close();
 }
 console.log('Coach passed: real UI anchors, back/next, actual start action, persistence, no repeat, small/large text and safe areas.');
}finally{await b.close();}
