import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {practiceCases} from './practice-fixtures.mjs';
const b=await webkit.launch();try{
 const p=await b.newPage({viewport:{width:320,height:844}}),errors=[],requests=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
 await p.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);if(f==='src/build-config.js')return r.fulfill({body:'export const developmentMode=true;',contentType:'text/javascript'});try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.svg')?'image/svg+xml':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
 const [,s]=practiceCases().find(([kind])=>kind==='basic');s.settings={sound:false,motion:'off',textScale:1.2};
 await p.addInitScript(s=>{if(!sessionStorage.seeded){localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));sessionStorage.seeded='1';}},s);
 await p.goto('https://seodang.test/playable.html');assert.ok(!requests.some(r=>r.endsWith('lesson-session.js')));
 const open=()=>p.locator('.map-choice[data-action=basic][data-id="6"]').click();
 await open();await expect(p.locator('.lesson-resume')).toBeVisible();const before=await p.evaluate(()=>localStorage.getItem('seodang.web-prototype.v1'));
 const boxes=await p.locator('.lesson-resume button').evaluateAll(els=>els.map(el=>({y:el.getBoundingClientRect().y,x:el.getBoundingClientRect().x})));assert.equal(boxes[0].y,boxes[1].y);assert.ok(boxes[1].x>boxes[0].x);await p.screenshot({path:'/tmp/seodang-resume-choice.png'});
 await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>localStorage.getItem('seodang.web-prototype.v1')),before);
 await open();await p.locator('[data-choice=resume]').click();await expect(p.locator('.view-basic')).toBeVisible();await expect(p.getByRole('progressbar')).toHaveAttribute('aria-valuenow','10');
 await p.locator('[data-action=home]').first().click();await open();await p.locator('[data-choice=restart]').click();await expect(p.getByRole('progressbar')).toHaveAttribute('aria-valuenow','0');assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')).basics.lessons[6].index),0);
 await p.locator('[data-action=home]').first().click();await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('seodang.web-prototype.v1'));s.practices={'ko-ja:basic:6':{version:1,round:2,mode:1,index:3,count:6,action:{type:'basic-check'}}};localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));});await p.reload();await p.locator('[data-action=practice-resume]').click();await p.locator('[data-choice=resume]').click();await expect(p.getByRole('progressbar')).toHaveAttribute('aria-valuenow','63');await p.screenshot({path:'/tmp/seodang-learning-progress.png'});
 assert.deepEqual(errors,[]);console.log('Resume, cancel, scoped restart, repetition resume, narrow horizontal layout and progress passed');
}finally{await b.close();}
