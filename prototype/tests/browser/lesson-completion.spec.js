import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {valid} from '../../src/storage.js';
import {freshScenario,scenarioLessons} from '../../src/scenario-state.js';
import {prepareCourseExpansion} from '../../src/course-expansion-content.js';
import {freshDialogue} from '../../src/dialogue-state.js';
import {freshKoreanProgress} from '../../src/korean-state.js';
import {freshVideo,videoLessons} from '../../src/video-lesson-state.js';
import {freshSong,songLessons} from '../../src/song-state.js';
import {caseTasks,prepareContent,practiceKey} from '../../src/practice-content.js';
import {casePracticeVersion} from '../../src/practice-state.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
import {openMapLesson} from './learning-map-fixture.js';
const key='seodang.web-prototype.v1';
const initial=(direction,level)=>({...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:direction,onboardingLevel:level,settings:{sound:true,motion:'off',textScale:1.2,audioRate:1}});
async function setup(page,s,kind,id){
 expect(valid(s)).toBe(true);await page.setViewportSize({width:320,height:700});
 await page.addInitScript(({key,s})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(s));
  localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
  window.cues={tones:0,closed:0};
  window.Audio=class{play(){queueMicrotask(()=>this.onended?.());return Promise.resolve();}pause(){}};
  window.AudioContext=class{state='running';currentTime=0;destination={};createOscillator(){window.cues.tones++;return{frequency:{},connect(){},start(){},stop(){}};}createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}close(){window.cues.closed++;return Promise.resolve();}};
 },{key,s});
 await useCatalogWithoutPacks(page);await page.route('https://www.youtube.com/embed/**',r=>r.fulfill({body:'player fixture'}));
 await page.goto('/playable.html');await openMapLesson(page,{kind,id});
 if(!['video','song'].includes(kind))await page.locator('[data-choice="resume"]').click();
}
const tones=page=>page.evaluate(()=>window.cues.tones);
async function completed(page,before,sound=true,home=false){
 await expect(page.locator('.practice-complete')).toBeVisible();await expect(page.locator('.lesson-complete-shell')).toHaveCount(1);
 expect(await tones(page)).toBe(before+(sound?6:0));
 await expect(page.locator('[data-action="completed-next"]')).toBeVisible();
 const buttons=page.locator('.practice-complete .button-pair>button');await expect(buttons).toHaveCount(2);
 await expect(buttons.first()).toHaveAttribute('data-action','home');await expect(buttons.last()).toHaveAttribute('data-action','completed-next');
 const boxes=await buttons.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));expect(boxes[0].x).toBeLessThan(boxes[1].x);expect(Math.abs(boxes[0].top-boxes[1].top)).toBeLessThan(1);expect(Math.abs(boxes[0].width-boxes[1].width)).toBeLessThan(1);
 if(home){
  await page.screenshot({path:`output/completion-home-${test.info().title.includes('ja-ko')?'ja-ko':'ko-ja'}-${test.info().project.name}.png`});
  await page.setViewportSize({width:390,height:844});const wide=await buttons.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));expect(Math.abs(wide[0].top-wide[1].top)).toBeLessThan(1);expect(Math.abs(wide[0].width-wide[1].width)).toBeLessThan(1);expect(wide[1].right).toBeLessThanOrEqual(390);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 // Settings forces a render of the same completion state; it must not replay.
 await page.locator('[data-action="settings"]').click();await page.locator('[data-setting="motion"]').selectOption('system');await page.keyboard.press('Escape');
 expect(await tones(page)).toBe(before+(sound?6:0));
 await page.locator(home?'.practice-complete [data-action="home"]':'[data-action="completed-next"]').click();await expect(page.locator('.practice-complete')).toHaveCount(0);if(home)await expect(page.locator('.learning-map')).toBeVisible();
 expect(await tones(page)).toBe(before+(sound?6:0));
}
for(const direction of ['ko-ja','ja-ko'])test(`level 3 review completion ${direction}`,async({page})=>{
 const s=initial(direction,4),kind=direction==='ko-ja'?'dialogue':'korean',id=direction==='ko-ja'?undefined:'4-1';
 if(kind==='dialogue')s.dialogue={...freshDialogue(),started:true,phase:'practice',index:2,selected:0,learned:[0,1,2]};
 else s.korean={version:4,active:id,lessons:{[id]:{...freshKoreanProgress(id),started:true,phase:'quiz',index:5,selected:2,caseSeen:true}}};
 await prepareContent(kind);const tasks=caseTasks(s,kind),pk=practiceKey(s,kind);
 s.practices={[pk]:{version:1,caseVersion:casePracticeVersion(pk),count:tasks.length,index:tasks.length-1,round:0,mode:0,action:{type:kind==='dialogue'?'dialogue-check':'korean-check'}}};
 await setup(page,s,kind,id);expect(await tones(page)).toBe(0);
 await page.locator(`[data-case-choice="${tasks.at(-1).answer}"]`).click();await page.locator('[data-case-confirm]').click();
 const before=await tones(page);expect(before).toBe(2);await page.locator('[data-case-confirm]').click();await completed(page,before);
});
for(const direction of ['ko-ja','ja-ko'])for(const family of ['expert','legacy','scene','detective','song'])test(`shared completion ${direction}/${family}`,async({page})=>{
 const s=initial(direction,family==='legacy'?4:family==='scene'?5:7);let kind,id;
 if(family==='expert'){
  kind='expert';id=1;s.expertActive=id;s.experts={[`${direction}:expert:${id}`]:{discussionVersion:2,part:0,phase:'reflection',index:0,sentence:0,selected:null,retry:false,checked:false,attempts:0,started:true,completed:true,solved:[]}};
 }else if(family==='song'){
  kind='song';const l=songLessons.find(l=>l.direction===direction&&l.level===7&&l.number===5);id=l.id;s.songActive=id;s.songs={[id]:{...freshSong(l.revision,id),started:true,phase:'encore'}};
 }else{
  kind='video';const l=videoLessons.find(l=>l.direction===direction&&l.level===s.onboardingLevel&&(family==='legacy'?!l.mode:l.mode===family));id=l.id;
  s.videoActive=id;s.videoLessons={[id]:{...freshVideo(l.revision??1,l.mode),started:true,index:l.count-1,phase:family==='scene'?'use':'learn',...(family==='scene'?{selected:l.answers[1],checked:true}:{})}};
 }
 await setup(page,s,kind,id);expect(await tones(page)).toBe(0);await page.locator(`[data-action="${kind}-next"]`).click();await completed(page,0,true,family==='expert');
});
test('sound off also mutes expert completion',async({page})=>{
 const s=initial('ko-ja',7);s.settings.sound=false;s.expertActive=1;s.experts={'ko-ja:expert:1':{discussionVersion:2,part:0,phase:'reflection',index:0,sentence:0,selected:null,retry:false,checked:false,attempts:0,started:true,completed:false,solved:[]}};
 await setup(page,s,'expert',1);await page.locator('[data-action="expert-next"]').click();await completed(page,0,false);
});

for(const direction of ['ko-ja','ja-ko'])for(const id of ['8','course4-13','course5-13'])test(`scenario completion ${direction}/${id}`,async({page})=>{
 const l=scenarioLessons.find(l=>l.id===id),s=initial(direction,l.level),pk=`${direction}:scenario:${id}`;
 s.scenarioActive=id;s.scenarios={[pk]:{...freshScenario(id),started:true,phase:'quiz',index:2,selected:l.answers?.[2]??2,checked:true}};
 let last;
 if(id.startsWith('course')){
  await prepareCourseExpansion(id);await prepareContent('scenario');const tasks=caseTasks(s,'scenario');last=tasks.at(-1);
  s.practices={[pk]:{version:1,caseVersion:casePracticeVersion(pk),count:tasks.length,index:tasks.length-1,round:0,mode:0,action:{type:'scenario-next'}}};
 }
 await setup(page,s,'scenario',id);let before=0;
 if(last){await page.locator(`[data-review-choice="${last.answer}"]`).click();await page.locator('[data-review-confirm]').click();before=await tones(page);await page.locator('[data-review-confirm]').click();}
 else await page.locator('[data-action="scenario-next"]').click();
 await completed(page,before);
});

test('completion home stays disabled while the next lesson loads',async({page})=>{
 const s=initial('ja-ko',7);s.expertActive=1;s.experts={'ja-ko:expert:1':{discussionVersion:2,part:0,phase:'reflection',index:0,sentence:0,selected:null,retry:false,checked:false,attempts:0,started:true,completed:false,solved:[]}};
 let release;const gate=new Promise(resolve=>{release=resolve;});
 await page.route('**/src/video-lesson.js',async route=>{await gate;await route.continue();});
 await setup(page,s,'expert',1);await page.locator('[data-action="expert-next"]').click();await expect(page.locator('.practice-complete')).toBeVisible();
 try{
  await page.locator('[data-action="completed-next"]').click();
  await expect(page.locator('.practice-complete [data-action="home"]')).toBeDisabled();
  await expect(page.locator('.app-header [data-action="home"]')).toBeDisabled();
  await expect(page.locator('[data-action="completed-next"]')).toBeDisabled();
 }finally{release();}
 await expect(page.locator('.view-video')).toBeVisible();
});
