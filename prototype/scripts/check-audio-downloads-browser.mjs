import {webkit,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freshState} from '../src/engine.js';
const browser=await webkit.launch();
try{
 const context=await browser.newContext({viewport:{width:320,height:667}});const page=await context.newPage();let remote=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('.supabase.co/'))remote++;});
 await page.route('https://seodang.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);try{return r.fulfill({body:readFileSync(`dist/${file}`),contentType:({js:'text/javascript',css:'text/css',html:'text/html',json:'application/json',wasm:'application/wasm',png:'image/png'})[file.split('.').at(-1)]||'application/octet-stream'});}catch{return r.fulfill({status:404,body:''});}});
 const state={...freshState(),onboarded:true,koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1.2}};
 await page.addInitScript(s=>{if(!localStorage.getItem('seodang.web-prototype.v1'))localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));},state);
 await page.goto('https://seodang.test/playable.html');await page.waitForSelector('[data-action=settings]');assert.equal(remote,0,'No initial audio downloads');
 const summary=await page.evaluate(async()=>{
  const m=await import('./src/audio-downloads.js'),c=await m.catalog();const files=c.packs['ko-ja:sentence:1'].files;
  await m.clearDownloads();await m.downloadFiles(files);const status=await m.downloadStatus();return {files,status};
 });assert.equal(summary.status.count,4);const downloadedRequests=remote;
 await page.reload();
 await context.setOffline(true);
 const offline=await page.evaluate(async file=>{const m=await import('./src/audio-downloads.js');const x=await m.resolveAudio(file);const a=new Audio(x.url);await new Promise((resolve,reject)=>{a.onloadedmetadata=resolve;a.onerror=reject;a.load();});const duration=a.duration;x.release();return {duration,status:await m.downloadStatus()};},summary.files[0]);
 assert.ok(offline.duration>0);assert.equal(offline.status.count,4);assert.equal(remote,downloadedRequests);
 await context.setOffline(false);
 const target=await page.evaluate(async()=>{const c=await(await import('./src/audio-downloads.js')).catalog();const file='assets/audio/level-two/meet-time.wav';return {file,url:c.files[file].url};});
 await page.route(target.url,r=>r.fulfill({body:'corrupt',contentType:'audio/mp4'}));
 assert.equal(await page.evaluate(async file=>{try{await(await import('./src/audio-downloads.js')).resolveAudio(file);return false;}catch{return true;}},target.file),true);
 assert.equal(await page.evaluate(async()=>(await(await import('./src/audio-downloads.js')).downloadStatus()).count),4);
 await page.unroute(target.url);
 await page.evaluate(async file=>{const x=await(await import('./src/audio-downloads.js')).resolveAudio(file);x.release();},target.file);
 assert.equal(await page.evaluate(async()=>(await(await import('./src/audio-downloads.js')).downloadStatus()).count),5);
 for(const width of [320,390])for(const courseDirection of ['ko-ja','ja-ko']){
  await page.setViewportSize({width,height:width===320?667:844});
  await page.evaluate(async courseDirection=>{await(await import('./src/audio-download-ui.js')).openAudioDownloads({courseDirection,onboardingLevel:2});},courseDirection);
  await expect(page.locator('.audio-download-dialog')).toBeVisible();
  assert.ok(await page.evaluate(()=>{const d=document.querySelector('.audio-download-dialog'),a=d.querySelector('[data-download]').getBoundingClientRect(),b=d.querySelector('[data-delete]').getBoundingClientRect();return d.scrollWidth<=d.clientWidth&&Math.abs(a.top-b.top)<1&&a.height>=44&&b.height>=44;}));
  await page.screenshot({path:`output/final-voices/downloads-${width}-${courseDirection}.png`});
  await page.locator('[data-close]').click();
 }
 await page.evaluate(async()=>{await(await import('./src/audio-downloads.js')).clearDownloads();});
 assert.equal(await page.evaluate(async()=>(await(await import('./src/audio-downloads.js')).downloadStatus()).count),0);
 // Exercise the real player after a first network download, not just AAC metadata decoding.
 await page.evaluate(async file=>{
  const {AudioPlayer}=await import('./src/media.js');const player=new AudioPlayer();window.audioResult=null;
  const button=document.createElement('button');button.id='test-play';button.style.cssText='position:fixed;top:0;left:0;z-index:9999';button.textContent='Play';document.body.append(button);
  button.onclick=async()=>{let error;await player.play({status:'ready',audioFile:file},true,m=>error=m);window.audioResult=error||'played';};
 },'assets/audio/kana/ha.wav');
 await page.locator('#test-play').click();
 await expect.poll(()=>page.evaluate(()=>window.audioResult),{timeout:60000}).toBe('played');
 await page.evaluate(async()=>{await(await import('./src/audio-downloads.js')).clearDownloads();});
 await context.setOffline(true);
 assert.equal(await page.evaluate(async file=>{try{await(await import('./src/audio-downloads.js')).resolveAudio(file);return false;}catch{return true;}},summary.files[0]),true);
 assert.deepEqual(errors,[]);
 console.log('PASS: no initial audio fetch; per-lesson download; reload + offline decode; first-download playback; corrupt download rejected; retry; deletion; 320/390 large-text Korean/Japanese layout.');
}finally{await browser.close();}
