import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {freshKoreanProgress,koreanLessons} from '../../src/korean-state.js';
import {courseExpansionCatalog} from '../../src/course-expansion-state.js';
import {prepareCourseExpansion,expandedCourseContent} from '../../src/course-expansion-content.js';
import {courseVoicePath} from '../../src/course-voice-path.js';
import {courseExpansionReview} from '../../src/course-expansion-review.js';
import {freshScenario} from '../../src/scenario-state.js';
import {openMapLesson,findMapLesson,collectMapLessons} from './learning-map-fixture.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
const storageKey='seodang.web-prototype.v1';
const examples=['ko-ja','ja-ko'].flatMap(direction=>[...[2,3,4,5].map(level=>`course20-${level}-19`),'course3-8','course4-11','course5-16'].map(id=>({direction,id})));
for(const {id} of examples)await prepareCourseExpansion(id);
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
const button=(page,action)=>page.locator(`[data-action="${action}"]`);
const progress=async(page,value)=>{await expect(page.locator('[role="progressbar"]')).toHaveCount(1);await expect(page.locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow',String(value));};
async function setup(page,direction,id,width){
 const meta=courseExpansionCatalog.find(l=>l.id===id),state={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:direction,onboardingLevel:meta.level,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}};
 await page.setViewportSize({width,height:width===320?640:844});
 await page.addInitScript(({storageKey,state})=>{
  if(!localStorage.getItem(storageKey))localStorage.setItem(storageKey,JSON.stringify(state));
  localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));window.coursePlayed=[];
  // UI/audio mapping only; real file decoding belongs to the asset validation.
  window.Audio=class{constructor(src){this.src=src;}play(){window.coursePlayed.push(this.src);queueMicrotask(()=>this.onended?.());return Promise.resolve();}pause(){}};
 },{storageKey,state});
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');
 const enter=async(resume=false)=>{await openMapLesson(page,{kind:'scenario',id});if(resume)await page.locator('[data-choice="resume"]').click();await expect(page.locator('.view-scenario')).toBeVisible();};
 await enter();return{meta,state,enter};
}
async function layout(page){
 const lesson=page.locator('main.course-expansion');
 if(await lesson.count()){
  const gap=await lesson.evaluate(el=>el.firstElementChild.getBoundingClientRect().top-el.getBoundingClientRect().top);
  expect(gap,'lesson content starts below the header without vertical centering').toBeLessThanOrEqual(18);
 }
 await expect(page.locator('.case-task-count,.practice-rounds')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 for(const pair of await page.locator('main .button-pair:visible').all()){
  const b=await pair.locator(':scope>button').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));expect(b).toHaveLength(2);expect(Math.abs(b[0].top-b[1].top)).toBeLessThan(2);expect(Math.abs(b[0].width-b[1].width)).toBeLessThan(2);
 }
 for(const row of await page.locator('main .audio-text-row:visible').all()){
  const b=await row.evaluate(el=>({text:el.querySelector('p').getBoundingClientRect().toJSON(),button:el.querySelector('button').getBoundingClientRect().toJSON()}));expect(b.button.left).toBeGreaterThanOrEqual(b.text.right-1);expect(b.button.width).toBeGreaterThanOrEqual(44);expect(b.button.height).toBeGreaterThanOrEqual(44);
 }
}
async function hear(page,locator,direction,text){
 const before=await page.evaluate(()=>window.coursePlayed.length);await locator.click();
 await expect.poll(()=>page.evaluate(()=>window.coursePlayed.length)).toBeGreaterThan(before);
 await expect.poll(()=>page.evaluate(()=>window.coursePlayed.at(-1))).toBe(courseVoicePath(direction==='ko-ja'?'ja-JP':'ko-KR',text));
}
async function home(page){await button(page,'home').first().click();await expect(page.locator('.view-home')).toBeVisible();}
for(const {direction,id}of examples)for(const width of [320,390])test(`expanded lesson ${direction} ${id} ${width}px full learning, audio, review and resume`,async({page})=>{
 test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const {meta,enter}=await setup(page,direction,id,width),key=`${direction}:scenario:${id}`,content=expandedCourseContent(direction,id),tasks=courseExpansionReview(key);
 const resumeAfterReload=async()=>{if(meta.level===7){await page.locator(`.home-start-card[data-action="scenario"][data-id="${id}"]`).click();await expect(page.locator('.lesson-resume')).toHaveCount(0);await expect(page.locator('.view-scenario')).toBeVisible();}else await enter(true);};
 await expect(page.locator('.course-expansion')).toHaveAttribute('data-course-activity',content.activity);await expect(page.locator('.reading-intro')).toHaveText(content.scene);await progress(page,0);await layout(page);
 if(content.image){const img=page.locator('.scenario-image');await expect(img).toHaveAttribute('src',content.image);await expect.poll(()=>img.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);}
 await expect(page.locator('[data-action="scenario-select"]')).toHaveCount(0);await button(page,'scenario-next').click();
 for(let index=0;index<3;index++){
  const item=content.items[index];await progress(page,[0,16,33][index]);await expect(page.locator('.scenario-learning-note')).toHaveText(item.learnNote);await expect(page.locator('.dialogue-self .audio-text-row p')).toHaveText(item.answer);await expect(page.locator('.dialogue-self .dialogue-meaning')).toHaveText(item.answerMeaning);await expect(page.locator('.scenario-choices')).toHaveCount(0);await layout(page);
  if(index===0){
   const expected={words:direction==='ja-ko'?'単語を読む':'단어를 읽어요',reading:direction==='ja-ko'?'読んで表現を覚える':'읽고 표현 익히기',repair:direction==='ja-ko'?'意図が伝わる言い方':'뜻을 분명하게 전해요',dialogue:direction==='ja-ko'?'会話を覚える':'대화 익히기'}[content.activity];await expect(page.locator('main h1')).toHaveText(expected);
   await hear(page,page.locator('[data-action="scenario-audio"][data-id="answer"]'),direction,item.answer);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`output/expansion-${direction}-${id}-${width}-${test.info().project.name}-learn.png`,fullPage:true});
   await page.reload();await resumeAfterReload();await expect(page.locator('.scenario-learning-note')).toHaveText(item.learnNote);
  }
  await button(page,'scenario-next').click();await progress(page,[8,25,41][index]);await expect(page.locator('.scenario-learning-note,.dialogue-self')).toHaveCount(0);await expect(page.locator('[data-action="scenario-select"]')).toHaveCount(3);await expect(page.locator('[data-action="scenario-select"] svg')).toHaveCount(0);await expect(button(page,'scenario-check')).toBeDisabled();
  const choices=[...item.others];choices.splice(meta.answers[index],0,item.answer);
  for(let option=0;option<choices.length;option++){const choice=page.locator(`[data-action="scenario-select"][data-id="${option}"]`);await hear(page,choice,direction,choices[option]);await expect(choice).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-action="scenario-select"][aria-pressed="true"]')).toHaveCount(1);}
  const wrong=(meta.answers[index]+1)%3;await page.locator(`[data-action="scenario-select"][data-id="${wrong}"]`).click();
  if(index===1){const before=(await saved(page)).scenarios[key];await page.reload();await resumeAfterReload();expect((await saved(page)).scenarios[key]).toEqual(before);await expect(page.locator(`[data-action="scenario-select"][data-id="${wrong}"]`)).toHaveAttribute('aria-pressed','true');}
  await button(page,'scenario-check').click();await expect(page.locator('.scenario-feedback')).not.toHaveText('');expect((await saved(page)).scenarios[key].checked).toBe(false);
  await page.locator(`[data-action="scenario-select"][data-id="${meta.answers[index]}"]`).click();await button(page,'scenario-check').click();await expect(page.locator('.scenario-feedback.success')).toBeVisible();await expect(page.locator('[data-action="scenario-select"]:enabled')).toHaveCount(0);await layout(page);await button(page,'scenario-next').click();
 }
 const held=await saved(page);expect(held.scenarios[key]).toMatchObject({phase:'quiz',index:2,checked:true,completed:false});expect(held.practices[key]).toMatchObject({caseVersion:1,count:6,index:0});expect(held.studyTools?.[direction]?.lessons?.[key]).toBeUndefined();await expect(page.locator('.introduction-review')).toBeVisible();
 for(const [index,task]of tasks.entries()){
  await progress(page,[50,58,66,75,83,91][index]);await layout(page);expect((await saved(page)).practices[key].index).toBe(index);const confirm=page.locator('[data-review-confirm]');await expect(confirm).toBeDisabled();
  if(task.type==='order'){
   await expect(page.locator('[data-review-token]')).toHaveCount(task.tokens.length);await expect(page.locator('.review-build-meaning')).toHaveText(task.scene);
   await page.locator('[data-review-token="0"]').click();await expect(page.locator('[data-review-token="0"]')).toBeDisabled();await page.locator('[data-review-remove="0"]').click();await expect(page.locator('[data-review-token="0"]')).toBeEnabled();await expect(confirm).toBeDisabled();
   if(index===0){const wrong=task.tokens.map((_,i)=>i).reverse();expect(task.acceptedOrders||[task.tokens.map((_,i)=>i)]).not.toContainEqual(wrong);for(const token of wrong)await page.locator(`[data-review-token="${token}"]`).click();await confirm.click();await expect(page.locator('.review-result')).toBeHidden();expect((await saved(page)).practices[key].index).toBe(index);for(const token of wrong)await page.locator(`[data-review-remove="${token}"]`).click();}
   for(let token=0;token<task.answerLength;token++)await page.locator(`[data-review-token="${token}"]`).click();
  }else if(task.type==='listen'){
   const transcript=page.locator('[data-review-transcript]');await expect(transcript).not.toHaveAttribute('open','');await expect(transcript.locator('p')).toBeHidden();await expect(page.locator('[data-review-choice]')).toHaveCount(3);
   const before=await page.evaluate(()=>window.coursePlayed.length);for(let option=0;option<task.options.length;option++){await expect(page.locator(`[data-review-choice="${option}"]`)).toHaveText(task.options[option]);await page.locator(`[data-review-choice="${option}"]`).click();}expect(await page.evaluate(()=>window.coursePlayed.length)).toBe(before);await expect(confirm).toBeDisabled();
   if(index===1){await transcript.locator('summary').click();await expect(transcript.locator('p')).toHaveText(task.unit.text);}else await hear(page,page.locator('.review-listen [data-review-audio]'),direction,task.unit.text);
   await expect(confirm).toBeEnabled();await page.locator(`[data-review-choice="${(task.answer+1)%3}"]`).click();await confirm.click();await expect(page.locator('.review-result')).toBeHidden();expect((await saved(page)).practices[key].index).toBe(index);await page.locator(`[data-review-choice="${task.answer}"]`).click();
  }else{await expect(page.locator('.case-task-scene')).toHaveText(task.scene);for(let option=0;option<task.options.length;option++)await hear(page,page.locator(`[data-review-choice="${option}"]`),direction,task.options[option]);await page.locator(`[data-review-choice="${task.answer}"]`).click();}
  await confirm.click();await expect(page.locator('.review-result')).toBeVisible();await expect(page.locator('.practice-feedback.success')).toBeVisible();await expect(page.locator('.review-correct-mark')).toBeVisible();await expect(page.locator('.review-result .audio-text-row p')).toHaveText(task.unit.text);await layout(page);expect((await saved(page)).studyTools?.[direction]?.lessons?.[key]).toBeUndefined();
  if(index===0)await hear(page,page.locator('.review-result [data-review-audio]'),direction,task.unit.text);await confirm.click();
  if(index===1){await page.reload();await resumeAfterReload();expect((await saved(page)).practices[key]).toMatchObject({count:6,index:2});}
 }
 await expect(page.locator('.practice-complete')).toBeVisible();await expect(page.locator('.practice-fireworks svg')).toBeVisible();await progress(page,100);await layout(page);
 const done=await saved(page);expect(done.practices[key]).toBeUndefined();expect(done.scenarios[key]).toMatchObject({phase:'done',completed:true});expect(done.studyTools[direction].lessons[key].completedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);const history=direction==='ja-ko'?done.korean.history:done.history;expect(Object.values(history.days).reduce((sum,day)=>sum+day.cases,0)).toBe(1);
 await home(page);await expect(await findMapLesson(page,{kind:'scenario',id})).toHaveAttribute('aria-label',new RegExp(direction==='ja-ko'?'完了':'완료'));
 await enter();await button(page,'scenario-next').click();await home(page);await openMapLesson(page,{kind:'scenario',id});await page.locator('[data-choice="restart"]').click();await expect.poll(async()=>(await saved(page)).scenarios[key]).toMatchObject({phase:'intro',completed:true});const restarted=await saved(page);expect(restarted.scenarios[key]).toMatchObject({phase:'intro',completed:true});expect(restarted.studyTools).toEqual(done.studyTools);expect(direction==='ja-ko'?restarted.korean.history:restarted.history).toEqual(history);expect(errors).toEqual([]);
});
for(const direction of ['ko-ja','ja-ko'])test(`all new map pages expose the expected levels ${direction}`,async({page})=>{
 await setup(page,direction,'course3-8',390);await home(page);
 for(const level of [0,4,5,7]){
  await page.evaluate(({storageKey,level})=>{const s=JSON.parse(localStorage.getItem(storageKey));s.onboardingLevel=level;localStorage.setItem(storageKey,JSON.stringify(s));},{storageKey,level});await page.reload();const lessons=await collectMapLessons(page);
  expect(lessons.length).toBe(level===0?(direction==='ko-ja'?30:10):20);expect(lessons.map(l=>l.number)).toEqual(Array.from({length:lessons.length},(_,i)=>i+1));if(level===0&&direction==='ko-ja')expect(lessons.some(l=>l.id?.startsWith('course1-'))).toBe(false);
 }
});

const repeatExamples=examples;
for(const {direction,id}of repeatExamples)test(`expansion resume card keeps the UI language ${direction} ${id}`,async({page})=>{
 const {meta}=await setup(page,direction,id,320);await button(page,'scenario-next').click();await home(page);
 const card=page.locator(`.home-start-card[data-action="scenario"][data-id="${id}"]`),level={0:1,2:2,4:3,5:4,7:5}[meta.level];
 await expect(card.locator('.home-position')).toHaveText(`${direction==='ja-ko'?`レベル${level}`:`${level}단계`} · ${id.split('-').at(-1)}`);
 await card.click();await expect(page.locator('.scenario-learning')).toBeVisible();await expect(page.locator('.lesson-resume')).toHaveCount(0);
});

for(const route of ['completion','home'])for(const width of [320,390])test(`Korean lesson 1-10 ends level one and continues to pronunciation from ${route} at ${width}px`,async({page})=>{
 const id='1-10',key='ja-ko:scenario:course20-1-20';
 const oldProgress={...freshScenario('course20-1-20'),started:true,phase:'quiz',index:2,checked:true};
 const pending={version:1,caseVersion:1,count:6,index:5,round:0,mode:0,action:{type:'scenario-next'}};
 const lessons=Object.fromEntries(koreanLessons.filter(l=>l.level===0).map(l=>[l.id,{...freshKoreanProgress(l.id),started:true,phase:'done',index:l.count-1,completed:true}]));
 lessons[id]={...freshKoreanProgress(id),started:true,phase:'quiz',index:koreanLessons.find(l=>l.id===id).count-1,selected:(koreanLessons.find(l=>l.id===id).count-1)%4};
 const state={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:'ja-ko',onboardingLevel:0,korean:{version:4,active:id,lessons},scenarioActive:'course20-1-20',scenarios:{[key]:oldProgress},practices:{[key]:pending},settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}};
 await page.setViewportSize({width,height:width===320?640:844});
 await page.addInitScript(({storageKey,state})=>{if(!localStorage.getItem(storageKey))localStorage.setItem(storageKey,JSON.stringify(state));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));window.Audio=class{play(){queueMicrotask(()=>this.onended?.());return Promise.resolve();}pause(){}};},{storageKey,state});
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');
 await expect(page.locator('.home-start-card[data-action="practice-resume"],.home-start-card[data-action="scenario"]')).toHaveCount(0);
 await openMapLesson(page,{kind:'korean',id});await page.locator('[data-choice="resume"]').click();await button(page,'korean-check').click();
 await expect(page.locator('.korean-zero-finish')).toBeVisible();await layout(page);
 expect((await saved(page)).korean.lessons[id].completed).toBe(true);
 if(route==='home'){
  await home(page);const card=page.locator('.home-start-card[data-action="next-course"]');await expect(card).toContainText('レベル1.5');await page.reload();await expect(card).toBeVisible();await card.click();
 }else await button(page,'completed-next').click();
 await expect(page.locator('.view-korean')).toBeVisible();
 const advanced=await saved(page);expect(advanced.onboardingLevel).toBe(8);expect(advanced.korean.active).toBe('15-1');expect(advanced.scenarios[key]).toEqual(oldProgress);expect(advanced.archivedPractices[key]).toEqual(pending);expect(advanced.practices[key]).toBeUndefined();
 for(const l of koreanLessons.filter(l=>l.level===0))expect(advanced.korean.lessons[l.id].completed).toBe(true);
});

for(const {direction,id}of repeatExamples)test(`completed expansion repeat stays in its level home card ${direction} ${id}`,async({page})=>{
 const meta=courseExpansionCatalog.find(l=>l.id===id),key=`${direction}:scenario:${id}`,index=4;
 const pending={version:1,caseVersion:1,count:6,index,round:0,mode:0,action:{type:'scenario-next'}};
 const state={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:direction,onboardingLevel:meta.level,scenarioActive:id,scenarios:{[key]:{...freshScenario(id),started:true,phase:'quiz',index:2,selected:meta.answers[2],checked:true,completed:true,attempts:2}},practices:{[key]:pending},settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}};
 await page.setViewportSize({width:320,height:640});
 await page.addInitScript(({storageKey,state})=>{if(!localStorage.getItem(storageKey))localStorage.setItem(storageKey,JSON.stringify(state));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{storageKey,state});
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');
 const card=page.locator('.home-start-card[data-action="practice-resume"]');
 await expect(card).toBeVisible();await expect(card).toContainText(meta.titles[direction==='ja-ko'?1:0]);
 await card.click();await expect(page.locator('.lesson-resume')).toHaveCount(0);await expect(page.locator('.introduction-review')).toBeVisible();await expect(page.locator('.case-task-scene')).toHaveText(courseExpansionReview(key)[index].scene);await progress(page,83);
 expect((await saved(page)).practices[key]).toEqual(pending);expect((await saved(page)).scenarios[key].completed).toBe(true);
 await home(page);await page.reload();await expect(card).toBeVisible();await expect(card).toContainText(meta.titles[direction==='ja-ko'?1:0]);
 // A repeat belongs to its actual level, even though legacy scenario reviews use level 2.
 await page.evaluate(({storageKey,level})=>{const s=JSON.parse(localStorage.getItem(storageKey));s.onboardingLevel=level===2?4:2;localStorage.setItem(storageKey,JSON.stringify(s));},{storageKey,level:meta.level});await page.reload();
 await expect(page.locator('.home-start-card')).toBeVisible();await expect(card).toHaveCount(0);await expect(page.locator(`.home-start-card[data-action="scenario"][data-id="${id}"]`)).toHaveCount(0);expect((await saved(page)).practices[key]).toEqual(pending);
 await page.evaluate(({storageKey,level})=>{const s=JSON.parse(localStorage.getItem(storageKey));s.onboardingLevel=level;localStorage.setItem(storageKey,JSON.stringify(s));},{storageKey,level:meta.level});await page.reload();await expect(card).toBeVisible();await card.click();await expect(page.locator('.case-task-scene')).toHaveText(courseExpansionReview(key)[index].scene);await progress(page,83);
});
