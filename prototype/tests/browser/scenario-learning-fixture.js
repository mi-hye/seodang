import {openMapLesson} from './learning-map-fixture.js';
import {expect} from '@playwright/test';
import {scenarioContent} from '../../src/scenario-content.js';

export async function assertScenarioLearning(page,direction,id,index){
 const content=scenarioContent[direction][id],item=content.items[index],learn=page.locator('.scenario-learning');
 await expect(learn).toBeVisible();
 await expect(learn.locator('[data-model-prompt]')).toHaveText(item.text);
 await expect(learn.locator('[data-model-answer]')).toHaveText(item.answer);
 await expect(learn.locator('.case-lesson-meaning')).toHaveText(item.answerMeaning);
 expect(item.learnNote?.trim()).toBeTruthy();
 await expect(learn.locator('.scenario-learning-note')).toHaveText(item.learnNote);
 await expect(page.locator('.scenario-choices,[data-action="scenario-select"]')).toHaveCount(0);
 await expect(page.locator('[role="progressbar"]')).toHaveCount(1);
 await expect(page.locator('.case-task-count,.practice-rounds')).toHaveCount(0);
 await expect(learn.locator('img')).toHaveCount(0);
 await expect(learn.locator('[data-action="scenario-audio"]')).toHaveCount(2);
 for(const part of ['prompt','answer']){
  await expect(learn.locator(`[data-action="scenario-audio"][data-id="${part}"]`)).toBeVisible();
  const boxes=await learn.locator(`[data-model-${part}]`).evaluate(el=>({text:el.getBoundingClientRect().toJSON(),button:el.closest('.audio-text-row').querySelector('button').getBoundingClientRect().toJSON()}));
  expect(boxes.button.left).toBeGreaterThanOrEqual(boxes.text.right-1);
  expect(boxes.button.width).toBeGreaterThanOrEqual(44);expect(boxes.button.height).toBeGreaterThanOrEqual(44);
 }
 const pair=await learn.locator('.button-pair>button').evaluateAll(es=>es.map(el=>el.getBoundingClientRect().toJSON()));
 expect(pair).toHaveLength(2);expect(Math.abs(pair[0].top-pair[1].top)).toBeLessThan(2);expect(Math.abs(pair[0].width-pair[1].width)).toBeLessThan(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await expect(learn.locator('[data-action="scenario-next"]')).toHaveText(direction==='ko-ja'?'연습하기':'練習する');
}

export async function prepareScenarioPractice(page,direction,id,index,{screenshot}={}){
 const next=()=>page.locator('[data-action="scenario-next"]').click(),previous=()=>page.locator('[data-action="scenario-previous"]').click();
 await assertScenarioLearning(page,direction,id,index);
 if(screenshot)await page.screenshot({path:screenshot,fullPage:true});
 if(index===0){
  // Saved learning and the first back action must stay before answer selection.
  await page.reload();await openMapLesson(page,{kind:'scenario',id:id});await page.locator('[data-choice="resume"]').click();
  await assertScenarioLearning(page,direction,id,0);
  await previous();await expect(page.locator('.scenario-learning,.scenario-choices')).toHaveCount(0);
  const image=page.locator('.scenario-image'),source=scenarioContent[direction][id].image;
  await expect(image).toHaveCount(source?1:0);
  if(source){await expect(image).toHaveAttribute('src',source);await expect.poll(()=>image.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);}
  await expect(page.locator('[data-action="scenario-next"]')).toHaveText(direction==='ko-ja'?'학습 시작하기':'学習を始める');
  await next();await assertScenarioLearning(page,direction,id,0);
 }else if(index===1){
  // Back from the next expression returns to the previous expression's learning page.
  await previous();await assertScenarioLearning(page,direction,id,0);await next();
  const answer=({'14':2,'15':1,'16':2,'17':1})[id];
  await page.locator(`[data-action="scenario-select"][data-id="${answer}"]`).click();await page.locator('[data-action="scenario-check"]').click();await next();
  await assertScenarioLearning(page,direction,id,1);
 }
 await next();await expect(page.locator('.scenario-choices')).toBeVisible();
 await expect(page.locator('[data-action="scenario-previous"]')).toHaveText(direction==='ko-ja'?'다시 배우기':'もう一度学ぶ');
 // Relearning from a quiz must show this same expression, not a prior conversation.
 await previous();await assertScenarioLearning(page,direction,id,index);await next();
 await expect(page.locator('.scenario-choices')).toBeVisible();await expect(page.locator('.scenario-learning')).toHaveCount(0);
}
