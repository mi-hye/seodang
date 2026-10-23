import {openMapLesson} from './learning-map-fixture.js';
import {scenarioContent} from '../../src/scenario-content.js';
import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../../assets/audio/catalog.json',import.meta.url)));
for(const direction of ['ko-ja','ja-ko'])test(`weather choice taps select and play matching clips ${direction}`,async({page})=>{
 test.setTimeout(90000);
 await page.addInitScript(s=>{
  localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
  window.played=[];window.paused=[];window.Audio=class{constructor(src){this.src=src;}play(){window.played.push(this.src);return Promise.resolve();}pause(){window.paused.push(this.src);}};
 },{...freshState(),onboarded:true,courseDirection:direction,onboardingLevel:2,koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1,audioRate:1}});
 await page.route('**/assets/audio/catalog.json',r=>r.fulfill({json:{...catalog,packs:{}}}));
 // Observe the verified media blob without bypassing download or checksum checks.
 await page.addInitScript(()=>{URL.createObjectURL=blob=>{const url=`blob:clip-${window.blobs.length}`;window.blobs.push(blob);return url;};URL.revokeObjectURL=()=>{};window.blobs=[];});
 await page.goto('/playable.html');await openMapLesson(page,{kind:'scenario',id:'16'});await page.locator('[data-action="scenario-next"]').click();
 // Both speakers play their own verified line before answer selection is offered.
 await expect(page.locator('.scenario-learning [data-model-prompt]')).toHaveText(scenarioContent[direction]['16'].items[0].text);
 await expect(page.locator('.scenario-learning [data-model-answer]')).toHaveText(scenarioContent[direction]['16'].items[0].answer);
 await expect(page.locator('.scenario-choices')).toHaveCount(0);
 for(const [voice,file,text]of [['prompt',`${direction}.16.0.wav`,scenarioContent[direction]['16'].items[0].text],['answer',`${direction}.16.speak.0.wav`,scenarioContent[direction]['16'].items[0].answer]]){
  const before=await page.evaluate(()=>window.played.length);
  await page.locator(`.scenario-learning [data-action="scenario-audio"][data-id="${voice}"]`).click();
  await expect.poll(()=>page.evaluate(()=>window.played.length),{timeout:60000}).toBeGreaterThan(before);
  const learnedClip=catalog.files[`assets/audio/scenarios/${file}`];
  expect(learnedClip.text).toBe(text);
  await expect.poll(()=>page.evaluate(async()=>{const url=window.played.at(-1);if(!url?.startsWith('blob:clip-'))return '';const b=window.blobs[Number(url.split('-').at(-1))];return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await b.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');}),{timeout:60000}).toBe(learnedClip.sha256);
 }
 await page.locator('[data-action="scenario-next"]').click();
 for(const token of [2,0,1,1]){
  const before=await page.evaluate(()=>window.played.length);
  await page.locator(`.scenario-choices [data-id="${token}"]`).click();
  await expect.poll(()=>page.evaluate(()=>window.played.length)).toBeGreaterThan(before);
  const file=token===2?`${direction}.16.speak.0.wav`:`${direction}.16.choice.0.${token+1}.wav`;const url=catalog.files[`assets/audio/scenarios/${file}`].url;
  await expect.poll(()=>page.evaluate(async()=>{const url=window.played.at(-1);if(!url?.startsWith('blob:clip-'))return '';const b=window.blobs[Number(url.split('-').at(-1))];return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await b.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');})).toBe(url.split('/').at(-1).replace('.m4a',''));
 }
 await expect(page.locator('[data-action="scenario-select"][data-id="1"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.intent-result')).toHaveCount(0);
 await expect(page.locator('.scenario-choices .icon-button')).toHaveCount(0);
 expect(await page.evaluate(()=>window.paused.includes(window.played.at(-2)))).toBe(true);
});
