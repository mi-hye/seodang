import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
for(const width of [320,390])test(`exchange wrong answer explanations at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:'ja-ko',onboardingLevel:2,settings:{sound:false,motion:'off',textScale:1.2}});
 await page.goto('/playable.html');await expect(page.locator('.view-home')).toBeVisible();
 for(let index=0;index<6;index++){
  const task=await page.evaluate(async index=>{
   const {renderCasePractice,mountCasePractice}=await import('/src/case-practice.js');
   const {freshState}=await import('/src/engine.js');const {prepareContent,caseTasks}=await import('/src/practice-content.js');
   await prepareContent('korean');const s={...freshState(),courseDirection:'ja-ko',onboardingLevel:2,korean:{active:'3-1'},settings:{textScale:1.2}};
   const task=caseTasks(s,'korean')[index];window.disposeFeedback?.();
   document.body.innerHTML='<div id="feedback-fixture" class="shell"></div>';const root=document.querySelector('#feedback-fixture');
   document.documentElement.style.setProperty('--text-scale','1.2');
   for(const file of ['practice','korean'])if(!document.querySelector(`[data-fixture-style="${file}"]`)){const link=document.createElement('link');link.rel='stylesheet';link.href=`/src/${file}.css`;link.dataset.fixtureStyle=file;document.head.append(link);await new Promise(r=>link.onload=r);}
   root.innerHTML=renderCasePractice(s,task,{index,count:6},()=> '');window.advanced=0;
   if(index===0){
    const {feedbackText}=await import('/src/feedback-text.js');
    const probe=document.createElement('main');probe.className='page korean-page';
    probe.innerHTML=`<p class="korean-feedback">${feedbackText('「한국 사람」は韓国人です。今は日本人だと伝えたいので、国が違います。')}</p>`;root.append(probe);
    const quote=probe.querySelector('.feedback-phrase'),suffix=quote.nextSibling,range=document.createRange();range.setStart(suffix,0);range.setEnd(suffix,1);
    window.quoteLine={quote:quote.getBoundingClientRect().top,suffix:range.getBoundingClientRect().top};probe.remove();
   }

   window.disposeFeedback=mountCasePractice(root,s,task,{stop(){},advance(){window.advanced++;}});return task;
  },index);
  const confirm=page.locator('[data-case-confirm]'),feedback=page.locator('.practice-feedback');
  if(index===0){const line=await page.evaluate(()=>window.quoteLine);expect(Math.abs(line.quote-line.suffix)).toBeLessThan(8);}
  if(task.type==='order'){
   for(let i=task.tokens.length-1;i>=0;i--)await page.locator(`[data-case-token="${i}"]`).click();await confirm.click();await expect(feedback).toHaveText(task.orderFeedback);
   for(let i=0;i<task.tokens.length;i++)await page.locator('[data-case-undo]').click();
   await expect(feedback).toBeEmpty();for(let i=0;i<task.tokens.length;i++)await page.locator(`[data-case-token="${i}"]`).click();
  }else{
   for(let i=0;i<task.options.length;i++)if(i!==task.answer){await page.locator(`[data-case-choice="${i}"]`).click();await expect(feedback).toBeEmpty();await confirm.click();await expect(feedback).toHaveText(task.wrongFeedback[task.options[i]]);expect(await page.evaluate(()=>window.advanced)).toBe(0);const quoted=feedback.locator('.feedback-phrase');for(const span of await quoted.all()){if((await span.textContent()).length<=10)expect(await span.evaluate(el=>el.getBoundingClientRect().height/parseFloat(getComputedStyle(el).lineHeight))).toBeLessThan(1.5);}}
   await page.locator(`[data-case-choice="${task.answer}"]`).click();await expect(feedback).toBeEmpty();
  }
  await confirm.click();await expect(feedback).toContainText('正解です。');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await confirm.click();expect(await page.evaluate(()=>window.advanced)).toBe(1);
 }
});
