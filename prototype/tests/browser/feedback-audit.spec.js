import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';

for(const width of [320,390])test(`audit basic wrong answer and recovery ${width}`,async({page})=>{
 const key='seodang.web-prototype.v1',s={...freshState(),onboarded:true,onboardingLevel:0,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1},basics:{version:7,active:7,lessons:{7:{index:0,phase:'quiz',selected:null,retry:false,started:true,completed:false}}}};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:700});
 await page.addInitScript(({s,key})=>{localStorage.setItem(key,JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{s,key});
 await page.goto('/playable.html');await page.locator('[data-action="basic"][data-id="7"]').first().click();await page.locator('[data-choice="resume"]').click();
 await page.locator('[data-action="basic-select"][data-id="1"]').click();await page.locator('[data-action="basic-check"]').click();
 await expect(page.locator('.basic-feedback')).toHaveText('다시 골라 주세요.');
 await page.screenshot({path:`output/feedback-audit-basic-${width}-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-action="basic-select"][data-id="0"]').click();await page.waitForTimeout(500);await page.locator('[data-action="basic-check"]').click();
 expect((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).basics.lessons[7].index).toBe(1);
 expect(errors).toEqual([]);
});

test('audit legacy case order wrong answer recovery',async({page})=>{
 await page.setViewportSize({width:320,height:700});
 await page.route('**/feedback-audit',r=>r.fulfill({contentType:'text/html',body:'<html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/header.css"><link rel="stylesheet" href="/src/practice.css"></head><body class="learning-app"><div id="root"></div></body></html>'}));await page.goto('/feedback-audit');
 await page.evaluate(async()=>{
  const {freshState}=await import('/src/engine.js'),{prepareContent,caseTasks}=await import('/src/practice-content.js'),m=await import('/src/case-practice.js');
  const s={...freshState(),onboardingLevel:4,settings:{sound:false,motion:'off',textScale:1.2},courseDirection:'ja-ko',korean:{version:4,active:'4-1',lessons:{}}};await prepareContent('korean');
  window.task=caseTasks(s,'korean').find(t=>t.type==='order');window.advances=0;
  const root=document.querySelector('#root');root.innerHTML=m.renderCasePractice(s,window.task,{index:0,count:6},()=> '');window.disposeAudit=m.mountCasePractice(root,s,window.task,{stop(){},advance(){window.advances++;}});
 });
 const task=await page.evaluate(()=>window.task);
 for(let i=task.tokens.length-1;i>=0;i--)await page.locator(`[data-case-token="${i}"]`).click();
 await page.locator('[data-case-confirm]').click();await expect(page.locator('.practice-feedback')).not.toHaveClass(/success/);
 await page.screenshot({path:`output/feedback-audit-case-${test.info().project.name}.png`,fullPage:true});
 for(let i=0;i<task.tokens.length;i++)await page.locator('[data-case-undo]').click();
 for(const i of task.order||task.tokens.map((_,i)=>i))await page.locator(`[data-case-token="${i}"]`).click();
 await page.locator('[data-case-confirm]').click();await expect(page.locator('.practice-feedback')).toHaveClass(/success/);await page.locator('[data-case-confirm]').click();expect(await page.evaluate(()=>window.advances)).toBe(1);
});

test('audit generic listening retry and recovery',async({page})=>{
 await page.setViewportSize({width:320,height:700});await page.route('**/feedback-audit',r=>r.fulfill({contentType:'text/html',body:'<html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/header.css"><link rel="stylesheet" href="/src/practice.css"></head><body class="learning-app"><div id="root"></div></body></html>'}));await page.goto('/feedback-audit');
 await page.evaluate(async()=>{const {freshState}=await import('/src/engine.js'),m=await import('/src/practice.js');const s={...freshState(),onboardingLevel:0,settings:{sound:false,motion:'off'},basics:{version:7,active:9,lessons:{}},practices:{'ko-ja:basic:9':{version:1,round:0,mode:0,index:0,count:6,action:{type:'basic-check'}}}};await m.prepareContent('basic');window.advances=0;const root=document.querySelector('#root');root.innerHTML=m.renderPractice(s,'basic',()=> '');m.mountPractice(root,s,'basic',{play:async()=>{},stop(){},advance(){window.advances++;}});});
 await page.locator('[data-practice="choice"][data-choice="1"]').click();await page.locator('[data-practice="next"]').click();await expect(page.locator('.practice-feedback')).toHaveText('다시 확인해 주세요.');
 await page.screenshot({path:`output/feedback-audit-listening-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-practice="choice"][data-choice="0"]').click();await page.locator('[data-practice="next"]').click();expect(await page.evaluate(()=>window.advances)).toBe(1);
});

test('audit Korean introduction wrong choice and recovery',async({page})=>{
 await page.setViewportSize({width:320,height:700});const s={...freshState(),onboarded:true,onboardingLevel:2,courseDirection:'ja-ko',koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1},korean:{version:4,active:'3-1',lessons:{'3-1':{index:0,phase:'quiz',selected:null,retry:false,started:true,completed:false,caseSeen:true}}}};
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},s);
 await page.goto('/playable.html');await page.locator('[data-action="korean"][data-id="3-1"]').first().click();await page.locator('[data-choice="resume"]').click();await page.locator('[data-action="korean-select"][data-id="1"]').click();await page.locator('[data-action="korean-check"]').click();await expect(page.locator('.korean-feedback')).not.toBeEmpty();
 await page.screenshot({path:`output/feedback-audit-korean-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-action="korean-select"][data-id="0"]').click();await page.waitForTimeout(500);await page.locator('[data-action="korean-check"]').click();await expect(page.locator('.korean-speaking')).toBeVisible();
});
