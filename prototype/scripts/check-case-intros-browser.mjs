import {webkit,expect} from '@playwright/test';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {freshState} from '../src/engine.js';import {freshKana,kanaLessons} from '../src/kana-state.js';
const b=await webkit.launch();
try{
 for(const [level,chapter]of [[1,0],[1,1],[1,2],[2,0],[3,0]])for(const [width,height,scale]of [[320,568,1],[390,844,1],[390,844,1.2]]){
  const p=await b.newPage({viewport:{width,height},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{let body=readFileSync(f);if(f.endsWith('.css'))body=body.toString().replace(/env\(safe-area-inset-top(?:,\s*0px)?\)/g,'47px').replace(/env\(safe-area-inset-bottom(?:,\s*0px)?\)/g,'34px');return r.fulfill({body,contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.json')?'application/json':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
  const s=freshState();s.onboarded=true;s.onboardingLevel=level;s.settings.sound=false;s.settings.textScale=scale;
  if(level===1){s.kana=freshKana();s.kana.active=chapter;for(let i=0;i<chapter;i++){Object.assign(s.kana.lessons[i],{started:true,completed:true,caseSolved:true,phase:'summary'});s.kana.learned.push(...kanaLessons[i].letters.map(x=>x.id));}}
  await p.addInitScript(s=>localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s)),s);await p.goto('https://seodang.test/playable.html#home');
  const action=level===1?'kana':level===2?'play':'sentence';await p.locator(`[data-action="${action}"]`).first().click();const main=p.locator('main');await expect(main).toContainText('먼저');await expect(main).toContainText('그다음');await expect(main).toContainText('골라');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width===390&&scale===1)await p.screenshot({path:`/tmp/seodang-brief-${level}-${chapter}.png`,fullPage:true});
  const next=level===1?'kana-next':level===2?'next':'sentence-next';const button=p.locator(`[data-action="${next}"]`).first();await button.scrollIntoViewIfNeeded();await button.click();await p.waitForSelector(level===1?'.kana-learn':level===2?'.play-learn':'.sentence-learn');assert.deepEqual(errors,[]);await p.close();
 }
 console.log('15 case intro checks passed: situation/actions present, responsive width, reachable start buttons, transitions to learning and no page errors.');
}finally{await b.close();}
