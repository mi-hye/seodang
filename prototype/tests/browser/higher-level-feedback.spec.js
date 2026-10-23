import {test,expect} from '@playwright/test';
import {valid} from '../../src/storage.js';
import {freshState} from '../../src/engine.js';
import {freshScenario,scenarioLessons} from '../../src/scenario-state.js';
import {freshDialogue} from '../../src/dialogue-state.js';
import {freshReading,readingAnswers} from '../../src/reading-state.js';
import {freshKoreanProgress} from '../../src/korean-state.js';
import {freshVideo} from '../../src/video-lesson-state.js';
import {openMapLesson} from './learning-map-fixture.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
const key='seodang.web-prototype.v1';
const state=(direction,level)=>({...freshState(),onboarded:true,courseDirection:direction,onboardingLevel:level,koreanGuideSeenVersion:1,settings:{sound:true,motion:'system',textScale:1.2,audioRate:1}});
async function setup(page,s,{width=320,reduced=false}={}){
 expect(valid(s)).toBe(true);await page.setViewportSize({width,height:700});await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
 await page.addInitScript(({s,key})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(s));
  localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
  window.cues={haptics:0,tones:0,closed:0};
  window.Capacitor={getPlatform:()=> 'ios',isNativePlatform:()=>true,isPluginAvailable:()=>false,nativePromise:async(plugin,method)=>{if(plugin==='SeodangUI'&&method==='correctAnswer')window.cues.haptics++;return {};}};
  window.Audio=class{constructor(src){this.src=src;}play(){queueMicrotask(()=>this.onended?.());return Promise.resolve();}pause(){}};
  window.AudioContext=class{state='running';currentTime=0;destination={};createOscillator(){window.cues.tones++;return {frequency:{},connect(){},start(){},stop(){}};}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}close(){window.cues.closed++;return Promise.resolve();}};
 },{s,key});
 await useCatalogWithoutPacks(page);await page.route('https://www.youtube.com/embed/**',r=>r.fulfill({body:'player fixture'}));await page.goto('/playable.html');
}
const cues=page=>page.evaluate(()=>window.cues);
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
async function resume(page,kind,id){await openMapLesson(page,{kind,id});const prompt=page.locator('[data-choice="resume"]');if(kind!=='video')await prompt.click();}
async function layout(page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const mark=page.locator('.review-correct-mark');await expect(mark).toHaveCount(1);expect(await mark.evaluate(e=>parseFloat(getComputedStyle(e).width))).toBe(26);
 const buttons=page.locator('main>.button-pair>button');if(await buttons.count()===2){const boxes=await buttons.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));expect(Math.abs(boxes[0].top-boxes[1].top)).toBeLessThan(2);}
}
for(const direction of ['ko-ja','ja-ko'])for(const id of ['3','4','6','8','10','11','12','course3-8','course4-8','course5-11'])test(`higher scenario correct cue ${direction}/${id}`,async({page})=>{
 const l=scenarioLessons.find(l=>l.id===id),s=state(direction,l.level),sk=`${direction}:scenario:${id}`;s.scenarioActive=id;s.scenarios={[sk]:{...freshScenario(id),started:true,phase:'quiz'}};
 await setup(page,s);await resume(page,'scenario',id);
 const choice=(answer)=>page.locator(`[data-action="scenario-select"][data-id="${answer}"]`).click();
 if(id==='12'){for(const n of [2,1,0])await page.locator(`.token-builder-choices [data-id="${n}"]`).click();}
 else await choice(((l.answers?.[0]??0)+1)%3);
 await page.locator('[data-action="scenario-check"]').click();expect((await cues(page)).haptics).toBe(0);
 if(id==='12'){await page.locator('[data-action="scenario-clear"]').click();for(const n of [0,1,2])await page.locator(`.token-builder-choices [data-id="${n}"]`).click();}
 else await choice(l.answers?.[0]??0);
 await page.locator('[data-action="scenario-check"]').click();await layout(page);expect(await cues(page)).toMatchObject({haptics:1,tones:2});
 if(id==='8'||id==='11')await page.screenshot({path:`output/correct-${direction}-${id}-${test.info().project.name}.png`,fullPage:true});
 expect((await saved(page)).scenarios[sk].checked).toBe(true);
 // No duplicate sound from revisiting the same checked state.
 await page.reload();await resume(page,'scenario',id);expect(await cues(page)).toMatchObject({haptics:0,tones:0});
});
for(const target of [{kind:'dialogue',level:4},{kind:'reading',level:5,id:5},{kind:'reading',level:6,id:6},{kind:'korean',level:4,id:'4-1'},{kind:'korean',level:5,id:'5-1'},{kind:'korean',level:5,id:'6-1'}])test(`legacy correct acknowledgement ${target.kind}/${target.id??0}`,async({page})=>{
 const {kind,id,level}=target,s=state(kind==='korean'?'ja-ko':'ko-ja',level);
 if(kind==='dialogue')s.dialogue={...freshDialogue(),started:true,phase:'practice',learned:[0,1,2]};
 if(kind==='reading')s.readings={[level]:{...freshReading(),started:true,phase:'read'}};
 if(kind==='korean')s.korean={version:4,active:id,lessons:{[id]:{...freshKoreanProgress(id),started:true,phase:'quiz',caseSeen:true}}};
 await setup(page,s);await resume(page,kind,id);
 const answer=kind==='reading'?readingAnswers[level][0]:0;
 await page.locator(`[data-action="${kind}-select"][data-id="${(answer+1)%3}"]`).click();await page.locator(`[data-action="${kind}-check"]`).click();expect((await cues(page)).haptics).toBe(0);
 await page.locator(`[data-action="${kind}-select"][data-id="${answer}"]`).click();await page.locator(`[data-action="${kind}-check"]`).click();await layout(page);expect(await cues(page)).toMatchObject({haptics:1,tones:2});
 const progress=s=>kind==='dialogue'?s.dialogue:kind==='reading'?s.readings[level]:s.korean.lessons[id];expect(progress(await saved(page)).index).toBe(0);
 await expect(page.locator(`[data-action="${kind}-select"]`).first()).toBeDisabled();
 await page.locator(`[data-action="${kind}-check"]`).click();expect(progress(await saved(page)).index).toBe(1);expect((await cues(page)).haptics).toBe(1);
});
for(const reduced of [false,true])test(`detective correct effect settings reduced=${reduced}`,async({page})=>{
 const s=state('ko-ja',7),id='frieren-subtext';s.settings.sound=!reduced;s.videoActive=id;s.videoLessons={[id]:{...freshVideo(2,'detective'),started:true,phase:'infer'}};
 await setup(page,s,{width:390,reduced});await resume(page,'video',id);
 await page.locator('[data-action="video-select"][data-id="1"]').click();await page.locator('[data-action="video-check"]').click();await layout(page);
 expect(await cues(page)).toMatchObject({haptics:1,tones:reduced?0:2});await expect(page.locator('.review-correct-motion')).toHaveCount(reduced?0:1);
 await page.locator('[data-action="video-replay"]').click();await page.locator('[data-action="video-next"]').click();expect((await cues(page)).haptics).toBe(1);
});
test('legacy case review has one correct cue and keeps next progression',async({page})=>{
 const s=state('ko-ja',4);s.dialogue={...freshDialogue(),started:true,phase:'practice',index:2,selected:0,learned:[0,1,2]};s.practices={'ko-ja:dialogue:0':{version:1,caseVersion:1,round:0,mode:0,index:0,count:3,action:{type:'dialogue-check'}}};
 await setup(page,s);await resume(page,'dialogue');for(const i of [0,1,2])await page.locator(`[data-case-token="${i}"]`).click();await page.locator('[data-case-confirm]').click();await layout(page);expect(await cues(page)).toMatchObject({haptics:1,tones:2});await page.locator('[data-case-confirm]').click();expect((await saved(page)).practices['ko-ja:dialogue:0'].index).toBe(1);expect((await cues(page)).haptics).toBe(1);
});

test('last dialogue answer enters review only after Next and completes once',async({page})=>{
 const s=state('ko-ja',4);s.dialogue={...freshDialogue(),started:true,phase:'practice',index:2,learned:[0,1,2]};
 await setup(page,s);await resume(page,'dialogue');await page.locator('[data-action="dialogue-select"][data-id="0"]').click();await page.locator('[data-action="dialogue-check"]').click();
 expect((await saved(page)).practices?.['ko-ja:dialogue:0']).toBeUndefined();expect((await saved(page)).dialogue.completed).toBe(false);
 await page.locator('[data-action="dialogue-check"]').click();await expect(page.locator('.case-practice')).toBeVisible();expect((await saved(page)).practices['ko-ja:dialogue:0'].index).toBe(0);
 for(let index=0;index<3;index++){
  if(index===0)for(const token of [0,1,2])await page.locator(`[data-case-token="${token}"]`).click();else await page.locator(`[data-case-choice="${index}"]`).click();
  await page.locator('[data-case-confirm]').click();expect((await cues(page)).haptics).toBe(index+2);await page.locator('[data-case-confirm]').click();
 }
 await expect(page.locator('.practice-complete')).toBeVisible();expect((await saved(page)).dialogue.completed).toBe(true);expect((await saved(page)).practices['ko-ja:dialogue:0']).toBeUndefined();
});

test('leaving a correct acknowledgement cancels it and motion/sound settings are respected',async({page})=>{
 const s=state('ko-ja',4);s.settings.sound=false;s.settings.motion='off';s.dialogue={...freshDialogue(),started:true,phase:'practice',learned:[0,1,2]};
 await setup(page,s,{width:390});await resume(page,'dialogue');await page.locator('[data-action="dialogue-select"][data-id="0"]').click();await page.locator('[data-action="dialogue-check"]').click();
 await expect(page.locator('.review-correct-motion')).toHaveCount(0);expect(await cues(page)).toMatchObject({haptics:1,tones:0});
 await page.locator('.app-header [data-action="home"]').click();await expect(page.locator('.learning-map')).toBeVisible();expect((await saved(page)).dialogue.index).toBe(0);
 await resume(page,'dialogue');await expect(page.locator('.review-correct-mark')).toHaveCount(0);await page.locator('[data-action="dialogue-check"]').click();expect((await cues(page)).haptics).toBe(2);
 await page.locator('[data-action="dialogue-check"]').click();expect((await saved(page)).dialogue.index).toBe(1);
});


test('correct acknowledgement survives replay, audio failure and settings without repeating effects',async({page})=>{
 const s=state('ko-ja',4);s.settings.sound=false;s.dialogue={...freshDialogue(),started:true,phase:'practice',learned:[0,1,2]};
 await setup(page,s);await resume(page,'dialogue');await page.locator('[data-action="dialogue-select"][data-id="0"]').click();await page.locator('[data-action="dialogue-check"]').click();
 const next=()=>page.locator('[data-action="dialogue-check"]');
 await page.locator('[data-action="dialogue-audio"]').click();await expect(next()).toHaveText('다음');await layout(page);expect(await cues(page)).toMatchObject({haptics:1,tones:0});
 await page.evaluate(()=>{window.Audio.prototype.play=function(){return Promise.reject(new Error('audio fixture failure'));};});
 await page.locator('[data-action="dialogue-audio"]').click();await expect(page.locator('.toast')).toBeVisible();await expect(next()).toHaveText('다음');await layout(page);expect(await cues(page)).toMatchObject({haptics:1,tones:0});
 await page.locator('[data-action="settings"]').click();await page.locator('[data-setting="motion"]').selectOption('off');await page.keyboard.press('Escape');await expect(page.locator('#panel')).not.toBeVisible();
 await expect(next()).toHaveText('다음');await expect(page.locator('.review-correct-motion')).toHaveCount(0);expect(await cues(page)).toMatchObject({haptics:1,tones:0});
 await next().click();expect((await saved(page)).dialogue.index).toBe(1);expect((await cues(page)).haptics).toBe(1);
});
