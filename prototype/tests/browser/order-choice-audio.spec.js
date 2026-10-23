import {openMapLesson} from './learning-map-fixture.js';
import {scenarioContent} from '../../src/scenario-content.js';
import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const catalog=JSON.parse(readFileSync(new URL('../../assets/audio/catalog.json',import.meta.url)));
const verifiedClips=new Map();
test.beforeAll(async({request})=>{
 // Validate the published bytes separately from the five-second tap assertion.
 // A CDN transfer can take up to the app's 60-second download timeout.
 test.setTimeout(90000);
 const files=['ko-ja','ja-ko'].flatMap(direction=>['0','speak.0','choice.0.1','choice.0.2'].map(part=>`assets/audio/scenarios/${direction}.15.${part}.wav`));
 await Promise.all(files.map(async file=>{
  const clip=catalog.files[file],response=await request.get(clip.url,{timeout:60000});
  expect(response.ok(),`published audio GET: ${file}`).toBe(true);
  const bytes=await response.body();
  expect(bytes.length,`published audio size: ${file}`).toBe(clip.bytes);
  expect(createHash('sha256').update(bytes).digest('hex'),`published audio checksum: ${file}`).toBe(clip.sha256);
  verifiedClips.set(clip.url,bytes);
 }));
});
for(const direction of ['ko-ja','ja-ko'])test(`order choice taps select and play matching clips ${direction}`,async({page})=>{
 test.setTimeout(90000);
 await page.addInitScript(s=>{
  localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
  window.played=[];window.paused=[];window.Audio=class{constructor(src){this.src=src;}play(){window.played.push(this.src);return Promise.resolve();}pause(){window.paused.push(this.src);}};
 },{...freshState(),onboarded:true,courseDirection:direction,onboardingLevel:2,koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1,audioRate:1}});
 await page.route('**/assets/audio/catalog.json',r=>r.fulfill({json:{...catalog,packs:{}}}));
 for(const [url,body]of verifiedClips)await page.route(url,r=>r.fulfill({body,contentType:'audio/mp4',headers:{'access-control-allow-origin':'*'}}));
 // Use the exact verified media bytes; the app still downloads, checks and caches them.
 await page.addInitScript(()=>{URL.createObjectURL=blob=>{const url=`blob:clip-${window.blobs.length}`;window.blobs.push(blob);return url;};URL.revokeObjectURL=()=>{};window.blobs=[];});
 await page.goto('/playable.html');await openMapLesson(page,{kind:'scenario',id:'15'});await page.locator('[data-action="scenario-next"]').click();
 // Both speakers play their own verified line before answer selection is offered.
 await expect(page.locator('.scenario-learning [data-model-prompt]')).toHaveText(scenarioContent[direction]['15'].items[0].text);
 await expect(page.locator('.scenario-learning [data-model-answer]')).toHaveText(scenarioContent[direction]['15'].items[0].answer);
 await expect(page.locator('.scenario-choices')).toHaveCount(0);
 for(const [voice,file,text]of [['prompt',`${direction}.15.0.wav`,scenarioContent[direction]['15'].items[0].text],['answer',`${direction}.15.speak.0.wav`,scenarioContent[direction]['15'].items[0].answer]]){
  const before=await page.evaluate(()=>window.played.length);
  await page.locator(`.scenario-learning [data-action="scenario-audio"][data-id="${voice}"]`).click();
  await expect.poll(()=>page.evaluate(()=>window.played.length),{timeout:60000}).toBeGreaterThan(before);
  const learnedClip=catalog.files[`assets/audio/scenarios/${file}`];
  expect(learnedClip.text).toBe(text);
  await expect.poll(()=>page.evaluate(async()=>{const url=window.played.at(-1);if(!url?.startsWith('blob:clip-'))return '';const b=window.blobs[Number(url.split('-').at(-1))];return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await b.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');}),{timeout:60000}).toBe(learnedClip.sha256);
 }
 await page.locator('[data-action="scenario-next"]').click();
 for(const token of [1,0,2,2]){
  const before=await page.evaluate(()=>window.played.length);
  await page.locator(`.scenario-choices [data-id="${token}"]`).click();
  await expect.poll(()=>page.evaluate(()=>window.played.length)).toBeGreaterThan(before);
  const file=token===1?`${direction}.15.speak.0.wav`:`${direction}.15.choice.0.${token===0?1:2}.wav`;const url=catalog.files[`assets/audio/scenarios/${file}`].url;
  await expect.poll(()=>page.evaluate(async()=>{const url=window.played.at(-1);if(!url?.startsWith('blob:clip-'))return '';const b=window.blobs[Number(url.split('-').at(-1))];return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await b.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');})).toBe(url.split('/').at(-1).replace('.m4a',''));
 }
 await expect(page.locator('[data-action="scenario-select"][data-id="2"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.repair-result')).toHaveCount(0);
 await expect(page.locator('.scenario-choices .icon-button')).toHaveCount(0);
 expect(await page.evaluate(()=>window.paused.includes(window.played.at(-2)))).toBe(true);
});
