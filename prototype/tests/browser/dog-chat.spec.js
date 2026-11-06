import {test,expect} from '@playwright/test';
import {dogChatLessons} from '../../../supabase/functions/dog-chat/lessons.mjs';
import {caseTasks,prepareContent,practiceKey} from '../../src/practice-content.js';
import {casePracticeVersion} from '../../src/practice-state.js';
import {reviewFixture} from '../level-two-review-fixtures.mjs';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
import {openMapLesson} from './learning-map-fixture.js';

const storageKey='seodang.web-prototype.v1';
const panel=page=>page.locator('dialog.dog-chat-panel');
async function settledShot(page,options){
 await panel(page).evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
 await page.screenshot(options);
}
const counts=page=>page.evaluate(()=>({get:window.dogTest.getCalls.length,post:window.dogTest.calls.length,aborts:window.dogTest.aborts}));
const stored=page=>page.evaluate(()=>Object.entries(localStorage).sort(([a],[b])=>a.localeCompare(b)));
async function config(page,enabled=true){
 await page.route('**/src/dog-chat-config.js',route=>route.fulfill({contentType:'application/javascript',body:`export const dogChatConfig={enabled:${enabled},serverURL:'https://dog.invalid/functions/v1/dog-chat',authURL:'https://dog.invalid',key:'test-public-key'};`}));
}
async function fixture(page,{key='ko-ja:sentence:3',width=320,mode='success',enabled=true}={}){
 await page.setViewportSize({width,height:width===320?640:844});await config(page,enabled);
 await page.route('**/__dog-chat.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/header.css"><link rel="stylesheet" href="/src/learning-map.css"><link rel="stylesheet" href="/src/library.css"></head><body class="learning-app"><button id="dog-trigger">Open</button></body></html>'}));
 await page.goto('/__dog-chat.html');
 await page.evaluate(async({key,mode,storageKey})=>{
  document.documentElement.style.setProperty('--text-scale','1.2');
  document.documentElement.lang=key.startsWith('ja-ko:')?'ja':'ko';
  localStorage.setItem(storageKey,JSON.stringify({completed:['preserve-course-completion'],history:{'2026-10-29':3},practices:{untouched:true}}));
  localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
  window.dogTest={mode,getCalls:[],calls:[],aborts:0};
  const api={
   async availability(lessonKey,{signal}={}){
    window.dogTest.getCalls.push(lessonKey);
    if(mode==='get-offline')throw Object.assign(Error('offline'),{code:'offline'});
    if(mode==='unavailable')return {available:false,remaining:3,reason:'credit_unavailable'};
    if(mode==='limit')return {available:false,remaining:0,reason:'daily_limit'};
    return {available:true,remaining:3};
   },
   async submit(input,{signal}={}){
    const record=JSON.parse(JSON.stringify(input));window.dogTest.calls.push(record);
    const response=()=>({requestId:input.requestId,remaining:2,feedback:mode==='neutral'?{praise:null,correction:null}:mode==='correction'?{
     praise:{quote:input.answers[1],explanation:'사는 곳을 잘 말했어요.'},
     correction:{original:input.answers[0],suggestion:'私は学生です。',explanation:'문장 끝을 です로 마무리해요.'},
    }:{praise:{quote:input.answers[0],explanation:key.startsWith('ja-ko:')?'自己紹介の表現が使えました。':'자기소개 표현을 잘 썼어요.'},correction:null}});
    if(mode==='offline'&&window.dogTest.calls.length===1||mode==='always-offline')throw Object.assign(Error('offline'),{code:'offline'});
    if(mode==='timeout'&&window.dogTest.calls.length===1)throw Object.assign(Error('timeout'),{code:'timeout'});
    if(mode==='terminal')throw Object.assign(Error('credit_unavailable'),{code:'credit_unavailable'});
    if(mode==='hold')return new Promise((resolve,reject)=>{
     window.dogTest.resolve=()=>resolve(response());
     signal?.addEventListener('abort',()=>{window.dogTest.aborts++;reject(Object.assign(Error('aborted'),{code:'aborted'}));},{once:true});
    });
    return response();
   },
  };
  const {openDogChat}=await import('/src/dog-chat.js');
  await openDogChat(key,{trigger:document.querySelector('#dog-trigger'),api});
 },{key,mode,storageKey});
 await expect(panel(page)).toBeVisible();
 const tokens=await panel(page).evaluate(el=>['--stage','--amber','--text'].map(name=>getComputedStyle(el).getPropertyValue(name).trim()));
 expect(tokens.every(Boolean)).toBe(true);
}
async function start(page){
 await expect(page.locator('[data-dog-start]')).toBeDisabled();
 await page.locator('[data-dog-consent]').check();await page.locator('[data-dog-start]').click();
 await expect(page.locator('[data-dog-answer]')).toBeVisible();
 await expect(page.locator('[data-dog-answer]')).not.toBeFocused();
}
async function fits(page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const geometry=await panel(page).evaluate(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,scroll:el.scrollWidth,client:el.clientWidth}));
 expect(geometry.left).toBeGreaterThanOrEqual(-1);expect(geometry.right).toBeLessThanOrEqual((await page.viewportSize()).width+1);expect(geometry.scroll).toBeLessThanOrEqual(geometry.client+1);
 for(const pair of await panel(page).locator('.button-pair').all()){
  const boxes=await pair.locator('button').evaluateAll(nodes=>nodes.filter(el=>el.getBoundingClientRect().height>0).map(el=>el.getBoundingClientRect().toJSON()));
  if(boxes.length===2){expect(Math.abs(boxes[0].top-boxes[1].top)).toBeLessThan(2);expect(Math.abs(boxes[0].width-boxes[1].width)).toBeLessThan(2);}
 }
 // Fractional animation/layout coordinates can report 43.999996 for 44px.
 for(const button of await panel(page).locator('button:visible').all())expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(43.9);
 expect(await panel(page).locator('[lang="ko"]').evaluateAll(nodes=>nodes.every(el=>getComputedStyle(el).wordBreak==='keep-all'))).toBe(true);
 for(const text of await panel(page).locator('[data-dog-choice] > span[lang="ja"]').all()){
  const ending=await text.evaluate(el=>{
   const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),characters=[];let node;
   while(node=walker.nextNode())for(let i=0;i<node.textContent.length;i++)if(node.textContent[i].trim()){const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);characters.push({text:node.textContent[i],top:range.getBoundingClientRect().top});}
   return characters.slice(-2);
  });
  if(ending.length===2&&/[。！？]/.test(ending[1].text))expect(Math.abs(ending[0].top-ending[1].top)).toBeLessThan(2);
 }
}
async function sendExample(page,index=0){
 await page.locator(`[data-dog-choice="${index}"]`).click();await expect(page.locator('[data-dog-answer]')).not.toHaveValue('');
 await expect(page.locator('[data-dog-answer]')).not.toBeFocused();await expect(page.locator('[data-dog-send]')).toBeFocused();
 await page.locator('[data-dog-send]').click();
 if(await page.locator('[data-dog-answer]').count())await expect(page.locator('[data-dog-answer]')).not.toBeFocused();
}
async function finishThree(page){
 await start(page);await sendExample(page);await sendExample(page);await sendExample(page);
}

for(const key of Object.keys(dogChatLessons))for(const width of [320,390])test(`dog chat ${key} three replies at ${width}`,async({page})=>{
 const lesson=dogChatLessons[key],errors=[];page.on('pageerror',error=>errors.push(error.message));
 await fixture(page,{key,width});const before=await stored(page);
 expect(await counts(page)).toEqual({get:0,post:0,aborts:0});await fits(page);
 await settledShot(page,{path:`output/dog-chat-consent-${lesson.targetLanguage}-${width}-${test.info().project.name}.png`,fullPage:true});
 await start(page);expect((await counts(page)).get).toBe(1);
 await expect(panel(page)).toContainText(lesson.turns[0].prompt);await expect(panel(page)).toContainText(lesson.turns[0].meaning);
 await settledShot(page,{path:`output/dog-chat-prompt-${lesson.targetLanguage}-${width}-${test.info().project.name}.png`,fullPage:true});
 await expect(page.locator('[data-dog-send]')).toBeDisabled();
 await page.locator('[data-dog-choice="1"]').click();await expect(page.locator('[data-dog-answer]')).toHaveValue(lesson.turns[0].choices[1].text);
 await expect(page.locator('[data-dog-answer]')).not.toBeFocused();await expect(page.locator('[data-dog-send]')).toBeFocused();
 expect((await counts(page)).post).toBe(0);await fits(page);
 await settledShot(page,{path:`output/dog-chat-conversation-${lesson.targetLanguage}-${width}-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-dog-send]').click();await expect(panel(page)).toContainText(lesson.turns[1].prompt);
 const typed=lesson.targetLanguage==='ko'?'서울에 살아요.':'東京に住んでいます。';
 await page.locator('[data-dog-answer]').fill(typed);await page.locator('[data-dog-send]').click();
 expect((await counts(page)).post).toBe(0);await expect(panel(page)).toContainText(lesson.turns[2].prompt);await sendExample(page);
 await expect(page.locator('.dog-chat-feedback')).toBeVisible();expect((await counts(page)).post).toBe(1);
 const sent=await page.evaluate(()=>window.dogTest.calls[0]);
 expect(sent).toMatchObject({lessonKey:key,consent:true,answers:[lesson.turns[0].choices[1].text,typed,lesson.turns[2].choices[0].text]});expect(sent.requestId).toMatch(/^[0-9a-f-]{36}$/i);
 await expect(page.locator('.dog-chat-feedback')).toContainText(sent.answers[0]);
 await expect(page.locator('.dog-chat-feedback article')).toHaveCount(1);
 await expect(page.locator('.dog-chat-original')).toHaveCount(0);
 await expect(page.locator('[data-dog-answer],[data-dog-send],[data-dog-retry]')).toHaveCount(0);
 await expect(page.locator('.dog-chat-feedback')).not.toContainText('undefined');await fits(page);
 await settledShot(page,{path:`output/dog-chat-feedback-${lesson.targetLanguage}-${width}-${test.info().project.name}.png`,fullPage:true});
 expect(await stored(page)).toEqual(before);await page.locator('[data-dog-close]').first().click();await expect(panel(page)).toHaveCount(0);
 await expect(page.locator('#dog-trigger')).toBeFocused();expect(errors).toEqual([]);
});

test('dog chat disabled configuration performs no availability or submission calls',async({page})=>{
 await fixture(page,{enabled:false});await expect(page.locator('[data-dog-answer],[data-dog-consent],[data-dog-start]')).toHaveCount(0);
 expect(await counts(page)).toEqual({get:0,post:0,aborts:0});await fits(page);
});

test('dog chat duplicate final taps make one request and closing aborts it',async({page})=>{
 await fixture(page,{mode:'hold'});const before=await stored(page);await start(page);await sendExample(page);await sendExample(page);
 await page.locator('[data-dog-choice="0"]').click();await page.locator('[data-dog-send]').evaluate(button=>{button.click();button.click();});
 await expect.poll(async()=>(await counts(page)).post).toBe(1);
 await expect(page.locator('[data-dog-retry]')).toHaveCount(0);await fits(page);
 await page.locator('[data-dog-close]').first().click();await expect(panel(page)).toHaveCount(0);
 await expect.poll(async()=>(await counts(page)).aborts).toBe(1);
 await page.evaluate(()=>window.dogTest.resolve());await page.waitForTimeout(50);
 await expect(page.locator('.dog-chat-feedback')).toHaveCount(0);expect(await stored(page)).toEqual(before);
});

for(const mode of ['offline','timeout'])test(`dog chat ${mode} retry keeps all three replies and the same request ID`,async({page})=>{
 await fixture(page,{mode,key:'ja-ko:korean:3-1'});const before=await stored(page);await finishThree(page);
 await expect(page.locator('[data-dog-retry]')).toBeVisible();expect((await counts(page)).post).toBe(1);await fits(page);
 await page.locator('[data-dog-retry]').click();await expect(page.locator('.dog-chat-feedback')).toBeVisible();
 const calls=await page.evaluate(()=>window.dogTest.calls);expect(calls).toHaveLength(2);expect(calls[1]).toEqual(calls[0]);expect(await stored(page)).toEqual(before);
});

test('dog chat stops retrying after two manual retries',async({page})=>{
 await fixture(page,{mode:'always-offline'});await finishThree(page);
 for(let i=0;i<2;i++){await expect(page.locator('[data-dog-retry]')).toBeVisible();await page.locator('[data-dog-retry]').click();}
 await expect.poll(async()=>(await counts(page)).post).toBe(3);await expect(page.locator('[data-dog-retry]')).toHaveCount(0);
 const calls=await page.evaluate(()=>window.dogTest.calls);expect(calls[1]).toEqual(calls[0]);expect(calls[2]).toEqual(calls[0]);
 await expect(page.locator('[data-dog-answer]')).toHaveCount(0);await fits(page);
});

for(const mode of ['limit','unavailable'])test(`dog chat ${mode} leaves learning records unchanged`,async({page})=>{
 await fixture(page,{mode});const before=await stored(page);
 await page.locator('[data-dog-consent]').check();await page.locator('[data-dog-start]').click();
 await expect.poll(async()=>(await counts(page)).get).toBe(1);await expect(page.locator('[data-dog-answer],[data-dog-send],[data-dog-retry]')).toHaveCount(0);
 expect((await counts(page)).post).toBe(0);expect(await stored(page)).toEqual(before);await fits(page);
});

test('dog chat does not retry a terminal credit failure',async({page})=>{
 await fixture(page,{mode:'terminal'});await finishThree(page);
 await expect.poll(async()=>(await counts(page)).post).toBe(1);await expect(page.locator('[data-dog-retry],[data-dog-answer]')).toHaveCount(0);await fits(page);
});

test('dog chat rejects blank, markup and overlong answers before sending',async({page})=>{
 await fixture(page);await start(page);const answer=page.locator('[data-dog-answer]'),send=page.locator('[data-dog-send]');
 for(const value of ['   ','<script>alert(1)</script>','あ'.repeat(161)]){await answer.fill(value);await expect(send).toBeDisabled();}
 expect((await counts(page)).post).toBe(0);await answer.fill('私は学生です。');await expect(send).toBeEnabled();
 await answer.dispatchEvent('compositionstart');await expect(send).toBeDisabled();await answer.dispatchEvent('compositionend');await expect(send).toBeEnabled();
 await page.setViewportSize({width:320,height:420});await expect.poll(async()=>(await panel(page).boundingBox()).height).toBeLessThanOrEqual(420);
 await send.scrollIntoViewIfNeeded();await expect(send).toBeInViewport();await fits(page);
});

test('dog chat preserves intentional line breaks in typed answers',async({page})=>{
 await fixture(page);await start(page);const reply='私は学生です。\n日本語を勉強しています。';
 await page.locator('[data-dog-answer]').fill(reply);await page.locator('[data-dog-send]').click();await sendExample(page);await sendExample(page);
 await expect(page.locator('.dog-chat-feedback')).toBeVisible();
 expect(await page.evaluate(()=>window.dogTest.calls[0].answers[0])).toBe(reply);
});

test('dog chat renders a specific correction beside a separate useful expression',async({page})=>{
 await fixture(page,{mode:'correction',width:320});await start(page);
 await page.locator('[data-dog-answer]').fill('私は学生で。');await page.locator('[data-dog-send]').click();await sendExample(page);await sendExample(page);
 await expect(page.locator('.dog-chat-feedback')).toBeVisible();await expect(page.locator('.dog-chat-feedback article')).toHaveCount(2);
 await expect(page.locator('.dog-chat-original')).toHaveText('私は学生で。');await expect(page.locator('.dog-chat-feedback article').last()).toContainText('私は学生です。');
 await expect(page.locator('.dog-chat-feedback article').first()).toContainText('ソウルに住んでいます。');await fits(page);
 await settledShot(page,{path:`output/dog-chat-feedback-correction-320-${test.info().project.name}.png`,fullPage:true});
 await page.locator('.dog-chat-feedback [data-dog-close]').scrollIntoViewIfNeeded();
 await expect(page.locator('.dog-chat-feedback article').last().locator('.dog-chat-quote')).toBeInViewport();
 await settledShot(page,{path:`output/dog-chat-feedback-correction-lower-320-${test.info().project.name}.png`,fullPage:true});
});

test('dog chat renders a neutral finish without inventing praise or correction',async({page})=>{
 await fixture(page,{mode:'neutral',key:'ja-ko:korean:3-1',width:390});await finishThree(page);
 await expect(page.locator('.dog-chat-feedback')).toBeVisible();await expect(page.locator('.dog-chat-feedback article,.dog-chat-original')).toHaveCount(0);
 await expect(page.locator('.dog-chat-feedback')).toContainText('3回とも返事ができました。');await fits(page);
 await settledShot(page,{path:`output/dog-chat-feedback-neutral-390-${test.info().project.name}.png`,fullPage:true});
});

test('dog chat bounds availability retries and never offers a dead submission retry',async({page})=>{
 await fixture(page,{mode:'get-offline'});
 for(let i=0;i<3;i++){
  if(i>0)await expect(page.locator('[data-dog-consent]')).toBeChecked();
  await page.locator('[data-dog-consent]').check();await page.locator('[data-dog-start]').click();
  await expect.poll(async()=>(await counts(page)).get).toBe(i+1);
 }
 await expect(page.locator('[data-dog-start],[data-dog-retry],[data-dog-answer]')).toHaveCount(0);
 expect((await counts(page)).post).toBe(0);await fits(page);
});

for(const lessonKey of Object.keys(dogChatLessons))test(`completed lesson exposes optional dog chat without changing progress ${lessonKey}`,async({page})=>{
 const {s,kind,id}=reviewFixture(lessonKey);s.settings.sound=false;
 // These lessons have six learned expressions; the final pending completion
 // action must point to the sixth expression, not the generic fixture's third.
 if(kind==='sentence'){Object.assign(s.sentenceLessons[id],{index:5,phase:'speak',learned:[0,1,2,3,4]});}
 else Object.assign(s.korean.lessons[id],{index:5,phase:'speak'});
 await prepareContent(kind);const tasks=caseTasks(s,kind),key=practiceKey(s,kind);
 s.practices={[key]:{version:1,caseVersion:casePracticeVersion(key),count:tasks.length,index:tasks.length-1,round:0,mode:0,action:{type:kind==='sentence'?'sentence-speak-next':'korean-speak-next'}}};
 const lazyRequests=[];page.on('request',request=>{if(/\/src\/dog-chat(?:-api|-lessons)?\.(js|css)(?:\?|$)/.test(request.url()))lazyRequests.push(request.url());});
 await page.setViewportSize({width:320,height:700});await config(page);
 await page.addInitScript(({s,storageKey})=>{localStorage.setItem(storageKey,JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{s,storageKey});
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');await openMapLesson(page,{kind,id});await page.locator('[data-choice="resume"]').click();
 const last=tasks.at(-1);await page.locator(`[data-review-choice="${last.answer}"]`).click();await page.locator('[data-review-confirm]').click();await page.locator('[data-review-confirm]').click();
 await expect(page.locator('.practice-complete')).toBeVisible();const before=await stored(page);
 const entry=page.locator(`[data-action="dog-chat"][data-id="${lessonKey}"]`);await expect(entry).toBeVisible();
 await expect(page.locator('.practice-complete [data-action="home"]')).toBeVisible();await expect(page.locator('[data-action="completed-next"]')).toBeVisible();
 expect(lazyRequests).toEqual([]);
 await entry.click();await expect(panel(page)).toBeVisible();expect(lazyRequests.some(url=>url.endsWith('/src/dog-chat.js'))).toBe(true);expect(lazyRequests.some(url=>url.endsWith('/src/dog-chat-lessons.js'))).toBe(true);
 await page.locator('[data-dog-close]').first().click();
 await expect(page.locator('.practice-complete')).toBeVisible();expect(await stored(page)).toEqual(before);
});
