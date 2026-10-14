import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const browser=await webkit.launch();
try{
 const page=await browser.newPage();
 await page.route('https://seodang.test/**',route=>{const file=new URL(route.request().url()).pathname.slice(1);try{return route.fulfill({body:readFileSync(file),contentType:/\.m?js$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});}catch{return route.fulfill({status:404,body:''});}});
 await page.goto('https://seodang.test/setup.html');
 await page.evaluate(async()=>{
  const {practiceCases}=await import('./scripts/practice-fixtures.mjs');
  const {prepareContent,practiceKey,renderPractice,mountPractice}=await import('./src/practice.js');
  const [kind,state]=practiceCases()[0];await prepareContent(kind);
  const progress={round:0,mode:0,index:0,count:15};state.practices={[practiceKey(state,kind)]:progress};
  window.plays=0;window.stops=0;window.failAudio=false;
  const root=document.createElement('div');document.body.replaceChildren(root);
  window.mountStep=mode=>{window.dispose?.();progress.mode=mode;root.innerHTML=renderPractice(state,kind,()=> '');window.dispose=mountPractice(root,state,kind,{play:async(entry,onError)=>{window.plays++;if(window.failAudio)onError();},stop:()=>window.stops++,advance:()=>{progress.index++;window.mountStep(0);}});};
  window.mountStep(0);
 });
 await expect.poll(()=>page.evaluate(()=>window.plays)).toBe(1);
 await expect(page.locator('.practice-count')).toHaveCount(0);
 await page.locator('[data-choice="0"]').click();await expect(page.locator('[data-practice=next]')).toBeEnabled();
 await page.locator('[data-practice=next]').click();await expect.poll(()=>page.evaluate(()=>window.plays)).toBe(2);
 await page.locator('[data-practice=listen]').click();await expect.poll(()=>page.evaluate(()=>window.plays)).toBe(3);
 await page.evaluate(()=>{window.failAudio=true;window.mountStep(0);});
 await expect(page.locator('.practice-feedback')).not.toBeEmpty();await page.locator('[data-choice="1"]').click();await expect(page.locator('[data-practice=next]')).toBeDisabled();
 await page.evaluate(()=>window.failAudio=false);await page.locator('[data-practice=listen]').click();await expect(page.locator('[data-practice=next]')).toBeEnabled();
 const plays=await page.evaluate(()=>window.plays);await page.evaluate(()=>window.mountStep(2));await expect.poll(()=>page.evaluate(()=>window.plays)).toBe(plays);
 await page.evaluate(()=>window.dispose());await expect.poll(()=>page.evaluate(()=>window.stops)).toBeGreaterThan(0);
 console.log('Listening autoplays on entry and next question; replay, failed-audio retry, writing-mode silence and cleanup passed.');
}finally{await browser.close();}
