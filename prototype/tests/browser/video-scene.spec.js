import {findMapLesson,openMapLesson,collectMapLessons} from './learning-map-fixture.js';
import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {videoLessons} from '../../src/video-lesson-state.js';
import {videoContent} from '../../src/video-lesson-content.js';
import {videoSceneContent} from '../../src/video-scene-content.js';

const scenes=videoLessons.filter(l=>l.mode==='scene'&&l.count===1);
const fixture=(l,sound=false)=>({...freshState(),onboarded:true,onboardingLevel:l.level,courseDirection:l.direction,koreanGuideSeenVersion:1,settings:{sound,motion:'off',textScale:1.2,audioRate:1}});
const enter=(page,id)=>openMapLesson(page,{kind:'video',id:id});
async function layout(page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const boxes=await page.locator('.video-scene>.button-pair>button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,width:r.width,height:r.height};}));
 expect(boxes).toHaveLength(2);expect(Math.abs(boxes[0].top-boxes[1].top)).toBeLessThan(2);expect(Math.abs(boxes[0].width-boxes[1].width)).toBeLessThan(2);expect(Math.min(...boxes.map(b=>b.height))).toBeGreaterThanOrEqual(44);
 await expect(page.locator('[role="progressbar"]')).toHaveCount(1);await expect(page.locator('.review-phase-progress,.practice-rounds')).toHaveCount(0);
}
for(const {l,width}of scenes.flatMap((l,index)=>(l.level===4&&l.number===6?[320,390]:[Math.floor(index/2)%2?390:320]).map(width=>({l,width}))))test(`scene ${l.id}: watch, meaning and real-life use at ${width}px`,async({page})=>{
 const x=videoContent[l.id][0],copy=videoSceneContent[l.id];
 await page.setViewportSize({width,height:844});
 await page.addInitScript(s=>{if(!localStorage.getItem('seodang.web-prototype.v1'))localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},fixture(l));
 await page.route('https://www.youtube.com/embed/**',r=>r.fulfill({contentType:'text/html',body:'<body style="background:#111;color:#fff">Official player fixture</body>'}));
 await page.goto('/playable.html');expect((await collectMapLessons(page))[l.number-1]).toMatchObject({kind:'video',id:l.id,number:l.number});await enter(page,l.id);
 await expect(page.locator('.app-header-title')).toContainText(`${l.number}.`);await expect(page.locator('.video-scene')).toHaveAttribute('lang',l.direction==='ko-ja'?'ko':'ja');await layout(page);
 const src=new URL(await page.locator('iframe.lesson-youtube').getAttribute('src'));
 expect(src.pathname).toBe(`/embed/${x.videoId}`);expect(src.searchParams.get('start')).toBe(String(x.startSeconds));expect(src.searchParams.get('end')).toBe(String(x.endSeconds));expect(src.searchParams.get('cc_load_policy')).toBe('0');
 await expect(page.locator('.video-scene')).not.toContainText(x.translation);await expect(page.locator('.video-example')).toHaveCount(0);
 await expect(page.locator('.video-support .video-source')).toBeHidden();await page.locator('.video-support summary').click();await expect(page.locator('.video-original')).toHaveAttribute('href',`https://www.youtube.com/watch?v=${x.videoId}&t=${x.startSeconds}s`);await page.locator('.video-support summary').click();
 await page.screenshot({path:`output/scene-${l.id}-watch-${test.info().project.name}.png`,fullPage:true});await page.locator('[data-action="video-next"]').click();
 for(const phase of ['meaning','use']){
  const answer=copy[phase].answer,wrong=(answer+1)%3;
  await expect(page.locator(`.video-phase-${phase}`)).toBeVisible();await expect(page.locator('.video-scene-choices>button')).toHaveCount(3);await expect(page.locator('[data-action="video-check"]')).toBeDisabled();await expect(page.locator('.video-dialogue blockquote')).toHaveText(x.quote);await expect(page.locator('.video-example')).toHaveCount(0);await layout(page);
  if(phase==='meaning')await expect(page.locator('.video-dialogue')).not.toContainText(x.translation);
  await page.locator(`[data-action="video-select"][data-id="${wrong}"]`).click();await page.locator('[data-action="video-check"]').click();await expect(page.locator('.video-scene-feedback')).toBeVisible();await expect(page.locator('.video-scene-feedback.success')).toHaveCount(0);await expect(page.locator('[data-action="video-next"]')).toHaveCount(0);await expect(page.locator('.review-correct-mark')).toHaveCount(0);
  await page.reload();await enter(page,l.id);await expect(page.locator(`[data-action="video-select"][data-id="${wrong}"]`)).toHaveAttribute('aria-pressed','true');await expect(page.locator('.video-scene-feedback')).toBeVisible();
  await page.locator(`[data-action="video-select"][data-id="${answer}"]`).click();await page.locator('[data-action="video-check"]').click();await expect(page.locator('.video-scene-feedback.success')).toBeInViewport();await expect(page.locator('.review-correct-mark')).toBeVisible();await expect(page.locator('.video-scene-choices>button').first()).toBeDisabled();await expect(page.locator('.video-scene-choices>button.correct')).toHaveCount(1);await layout(page);
  if(phase==='use')await expect(page.locator('.video-example')).toContainText(x.example);
  await page.locator('[data-action="video-replay"]').click();await expect(page.locator('.video-phase-watch')).toBeVisible();await page.reload();await enter(page,l.id);await expect(page.locator('.video-phase-watch')).toBeVisible();await page.locator('[data-action="video-next"]').click();await expect(page.locator(`.video-phase-${phase}`)).toBeVisible();await expect(page.locator(`[data-action="video-select"][data-id="${answer}"]`)).toHaveClass(/correct/);await expect(page.locator('.video-scene-choices>button').first()).toBeDisabled();
  await page.screenshot({path:`output/scene-${l.id}-${phase}-${width}-${test.info().project.name}.png`,fullPage:true});await page.locator('[data-action="video-next"]').click();
  if(phase==='meaning'){
   await expect(page.locator('.video-phase-learn')).toBeVisible();await expect(page.locator('.video-example')).toHaveCount(0);await layout(page);await page.locator('[data-action="video-next"]').click();
  }
 }
 await expect(page.locator('.practice-complete h1')).toHaveText(l.direction==='ja-ko'?'学習が完了しました':'학습을 완료하셨습니다');await expect(page.locator('.practice-fireworks svg')).toBeVisible();await expect(page.locator('.lesson-youtube')).toHaveCount(0);
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1'))),key=`${l.direction}:video:${l.id}`;
 expect(stored.practices?.[key]).toBeUndefined();expect(stored.videoLessons[l.id]).toMatchObject({phase:'done',completed:true,version:l.revision});expect(stored.studyTools[l.direction].lessons[key].completedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
 await page.locator('[data-action="completed-next"]').click();await page.reload();const finished=await findMapLesson(page,{kind:'video',id:l.id});await expect(finished.locator('..')).toHaveClass(/is-complete/);await expect(finished.locator('.map-status')).toHaveCount(0);
});

for(const direction of ['ko-ja','ja-ko'])for(const sound of [true,false])for(const number of [3,6])test(`scene native player teardown and one-time feedback ${direction} ${number===6?'3-6':'2-3'} sound=${sound}`,async({page})=>{
 const l=scenes.find(x=>x.direction===direction&&x.number===number&&x.level===(number===6?4:2)),x=videoContent[l.id][0];
 await page.setViewportSize({width:320,height:844});
 await page.addInitScript(s=>{
  if(!localStorage.getItem('seodang.web-prototype.v1'))localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
  window.videoCalls=[];window.sceneCues={haptics:0,tones:0,closed:0};
  window.Capacitor={getPlatform:()=> 'ios',isNativePlatform:()=>true,isPluginAvailable:name=>name==='SeodangVideo',nativePromise:async(plugin,method,args)=>{if(plugin==='SeodangVideo')window.videoCalls.push({method,args});if(plugin==='SeodangUI'&&method==='correctAnswer')window.sceneCues.haptics++;return {};}};
  window.AudioContext=class{state='running';currentTime=0;destination={};createOscillator(){window.sceneCues.tones++;return {frequency:{},connect(){},start(){},stop(){}};}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}close(){window.sceneCues.closed++;return Promise.resolve();}};
 },fixture(l,sound));
 await page.goto('/playable.html');await enter(page,l.id);await expect(page.locator('[data-native-video]')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.videoCalls.find(c=>c.method==='mount')?.args.videoId)).toBe(x.videoId);
 expect((await page.evaluate(()=>window.videoCalls.find(c=>c.method==='mount'))).args).toMatchObject({startSeconds:x.startSeconds,endSeconds:x.endSeconds});await page.locator('[data-action="video-next"]').click();await expect.poll(()=>page.evaluate(()=>window.videoCalls.at(-1)?.method)).toBe('remove');
 for(const [stage,phase]of ['meaning','use'].entries()){
  await page.locator(`[data-action="video-select"][data-id="${(l.answers[stage]+1)%3}"]`).click();await page.locator('[data-action="video-check"]').click();expect(await page.evaluate(()=>window.sceneCues.haptics)).toBe(stage);
  await page.locator(`[data-action="video-select"][data-id="${l.answers[stage]}"]`).click();await page.locator('[data-action="video-check"]').click();await expect(page.locator('.review-correct-mark')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.sceneCues.haptics)).toBe(stage+1);await expect.poll(()=>page.evaluate(()=>window.sceneCues.tones)).toBe(sound?(stage+1)*2:0);await expect(page.locator('.review-correct-motion')).toHaveCount(0);
  await page.locator('[data-action="video-replay"]').click();await expect.poll(()=>page.evaluate(()=>window.videoCalls.filter(c=>c.method==='mount').length)).toBe(stage+2);await page.locator('[data-action="video-next"]').click();await expect(page.locator(`.video-phase-${phase}`)).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.videoCalls.at(-1)?.method)).toBe('remove');expect(await page.evaluate(()=>window.sceneCues.haptics)).toBe(stage+1);expect(await page.evaluate(()=>window.sceneCues.tones)).toBe(sound?(stage+1)*2:0);
  await page.locator('[data-action="video-next"]').click();if(stage===0)await page.locator('[data-action="video-next"]').click();
 }
 await expect(page.locator('.practice-complete')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.sceneCues.tones)).toBe(sound?10:0);expect(await page.evaluate(()=>window.sceneCues.haptics)).toBe(2);await expect(page.locator('[data-native-video]')).toHaveCount(0);
 await page.locator('[data-action="completed-next"]').click();expect(await page.evaluate(()=>window.sceneCues.tones)).toBe(sound?10:0);
});
