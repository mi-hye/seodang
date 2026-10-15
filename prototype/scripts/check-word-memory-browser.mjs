import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
const b=await webkit.launch();try{
 const p=await b.newPage({viewport:{width:320,height:844}}),errors=[],requests=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
 await p.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);if(f==='src/build-config.js')return r.fulfill({body:'export const developmentMode=true;',contentType:'text/javascript'});try{return r.fulfill({body:readFileSync(f),contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.svg')?'image/svg+xml':'image/jpeg'});}catch{return r.fulfill({status:404,body:''});}});
 await p.addInitScript(s=>localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s)),{...freshState(),onboarded:true,onboardingLevel:2});
 await p.goto('https://seodang.test/playable.html');await expect(p.locator('.shell')).toBeVisible();
 for(const width of [320,390])for(const [kind,index,word] of [['labels',0,'かさ'],['labels',1,'くつ'],['basic',0,'いぬ'],['basic',4,'そら']]){
 await p.setViewportSize({width,height:844});
 await p.evaluate(async({kind,index})=>{
 const {freshState}=await import('/src/engine.js');const s={...freshState(),settings:{sound:false,motion:'off',textScale:1.2},labels:{phase:'read',index},basics:{active:6,lessons:{6:{phase:'learn',index}}}};
 const module=await import(kind==='labels'?'/src/labels.js':'/src/basics.js');const css=document.createElement('link');css.rel='stylesheet';css.href=kind==='labels'?'/src/labels.css':'/src/basics.css';document.head.append(css);document.querySelector('.shell').innerHTML=(kind==='labels'?module.renderLabels:module.renderBasic)(s,title=>`<header class="app-header" style="padding-top:55px">${title}</header>`);
 },{kind,index});
 await expect(p.locator('main')).toContainText(word);await expect(p.locator('.word-memory')).toHaveCount(0);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 assert.deepEqual(errors,[]);console.log('All four non-compound words have no memory tips at 320/390px with large text.');
}finally{await b.close();}
