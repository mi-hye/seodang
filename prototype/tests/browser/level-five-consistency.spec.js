import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {openMapLesson,collectMapLessons} from './learning-map-fixture.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
import {videoContent} from '../../src/video-lesson-content.js';
import {videoSceneContent} from '../../src/video-scene-content.js';
const fixture=direction=>({...freshState(),onboarded:true,onboardingLevel:7,courseDirection:direction,koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
async function setup(page,direction,width){
 await page.setViewportSize({width,height:844});await page.addInitScript(s=>{if(!localStorage.getItem('seodang.web-prototype.v1'))localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));window.Audio=class{play(){queueMicrotask(()=>this.onended?.());return Promise.resolve()}pause(){}};},fixture(direction));await useCatalogWithoutPacks(page);
}
async function layout(page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await expect(page.locator('[role="progressbar"]')).toHaveCount(1);
 const boxes=await page.locator('main>.button-pair>button').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));expect(boxes).toHaveLength(2);expect(Math.abs(boxes[0].top-boxes[1].top)).toBeLessThan(2);expect(Math.abs(boxes[0].width-boxes[1].width)).toBeLessThan(2);
 for(const row of await page.locator('main .audio-text-row').all())expect(await row.evaluate(e=>e.querySelector('button').getBoundingClientRect().left>=e.querySelector('p').getBoundingClientRect().right-1)).toBe(true);
}
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`level five common layout ${direction} ${width}`,async({page},info)=>{
 test.setTimeout(90000);await setup(page,direction,width);await page.goto('/playable.html');const lessons=await collectMapLessons(page);expect(lessons).toHaveLength(17);
 for(const l of lessons.filter(l=>!['video','song'].includes(l.kind))){
  await openMapLesson(page,{kind:l.kind,id:l.id});const main=page.locator('main');await expect(main).toHaveClass(/level-five-lesson/);
  await expect(main.locator(`:scope>[data-action="${l.kind}-next"]`)).toHaveText(direction==='ko-ja'?'학습 시작하기':'学習を始める');
  await page.waitForTimeout(470);await main.locator(`:scope>[data-action="${l.kind}-next"]`).click();await layout(page);
  if(l.kind!=='expert')await expect(main.locator('.button-pair').last().locator('button').last()).toHaveText(direction==='ko-ja'?'연습하기':'練習する');
  if([1,7,8,13].includes(l.number))await page.screenshot({path:`output/level-five-${direction}-${l.number}-learn-${width}-${info.project.name}.png`,fullPage:true});
  await page.waitForTimeout(470);await main.locator('.button-pair').last().locator('button').last().click();await layout(page);
  await page.locator('.app-header [data-action="home"]').click();
 }
});
for(const width of [320,390])test(`Misaeng two scenes through completion ${width}`,async({page},info)=>{
 await setup(page,'ja-ko',width);await page.route('https://www.youtube.com/embed/**',r=>r.fulfill({contentType:'text/html',body:'<body>Official player fixture</body>'}));await page.goto('/playable.html');await openMapLesson(page,{kind:'video',id:'misaeng'});
 for(let index=0;index<2;index++){
  const x=videoContent.misaeng[index];await expect(page.locator('.video-phase-watch')).toBeVisible();await expect(page.locator('.video-dialogue blockquote')).toHaveText(x.quote);await layout(page);
  const src=new URL(await page.locator('iframe.lesson-youtube').getAttribute('src'));expect(src.searchParams.get('start')).toBe(String(x.startSeconds));expect(src.searchParams.get('end')).toBe(String(x.endSeconds));expect(src.searchParams.get('cc_load_policy')).toBe('0');
  if(index){await page.reload();await openMapLesson(page,{kind:'video',id:'misaeng'});await expect(page.locator('.video-dialogue blockquote')).toHaveText(x.quote);}
  await page.locator('[data-action="video-next"]').click();
  for(const phase of ['meaning','use']){
   await expect(page.locator(`.video-phase-${phase}`)).toBeVisible();await page.locator(`[data-action="video-select"][data-id="${videoSceneContent.misaeng[index][phase].answer}"]`).click();await page.locator('[data-action="video-check"]').click();await expect(page.locator('.video-scene-feedback.success')).toBeVisible();await layout(page);
   await page.screenshot({path:`output/level-five-misaeng-${index}-${phase}-${width}-${info.project.name}.png`,fullPage:true});await page.locator('[data-action="video-next"]').click();if(phase==='meaning')await page.locator('[data-action="video-next"]').click();
  }
 }
 await expect(page.locator('.practice-complete')).toBeVisible();await expect(page.locator('.practice-complete [data-action="home"]')).toBeVisible();await expect(page.locator('[data-action="completed-next"]')).toBeVisible();
});
for(const sound of [true,false])test(`Misaeng native mounts each clip and completes once sound=${sound}`,async({page})=>{
 const s=fixture('ja-ko');s.settings.sound=sound;await page.setViewportSize({width:320,height:844});await page.addInitScript(s=>{
  localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));window.calls=[];window.cues={haptics:0,tones:0};
  window.Capacitor={getPlatform:()=> 'ios',isNativePlatform:()=>true,isPluginAvailable:n=>n==='SeodangVideo',nativePromise:async(plugin,method,args)=>{if(plugin==='SeodangVideo')window.calls.push({method,args});if(plugin==='SeodangUI'&&method==='correctAnswer')window.cues.haptics++;return {};}};
  window.AudioContext=class{state='running';currentTime=0;destination={};createOscillator(){window.cues.tones++;return {frequency:{},connect(){},start(){},stop(){}};}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}close(){return Promise.resolve();}};
 },s);await useCatalogWithoutPacks(page);await page.goto('/playable.html');await openMapLesson(page,{kind:'video',id:'misaeng'});
 for(let i=0;i<2;i++){
  const x=videoContent.misaeng[i];await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.method==='mount').at(-1)?.args.startSeconds)).toBe(x.startSeconds);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.method==='mount').at(-1).args.endSeconds)).toBe(x.endSeconds);await page.locator('[data-action="video-next"]').click();await expect.poll(()=>page.evaluate(()=>window.calls.at(-1).method)).toBe('remove');
  for(const phase of ['meaning','use']){await page.locator(`[data-action="video-select"][data-id="${videoSceneContent.misaeng[i][phase].answer}"]`).click();await page.locator('[data-action="video-check"]').click();await page.locator('[data-action="video-next"]').click();if(phase==='meaning')await page.locator('[data-action="video-next"]').click();}
  if(i===0){await expect(page.locator('.practice-complete')).toHaveCount(0);expect(await page.evaluate(()=>window.cues)).toEqual({haptics:2,tones:sound?4:0});}
 }
 await expect(page.locator('.practice-complete')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.cues)).toEqual({haptics:4,tones:sound?14:0});await expect.poll(()=>page.evaluate(()=>window.calls.at(-1).method)).toBe('remove');
});
