import {webkit,expect} from '@playwright/test';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {freshState} from '../src/engine.js';import {freshKana} from '../src/kana-state.js';
const browser=await webkit.launch();try{for(const width of [390,320]){
 const page=await browser.newPage({viewport:{width,height:width===320?667:844}});
 await page.route('https://seodang.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);if(file==='src/build-config.js')return r.fulfill({body:'export const developmentMode=true;',contentType:'text/javascript'});try{return r.fulfill({body:readFileSync(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 await page.addInitScript(s=>localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s)),{...freshState(),onboarded:true,onboardingLevel:0,kana:freshKana()});
 await page.goto('https://seodang.test/playable.html');await page.locator('.home-start-card button').click();await expect(page.locator('.kana-vowel-card')).toHaveCount(5);
 const cards=await page.locator('.kana-vowel-card').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y};}));assert.equal(cards[0].y,cards[2].y);assert.equal(cards[3].y,cards[4].y);assert.ok(cards[3].y>cards[0].y);assert.ok(cards[3].x>cards[0].x&&cards[3].x<cards[1].x);
 const motion=await page.locator('.kana-vowel-glyph').evaluateAll(nodes=>nodes.map(n=>({name:getComputedStyle(n).animationName,delay:getComputedStyle(n).animationDelay})));assert.ok(motion.every(x=>x.name==='kana-vowel-hop'));assert.equal(new Set(motion.map(x=>x.delay)).size,5);
 await expect(page.locator('.dev-lesson-tools')).toBeVisible();const floater=await page.locator('.dev-lesson-tools').boundingBox();assert.ok(floater.y>=0&&floater.y+floater.height<=(width===320?667:844));
 const centered=await page.locator('.kana-intro-content').boundingBox();assert.ok(Math.abs(centered.y+centered.height/2-(width===320?667:844)/2)<2,'Introduction centered in viewport');
 await page.screenshot({path:`/tmp/seodang-vowels-${width}.png`});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.kana-vowel-glyph').first()).toHaveCSS('animation-name','none');
 await page.locator('[data-action=kana-next]').click();await expect(page.locator('canvas')).toBeVisible();await expect(page.locator('.kana-vowel-motion')).toHaveCount(0);
 await page.evaluate(async()=>{
  const {renderKana}=await import('./src/kana.js');const {freshKana,kanaLessons}=await import('./src/kana-state.js');
  for(const lesson of kanaLessons)for(let row=0;row<lesson.rounds.length;row++){
   const kana=freshKana();kana.practiceAccess=true;kana.active=lesson.id;kana.lessons[lesson.id].index=row===0?0:lesson.rounds[0].length;
   const markup=renderKana({kana,settings:{sound:false}},()=>''),root=document.createElement('div');root.innerHTML=markup;
   if(root.querySelectorAll('.kana-vowel-glyph').length!==lesson.rounds[row].length)throw Error('Missing animated group');
   if(root.querySelector('.kana-course-progress'))throw Error('Old progress label remains');
   if(root.querySelector('.kana-story').textContent!=='5글자씩 읽고 써봐요')throw Error('Incorrect introduction copy');
  }
 });await page.close();
}console.log('Opening vowels: 3+2 layout, five staggered animations, small-screen fit, reduced motion and writing transition passed.');}finally{await browser.close();}
