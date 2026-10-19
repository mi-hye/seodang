import {chromium,expect} from '@playwright/test';
import {freshState} from '../src/engine.js';
const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const page=await browser.newPage({viewport:{width:390,height:844}});
try{
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:'ja-ko',onboardingLevel:7,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
 await page.goto('http://localhost:4173/playable.html');
 console.log(await page.evaluate(async()=>{
  const audio=await import('/src/audio-downloads.js'),catalog=await audio.catalog();
  const files=Object.keys(catalog.files).filter(f=>f.includes('/scenarios/'));await audio.downloadFiles(files);
  const originalFetch=window.fetch;window.fetch=()=>Promise.reject(Error('offline verification'));
  try{for(const file of files){const source=await audio.resolveAudio(file);try{const player=new Audio(source.url);await new Promise((resolve,reject)=>{player.onloadedmetadata=resolve;player.onerror=reject;player.load();});if(!Number.isFinite(player.duration)||player.duration<=0)throw Error('Undecodable '+file);}finally{source.release();}}}finally{window.fetch=originalFetch;}
  return {cachedAndDecodedOffline:files.length};
 }));
 await page.locator('[data-action=scenario][data-id="5"]').click();await page.locator('[data-action=scenario-next]').click();
 await page.screenshot({path:'output/scenario-korean-reading-390.png',fullPage:true});
 await page.locator('[data-audio-rate]').fill('0.8');await expect(page.locator('[data-audio-rate-label]')).toHaveText('0.8×');
 await page.locator('[data-action=scenario-audio]').click();const pause=page.locator('[data-passage-pause]');await expect(pause).toBeEnabled();await pause.click();await expect(pause).toHaveAttribute('aria-label','이어서 재생');await pause.click();await expect(pause).toHaveAttribute('aria-label','일시정지');await page.locator('[data-action=home]').click();console.log('speaker, pause, resume and home: passed');
}finally{await browser.close();}
