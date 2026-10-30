import {findMapLesson,openMapLesson,collectMapLessons} from './learning-map-fixture.js';
import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {songLessons,freshSong} from '../../src/song-state.js';
import {songContent} from '../../src/song-lesson-content.js';

const storageKey='seodang.web-prototype.v1';
const fixture=(l,sound=false)=>({...freshState(),onboarded:true,onboardingLevel:l.level,courseDirection:l.direction,koreanGuideSeenVersion:1,settings:{sound,motion:'off',textScale:1.2,audioRate:1}});
const enter=(page,id)=>openMapLesson(page,{kind:'song',id:id});
const select=(page,id)=>page.locator(`[data-action="song-select"][data-id="${id}"]`).click();
const next=page=>page.locator('[data-action="song-next"]').click();
const check=page=>page.locator('[data-action="song-check"]').click();

async function buildMode(page,preview){
 // The local server itself serves developmentMode=true, so pin both test modes.
 await page.route('**/src/build-config.js',async route=>{
  const response=await route.fetch(),source=await response.text();
  await route.fulfill({response,body:source.replace(/export const developmentMode\s*=\s*(?:false|true)/,`export const developmentMode = ${preview}`)});
 });
}
async function setup(page,lesson,{preview=true,sound=false,native=false}={}){
 await buildMode(page,preview);
 await page.addInitScript(({state,native})=>{
  if(!localStorage.getItem('seodang.web-prototype.v1'))localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(state));
  localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
  if(!native)return;
  window.songVideoCalls=[];window.songCues={haptics:0,tones:0,closed:0};
  window.Capacitor={getPlatform:()=> 'ios',isNativePlatform:()=>true,isPluginAvailable:name=>name==='SeodangVideo',nativePromise:async(plugin,method,args)=>{
   if(plugin==='SeodangVideo')window.songVideoCalls.push({method,args});
   if(plugin==='SeodangUI'&&method==='correctAnswer')window.songCues.haptics++;
   return {};
  }};
  window.AudioContext=class{state='running';currentTime=0;destination={};createOscillator(){window.songCues.tones++;return {frequency:{},connect(){},start(){},stop(){}};}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}close(){window.songCues.closed++;return Promise.resolve();}};
 },{state:fixture(lesson,sound),native});
 // This fixture verifies embed parameters and app behavior, not actual YouTube playback.
 await page.route('https://www.youtube.com/embed/**',route=>route.fulfill({contentType:'text/html',body:'<body style="background:#111;color:#fff">Official player fixture</body>'}));
}

async function layout(page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const buttons=await page.locator('.song-lesson>.button-pair>button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,width:r.width,height:r.height};}));
 expect(buttons).toHaveLength(2);
 expect(Math.abs(buttons[0].top-buttons[1].top)).toBeLessThan(2);
 expect(Math.abs(buttons[0].width-buttons[1].width)).toBeLessThan(2);
 expect(Math.min(...buttons.map(b=>b.height))).toBeGreaterThanOrEqual(44);
 await expect(page.locator('[role="progressbar"]')).toHaveCount(1);
 await expect(page.locator('.review-phase-progress,.practice-rounds')).toHaveCount(0);
}

for(const [index,lesson]of songLessons.entries())for(const width of (lesson.number===15||lesson.learnFirst)?[320,390]:[index%2?390:320])test(`song ${lesson.id} ${width}px: preview map, full lesson, saved replay and review record`,async({page})=>{
 const c=songContent[lesson.id],key=`${lesson.direction}:song:${lesson.id}`,errors=[],learnsFirst=(lesson.number===15||lesson.learnFirst);
 page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:844});
 await setup(page,lesson);
 await page.goto('/playable.html');
 expect(await collectMapLessons(page)).toHaveLength(20);
 expect((await collectMapLessons(page))[lesson.number-1]).toMatchObject({kind:'song',id:lesson.id,number:lesson.number});
 expect((await collectMapLessons(page)).filter(l=>l.kind==='video').map(l=>l.number)).toEqual([3,6,9,12,18]);
 expect((await collectMapLessons(page)).filter(l=>l.kind==='song').map(l=>l.number)).toEqual([5,10,15,20]);
 await enter(page,lesson.id);
 await expect(page.locator('.app-header-title')).toContainText(`${lesson.number}.`);
 await expect(page.locator('.song-lesson')).toHaveAttribute('lang',lesson.direction==='ko-ja'?'ko':'ja');
 await expect(page.locator('.song-phase-listen')).toBeVisible();
 await expect(page.locator('.song-track')).toContainText(c.artist);
 await expect(page.locator('.song-track')).not.toContainText(c.work);
 await layout(page);
 const src=new URL(await page.locator('iframe.lesson-youtube').getAttribute('src'));
 expect(src.pathname).toBe(`/embed/${c.videoId}`);
 expect(src.searchParams.get('start')).toBe(String(c.startSeconds));
 expect(src.searchParams.get('end')).toBe(String(c.endSeconds));
 expect(src.searchParams.get('cc_load_policy')).toBe('0');
 await expect(page.locator('.video-source')).toBeHidden();
 await page.locator('.video-support summary').click();
 await expect(page.locator('.video-original')).toHaveAttribute('href',`https://www.youtube.com/watch?v=${c.videoId}&t=${c.startSeconds}s`);
 await page.locator('.video-support summary').click();
 await page.screenshot({path:`output/song-${lesson.id}-listen-${test.info().project.name}.png`,fullPage:true});
 const learning=async()=>{
  await expect(page.locator('.song-phase-learn')).toBeVisible();
  await expect(page.locator('.song-target')).toHaveText(c.target);
  await expect(page.locator('.song-meaning')).toHaveText(c.meaning);
  await expect(page.locator('.song-expression + p')).toHaveText(c.usage);
  await expect(page.locator('.song-choices,.video-example,iframe.lesson-youtube')).toHaveCount(0);
  await layout(page);
 };
 await next(page);
 if(learnsFirst){
  await learning();
  const progress=await page.locator('[role="progressbar"]').getAttribute('aria-valuenow');
  await page.locator('[data-action="song-replay"]').click();
  await expect(page.locator('.song-phase-listen')).toBeVisible();
  await expect(page.locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow',progress);
  await page.reload();await enter(page,lesson.id);await next(page);await learning();
  await page.screenshot({path:`output/song-${lesson.id}-learn-first-${width}-${test.info().project.name}.png`,fullPage:true});
  await next(page);
 }
 for(const [stage,phase]of ['gap','apply'].entries()){
  const answer=lesson.answers[stage],wrong=(answer+1)%3;
  await expect(page.locator(`.song-phase-${phase}`)).toBeVisible();
  if(phase==='gap'&&learnsFirst){
   await page.locator('[data-action="song-previous"]').click();await learning();await next(page);
   await expect(page.locator('.song-phase-gap')).toBeVisible();
  }
  await expect(page.locator('.song-choices>button')).toHaveCount(3);
  await expect(page.locator('[data-action="song-check"]')).toBeDisabled();
  await expect(page.locator('iframe.lesson-youtube')).toHaveCount(0);
  await layout(page);
  await select(page,wrong);await check(page);
  await expect(page.locator('.song-feedback')).toBeVisible();
  await expect(page.locator('.song-feedback.success')).toHaveCount(0);
  await expect(page.locator('[data-action="song-next"]')).toHaveCount(0);
  await expect(page.locator('.review-correct-mark')).toHaveCount(0);
  await page.reload();await enter(page,lesson.id);
  await expect(page.locator(`[data-action="song-select"][data-id="${wrong}"]`)).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.song-feedback')).toBeVisible();
  if(phase==='apply'){
   const progress=await page.locator('[role="progressbar"]').getAttribute('aria-valuenow');
   await page.locator('[data-action="song-replay"]').click();
   await expect(page.locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow',progress);
   await page.reload();await enter(page,lesson.id);await next(page);
   await expect(page.locator('.song-phase-apply')).toBeVisible();
   await expect(page.locator(`[data-action="song-select"][data-id="${wrong}"]`)).toHaveAttribute('aria-pressed','true');
   await expect(page.locator('.song-feedback')).toBeVisible();
  }
  await select(page,answer);await check(page);
  await expect(page.locator('.song-feedback.success')).toBeInViewport();
  await expect(page.locator('.review-correct-mark')).toBeVisible();
  await expect(page.locator('.song-choices>button').first()).toBeDisabled();
   if(phase==='apply'&&c.apply.optionParts){
    const flow=await page.locator('.song-choices>button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect(),css=getComputedStyle(e),first=e.querySelector('.text-phrase')?.getBoundingClientRect();return {display:css.display,left:first?Math.abs(first.left-r.left-parseFloat(css.paddingLeft)-parseFloat(css.borderLeftWidth)):0};}));
    expect(flow.every(x=>x.display==='block'&&x.left<2)).toBe(true);
   }
  await expect(page.locator('.song-choices>button.correct')).toHaveCount(1);
  if(phase==='apply'){
   await expect(page.locator('.song-feedback')).toContainText(c.apply.explanation);
   await expect(page.locator('.video-example')).toContainText(c.example);
  }
  await layout(page);
  if(phase==='gap'){
   const progress=await page.locator('[role="progressbar"]').getAttribute('aria-valuenow');
   await page.locator('[data-action="song-replay"]').click();
   await expect(page.locator('.song-phase-listen')).toBeVisible();
   await expect(page.locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow',progress);
   await page.reload();await enter(page,lesson.id);await next(page);
   await expect(page.locator('.song-phase-gap')).toBeVisible();
   await expect(page.locator(`[data-action="song-select"][data-id="${answer}"]`)).toHaveClass(/correct/);
   await expect(page.locator('.song-choices>button').first()).toBeDisabled();
  }else await expect(page.locator('[data-action="song-replay"]')).toHaveCount(0);
  await page.screenshot({path:`output/song-${lesson.id}-${phase}-${test.info().project.name}.png`,fullPage:true});
  await next(page);
  if(phase==='gap'&&!learnsFirst){
   await learning();
   await page.screenshot({path:`output/song-${lesson.id}-learn-${test.info().project.name}.png`,fullPage:true});
   await next(page);
  }
 }
 await expect(page.locator('.song-phase-encore')).toBeVisible();
 await expect(page.locator('.song-target')).toHaveText(c.target);
 await expect(page.locator('iframe.lesson-youtube')).toHaveCount(1);
 await layout(page);await next(page);
 await expect(page.locator('.practice-complete h1')).toHaveText(lesson.direction==='ja-ko'?'学習が完了しました':'학습을 완료하셨습니다');
 await expect(page.locator('.practice-fireworks svg')).toBeVisible();
 await expect(page.locator('.lesson-youtube')).toHaveCount(0);
 await expect(page.locator('[data-action="completed-next"]')).toBeInViewport();
 const centered=await page.locator('.practice-complete').evaluate(el=>{const r=el.getBoundingClientRect(),css=getComputedStyle(el),paw=el.querySelector('.practice-fireworks>span').getBoundingClientRect(),button=el.querySelector('button').getBoundingClientRect();return Math.abs((paw.top+button.bottom)/2-(r.top+parseFloat(css.paddingTop)+r.bottom-parseFloat(css.paddingBottom))/2);});
 expect(centered).toBeLessThan(2);
 const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
 expect(stored.songs[lesson.id]).toMatchObject({version:1,phase:'done',completed:true});
 expect(stored.studyTools[lesson.direction].lessons[key].completedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
 const history=lesson.direction==='ko-ja'?stored.history:stored.korean.history;
 expect(Object.values(history.days).reduce((n,d)=>n+d.cases,0)).toBe(1);
 await expect(page.locator('[data-action="completed-next"]')).toHaveText(lesson.number===20&&lesson.level===7?(lesson.direction==='ja-ko'?'学習ホームへ':'학습 홈으로'):(lesson.direction==='ja-ko'?'次のレッスン':'다음 수업'));
 await page.locator('[data-action="completed-next"]').click();
 await expect(page.locator('.practice-complete')).toHaveCount(0);
 if(lesson.number===20&&lesson.level===7)await expect(page.locator('.view-home')).toBeVisible();else await page.locator('[data-action="home"]').first().click();
 if(lesson.number===20){
  const expected={2:4,4:5,5:7,7:7}[lesson.level];
  expect((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey)).onboardingLevel).toBe(expected);
  await page.evaluate(({storageKey,level})=>{const s=JSON.parse(localStorage.getItem(storageKey));s.onboardingLevel=level;localStorage.setItem(storageKey,JSON.stringify(s));},{storageKey,level:lesson.level});await page.reload();
 }
 await expect(await findMapLesson(page,{kind:'song',id:lesson.id})).toHaveAttribute('aria-label',new RegExp(lesson.direction==='ja-ko'?'完了':'완료'));
 await page.locator('[data-action="my"]').first().click();
 await expect(page.locator('.record-overview dd').first()).toHaveText(lesson.direction==='ja-ko'?'1件':'1개');
 // Finish the navigation's lazy import before the fixture forces a reload to age the record.
 await page.evaluate(()=>import('/src/audio-download-ui.js'));
 await page.evaluate(({storageKey,key,direction})=>{const s=JSON.parse(localStorage.getItem(storageKey)),d=new Date();d.setDate(d.getDate()-4);s.studyTools[direction].lessons[key].completedOn=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;localStorage.setItem(storageKey,JSON.stringify(s));},{storageKey,key,direction:lesson.direction});
 await page.reload();await page.locator('[data-action="my"]').first().click();await page.locator('[data-action="study-review"]').click();
 const review=page.locator(`[data-action="study-lesson"][data-id="${key}"]`);
 await expect(review).toBeVisible();await expect(review.locator('..')).toContainText(`${({2:2,4:3,5:4,7:5})[lesson.level]}-${lesson.number}`);
 await review.click();await expect(page.locator('.song-phase-listen')).toBeVisible();
 expect((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey)).songs[lesson.id].completed).toBe(true);
 expect(errors).toEqual([]);
});

for(const direction of ['ko-ja','ja-ko'])test(`production ${direction} retains 16 lessons and hides saved local song previews`,async({page})=>{
 const l=songLessons.find(l=>l.direction===direction),state={...fixture(l),songActive:l.id,songs:{[l.id]:{...freshSong(),started:true,completed:true,phase:'done'}}};
 await page.setViewportSize({width:390,height:844});
 await buildMode(page,false);
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},state);
 await page.goto('/playable.html');
 expect(await collectMapLessons(page)).toHaveLength(16);
 expect((await collectMapLessons(page)).filter(l=>l.kind==='song')).toHaveLength(0);
 await expect(page.locator('.storage-warning')).toHaveCount(0);
 expect((await collectMapLessons(page)).filter(l=>l.kind==='video').map(l=>l.number)).toEqual([3,6,9,12,15]);
});

for(const direction of ['ko-ja','ja-ko'])for(const sound of [true,false])test(`song native lifecycle and one-time feedback ${direction} sound=${sound}`,async({page})=>{
 const l=songLessons.find(l=>l.direction===direction),c=songContent[l.id];
 await page.setViewportSize({width:320,height:844});await setup(page,l,{sound,native:true});
 await page.goto('/playable.html');await enter(page,l.id);
 await expect(page.locator('[data-native-video]')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.songVideoCalls.find(c=>c.method==='mount')?.args.videoId)).toBe(c.videoId);
 expect((await page.evaluate(()=>window.songVideoCalls.find(c=>c.method==='mount'))).args).toMatchObject({startSeconds:c.startSeconds,endSeconds:c.endSeconds});
 await next(page);await expect.poll(()=>page.evaluate(()=>window.songVideoCalls.at(-1)?.method)).toBe('remove');
 for(const [stage,phase]of ['gap','apply'].entries()){
  await select(page,(l.answers[stage]+1)%3);await check(page);
  expect(await page.evaluate(()=>window.songCues.haptics)).toBe(stage);
  expect(await page.evaluate(()=>window.songCues.tones)).toBe(sound?stage*2:0);
  if(phase==='apply'){
   await page.locator('[data-action="song-replay"]').click();
   await expect.poll(()=>page.evaluate(()=>window.songVideoCalls.filter(c=>c.method==='mount').length)).toBe(3);
   await next(page);await expect(page.locator('.song-phase-apply')).toBeVisible();
   await expect.poll(()=>page.evaluate(()=>window.songVideoCalls.at(-1)?.method)).toBe('remove');
   expect(await page.evaluate(()=>window.songCues.haptics)).toBe(stage);
   expect(await page.evaluate(()=>window.songCues.tones)).toBe(sound?stage*2:0);
  }
  await select(page,l.answers[stage]);await check(page);
  await expect.poll(()=>page.evaluate(()=>window.songCues.haptics)).toBe(stage+1);
  await expect.poll(()=>page.evaluate(()=>window.songCues.tones)).toBe(sound?(stage+1)*2:0);
  await expect(page.locator('.review-correct-motion')).toHaveCount(0);
  if(phase==='gap'){
   await page.locator('[data-action="song-replay"]').click();
   await expect.poll(()=>page.evaluate(()=>window.songVideoCalls.filter(c=>c.method==='mount').length)).toBe(2);
   await next(page);await expect(page.locator('.song-phase-gap')).toBeVisible();
   await expect.poll(()=>page.evaluate(()=>window.songVideoCalls.at(-1)?.method)).toBe('remove');
  }else await expect(page.locator('[data-action="song-replay"]')).toHaveCount(0);
  expect(await page.evaluate(()=>window.songCues.haptics)).toBe(stage+1);
  expect(await page.evaluate(()=>window.songCues.tones)).toBe(sound?(stage+1)*2:0);
  await next(page);if(stage===0)await next(page);
 }
 await expect(page.locator('.song-phase-encore')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.songVideoCalls.filter(c=>c.method==='mount').length)).toBe(4);
 await next(page);await expect(page.locator('.practice-complete')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.songVideoCalls.at(-1)?.method)).toBe('remove');
 await expect.poll(()=>page.evaluate(()=>window.songCues.tones)).toBe(sound?10:0);
 expect(await page.evaluate(()=>window.songCues.haptics)).toBe(2);
 await expect(page.locator('[data-native-video]')).toHaveCount(0);
 await page.locator('[data-action="completed-next"]').click();
 await expect(page.locator('.view-video')).toBeVisible();
 expect(await page.evaluate(()=>window.songCues.tones)).toBe(sound?10:0);
 if(sound)await expect.poll(()=>page.evaluate(()=>window.songCues.closed)).toBeGreaterThanOrEqual(3);
});
