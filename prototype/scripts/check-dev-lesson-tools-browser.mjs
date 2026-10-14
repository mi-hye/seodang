import {webkit,expect} from '@playwright/test';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
import {practiceCases} from './practice-fixtures.mjs';import {reduce} from '../src/engine.js';import {prepareContent,interceptCompletion} from '../src/practice-content.js';
const cases=practiceCases();
const {koreanLessons,freshKoreanProgress}=await import('../src/korean-state.js');
const koreanBase=cases.find(([kind])=>kind==='korean')[1];
for(const lesson of koreanLessons.slice(1))cases.push(['korean',{...koreanBase,onboardingLevel:lesson.level,korean:{version:2,active:lesson.id,lessons:{[lesson.id]:{...freshKoreanProgress(),started:true,phase:'quiz',index:lesson.count-1,selected:(lesson.count-1)%3}}}},{type:'korean-check'}]);
const browser=await webkit.launch();
try{for(const dev of [false,true])for(const [kind,original,action] of cases){
 if(kind==='korean'&&original.onboardingLevel===0&&original.korean.active!=='1-1')original.korean.lessons[`1-${Number(original.korean.active.split('-')[1])-1}`]={...freshKoreanProgress(),completed:true};
 await prepareContent(kind);const s=interceptCompletion(original,reduce(original,action),kind,action);s.koreanGuideSeenVersion=1;s.settings={sound:false,motion:'off',textScale:1.2};
 const page=await browser.newPage({viewport:{width:320,height:740}}),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.route('https://seodang.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);if(file==='src/build-config.js')return r.fulfill({body:`export const developmentMode=${dev};`,contentType:'text/javascript'});try{return r.fulfill({body:readFileSync(file),contentType:/\.m?js$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));window.Audio=class{pause(){}play(){queueMicrotask(()=>this.onended?.());return Promise.resolve();}};},s);
 await page.goto('https://seodang.test/playable.html');await page.locator('.home-start-card button').click();await page.locator('[data-choice=resume]').click();await expect(page.locator('.practice-page')).toBeVisible();
 await expect(page.locator('.practice-choices button')).toHaveCount(4);
 const grid=await page.locator('.practice-choices button').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y};}));assert.equal(grid[0].y,grid[1].y);assert.equal(grid[2].y,grid[3].y);assert.ok(grid[2].y>grid[0].y);assert.equal(grid[0].x,grid[2].x);
 if(!dev){await expect(page.locator('.dev-lesson-tools')).toHaveCount(0);assert.ok(!requests.some(x=>x.includes('dev-lesson-tools')));}
 else{
  await expect(page.locator('.dev-lesson-tools')).toBeVisible();
  await expect(page.locator('.dev-lesson-tools')).toHaveCSS('position','fixed');
  const flow=await page.evaluate(()=>{const main=document.querySelector('.practice-page'),bar=document.querySelector('.dev-lesson-tools'),before=main.getBoundingClientRect().y;bar.hidden=true;const after=main.getBoundingClientRect().y;bar.hidden=false;return {before,after};});assert.equal(flow.before,flow.after);
  if(kind==='kana'){
   const handle=await page.locator('.dev-lesson-tools output').boundingBox(),beforeDrag=await page.locator('.dev-lesson-tools').boundingBox();await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2-30,handle.y+handle.height/2-70,{steps:5});await page.mouse.up();const afterDrag=await page.locator('.dev-lesson-tools').boundingBox();assert.ok(Math.abs(afterDrag.y-beforeDrag.y)>20);
  }
  const before=await page.locator('.dev-lesson-tools output').textContent();
  const saved=await page.evaluate(()=>localStorage.getItem('seodang.web-prototype.v1'));
  await page.locator('[data-action=dev-lesson-previous]').click();await expect(page.locator('.practice-page')).toHaveCount(0);
  await page.locator('[data-action=dev-lesson-next]').click();await expect(page.locator('.practice-page')).toBeVisible();await expect(page.locator('.dev-lesson-tools output')).toHaveText(before);
  assert.equal(await page.evaluate(()=>localStorage.getItem('seodang.web-prototype.v1')),saved);
  const result=await page.evaluate(async({s,kind})=>{const {seekDevLesson,devLessonPosition}=await import('./src/dev-lesson-tools.js');const {valid}=await import('./src/storage.js');let state=s;while(devLessonPosition(state,kind).index>0)state=seekDevLesson(state,kind,-1);const total=devLessonPosition(state,kind).total;for(let i=0;i<total;i++){const pos=devLessonPosition(state,kind);if(pos.index!==i||!valid(state))return {error:`${kind} screen ${i}: index ${pos.index}, valid ${valid(state)}`};state=seekDevLesson(state,kind,1);}return {total,history:JSON.stringify(state.history),koreanHistory:JSON.stringify(state.korean?.history)};},{s,kind});
  assert.ok(!result.error,result.error);assert.equal(result.history,JSON.stringify(s.history));assert.equal(result.koreanHistory,JSON.stringify(s.korean?.history));
  if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)){await page.screenshot({path:'/tmp/seodang-dev-overflow.png'});throw Error(`Overflow ${kind} ${s.korean?.active} ${s.onboardingLevel}`);}if(kind==='kana')await page.screenshot({path:'/tmp/seodang-dev-lesson-tools.png'});
 }
 assert.deepEqual(errors,[]);await page.close();
}console.log('All lesson types: dev-only loading, previous/next boundary, full screen numbering, valid state, unchanged saved records and narrow layout passed.');}finally{await browser.close();}
