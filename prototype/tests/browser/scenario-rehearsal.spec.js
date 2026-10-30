import {findMapLesson,openMapLesson} from './learning-map-fixture.js';
import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {scenarioContent} from '../../src/scenario-content.js';
import {levelTwoReview} from '../../src/level-two-review-content.js';
import {reviewFixture} from '../level-two-review-fixtures.mjs';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';

const storageKey='seodang.web-prototype.v1';
const catalog=JSON.parse(readFileSync(new URL('../../assets/audio/catalog.json',import.meta.url)));
const keys=['ko-ja','ja-ko'].flatMap(direction=>['14','15','16','17'].map(id=>`${direction}:scenario:${id}`));
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);

async function setup(page,key,width,legacy){
 const {s,id,action}=reviewFixture(key);
 if(legacy)s.practices={[key]:{version:1,caseVersion:1,count:12,index:11,round:0,mode:0,action}};
 await page.setViewportSize({width,height:width===320?640:844});
 await page.addInitScript(({s,storageKey})=>{
  if(!localStorage.getItem(storageKey))localStorage.setItem(storageKey,JSON.stringify(s));
  localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
  window.Audio=class{play(){queueMicrotask(()=>this.onended?.());return Promise.resolve();}pause(){}};
 },{s,storageKey});
 await useCatalogWithoutPacks(page);
 const enter=async()=>{await openMapLesson(page,{kind:'scenario',id:id});await page.locator('[data-choice="resume"]').click();};
 await page.goto('/playable.html');await enter();
 if(!legacy)await page.locator('[data-action="scenario-next"]').click();
 return {s,id,action,enter};
}

async function layout(page){
 await expect(page.locator('.scenario-rehearsal')).toBeVisible();
 await expect(page.locator('.introduction-review,.review-word-grid,[data-review-choice],.case-task-count,.practice-rounds')).toHaveCount(0);
 await expect(page.locator('[role="progressbar"]')).toHaveCount(1);
 await expect(page.locator('.scenario-rehearsal img')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await expect(page.locator('.scenario-rehearsal>button')).toHaveCount(1);
 for(const row of await page.locator('.scenario-rehearsal .audio-text-row:visible').all()){
  const bounds=await row.evaluate(el=>({text:el.querySelector('p').getBoundingClientRect().toJSON(),button:el.querySelector('button').getBoundingClientRect().toJSON()}));
  expect(bounds.button.left).toBeGreaterThanOrEqual(bounds.text.right-1);expect(bounds.button.width).toBeGreaterThanOrEqual(44);expect(bounds.button.height).toBeGreaterThanOrEqual(44);
 }
}

for(const key of keys)for(const width of [320,390])for(const legacy of [false,true])test(`conversation rehearsal ${key} ${width}px ${legacy?'migrates 12-step review':'new hand-off'}`,async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const {s,id,action,enter}=await setup(page,key,width,legacy),tasks=levelTwoReview(key),items=scenarioContent[s.courseDirection][id].items;
 expect(tasks).toHaveLength(3);expect(tasks.map(task=>task.unit.text)).toEqual(items.map(item=>item.answer));
 await layout(page);
 const pending=await saved(page);
 expect(pending.practices[key]).toMatchObject({version:1,caseVersion:2,count:3,index:0,action});
 expect(pending.scenarios[key]).toMatchObject({phase:'quiz',index:2,checked:true,completed:false});
 expect(pending.studyTools?.[s.courseDirection]?.lessons?.[key]).toBeUndefined();
 for(const [index,task]of tasks.entries()){
  const confirm=page.locator('[data-review-confirm]'),result=page.locator('.review-result');
  await layout(page);await expect(result).toBeHidden();
  await expect(page.locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow',String([66,77,88][index]));
  expect((await saved(page)).practices[key].index).toBe(index);
  await expect(page.locator('[data-review-token]')).toHaveCount(task.tokens.length);
  await expect(page.locator('[data-rehearsal-prompt]')).toHaveText(items[index].text);
  await expect(page.locator('[data-rehearsal-audio="answer"]:visible,[data-rehearsal-audio="reply"]:visible')).toHaveCount(0);
  const history=page.locator('[data-rehearsal-history]');
  await expect(history).toHaveCount(index?1:0);
  if(index){
   await expect(history).not.toHaveAttribute('open','');await history.locator('summary').click();
   for(let prior=0;prior<index;prior++)for(const part of ['prompt','answer',...(items[prior].reply?['reply']:[])]){
    const bubble=history.locator('.dialogue-bubble').filter({has:page.locator(`[data-rehearsal-audio="${prior}:${part}"]`)});
    await expect(bubble.locator('.audio-text-row p')).toHaveText(items[prior][part==='prompt'?'text':part]);
   }
   await layout(page);await history.locator('summary').click();
  }
  await expect(confirm).toBeDisabled();
  if(index===0)await page.screenshot({path:`output/rehearsal-${key.replaceAll(':','-')}-${width}-${legacy?'legacy':'new'}-${test.info().project.name}.png`,fullPage:true});
  // Tapping an assembled phrase removes only that phrase and makes it available again.
  await page.locator('[data-review-token="0"]').click();await page.locator('[data-review-remove="0"]').click();
  await expect(page.locator('[data-review-token="0"]')).toBeEnabled();await expect(confirm).toBeDisabled();
  // A full-length response containing the distractor stays on this turn.
  for(let token=0;token<task.answerLength-1;token++)await page.locator(`[data-review-token="${token}"]`).click();
  await page.locator(`[data-review-token="${task.answerLength}"]`).click();
  if(task.sceneContent.weather){
   await expect(confirm).toBeDisabled();
   const transcript=page.locator('[data-rehearsal-transcript]');await expect(transcript).not.toHaveAttribute('open','');
   await transcript.locator('summary').click();await expect(page.locator('[data-rehearsal-prompt]')).toBeVisible();
  }
  await expect(confirm).toBeEnabled();await confirm.click();
  await expect(result).toBeHidden();expect((await saved(page)).practices[key].index).toBe(index);
  await expect(page.locator('.practice-feedback')).not.toHaveText('');
  for(const token of [task.answerLength,...Array.from({length:task.answerLength-1},(_,i)=>i)])await page.locator(`[data-review-remove="${token}"]`).click();
  for(let token=0;token<task.answerLength;token++)await page.locator(`[data-review-token="${token}"]`).click();
  await confirm.click();await expect(result).toBeVisible();
  await expect(result.locator('.dialogue-self .audio-text-row p')).toHaveText(items[index].answer);
  await expect(result.locator('.dialogue-self .dialogue-meaning')).toHaveText(items[index].answerMeaning);
  await expect(page.locator('.rehearsal-compose')).toBeHidden();
  await expect(page.locator('[data-review-token]:visible')).toHaveCount(0);
  if(items[index].reply)await expect(result.locator('.dialogue-bubble:not(.dialogue-self) .audio-text-row p')).toHaveText(items[index].reply);
  await expect(page.locator('.practice-feedback.success')).toBeVisible();await expect(page.locator('.review-correct-mark')).toBeVisible();
  await expect(page.locator('[data-review-token]').first()).toBeDisabled();
  await layout(page);await confirm.click();
  if(index===0){await page.reload();await enter();await expect(page.locator('.scenario-rehearsal')).toBeVisible();expect((await saved(page)).practices[key]).toMatchObject({caseVersion:2,count:3,index:1});}
 }
 await expect(page.locator('.practice-complete')).toBeVisible();await expect(page.locator('.practice-fireworks svg')).toBeVisible();
 const completed=await saved(page);
 expect(completed.practices[key]).toBeUndefined();expect(completed.scenarios[key]).toMatchObject({phase:'done',completed:true});
 expect(completed.studyTools[s.courseDirection].lessons[key].completedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
 const history=s.courseDirection==='ko-ja'?completed.history:completed.korean.history;
 expect(Object.values(history.days).reduce((total,day)=>total+day.cases,0)).toBe(1);
 await page.locator('.practice-complete [data-action="home"]').click();await expect(await findMapLesson(page,{kind:'scenario',id:id})).toHaveAttribute('aria-label',new RegExp(s.courseDirection==='ko-ja'?'완료':'完了'));
 expect(errors).toEqual([]);
});

for(const key of keys)test(`rehearsal speakers play the original current and earlier lines ${key}`,async({page})=>{
 test.setTimeout(90000);
 const tasks=levelTwoReview(key);await setup(page,key,390,false);
 // Record the real downloaded blobs while replacing only the browser's media device.
 await page.evaluate(()=>{
  window.played=[];window.blobs=[];
  URL.createObjectURL=blob=>{const url=`blob:rehearsal-${window.blobs.length}`;window.blobs.push(blob);return url;};URL.revokeObjectURL=()=>{};
  window.Audio=class{constructor(src){this.src=src;}play(){window.played.push(this.src);queueMicrotask(()=>this.onended?.());return Promise.resolve();}pause(){}};
 });
 const hear=async(part,entry)=>{
  const expected=catalog.files[entry.audioFile];expect(expected.text).toBe(entry.text);
  const before=await page.evaluate(()=>window.played.length);
  await page.locator(`[data-rehearsal-audio="${part}"]`).click();
  await expect.poll(()=>page.evaluate(()=>window.played.length),{timeout:60000}).toBeGreaterThan(before);
  const hash=await page.evaluate(async()=>{const url=window.played.at(-1),blob=window.blobs[Number(url.split('-').at(-1))];return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');});
  expect(hash).toBe(expected.sha256);
 };
 const compose=async task=>{for(let token=0;token<task.answerLength;token++)await page.locator(`[data-review-token="${token}"]`).click();};
 const confirm=page.locator('[data-review-confirm]');await compose(tasks[0]);
 if(tasks[0].sceneContent.weather)await expect(confirm).toBeDisabled();
 await hear('prompt',tasks[0].promptAudio);await expect(confirm).toBeEnabled();
 await confirm.click();await expect(page.locator('.review-result')).toBeVisible();
 await hear('answer',tasks[0].answerAudio);if(tasks[0].replyAudio)await hear('reply',tasks[0].replyAudio);
 await confirm.click();await page.locator('[data-rehearsal-history] summary').click();
 for(const part of ['prompt','answer',...(tasks[0].replyAudio?['reply']:[])])await hear(`0:${part}`,tasks[0][`${part}Audio`]);
 await compose(tasks[1]);
 // Listening to an earlier weather turn must not unlock the current one.
 if(tasks[1].sceneContent.weather)await expect(confirm).toBeDisabled();
 await hear('prompt',tasks[1].promptAudio);await expect(confirm).toBeEnabled();
 await expect(page.locator('.review-result')).toBeHidden();
});

for(const direction of ['ko-ja','ja-ko'])test(`lost item rehearsal accepts thanks before the request ${direction}`,async({page})=>{
 const key=`${direction}:scenario:17`,task=levelTwoReview(key)[2],{enter}=await setup(page,key,320,false);
 await page.evaluate(({storageKey,key})=>{const s=JSON.parse(localStorage.getItem(storageKey));s.practices[key].index=2;localStorage.setItem(storageKey,JSON.stringify(s));},{storageKey,key});
 await page.reload();await enter();await expect(page.locator('.scenario-rehearsal')).toBeVisible();
 for(const token of [1,0])await page.locator(`[data-review-token="${token}"]`).click();
 await page.locator('[data-review-confirm]').click();
 await expect(page.locator('.practice-feedback.success')).toBeVisible();
 await expect(page.locator('.review-result .dialogue-self .audio-text-row p')).toHaveText(task.item.answer);
 await page.locator('[data-review-confirm]').click();await expect(page.locator('.practice-complete')).toBeVisible();
 const completed=await saved(page);expect(completed.scenarios[key].completed).toBe(true);expect(completed.practices[key]).toBeUndefined();
 expect(completed.studyTools[direction].lessons[key].completedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
