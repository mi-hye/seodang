import {webkit,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const browser=await webkit.launch();
try{for(const width of [320,390])for(const scale of [1,1.2]){
 const page=await browser.newPage({viewport:{width,height:844}});
 await page.route('https://seodang.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);if(file==='harness')return r.fulfill({body:'<html><head><link rel="stylesheet" href="src/style.css"><link rel="stylesheet" href="src/header.css"><link rel="stylesheet" href="src/sentences.css"></head><body class="learning-app"><div id="root"></div></body></html>',contentType:'text/html'});try{return r.fulfill({body:readFileSync(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream'});}catch{return r.fulfill({status:404,body:''});}});
 await page.goto('https://seodang.test/harness');
 for(const lesson of [0,1,2])for(const index of [0,1,2]){
  const count=await page.evaluate(async({scale,lesson,index})=>{
   const {freshState,reduce}=await import('./src/engine.js'),{freshSentence,setSentenceProgress}=await import('./src/sentence-state.js'),{renderSentences}=await import('./src/sentences.js'),{sentenceCourse}=await import('./src/sentence-content.js');
   let s={...freshState(),onboardingLevel:2,sentenceActive:lesson};setSentenceProgress(s,lesson,{...freshSentence(),started:true,phase:'arrange',index});document.documentElement.style.setProperty('--text-scale',scale);
   const root=document.querySelector('#root'),render=()=>root.innerHTML=renderSentences(s,()=> '');render();root.onclick=e=>{const b=e.target.closest('button');if(b&&!b.disabled){s=reduce(s,{type:b.dataset.action,id:b.dataset.id});render();}};
   return sentenceCourse(s).sentences[index].parts.length;
  },{scale,lesson,index});
  const sizes=[];
  for(let i=0;i<count;i++){
   await page.locator(`.sentence-choices [data-id="${i}"]`).click();
   const geometry=await page.locator('.sentence-answer [data-id="0"]').boundingBox();sizes.push(geometry);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
   assert.ok(Math.abs(geometry.width-sizes[0].width)<1&&Math.abs(geometry.height-sizes[0].height)<1,`stable chip ${width}/${scale}/${lesson}/${index}/${i}`);
  }
  if(width===390&&scale===1.2&&lesson===0&&index===0)await page.screenshot({path:'output/token-builder-fixed.png',fullPage:true});
  await page.locator('.sentence-answer [data-id="0"]').click();await expect(page.locator('.sentence-answer .sentence-chip')).toHaveCount(count-1);
  await page.locator('.sentence-choices [data-id="0"]').click();
  await page.locator('[data-action=sentence-check]').click();
 }
 await page.close();
}console.log('PASS: all 9 Japanese sentence exercises, 320/390, normal/large text, stable chip dimensions at 1/2/3 tokens, remove/reinsert/check.');}finally{await browser.close();}
