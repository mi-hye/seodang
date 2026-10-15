import {webkit,expect} from '@playwright/test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {caseFixtures} from './case-exercise-fixtures.mjs';
import {prepareContent,caseTasks,practiceKey,interceptCompletion} from '../src/practice-content.js';import {reduce} from '../src/engine.js';
const browser=await webkit.launch();
try{for(const width of [320,390])for(const [kind,before,action] of caseFixtures()){
 await prepareContent(kind);const tasks=caseTasks(before,kind),key=practiceKey(before,kind),state=interceptCompletion(before,reduce(before,action),kind,action);
 const page=await browser.newPage({viewport:{width,height:width===320?667:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);if(f==='src/build-config.js')return r.fulfill({body:'export const developmentMode=false;',contentType:'text/javascript'});try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 await page.addInitScript(s=>{if(!sessionStorage.getItem('fixture')){localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));sessionStorage.setItem('fixture','yes');}},state);
 const enter=async()=>{await page.locator('.home [data-action="practice-resume"]').click();await page.locator('[data-choice="resume"]').click();await expect(page.locator('.case-practice')).toBeVisible();};
 await page.goto('https://seodang.test/playable.html');await enter();await page.addStyleTag({content:'.app-header{padding-top:55px!important}'});
 for(let index=0;index<tasks.length;index++){
  const task=tasks[index];await expect(page.locator('.case-task-count')).toHaveText(`${index+1} / ${tasks.length}`);
  await expect(page.locator('[data-case-confirm]')).toBeDisabled();
  if(task.type==='order'){
   // A wrong order must not advance; undo permits correction.
   for(let i=task.tokens.length-1;i>=0;i--)await page.locator(`[data-case-token="${i}"]`).click();
   await page.locator('[data-case-confirm]').click();await expect(page.locator('.case-task-count')).toHaveText(`${index+1} / ${tasks.length}`);await expect(page.locator('.practice-feedback')).not.toBeEmpty();
   for(let i=0;i<task.tokens.length;i++)await page.locator('[data-case-undo]').click();
   for(let i=0;i<task.tokens.length;i++)await page.locator(`[data-case-token="${i}"]`).click();
  }else{
   await page.locator(`[data-case-choice="${(task.answer+1)%task.options.length}"]`).click();await page.locator('[data-case-confirm]').click();await expect(page.locator('.case-task-count')).toHaveText(`${index+1} / ${tasks.length}`);await expect(page.locator('.practice-feedback')).not.toBeEmpty();
   await page.locator(`[data-case-choice="${task.answer}"]`).click();
  }
  const overflow=await page.evaluate(()=>[...document.querySelectorAll('main *')].filter(n=>n.getBoundingClientRect().right>innerWidth+1).map(n=>({tag:n.tagName,cls:n.className,text:n.textContent.slice(0,70),width:n.getBoundingClientRect().width})));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${key}/${index}/${width} overflow ${JSON.stringify(overflow)}`);
  await page.locator('[data-case-confirm]').click();await expect(page.locator('[data-case-confirm]')).toHaveText((before.courseDirection==='ja-ko'?before.onboardingLevel<7:before.onboardingLevel>=6)?'次へ':'다음');
  if(index===0)await page.evaluate(()=>window.scrollTo(0,0));
  if(index===0)await page.screenshot({path:`/tmp/seodang-exercise-${before.courseDirection}-${before.onboardingLevel}-${width}.png`,fullPage:true});
  await page.locator('[data-case-confirm]').click();
  if(index===0){await page.reload();await enter();await expect(page.locator('.case-task-count')).toHaveText(`2 / ${tasks.length}`);}
 }
 await expect(page.locator('.practice-complete')).toBeVisible();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));assert.equal(saved.practices[key],undefined);const completed=kind==='korean'?saved.korean.lessons[saved.korean.active]:kind==='reading'?saved.readings[saved.onboardingLevel]:saved[kind];assert.equal(completed.completed,true);if(before.onboardingLevel===5){await page.locator('[data-action="completed-next"]').click();if(kind==='reading'){await expect(page.locator('.reading-page')).toBeVisible();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')).onboardingLevel),6);}else{assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')).korean.active),'6-1');}}assert.deepEqual(errors,[]);await page.close();
}console.log('All 10 case flows at 320/390: wrong answers, order correction, confirmation, saved resume and completion passed.');}finally{await browser.close();}
