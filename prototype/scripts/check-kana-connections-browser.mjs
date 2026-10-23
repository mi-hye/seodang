import {webkit,chromium,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {freshKana,kanaLessons,kanaRound} from '../src/kana-state.js';
const selector=(side,id)=>`[data-match-side="${side}"][data-match-id="${id}"]`;
async function setup(browser,{width=390,height=844,scale=1,chapter=0,index=0}={}){
 const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.json')?'application/json':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.wav')?'audio/wav':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 const s=freshState();s.onboarded=true;s.onboardingLevel=1;s.settings.sound=false;s.settings.textScale=scale;s.kana=freshKana();s.kana.active=chapter;
 s.kana.lessons.forEach((l,i)=>{if(i<chapter)Object.assign(l,{started:true,phase:'summary',completed:true,caseSolved:true});});Object.assign(s.kana.lessons[chapter],{started:true,phase:'quiz',index});
 await page.addInitScript(s=>{if(!sessionStorage.seeded){localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));sessionStorage.seeded='1';}},s);
 await page.goto('https://seodang.test/playable.html');await page.locator('button.home-start-card[data-action=kana]').click();
 return {page,errors,letters:kanaRound(kanaLessons[chapter],index).letters};
}
async function center(page,side,id){const r=await page.locator(selector(side,id)).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2};}
async function drag(page,left,right,{reverse=false}={}){
 const from=await center(page,reverse?'reading':'glyph',reverse?right:left),to=await center(page,reverse?'glyph':'reading',reverse?left:right);
 await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:10});await page.mouse.up();
}
const browser=await webkit.launch();
try{for(const options of [{width:320,height:568},{},{scale:1.2},{chapter:2,index:13}]){
 const {page,errors,letters}=await setup(browser,options),n=letters.length;
 await expect(page.locator('.kana-match-node')).toHaveCount(n*2);await expect(page.locator('[data-action=kana-answer]')).toHaveCount(0);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const order=await page.locator('[data-match-side=reading]').evaluateAll(nodes=>nodes.map(n=>n.dataset.matchId));assert.notDeepEqual(order,letters.map(l=>l.id));
 await drag(page,letters[0].id,letters[1].id);await expect(page.locator('.kana-course-progress,.kana-feedback,.kana-match-count,.kana-match-hint,.kana-match-instruction,.kana-match-headings')).toHaveCount(0);await expect(page.locator('[data-match-lines] path')).toHaveCount(0);await expect(page.locator('[data-action=kana-next]')).toHaveCount(0);
 const first=await center(page,'glyph',letters[0].id);await page.mouse.move(first.x,first.y);await page.mouse.down();await page.mouse.move(first.x+30,first.y+15);await page.locator('[data-matching]').dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse'});await page.mouse.up();await expect(page.locator('[data-match-lines] path')).toHaveCount(0);
 await drag(page,letters[0].id,letters[0].id);await expect(page.locator('[data-match-lines] path')).toHaveCount(1);
 await page.reload();await page.locator('button.home-start-card[data-action=kana]').click();await expect(page.locator('[data-match-lines] path')).toHaveCount(1);await expect(page.locator(selector('glyph',letters[0].id))).toBeDisabled();
 await drag(page,letters[1].id,letters[1].id,{reverse:true});await expect(page.locator('[data-match-lines] path')).toHaveCount(2);
 for(const [i,l] of letters.slice(2).entries()){
  if(i===0){await page.locator(selector('glyph',l.id)).focus();await page.keyboard.press('Enter');await page.locator(selector('reading',l.id)).focus();await page.keyboard.press('Enter');}
  else {await page.locator(selector('glyph',l.id)).tap();await page.locator(selector('reading',l.id)).tap();}
 }
 await expect(page.locator('[data-match-lines] path')).toHaveCount(n);await expect(page.locator('.kana-match-node:disabled')).toHaveCount(n*2);
 if(!Object.keys(options).length)await page.screenshot({path:'/tmp/seodang-connected-cards.png',fullPage:true});
 const paths=await page.locator('[data-match-lines] path').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')));assert.ok(paths.every(d=>!d.includes('NaN')));
 await page.setViewportSize({width:430,height:932});await expect.poll(()=>page.locator('[data-match-lines] path').first().getAttribute('d')).not.toBe(paths[0]);
 await page.locator('[data-action=kana-next]').click();await expect(page.locator('h1')).toHaveText(options.chapter===2?'3/3 학습을 마쳤어요':'か · き · く · け · こ');
 assert.deepEqual(errors,[]);await page.close();console.log(`Connections passed: ${JSON.stringify(options)}, ${n} pairs, wrong drag/cancel/reload/reverse drag/keyboard/touch taps/resize/advance`);
}}finally{await browser.close();}
// Real touch drag in Chromium uses the browser input pipeline, including pointer capture.
const touchBrowser=await chromium.launch();
try{
 const {page,errors,letters}=await setup(touchBrowser),client=await page.context().newCDPSession(page);
 const from=await center(page,'glyph',letters[0].id),to=await center(page,'reading',letters[0].id);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:1}]});
 for(let i=1;i<=10;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/10,y:from.y+(to.y-from.y)*i/10,id:1}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(page.locator('[data-match-lines] path')).toHaveCount(1);assert.deepEqual(errors,[]);console.log('Real touch drag: passed');
}finally{await touchBrowser.close();}
