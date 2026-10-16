import {webkit,expect} from '@playwright/test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {freshState} from '../src/engine.js';import {sentenceCourse} from '../src/sentence-content.js';import {koreanContent} from '../src/korean-content.js';import {sentenceProgress} from '../src/sentence-state.js';import {prepareContent,caseTasks,practiceKey} from '../src/practice-content.js';
const voiceFiles=new Map(['ja','ko'].flatMap(lang=>JSON.parse(readFileSync(`output/final-voices/${lang}-manifest.json`))).map(e=>[e.sha256,e.source]));
const browser=await webkit.launch();
try{for(const width of [320,390])for(const direction of ['ko-ja','ja-ko'])for(const id of direction==='ko-ja'?[3,1,2]:['3-1','3-4','3-2','3-3']){
 if(process.env.LESSON_FILTER&&`${direction}:${id}`!==process.env.LESSON_FILTER)continue;
 const kind=direction==='ko-ja'?'sentence':'korean',state={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:direction,onboardingLevel:2,settings:{sound:false,motion:'off',textScale:1.2}};
 const fixture=kind==='sentence'?{...state,sentenceActive:id}:{...state,korean:{version:4,active:id,lessons:{}}};await prepareContent(kind);const tasks=caseTasks(fixture,kind);
 const page=await browser.newPage({viewport:{width,height:width===320?667:844}}),errors=[];page.on('pageerror',e=>(errors.push(e.message),console.error(e.stack)));
 await page.route('https://jrmtfhmhcbkdzqzhbgfv.supabase.co/storage/v1/object/public/seodang-audio/voices-v1/*.m4a',r=>{const sha=new URL(r.request().url()).pathname.split('/').at(-1).replace('.m4a','');return r.fulfill({body:readFileSync(`output/final-voices/${voiceFiles.get(sha)}`),contentType:'audio/mp4',headers:{'access-control-allow-origin':'*'}});});
 await page.route('https://seodang.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1),types={js:'text/javascript',css:'text/css',html:'text/html',json:'application/json',wasm:'application/wasm',png:'image/png',wav:'audio/wav'};if(file==='src/build-config.js')return r.fulfill({body:'export const developmentMode=false;',contentType:'text/javascript'});try{return r.fulfill({body:readFileSync(file),contentType:types[file.split('.').at(-1)]||'application/octet-stream'});}catch{return r.fulfill({status:404,body:''});}});
 await page.addInitScript(s=>{if(!sessionStorage.getItem('fixture')){localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));sessionStorage.setItem('fixture','yes');}},state);
 await page.goto('https://seodang.test/playable.html');
 const enter=async()=>{await page.locator(`.map-choice[data-action=${kind}][data-id="${id}"]`).click();};
 await expect(page.locator(`.map-choice[data-action=${kind}]`)).toHaveCount(4);await enter();await expect(page.locator('.lesson-resume')).toHaveCount(0);
 if(kind==='korean'){
  const row=page.locator('.audio-text-row').filter({has:page.locator('[data-action=korean-intro-audio]')});
  await expect(row).toBeVisible();
  const title=await row.locator('h1').boundingBox(),speaker=await row.locator('button').boundingBox();
  assert.ok(speaker.x>=title.x+title.width-1);assert.ok(speaker.width>=44&&speaker.height>=44);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`/tmp/korean-intro-${id}-${width}.png`,fullPage:true});
 }
 const click=async action=>{await page.waitForTimeout(470);await page.locator(`[data-action=${action}]`).click();};
 await click(`${kind}-next`);
 const check=async()=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);};
 for(let index=0;index<(kind==='sentence'?sentenceCourse(fixture).sentences.length:koreanContent[id].length);index++){
  await expect(page.locator('.case-words')).toBeVisible();await check();if(index===0)await page.screenshot({path:`/tmp/level-two-${direction}-${id}-${width}.png`,fullPage:true});
  if(index===1){await page.reload();await enter();await expect(page.locator('.lesson-resume')).toBeVisible();await page.locator('[data-choice=resume]').click();await expect(page.locator('.case-words')).toBeVisible();}
  await click(`${kind}-next`);
  if(kind==='sentence'&&sentenceCourse(fixture).interaction==='choice'){
   await check();if(index===0)await page.screenshot({path:`/tmp/aligned-intro-quiz-${width}.png`,fullPage:true});
   await page.locator(`[data-action=sentence-select][data-id="${(index+1)%3}"]`).click();await click('sentence-check');await expect(page.locator('.sentence-feedback')).not.toBeEmpty();
   await page.locator(`[data-action=sentence-select][data-id="${index%3}"]`).click();await click('sentence-check');
  }else if(kind==='sentence'){
   const count=sentenceCourse(fixture).sentences[index].parts.length;
   for(let n=0;n<count;n++)await page.locator(`.sentence-choices [data-id="${n}"]`).click();
   await page.locator('[data-action=sentence-check]').click();await click('sentence-next');
  }else{
   await page.locator(`[data-action=korean-select][data-id="${(index+1)%3}"]`).click();await click('korean-check');await expect(page.locator('.korean-feedback')).not.toBeEmpty();await page.locator(`[data-action=korean-select][data-id="${index%3}"]`).click();await click('korean-check');
  }
 }
 if(kind==='sentence'&&sentenceCourse(fixture).solve){
  const options=page.locator('.sentence-option');await expect(options).toHaveCount(3);
  const boxes=await options.evaluateAll(items=>items.map(x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,bottom:r.bottom};}));
  assert.ok(boxes.every(b=>Math.abs(b.x-boxes[0].x)<1&&Math.abs(b.width-boxes[0].width)<1));
  assert.ok(boxes.every((b,i)=>i===0||b.y>=boxes[i-1].bottom));await check();
  await page.screenshot({path:`/tmp/sentence-options-${id}-${width}.png`,fullPage:true});
 }
 if(kind==='sentence'&&sentenceCourse(fixture).solve){await page.locator(`[data-action=sentence-select][data-id="${sentenceCourse(fixture).solve.answer}"]`).click();await click('sentence-submit');}
 await expect(page.locator('.case-practice')).toBeVisible();
 for(const [taskIndex,task] of tasks.entries()){
  if(task.type==='order')for(let n=0;n<task.tokens.length;n++)await page.locator(`[data-case-token="${n}"]`).click();
  else await page.locator(`[data-case-choice="${task.answer}"]`).click();
  await page.locator('[data-case-confirm]').click();await page.locator('[data-case-confirm]').click();
  if(taskIndex===1){await page.reload();await enter();await expect(page.locator('.lesson-resume')).toBeVisible();await page.locator('[data-choice=resume]').click();await expect(page.locator('.case-practice')).toBeVisible();}
 }
 await expect(page.locator('.practice-complete')).toBeVisible();await check();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));assert.equal(kind==='sentence'?sentenceProgress(saved).completed:saved.korean.lessons[id].completed,true);assert.equal(saved.practices[practiceKey(fixture,kind)],undefined);
 if(id===3||id===1||id==='3-1'||id==='3-4'||id==='3-2'){await page.locator('[data-action=completed-next]').click();const next=await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));assert.equal(kind==='sentence'?next.sentenceActive:next.korean.active,kind==='sentence'?(id===3?0:2):(id==='3-1'?'3-4':id==='3-4'?'3-2':'3-3'));await expect(page.locator('.lesson-resume')).toHaveCount(0);}
 await page.close();
}console.log('PASS: four added lessons, 320/390 large text, all learning/questions/practice, reload/resume, completion and next lesson.');}finally{await browser.close();}
