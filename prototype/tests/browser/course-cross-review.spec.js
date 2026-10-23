import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {freshScenario} from '../../src/scenario-state.js';
import {courseExpansionCatalog} from '../../src/course-expansion-state.js';
import {prepareCourseExpansion,expandedCourseContent} from '../../src/course-expansion-content.js';
import {courseExpansionReview} from '../../src/course-expansion-review.js';
import {courseVoicePath} from '../../src/course-voice-path.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';

const storageKey='seodang.web-prototype.v1';
for(const id of ['course3-12','course4-11','course5-16'])await prepareCourseExpansion(id);
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
async function openLesson(page,{direction='ko-ja',id,width=320,reviewIndex}){
 const meta=courseExpansionCatalog.find(l=>l.id===id),key=`${direction}:scenario:${id}`,review=reviewIndex!==undefined;
 const state={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:direction,onboardingLevel:meta.level,scenarioActive:id,scenarios:{[key]:{...freshScenario(id),started:true,phase:'quiz',index:review?2:0,selected:review?meta.answers[2]:null,checked:review}},...(review?{practices:{[key]:{version:1,caseVersion:1,count:6,index:reviewIndex,round:0,mode:0,action:{type:'scenario-next'}}}}:{}),settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}};
 await page.setViewportSize({width,height:width===320?640:844});
 await page.addInitScript(({storageKey,state})=>{
  if(!localStorage.getItem(storageKey))localStorage.setItem(storageKey,JSON.stringify(state));
  localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));window.crossReviewPlayed=[];
  // This mock checks which original clip a choice requests, not audio decoding or pronunciation.
  window.Audio=class{constructor(src){this.src=src;}play(){window.crossReviewPlayed.push(this.src);queueMicrotask(()=>this.onended?.());return Promise.resolve();}pause(){}};
 },{storageKey,state});
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');await page.locator(`.home-start-card[data-action="scenario"][data-id="${id}"]`).click();
 await expect(page.locator(review?'.introduction-review':'.scenario-choices')).toBeVisible();return{meta,key};
}
async function layout(page){
 await expect(page.locator('[role="progressbar"]')).toHaveCount(1);await expect(page.locator('.case-task-count,.practice-rounds')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 for(const pair of await page.locator('main .button-pair:visible').all()){
  const boxes=await pair.locator(':scope>button').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().toJSON()));
  expect(boxes).toHaveLength(2);expect(Math.abs(boxes[0].top-boxes[1].top)).toBeLessThan(2);expect(Math.abs(boxes[0].width-boxes[1].width)).toBeLessThan(2);
 }
}
async function choiceTextAndAudio(page,selector,options){
 await expect(page.locator(selector)).toHaveCount(options.length);
 for(const [index,text]of options.entries()){
  const choice=page.locator(selector).nth(index);expect(await choice.textContent()).toBe(text);
  expect(await choice.locator('.text-phrase').count()).toBeGreaterThan(1);
  expect(await choice.locator('.text-phrase').evaluateAll(nodes=>nodes.map(node=>node.textContent).join(''))).toBe(text);
  const before=await page.evaluate(()=>window.crossReviewPlayed.length);await choice.click();
  await expect(choice).toHaveAttribute('aria-pressed','true');await expect.poll(()=>page.evaluate(()=>window.crossReviewPlayed.length)).toBeGreaterThan(before);
  await expect.poll(()=>page.evaluate(()=>window.crossReviewPlayed.at(-1))).toBe(courseVoicePath('ja-JP',text));
 }
}

const alternateCases=[
 {direction:'ko-ja',id:'course4-11',unit:0,order:[3,0,1,2]},
 {direction:'ja-ko',id:'course4-11',unit:0,order:[2,0,1]},
 {direction:'ko-ja',id:'course4-11',unit:2,order:[3,4,0,1,2]},
 {direction:'ja-ko',id:'course4-11',unit:2,order:[2,0,1]},
 {direction:'ko-ja',id:'course5-16',unit:0,order:[2,0,1,3]},
];
for(const entry of alternateCases)test(`review accepts the natural alternative ${entry.direction} ${entry.id} expression ${entry.unit}`,async({page})=>{
 const key=`${entry.direction}:scenario:${entry.id}`,tasks=courseExpansionReview(key),reviewIndex=tasks.findIndex(task=>task.type==='order'&&task.unitIndex===entry.unit),task=tasks[reviewIndex];
 await openLesson(page,{...entry,reviewIndex});await expect(page.locator('[data-review-confirm]')).toBeDisabled();
 for(const token of entry.order)await page.locator(`[data-review-token="${token}"]`).click();
 expect((await saved(page)).practices[key].index).toBe(reviewIndex);await page.locator('[data-review-confirm]').click();
 await expect(page.locator('.practice-feedback.success')).toBeVisible();await expect(page.locator('.review-result')).toBeVisible();await expect(page.locator('.review-result .audio-text-row p')).toHaveText(task.unit.text);await layout(page);
 await page.locator('[data-review-confirm]').click();expect((await saved(page)).practices[key].index).toBe(reviewIndex+1);await expect(page.locator('.practice-feedback.success')).toHaveCount(0);
});

for(const id of ['course3-12','course4-11','course5-16'])for(const width of [320,390])test(`all Japanese quiz choices preserve text and clip with phrase layout ${id} ${width}px`,async({page})=>{
 const {meta}=await openLesson(page,{id,width}),item=expandedCourseContent('ko-ja',id).items[0],options=[...item.others];options.splice(meta.answers[0],0,item.answer);
 await expect(page.locator('.scenario-feedback')).toBeHidden();
 await choiceTextAndAudio(page,'[data-action="scenario-select"]',options);await layout(page);
 await expect(page.locator('.scenario-feedback')).toBeHidden();
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`output/cross-review-${id}-quiz-${width}-${test.info().project.name}.png`,fullPage:true});
 await page.locator(`[data-action="scenario-select"][data-id="${(meta.answers[0]+1)%3}"]`).click();
 await page.locator('[data-action="scenario-check"]').click();await expect(page.locator('.scenario-feedback')).toBeVisible();
 await expect(page.locator('.scenario-feedback')).toContainText('다시 생각해 보세요.');
 await page.locator(`[data-action="scenario-select"][data-id="${meta.answers[0]}"]`).click();
 await page.locator('[data-action="scenario-check"]').click();await expect(page.locator('.scenario-feedback.success')).toBeVisible();
 await expect(page.locator('.scenario-feedback .review-correct-mark')).toBeVisible();
});

for(const width of [320,390])test(`all Japanese transfer choices preserve text and clip with phrase layout ${width}px`,async({page})=>{
 const id='course5-16',reviewIndex=4,{key}=await openLesson(page,{id,width,reviewIndex}),task=courseExpansionReview(key)[reviewIndex];
 expect(task.type).toBe('apply');await choiceTextAndAudio(page,'[data-review-choice]',task.options);await layout(page);
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`output/cross-review-${id}-transfer-${width}-${test.info().project.name}.png`,fullPage:true});
 await page.locator(`[data-review-choice="${task.answer}"]`).click();await page.locator('[data-review-confirm]').click();await expect(page.locator('.practice-feedback.success')).toBeVisible();await expect(page.locator('.review-result .audio-text-row p')).toHaveText(task.unit.text);await layout(page);
});
