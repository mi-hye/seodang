import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {videoLessons} from '../../src/video-lesson-state.js';
import {songLessons} from '../../src/song-state.js';
import {openMapLesson} from './learning-map-fixture.js';

const flush=async page=>expect.poll(()=>page.evaluate(async()=>{
 const {analytics}=await import('/src/analytics.js');
 await analytics.flush();return analytics.pending;
})).toBe(0);
const next=(page,kind)=>page.locator(`[data-action="${kind}-next"]`).click();
async function finish(page,kind,lesson){
 await next(page,kind);
 for(const [index,phase]of (kind==='video'?['meaning','use']:['gap','apply']).entries()){
  await expect(page.locator(`.${kind}-phase-${phase}`)).toBeVisible();
  await page.locator(`[data-action="${kind}-select"][data-id="${lesson.answers[index]}"]`).click();
  await page.locator(`[data-action="${kind}-check"]`).click();
  await next(page,kind);
  if(index===0){
   await expect(page.locator(`.${kind}-phase-learn`)).toBeVisible();
   await next(page,kind);
  }
 }
 if(kind==='song'){
  await expect(page.locator('.song-phase-encore')).toBeVisible();
  await next(page,kind);
 }
 await expect(page.locator('.practice-complete')).toBeVisible();
 await flush(page);
}

for(const kind of ['video','song'])for(const direction of ['ko-ja','ja-ko']){
 const lesson=(kind==='video'?videoLessons:songLessons).find(l=>l.direction===direction&&l.level===2&&l.number===(kind==='video'?3:5));
 test(`${kind} ${direction}: real lesson and map replay keep IDs in transmitted analytics`,async({page})=>{
  const sent=[],errors=[],key=`${direction}:${kind}:${lesson.id}`;
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://us.i.posthog.com/**',async route=>{
   // Every request is intercepted: this test cannot write QA events to PostHog.
   sent.push(...JSON.parse(route.request().postData()).batch);
   await route.fulfill({status:200,contentType:'application/json',body:'{"status":"Ok"}'});
  });
  await page.route('https://www.youtube.com/embed/**',route=>route.fulfill({contentType:'text/html',body:'<body>Local player fixture</body>'}));
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(s=>{
   localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));
   localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:true,consent_version:3,queue:[]}));
  },{...freshState(),onboarded:true,onboardingLevel:lesson.level,courseDirection:direction,koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1,audioRate:1}});
  // The local server enables preview songs; the production release gate is untouched.
  await page.goto('/playable.html');
  await openMapLesson(page,{kind,id:lesson.id});
  await finish(page,kind,lesson);
  await page.locator('.practice-complete [data-action="home"]').click();
  await openMapLesson(page,{kind,id:lesson.id});
  await finish(page,kind,lesson);

  const events=sent.filter(e=>['lesson_started','learning_progress','answer_checked','step_time','lesson_completed','lesson_exited'].includes(e.event));
  const starts=events.filter(e=>e.event==='lesson_started'),completed=events.filter(e=>e.event==='lesson_completed');
  expect(starts).toHaveLength(2);expect(completed).toHaveLength(2);
  expect(new Set(starts.map(e=>e.properties.attempt_id)).size).toBe(2);
  expect(new Set(events.map(e=>e.distinct_id)).size).toBe(1);
  const phases=kind==='video'?['watch','meaning','learn','use','done']:['listen','gap','learn','apply','encore','done'];
  expect(new Set(events.map(e=>e.properties.phase))).toEqual(new Set(phases));
  for(const e of events){
   expect(e.properties).toMatchObject({lesson_id:key,course_direction:direction,client:'seodang-capacitor',environment:'development',schema_version:3});
   expect(starts.some(start=>start.properties.attempt_id===e.properties.attempt_id)).toBe(true);
   for(const name of ['answer','lyrics','target','translation','quote','selected','position','_selected','_checked','_retry'])expect(e.properties).not.toHaveProperty(name);
  }
  for(const start of starts){
   const attempt=events.filter(e=>e.properties.attempt_id===start.properties.attempt_id);
   expect(attempt.filter(e=>e.event==='lesson_completed')).toHaveLength(1);
   expect(attempt.filter(e=>e.event==='answer_checked').map(e=>e.properties.correct)).toEqual([true,true]);
   expect(attempt.some(e=>e.event==='step_time'&&e.properties.active_ms>0)).toBe(true);
  }
  expect(events.filter(e=>e.event==='lesson_exited')).toEqual([]);
  expect(errors).toEqual([]);
 });
}
