import {webkit,expect} from '@playwright/test';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {freshState} from '../src/engine.js';import {basicContent} from '../src/basics.js';
const words=['きゃく','きゅうり','きょう','しゃしん','しゅくだい','しょくぱん'];
const browser=await webkit.launch();try{for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:width===320?667:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://seodang.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);if(file==='src/build-config.js')return r.fulfill({body:'export const developmentMode=true;',contentType:'text/javascript'});try{return r.fulfill({body:readFileSync(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 await page.addInitScript(s=>localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s)),{...freshState(),onboarded:true,onboardingLevel:0,settings:{sound:false,motion:'off',textScale:1.2}});

 await page.goto('https://seodang.test/playable.html');await page.locator('.map-choice').nth(8).click();await page.locator('[data-action=basic-next]').click();
 for(const [word] of basicContent[10]){
  await expect(page.locator('.basic-word')).toHaveText(word);await expect(page.locator('.basic-choices')).toHaveCount(0);await expect(page.locator('.basic-word-picture')).toHaveCount(words.includes(word)?1:0);await page.waitForTimeout(460);await page.locator('[data-action=basic-next]').click();
 }
 for(let index=0;index<6;index++){
  const choices=page.locator('.practice-choices button');await expect(choices).toHaveCount(4);assert.ok((await choices.locator('.practice-choice-text').allTextContents()).every(t=>words.includes(t)));assert.ok(await choices.first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=28));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight));if(index===0)await page.screenshot({path:`/tmp/seodang-lesson9-listen-${width}.png`});
  await choices.nth(index%4).click();await page.locator('[data-practice=next]').click();
 }
 for(const word of words){
  await expect(page.locator('.practice-writing-reference>span')).toHaveText(word);const r=await page.locator('canvas').boundingBox();await page.mouse.move(r.x+30,r.y+30);await page.mouse.down();await page.mouse.move(r.x+100,r.y+100,{steps:5});await page.mouse.up();await page.locator('[data-practice=next]').click();
 }
 await expect(page.locator('.practice-complete')).toBeVisible();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));assert.equal(saved.basics.lessons[10].completed,true);assert.equal(saved.practices['ko-ja:basic:10'],undefined);assert.deepEqual(errors,[]);await page.close();
}console.log('Lesson 9: sound→word pairs, words-only listening/writing once, readable choices and completion passed.');}finally{await browser.close();}
