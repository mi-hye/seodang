import {comparisonAttachment} from '../../src/comparison-attachments.js';
import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {comparisonCourseCatalog as particleCourseCatalog} from '../../src/comparison-course-catalog.js';
import {comparisonCourseContent as particleCourseContent} from '../../src/comparison-course-content.js';
import {freshKoreanProgress} from '../../src/korean-state.js';
import {findMapLesson} from './learning-map-fixture.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';

const key='seodang.web-prototype.v1';
const action=(page,name)=>page.locator(`[data-action="${name}"]`).first();
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const move=async(page,name)=>{await page.waitForTimeout(460);await action(page,name).click();};
async function setup(page,width=390,extra={}){
 const state={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:'ja-ko',onboardingLevel:9,settings:{sound:true,motion:'off',textScale:1.2,audioRate:1},...extra};
 await page.setViewportSize({width,height:width===320?640:844});
 await page.addInitScript(({key,state})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
  localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
  window.clips=[];window.vibrations=[];window.tones=[];
  window.Audio=class{constructor(src){this.src=src;}play(){window.clips.push(this.src);queueMicrotask(()=>this.onended?.());return Promise.resolve();}pause(){}};
  Object.defineProperty(navigator,'vibrate',{configurable:true,value:value=>window.vibrations.push(value)});
  window.AudioContext=class{state='running';currentTime=0;destination={};createOscillator(){return {frequency:{},connect(){},start(){window.tones.push(1);},stop(){}};}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}close(){return Promise.resolve();}};
 },{key,state});
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');
}
async function fits(page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const boxes=await page.locator('.particle-navigation>button').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
 expect(Math.abs(boxes[0].top-boxes[1].top)).toBeLessThan(2);
 for(const box of boxes)expect(box.height).toBeGreaterThanOrEqual(44);
 for(const button of await page.locator('.particle-choices button').all()){
  const text=await button.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el.firstChild);return {lines:range.getClientRects().length,width:range.getBoundingClientRect().width,available:el.clientWidth-parseFloat(getComputedStyle(el).paddingLeft)-parseFloat(getComputedStyle(el).paddingRight)};});
  if(!await button.evaluate(el=>el.closest('.particle-interpretation')))expect(text.lines).toBe(1);expect(text.width).toBeLessThanOrEqual(text.available+1);
 }
 for(const row of await page.locator('.particle-example .audio-text-row').all()){
  const boxes=await row.locator('h2,button').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
  expect(boxes).toHaveLength(2);expect(boxes[1].left).toBeGreaterThanOrEqual(boxes[0].right-1);expect(boxes[1].width).toBeGreaterThanOrEqual(44);
 }
}
for(const width of [320,390])for(const lesson of particleCourseCatalog)test(`particles ${lesson.id} teaches, explains retries and completes at ${width}`,async({page})=>{
 const attachment=comparisonAttachment(lesson.id);await setup(page,width,{onboardingLevel:attachment.level});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const stop=await findMapLesson(page,{kind:'korean',id:lesson.id});await page.screenshot({path:`output/comparison-map-${lesson.id}-${width}-${test.info().project.name}.png`,fullPage:true});await stop.click();
 for(const [index,unit] of particleCourseContent[lesson.id].entries()){
  await expect(page.locator('.particle-course')).toHaveAttribute('data-particle-phase','learn');
  await expect(page.locator('.particle-examples .particle-example')).toHaveCount(2);
  await expect(page.locator('.particle-explanation')).toContainText(unit.explanation[0]);
  await expect(page.locator('[data-action="korean-select"]')).toHaveCount(0);await fits(page);
  const before=await page.evaluate(()=>window.clips.length);expect(before).toBe(index*3);
  for(const row of unit.examples){await page.locator(`[data-action="particle-audio"][data-id=${JSON.stringify(row.text)}]`).click();}
  await expect.poll(()=>page.evaluate(()=>window.clips.length)).toBe(before+2);
  if(index===0&&['25-1','25-6','25-10','25-11','25-12','25-13','35-1','35-2','35-3','35-4'].includes(lesson.id))await page.screenshot({path:`output/particles-${lesson.id}-learn-${width}-${test.info().project.name}.png`,fullPage:true});
  if(lesson.id==='25-8'&&index===1)await page.screenshot({path:`output/particles-${lesson.id}-note-${width}-${test.info().project.name}.png`,fullPage:true});
  if(lesson.id==='25-3'&&index===2)await page.screenshot({path:`output/particles-${lesson.id}-like-comparison-${width}-${test.info().project.name}.png`,fullPage:true});
  await move(page,'korean-next');
  await expect(page.locator('.particle-course')).toHaveAttribute('data-particle-phase','quiz');
  await expect(page.locator('[data-action="particle-audio"]')).toHaveCount(0);await expect(action(page,'korean-check')).toBeDisabled();
  const q=unit.question,wrong=(q.answer+1)%q.choices.length;
  await page.locator(`[data-action="korean-select"][data-id="${wrong}"]`).click();await move(page,'korean-check');
  await expect(page.locator('.particle-retry')).toContainText(q.choices[wrong].feedback);
  await expect(page.locator('.particle-choices .incorrect')).toHaveCount(1);await expect(page.locator('.particle-wrong-mark')).toBeVisible();await fits(page);
  if(lesson.id==='25-8'&&index===1)await page.screenshot({path:`output/particles-${lesson.id}-retry-${width}-${test.info().project.name}.png`,fullPage:true});
  expect((await saved(page)).korean.lessons[lesson.id].index).toBe(index);expect(await page.evaluate(()=>window.vibrations.length)).toBe(index);
  await page.locator(`[data-action="korean-select"][data-id="${q.answer}"]`).click();await expect(page.locator('.particle-retry')).toHaveCount(0);
  await move(page,'korean-check');await expect(page.locator('.particle-course')).toHaveAttribute('data-particle-phase','review');
  await expect(page.locator('.particle-feedback')).toContainText(q.choices[q.answer].feedback);
  await expect(page.locator('.particle-example')).toContainText(q.text);
  await expect(page.locator('[data-action="korean-select"],[data-action="korean-check"]')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>window.vibrations.length)).toBe(index+1);await fits(page);
  await action(page,'particle-audio').click();await expect.poll(()=>page.evaluate(()=>window.clips.length)).toBe(before+3);
  if(index===0&&lesson.id==='25-10')await page.screenshot({path:`output/particles-${lesson.id}-review-${width}-${test.info().project.name}.png`,fullPage:true});
  await move(page,'korean-next');
 }
 await expect(page.locator('.practice-complete')).toBeVisible();
 await expect(page.locator('[role="progressbar"]')).toHaveCount(1);await expect(page.locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow','100');
 const data=await saved(page);expect(data.korean.lessons[lesson.id].completed).toBe(true);expect(data.studyTools['ja-ko'].lessons[`ja-ko:korean:${lesson.id}`]).toBeDefined();
 expect(data.practices?.[`ja-ko:korean:${lesson.id}`]).toBeUndefined();expect(await page.evaluate(()=>window.tones.length)).toBe(12);
 await expect(action(page,'home')).toBeVisible();await expect(action(page,'completed-next')).toBeVisible();expect(errors).toEqual([]);
 if(['25-3','35-1'].includes(lesson.id)){
  await action(page,'completed-next').click();await expect(page.locator('.practice-complete')).toHaveCount(0);const next=await saved(page);
  expect(next.comparisonResume).toBeNull();
  if(lesson.id==='25-3')expect(next.korean.active).toBe('3-4');
  else expect(next.scenarioActive).toBe('course3-8');
 }

});

test('particle progress resumes the correct explanation without replaying feedback',async({page})=>{
 const id='25-6',q=particleCourseContent[id][1].question;
 await setup(page,320,{korean:{version:4,active:id,lessons:{[id]:{...freshKoreanProgress(id),started:true,index:1,phase:'review',selected:q.answer}}}});
 await page.locator('.home-start-card').click();
 await expect(page.locator('.particle-course')).toHaveAttribute('data-particle-phase','review');await expect(page.locator('.particle-feedback')).toContainText(q.choices[q.answer].feedback);
 expect(await page.evaluate(()=>window.vibrations.length)).toBe(0);expect(await page.evaluate(()=>window.tones.length)).toBe(0);
 await page.reload();await page.locator('.home-start-card').click();
 await expect(page.locator('.particle-course')).toHaveAttribute('data-particle-phase','review');expect(await page.evaluate(()=>window.vibrations.length)).toBe(0);
 await action(page,'korean-previous').click();await expect(page.locator('.particle-course')).toHaveAttribute('data-particle-phase','learn');
});

test('old particle level migrates and neither hidden level appears in onboarding',async({page})=>{
 await setup(page);await page.goto('/setup.html#guide');
 await expect(page.locator('input[name="level"][value="2"]')).toBeChecked();
 await expect(page.locator('input[name="level"][value="9"],input[name="level"][value="10"]')).toHaveCount(0);
 await page.goto('/setup.html');await page.locator('input[name="language"][value="ko"]').check();await page.locator('button[type="submit"]').click();
 await expect(page.locator('input[name="level"][value="8"]')).toHaveCount(1);
 await expect(page.locator('input[name="level"][value="9"],input[name="level"][value="10"]')).toHaveCount(0);
});

test('long Korean comparison quotes keep syllables together at 320px with large text',async({page})=>{
 const id='25-8';
 await setup(page,320,{korean:{version:4,active:id,lessons:{[id]:{...freshKoreanProgress(id),started:true,index:1,phase:'quiz'}}}});
 await page.locator('.home-start-card').click();
 await expect(page.locator('.particle-context')).toContainText('친구한테서 선물을 받았어요');
 const splitWords=await page.locator('.particle-context').evaluate(el=>{
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),split=[];
  while(walker.nextNode())for(const m of walker.currentNode.textContent.matchAll(/[가-힣]+/g)){
   const range=document.createRange();range.setStart(walker.currentNode,m.index);range.setEnd(walker.currentNode,m.index+m[0].length);
   if(range.getClientRects().length>1)split.push(m[0]);
  }
  return split;
 });
 expect(splitWords).toEqual([]);await fits(page);
 await page.screenshot({path:`output/particles-quote-wrap-320-${test.info().project.name}.png`,fullPage:true});
});


test('ending comparison resumes after reload and is absent from difficulty settings',async({page})=>{
 const id='35-1',p={...freshKoreanProgress(id),started:true,index:1,phase:'quiz'};
 await setup(page,320,{onboardingLevel:10,korean:{version:4,active:id,lessons:{[id]:p}}});
 await page.locator('.app-header [data-action="settings"]').click();
 await expect(page.locator('[data-setting="difficulty"] option[value="9"],[data-setting="difficulty"] option[value="10"]')).toHaveCount(0);
 await page.reload();await expect(page.locator('.map-heading h1')).toHaveText('日常会話をする');
 await page.locator('.home-start-card').click();
 await expect(page.locator('.particle-course')).toHaveAttribute('data-particle-phase','quiz');
 await page.locator('[data-action="korean-select"][data-id="0"]').click();await move(page,'korean-check');
 await page.reload();await page.locator('.home-start-card').click();
 await expect(page.locator('.particle-retry')).toBeVisible();expect((await saved(page)).korean.active).toBe(id);
});

for(const [level,id] of [[2,'hospital-appreciation'],[4,'blackdog-help'],[5,'queen-condition']])test(`shifted media headers and resume cards match the normal map number at level ${level}`,async({page})=>{
 await setup(page,320,{onboardingLevel:level});
 await page.route('https://www.youtube.com/embed/**',r=>r.fulfill({body:'player fixture'}));
 const stop=await findMapLesson(page,{kind:'video',id}),number=await stop.locator('.map-number').textContent();
 await stop.click();await expect(page.locator('.header-lesson-number')).toHaveText(`${number}.`);
 await page.locator('.app-header [data-action="home"]').click();
 await expect(page.locator('.home-start-card')).toHaveAttribute('data-id',id);
 await expect(page.locator('.home-start-card')).toHaveAttribute('aria-label',new RegExp(`: ${number}\\.`));
 await page.reload();await page.locator('.home-start-card').click();
 await expect(page.locator('.header-lesson-number')).toHaveText(`${number}.`);
});
