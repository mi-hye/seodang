import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../../assets/audio/catalog.json',import.meta.url)));
for(const direction of ['ko-ja','ja-ko'])test(`proposal token taps play matching clips and replace earlier audio ${direction}`,async({page})=>{
 await page.addInitScript(s=>{
  localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
  window.played=[];window.paused=[];window.Audio=class{constructor(src){this.src=src;}play(){window.played.push(this.src);return Promise.resolve();}pause(){window.paused.push(this.src);}};
 },{...freshState(),onboarded:true,courseDirection:direction,onboardingLevel:7,koreanGuideSeenVersion:1,settings:{sound:true,motion:'off',textScale:1,audioRate:1}});
 await page.route('**/assets/audio/catalog.json',r=>r.fulfill({json:{...catalog,packs:{}}}));
 // Observe the verified media blob without bypassing download or checksum checks.
 await page.addInitScript(()=>{URL.createObjectURL=blob=>{const url=`blob:clip-${window.blobs.length}`;window.blobs.push(blob);return url;};URL.revokeObjectURL=()=>{};window.blobs=[];});
 await page.goto('/playable.html');await page.locator('.map-choice[data-action="scenario"][data-id="12"]').click();await page.locator('[data-action="scenario-next"]').click();
 for(const token of [2,0]){
  await page.locator(`.token-builder-choices [data-id="${token}"]`).click();
  const url=catalog.files[`assets/audio/scenarios/${direction}.12.token.0.${token}.wav`].url;
  await expect.poll(()=>page.evaluate(async()=>{const url=window.played.at(-1);if(!url?.startsWith('blob:clip-'))return '';const b=window.blobs[Number(url.split('-').at(-1))];return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await b.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');})).toBe(url.split('/').at(-1).replace('.m4a',''));
 }
 await expect(page.locator('.token-builder-answer button')).toHaveCount(2);
 expect(await page.evaluate(()=>window.paused.includes(window.played.at(-2)))).toBe(true);
});
