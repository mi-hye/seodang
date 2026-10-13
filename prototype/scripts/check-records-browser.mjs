import {webkit,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';
import {freshKana} from '../src/kana-state.js';
import {freshSentence} from '../src/sentence-state.js';
import {localDateKey} from '../src/learning-history.js';
const b=await webkit.launch();
try {
 for(const [width,height,scale] of [[320,568,1],[390,844,1],[390,844,1.2]]) {
  const p=await b.newPage({viewport:{width,height},isMobile:true,hasTouch:true}),errors=[],requests=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
  await p.route('https://seodang.test/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);try{let body=readFileSync(f);if(f.endsWith('.css'))body=body.toString().replace(/env\(safe-area-inset-top(?:,\s*0px)?\)/g,'47px').replace(/env\(safe-area-inset-bottom(?:,\s*0px)?\)/g,'34px');return r.fulfill({body,contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.json')?'application/json':'image/png'});}catch{return r.fulfill({status:404,body:''});}});
  const s=freshState();s.onboarded=true;s.onboardingLevel=2;s.settings.sound=false;s.settings.textScale=scale;
  s.kana=freshKana();Object.assign(s.kana.lessons[0],{started:true,completed:true,caseSolved:true,phase:'summary'});s.kana.learned=['a','o','i'];s.episode.started=true;s.episode.step='summary';s.encountered=['blue-bag','near-window'];s.sentence={...freshSentence(),started:true};
  const today=localDateKey(new Date());s.history={version:1,startedOn:today,completed:['kana-v8-0','cafe'],days:{[today]:{letters:3,expressions:2,sentences:0,cases:1}}};
  await p.addInitScript(s=>{if(!sessionStorage.seeded){localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));sessionStorage.seeded='1';}},s);
  await p.goto('https://seodang.test/playable.html');assert.ok(!requests.some(x=>x.endsWith('/records.js')||x.endsWith('/records.css')));
  await p.locator('[data-action=my]').click();await expect(p.locator('.record-cases,.record-entry,[data-action=record-open]')).toHaveCount(0);await expect(p.locator('main')).not.toContainText('학습별 기록');await expect(p.locator('.record-overview')).toContainText('2개');await expect(p.locator('.calendar-detail')).toContainText('글자 3회');
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.locator('[data-action=record-month][data-id="-1"]').click();await expect(p.locator('.calendar-detail')).toContainText('시작하기 전');await p.locator('[data-action=record-month][data-id="1"]').click();
  await p.locator(`[data-action=record-day][data-id="${today}"]`).click();
  if(width===390&&scale===1)await p.screenshot({path:'/tmp/seodang-records.png',fullPage:true});
  await p.reload();await p.locator('[data-action=my]').click();await expect(p.locator('.record-overview')).toContainText('2개');assert.deepEqual(errors,[]);await p.close();
 }
 console.log('Records: 3 mobile layouts, lazy JS/CSS, calendar navigation, persistent completions and removed lesson list passed.');
} finally {await b.close();}
