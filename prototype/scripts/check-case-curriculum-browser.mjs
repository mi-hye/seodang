import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
const browser=await webkit.launch();
try{for(const width of [320,390])for(const direction of ['ko-ja','ja-ko'])for(const level of [2,4,5,6,7]){
 const page=await browser.newPage({viewport:{width,height:width===320?667:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://seodang.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);try{return r.fulfill({body:readFileSync(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.wav')?'audio/wav':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 await page.addInitScript(s=>localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s)),{...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:direction,onboardingLevel:level,settings:{sound:false,textScale:1.2,motion:'off'}});
 await page.goto('https://seodang.test/playable.html');
 await expect(page.locator('.learning-map')).toBeVisible();
 await expect(page.locator('.learning-map [data-action="labels"],.learning-map [data-id="1-11"],.learning-map [data-id="2-1"]')).toHaveCount(0);
 const kind=direction==='ja-ko'?'korean':level===2?'sentence':level===4?'dialogue':'reading';
 await page.locator(`.learning-map [data-action="${kind}"]${kind==='reading'?`[data-id="${level}"]`:kind==='korean'?`[data-id="${level===2?'3-1':`${level}-1`}"]`:''}`).click();
 await expect(page.locator('main.lesson-centered')).toBeVisible();
 await expect(page.locator('.case-words')).toHaveCount(0);
 assert.ok(await page.locator('main').evaluate(main=>{const first=main.firstElementChild;return first.getBoundingClientRect().top-main.getBoundingClientRect().top<=10;}),'Case content starts without centering space');
 // Merely visiting the scene is not a resumable lesson.
 await page.locator('.app-header-back').click();
 await page.locator(`.learning-map [data-action="${kind}"]${kind==='reading'?`[data-id="${level}"]`:kind==='korean'?`[data-id="${level===2?'3-1':`${level}-1`}"]`:''}`).click();
 await expect(page.locator('.lesson-resume')).toHaveCount(0);
 await expect(page.locator('main.lesson-centered')).toBeVisible();
 await page.locator(`main [data-action="${kind}-next"]`).click();
 await expect(page.locator('.case-words')).toBeVisible();
 await expect(page.locator('main.lesson-centered')).toBeVisible();
 await page.addStyleTag({content:'.app-header{padding-top:55px!important}'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${direction}/${level}/${width} overflow`);
 assert.ok(!(await page.locator('main').innerText()).includes('undefined'));
 const audioRows=await page.locator('.audio-text-row').evaluateAll(rows=>rows.every(row=>{const button=row.querySelector('button');if(!button)return true;const b=button.getBoundingClientRect(),t=row.firstElementChild.getBoundingClientRect();return b.width>=43&&b.x>=t.right-2;}));assert.ok(audioRows,`${direction}/${level}/${width} speaker`);
 await page.screenshot({path:`/tmp/seodang-case-${direction}-${level}-${width}.png`,fullPage:true});
 await page.locator('.app-header-back').click();
 await page.locator(`.learning-map [data-action="${kind}"]${kind==='reading'?`[data-id="${level}"]`:kind==='korean'?`[data-id="${level===2?'3-1':`${level}-1`}"]`:''}`).click();
 await expect(page.locator('.lesson-resume')).toBeVisible();
 await page.locator('[data-choice="resume"]').click();
 await expect(page.locator('.case-words')).toBeVisible();
 assert.deepEqual(errors,[]);await page.close();
}console.log('Both courses: ten case entries and contextual word screens pass at 320/390, large text and native header.');}finally{await browser.close();}
