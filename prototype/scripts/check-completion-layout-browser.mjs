import {webkit,expect} from '@playwright/test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {freshState} from '../src/engine.js';
const browser=await webkit.launch();
try{for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:width===320?667:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 await page.addInitScript(s=>localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s)),{...freshState(),onboarded:true,onboardingLevel:0});await page.goto('https://seodang.test/playable.html');await expect(page.locator('.shell')).toBeVisible();
 await page.evaluate(async()=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/src/practice.css';document.head.append(link);await new Promise(resolve=>link.onload=resolve);document.documentElement.style.setProperty('--text-scale','1.2');document.documentElement.dataset.motion='off';});
 for(const direction of ['ko-ja','ja-ko'])for(const level of [0,2,4,5,6]){
  await page.evaluate(async({direction,level})=>{
   const {freshState}=await import('/src/engine.js'),{renderPracticeComplete}=await import('/src/practice.js'),{centerLesson}=await import('/src/lesson-session.js'),{renderHeader}=await import('/src/header.js');
   const s={...freshState(),courseDirection:direction,onboardingLevel:level};const root=document.querySelector('#app');root.innerHTML=`<div class="shell">${renderPracticeComplete(s,title=>renderHeader(title),false)}</div>`;root.querySelector('.app-header').style.paddingTop='55px';centerLesson(root,s,direction==='ja-ko'?'korean':level===0?'kana':'sentence',true);window.scrollTo(0,0);
  },{direction,level});
  const boxes=await page.evaluate(()=>{const box=n=>{const r=n.getBoundingClientRect();return {cx:r.x+r.width/2,y:r.y,bottom:r.bottom};};return {icon:box(document.querySelector('.practice-fireworks')),title:box(document.querySelector('main h1')),button:box(document.querySelector('main>.primary')),progress:box(document.querySelector('.lesson-progress')),overflow:document.documentElement.scrollWidth>innerWidth,scroll:document.documentElement.scrollHeight>innerHeight+1};});
  assert.ok(Math.abs(boxes.icon.cx-width/2)<1,`${direction}/${level}/${width}: icon ${JSON.stringify(boxes)}`);assert.ok(Math.abs(boxes.title.cx-width/2)<1);assert.ok(Math.abs(boxes.button.cx-width/2)<1);assert.ok(boxes.icon.y>=boxes.progress.bottom);assert.ok(boxes.title.y>=boxes.icon.bottom);assert.ok(boxes.button.y>=boxes.title.bottom);assert.ok(!boxes.overflow&&!boxes.scroll,JSON.stringify(boxes));
  if(level===2)await page.screenshot({path:`/tmp/seodang-complete-${direction}-${width}.png`});
 }assert.deepEqual(errors,[]);await page.close();
}console.log('Completion centered in both courses/all five levels at 320/390 with large text/native header; no overlap or overflow.');}finally{await browser.close();}
