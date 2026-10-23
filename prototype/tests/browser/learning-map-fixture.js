import {expect} from '@playwright/test';
const map=page=>page.locator('section.learning-map');
export const activeMapPage=page=>page.locator('.map-sections>.map-page[data-active="true"]');
const loadEdge=(page,direction)=>page.locator(`[data-map-load="${direction}"]`).evaluate(button=>button.click());
export async function loadMapSection(page,index){
 while(!await page.locator(`[data-map-page="${index}"]`).count()){
  const first=Number(await page.locator('[data-map-page]').first().getAttribute('data-map-page'));
  await loadEdge(page,index<first?'previous':'next');
 }
}
export async function scrollMapSection(page,index){
 await loadMapSection(page,index);
 await page.locator(`[data-map-page="${Number(index)}"]`).evaluate(section=>{
  const header=document.querySelector('.app-header').getBoundingClientRect().height;
  window.scrollBy({top:section.getBoundingClientRect().top-header,behavior:'instant'});
 });
 await expect(map(page)).toHaveAttribute('data-page-index',String(index));
}
export async function findMapLesson(page,{kind,id}){
 await expect(map(page)).toBeVisible();
 const lesson=map(page).locator(`.map-choice[data-action=${JSON.stringify(kind)}]${id===undefined?'':`[data-id=${JSON.stringify(String(id))}]`}`);
 if(!await lesson.count()){
  for(let i=0;i<Number(await map(page).getAttribute('data-page-count'));i++){
   await loadMapSection(page,i);if(await lesson.count())break;
  }
 }
 await expect(lesson).toHaveCount(1);await lesson.scrollIntoViewIfNeeded();return lesson;
}
export async function openMapLesson(page,target){await (await findMapLesson(page,target)).click();}
export async function collectMapLessons(page){
 await expect(map(page)).toBeVisible();
 for(let i=0;i<Number(await map(page).getAttribute('data-page-count'));i++)await loadMapSection(page,i);
 return map(page).locator('.map-grid>.map-stop:not(.map-coming-soon)>.map-choice').evaluateAll(nodes=>nodes.map(node=>({number:Number(node.querySelector('.map-number').textContent),kind:node.dataset.action??null,id:node.dataset.id??null})));
}
