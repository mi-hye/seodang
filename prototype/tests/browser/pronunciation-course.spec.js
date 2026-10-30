import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {freshKoreanProgress,koreanLessons} from '../../src/korean-state.js';
import {openMapLesson} from './learning-map-fixture.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
const key='seodang.web-prototype.v1';
async function setup(page,width=390,extra={}){
 const state={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:'ja-ko',onboardingLevel:8,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1},...extra};
 await page.setViewportSize({width,height:width===320?640:844});
 await page.addInitScript(({key,state})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
  window.clips=[];window.Audio=class{constructor(src){this.src=src;}play(){window.clips.push(this.src);queueMicrotask(()=>this.onended?.());return Promise.resolve();}pause(){}};
 },{key,state});
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');
 await page.evaluate(()=>{window.recognitionCalls=[];window.Capacitor={isNativePlatform:()=>true,getPlatform:()=> 'android',nativePromise:async(plugin,method,args)=>{window.recognitionCalls.push({method,args});if(method==='finish'&&window.failFinish)throw new Error('finish failed');if(method==='cancel'&&window.holdCancel)return new Promise(resolve=>window.releaseCancel=resolve);if(method==='status')return window.recognitionStatus||{onDevice:true,available:true,permission:'granted'};if(method==='recognize')return new Promise((resolve,reject)=>{window.resolveRecognition=resolve;window.rejectRecognition=reject;});return {};}};});
}
const action=(page,name)=>page.locator(`[data-action="${name}"]`).first();
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
async function speak(page,id='15-1'){
 await openMapLesson(page,{kind:'korean',id});await action(page,'korean-next').click();await expect(page.locator('.pronunciation-speaking')).toBeVisible();
}
for(const width of [320,390])test(`pronunciation course full lesson, guided practice, resume and completion ${width}`,async({page})=>{
 await setup(page,width);await openMapLesson(page,{kind:'korean',id:'15-1'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(let index=0;index<6;index++){
  await expect(page.locator('.pronunciation-target').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  if(index===0){await action(page,'korean-contrast-audio').click();await expect.poll(()=>page.evaluate(()=>window.clips.length)).toBeGreaterThan(0);await page.screenshot({path:`output/pronunciation-learn-${width}-${test.info().project.name}.png`});}
  await expect(page.locator('.pronunciation-compare-card')).toHaveCount(index<3?1:3);
  await expect(page.locator('[data-action="korean-select"],[data-action="korean-check"]')).toHaveCount(0);
  await page.waitForTimeout(460);await action(page,'korean-next').click();
  await expect(page.locator('.pronunciation-speaking')).toBeVisible();await expect(page.locator('[data-speaking-next]')).toBeEnabled();
  if(index===2){await page.reload();await page.locator('.home-start-card[data-action="korean"]').click();await expect(page.locator('.pronunciation-speaking')).toBeVisible();expect((await saved(page)).korean.lessons['15-1'].index).toBe(index);}
  if(index===0){await page.screenshot({path:`output/pronunciation-speak-${width}-${test.info().project.name}.png`});const pair=await page.locator('.speaking-navigation>button:not([hidden])').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));expect(Math.abs(pair[0].top-pair[1].top)).toBeLessThan(2);}
  await page.locator('[data-speaking-next]').click();
 }
 await expect(page.locator('.practice-complete')).toBeVisible();await expect(page.locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow','100');expect((await saved(page)).studyTools['ja-ko'].lessons['ja-ko:korean:15-1']).toBeDefined();await action(page,'completed-next').click();await expect(page.locator('.pronunciation-course')).toBeVisible();expect((await saved(page)).korean.active).toBe('15-2');expect(errors).toEqual([]);
});
test('local recorder replays temporary audio and releases tracks on navigation',async({page})=>{
 await setup(page);await page.evaluate(()=>{
  window.stops=0;window.recRequests=0;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{window.recRequests++;return {getTracks:()=>[{stop:()=>window.stops++}]};}}});
  window.MediaRecorder=class{state='inactive';mimeType='audio/webm';start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['fake recording'],{type:'audio/webm'})});queueMicrotask(()=>this.onstop?.());}};
 });
 await speak(page);await page.locator('.pronunciation-note summary').click();expect(await page.evaluate(()=>window.recRequests)).toBe(0);await page.locator('[data-record]').click();await expect(page.locator('[data-record]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('.speaking-dog')).toHaveAttribute('data-speaking-mood','idle');await page.screenshot({path:`output/pronunciation-dog-recording-${test.info().project.name}.png`});await page.waitForTimeout(400);await page.locator('[data-record]').click();await expect(page.locator('[data-record-play]')).toBeEnabled();await expect(page.locator('[data-speaking-next]')).toBeEnabled();await page.locator('[data-record-play]').click();await expect(page.locator('[data-speaking-next]')).toBeEnabled();expect(await page.evaluate(()=>window.clips.at(-1))).toMatch(/^blob:/);
 await page.locator('[data-record]').click();await action(page,'home').click();expect(await page.evaluate(()=>window.stops)).toBeGreaterThanOrEqual(2);expect(JSON.stringify(await saved(page))).not.toContain('blob:');
});
test('microphone rejection has a clear fallback and settings recovery',async({page})=>{
 await setup(page);await speak(page);await page.locator('[data-speaking-record]').click();
 await page.evaluate(()=>window.rejectRecognition({code:'PERMISSION_BLOCKED'}));
 await expect(page.locator('[data-speaking-status]')).toContainText('マイクの権限');
 await expect(page.locator('[data-speaking-next]')).toBeEnabled();await page.locator('[data-speaking-settings]').click();
 expect(await page.evaluate(()=>window.recognitionCalls.some(c=>c.method==='openSettings'))).toBe(true);
 await page.locator('[data-speaking-next]').click();expect((await saved(page)).korean.lessons['15-1'].index).toBe(1);
});

for(const level of [0,8])test(`completed Korean level ${level} home points to the next course`,async({page})=>{
 const lessons=Object.fromEntries(koreanLessons.filter(l=>l.level===level).map(l=>[l.id,{...freshKoreanProgress(l.id),phase:'done',started:true,completed:true,index:l.count-1}]));
 await setup(page,320,{onboardingLevel:level,korean:{version:4,active:level===0?'1-10':'15-10',lessons}});
 const card=page.locator('.home-start-card[data-action="next-course"]');await expect(card).toContainText(level===0?'レベル1.5':'レベル2');await card.click();await expect(page.locator('.view-korean')).toBeVisible();expect((await saved(page)).onboardingLevel).toBe(level===0?8:2);
});

test('liaison teaches connected sounds and last completion opens level two',async({page})=>{
 const id='15-10';await setup(page,320,{korean:{version:4,active:id,lessons:{[id]:{...freshKoreanProgress(id),index:5,started:true}}}});
 await page.locator('.home-start-card[data-action="korean"]').click();await page.locator('.pronunciation-focus summary').click();await expect(page.locator('.pronunciation-linking')).toHaveCount(1);
 await expect(page.locator('.pronunciation-course')).toContainText('무늘 여러요');await action(page,'korean-next').click();await page.locator('[data-speaking-next]').click();await expect(page.locator('.practice-complete')).toBeVisible();await action(page,'completed-next').click();await expect.poll(async()=>(await saved(page)).onboardingLevel).toBe(2);expect((await saved(page)).korean.active).toBe('3-1');
});

test('a missing recorder stop event recovers without trapping the learner',async({page})=>{
 await setup(page);await page.evaluate(()=>{window.stops=0;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>window.stops++}]})}});window.MediaRecorder=class{state='inactive';start(){this.state='recording';}stop(){this.state='inactive';}};});
 await speak(page);await page.locator('.pronunciation-note summary').click();await page.locator('[data-record]').click();await expect(page.locator('[data-record]')).toHaveAttribute('aria-pressed','true');await page.locator('[data-record]').click();await expect(page.locator('[data-record-status]')).toContainText('録音を終了できなかった');await expect(page.locator('[data-record]')).toBeEnabled();expect(await page.evaluate(()=>window.stops)).toBe(1);await expect(page.locator('[data-speaking-next]')).toBeVisible();await expect(page.locator('[data-speaking-record]')).toBeEnabled();
});

test('all pronunciation comparisons stay balanced and usable at 320px with large text',async({page})=>{
 await setup(page,320,{settings:{sound:true,motion:'off',textScale:1.2,audioRate:1}});
 for(let n=1;n<=10;n++){
  await openMapLesson(page,{kind:'korean',id:`15-${n}`});
  await expect(page.locator('.pronunciation-compare-card')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const before=await page.evaluate(()=>window.clips.length);
  await page.waitForTimeout(300);expect(await page.evaluate(()=>window.clips.length)).toBe(before);
  for(const button of await page.locator('[data-action="korean-contrast-audio"]').all()){
   const box=await button.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
   const count=await page.evaluate(()=>window.clips.length);await button.click();await expect.poll(()=>page.evaluate(()=>window.clips.length)).toBe(count+1);
  }
  await expect.poll(()=>page.evaluate(()=>window.clips.length)).toBeGreaterThanOrEqual(before+1);
  if([3,8,10].includes(n))await page.screenshot({path:`output/pronunciation-compare-${n}-${test.info().project.name}.png`});
  await action(page,'home').click();
 }
});

test('mouth diagram cancels the microphone and playback appears only after recording',async({page})=>{
 await setup(page,320);await page.evaluate(()=>{
  window.stops=0;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>window.stops++}]})}});
  window.MediaRecorder=class{state='inactive';mimeType='audio/webm';start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['fake'])});queueMicrotask(()=>this.onstop?.());}};
 });
 await speak(page,'15-3');await page.locator('.pronunciation-note summary').click();await expect(page.locator('.pronunciation-playback')).toBeHidden();
 await expect(page.locator('.pronunciation-diagram-link')).toHaveAttribute('data-position','initial');
 await page.locator('[data-record]').click();await page.waitForTimeout(400);await page.locator('[data-record]').click();
 await expect(page.locator('.pronunciation-playback')).toBeVisible();await expect(page.locator('[data-record]')).toHaveText('録り直す');
 await page.screenshot({path:`output/pronunciation-recorded-${test.info().project.name}.png`});
 await page.locator('[data-record]').click();await page.locator('.pronunciation-diagram-link').click();
 await expect.poll(()=>page.evaluate(()=>window.stops)).toBe(2);
 await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('.speaking-dog')).toHaveAttribute('data-speaking-mood','idle');
});

for(const width of [320,390])test(`pronunciation keeps shared speaking controls with target-first order at ${width}px`,async({page})=>{
 await setup(page,width);await speak(page);
 await expect(page.locator('[data-speaking-next]')).toBeVisible();
 await expect(page.locator('.pronunciation-note')).not.toHaveAttribute('open','');
 const comparison=await page.evaluate(async()=>{
  const {renderKoreanSpeaking}=await import('/src/korean-speaking.js');
  const current=document.querySelector('.pronunciation-speaking');
  const holder=document.createElement('div');holder.innerHTML=renderKoreanSpeaking(()=>'',current.querySelector('h2').textContent);
  const normal=holder.firstElementChild;normal.querySelector('[data-speaking-skip]').hidden=true;normal.querySelector('[data-speaking-next]').hidden=false;normal.querySelector('[data-speaking-next]').disabled=false;for(const c of ['lesson-top','lesson-centered'])if(current.classList.contains(c))normal.classList.add(c);
  current.before(normal);
  const selectors=['.speaking-coach h1','.speaking-dog','.speaking-microphone','.audio-text-row .icon-button','.speaking-navigation'];
  const measure=root=>selectors.map(selector=>{const e=root.querySelector(selector),r=e.getBoundingClientRect(),style=getComputedStyle(e);return {selector,width:r.width,height:r.height,font:style.fontSize,padding:style.padding,gap:style.gap};});
  const result={normal:measure(normal),pronunciation:measure(current)};normal.remove();return result;
 });
 expect(comparison.pronunciation).toEqual(comparison.normal);
 const order=await page.locator('.pronunciation-speaking').evaluate(e=>Array.from(e.children).map(c=>c.className));
 expect(order.indexOf('audio-text-row')).toBeLessThan(order.findIndex(c=>c.includes('speaking-coach')));
 expect(order.indexOf('pronunciation-note')).toBeLessThan(order.indexOf('speaking-actions'));
 if(test.info().project.name==='chromium'){await page.locator('[data-speaking-example]').focus();await page.keyboard.press('Tab');await expect(page.locator('[data-speaking-record]')).toBeFocused();}
 expect(await page.locator('.pronunciation-speaking').evaluate(e=>Array.from(e.querySelectorAll('button')).slice(0,2).map(b=>b.hasAttribute('data-speaking-example')?'example':b.hasAttribute('data-speaking-record')?'mic':'other'))).toEqual(['example','mic']);

 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:`output/pronunciation-unified-${width}-${test.info().project.name}.png`,fullPage:true});
});

for(const id of ['15-1','15-3','15-8','15-10'])test(`recognition supports practice without gating next: ${id}`,async({page})=>{
 await setup(page);await speak(page,id);
 const mic=page.locator('[data-speaking-record]'),next=page.locator('[data-speaking-next]');
 const target=await page.locator('.pronunciation-speaking h2').textContent();
 await mic.click();await page.evaluate(()=>window.resolveRecognition({text:'違う音'}));
 await expect(next).toBeEnabled();await expect(page.locator('[data-speaking-status]')).toHaveText('お手本と聞き比べてみよう');await expect(page.locator('[data-speaking-mood]')).toHaveAttribute('data-speaking-mood','idle');
 await mic.click();await page.evaluate(text=>window.resolveRecognition({text}),target);
 await expect(next).toBeVisible();await expect(next).toBeEnabled();await expect(page.locator('[data-speaking-mood]')).toHaveAttribute('data-speaking-mood','happy');
 await expect(page.locator('.pronunciation-note')).not.toHaveAttribute('open','');
 await next.click();expect((await saved(page)).korean.lessons[id].index).toBe(1);
});
test('optional recording cannot change recognition success, including failure and replay',async({page})=>{
 await setup(page);await speak(page);
 await page.locator('[data-speaking-record]').click();await page.evaluate(()=>window.resolveRecognition({text:'아이예요.'}));
 const next=page.locator('[data-speaking-next]');await expect(next).toBeVisible();
 await page.locator('.pronunciation-note summary').click();
 await page.evaluate(()=>{Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{throw new DOMException('denied','NotAllowedError');}}});window.MediaRecorder=class{};});
 await page.locator('[data-record]').click();await expect(page.locator('[data-record-status]')).toContainText('許可');await expect(next).toBeEnabled();
 await page.evaluate(()=>{
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}});
  window.MediaRecorder=class{state='inactive';start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['fake'])});queueMicrotask(()=>this.onstop?.());}};
 });
 await page.locator('[data-record]').click();await expect(page.locator('[data-speaking-record]')).toBeDisabled();await expect(next).toBeEnabled();await page.waitForTimeout(400);await page.locator('[data-record]').click();await page.locator('[data-record-play]').click();await expect(next).toBeEnabled();await expect(page.locator('[data-speaking-record]')).toBeEnabled();
 await next.click();expect((await saved(page)).korean.lessons['15-1'].index).toBe(1);
});
test('recognition and pending optional capture cannot use the microphone together',async({page})=>{
 await setup(page);await speak(page);await page.locator('.pronunciation-note summary').click();
 await page.locator('[data-speaking-record]').click();await expect(page.locator('[data-record]')).toBeDisabled();
 await page.evaluate(()=>window.resolveRecognition({text:'아이예요.'}));await expect(page.locator('[data-record]')).toBeEnabled();
 await page.evaluate(()=>{window.stops=0;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>new Promise(resolve=>window.resolveCapture=()=>resolve({getTracks:()=>[{stop:()=>window.stops++}]}))}});window.MediaRecorder=class{};});
 await page.locator('[data-record]').click();await expect(page.locator('[data-speaking-record]')).toBeDisabled();
 await page.locator('.pronunciation-note summary').click();await expect(page.locator('[data-speaking-record]')).toBeDisabled();
 await page.evaluate(()=>window.resolveCapture());await expect(page.locator('[data-speaking-record]')).toBeEnabled();expect(await page.evaluate(()=>window.stops)).toBe(1);await expect(page.locator('[data-speaking-next]')).toBeEnabled();
});

test('pronunciation keeps system-service consent and can decline without being trapped',async({page})=>{
 await setup(page);await speak(page);await page.evaluate(()=>window.recognitionStatus={onDevice:false,available:true,permission:'granted'});
 await page.locator('[data-speaking-record]').click();await expect(page.locator('.speaking-consent')).toBeVisible();
 expect(await page.evaluate(()=>window.recognitionCalls.some(c=>c.method==='recognize'))).toBe(false);
 await page.locator('[data-decline]').click();await expect(page.locator('[data-speaking-record]')).toBeEnabled();
 await page.locator('[data-speaking-record]').click();await page.locator('[data-accept]').click();
 await page.evaluate(()=>window.resolveRecognition({text:'아이예요.'}));await expect(page.locator('[data-speaking-next]')).toBeVisible();
 expect(await page.evaluate(()=>window.recognitionCalls.find(c=>c.method==='recognize').args.allowNetwork)).toBe(true);
 await page.locator('[data-speaking-next]').click();expect((await saved(page)).korean.lessons['15-1'].index).toBe(1);
});

test('failed recognition finish keeps optional microphone locked until native cancel resolves',async({page})=>{
 await setup(page);await speak(page);await page.locator('.pronunciation-note summary').click();
 await page.evaluate(()=>{window.failFinish=true;window.holdCancel=true;});
 await page.locator('[data-speaking-record]').click();await expect(page.locator('[data-speaking-record]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-speaking-record]').click();await expect(page.locator('[data-speaking-status]')).toContainText('もう一度');
 await expect(page.locator('[data-record]')).toBeDisabled();await expect(page.locator('[data-speaking-record]')).toBeDisabled();
 await page.evaluate(()=>window.releaseCancel());await expect(page.locator('[data-record]')).toBeEnabled();await expect(page.locator('[data-speaking-record]')).toBeEnabled();
});

test('legacy quiz resumes with the same target and offers teaching before speaking',async({page})=>{
 const id='15-3';await setup(page,320,{korean:{version:4,active:id,lessons:{[id]:{...freshKoreanProgress(id),index:4,phase:'quiz',selected:1,retry:true,started:true}}}});
 await page.locator('.home-start-card[data-action="korean"]').click();
 await expect(page.locator('.pronunciation-focus h2')).toHaveText('토끼예요.');
 await expect(page.locator('.pronunciation-compare-card')).toHaveCount(3);
 await expect(page.locator('[data-action="korean-check"]')).toHaveCount(0);
 await page.screenshot({path:`output/pronunciation-guided-comparison-${test.info().project.name}.png`,fullPage:true});
 await action(page,'korean-next').click();await expect(page.locator('.pronunciation-speaking h2')).toHaveText('토끼예요.');
 await page.waitForTimeout(460);await action(page,'korean-previous').click();await expect(page.locator('.pronunciation-focus h2')).toHaveText('토끼예요.');
});

test('unsupported recognition still allows pronunciation practice and continuation',async({page})=>{
 await setup(page);await speak(page);await page.locator('[data-speaking-record]').click();
 await page.evaluate(()=>window.rejectRecognition({code:'ON_DEVICE_UNAVAILABLE'}));
 await expect(page.locator('[data-speaking-status]')).toHaveText('お手本を聞いて、声に出してみよう');
 await expect(page.locator('[data-speaking-next]')).toBeEnabled();await page.locator('[data-speaking-next]').click();
 expect((await saved(page)).korean.lessons['15-1'].index).toBe(1);
});

for(const width of [320,390])test(`guided target stays first across all pronunciation lessons at ${width}px`,async({page})=>{
 const lessons=Object.fromEntries(koreanLessons.filter(l=>l.level===8).map(l=>[l.id,{...freshKoreanProgress(l.id),started:true,index:4}]));
 await setup(page,width,{korean:{version:4,active:'15-3',lessons}});
 for(let n=1;n<=10;n++){
  await openMapLesson(page,{kind:'korean',id:`15-${n}`});await page.locator('[data-choice="resume"]').click();
  const target=page.locator('.pronunciation-focus');await expect(target).toBeVisible();
  expect(await page.locator('main').evaluate(e=>e.firstElementChild.classList.contains('pronunciation-focus'))).toBe(true);
  await expect(page.locator('.pronunciation-comparison li')).toHaveCount(2);
  const text=await target.locator('h2').textContent();
  const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,target:document.querySelector('.pronunciation-focus').getBoundingClientRect().top,progress:document.querySelector('.lesson-progress').getBoundingClientRect().bottom}));
  expect(geometry.overflow).toBe(false);expect(geometry.target-geometry.progress).toBeLessThanOrEqual(20);
  for(const row of await page.locator('.pronunciation-target').all()){
   const r=await row.evaluate(e=>{const t=e.querySelector('h2').getBoundingClientRect(),b=e.querySelector('button').getBoundingClientRect();return {right:b.left>=t.right,width:b.width,height:b.height};});expect(r.right).toBe(true);expect(r.width).toBeGreaterThanOrEqual(44);expect(r.height).toBeGreaterThanOrEqual(44);
  }
  if([3,8,10].includes(n))await page.screenshot({path:`output/pronunciation-polished-${n}-${width}-${test.info().project.name}.png`,fullPage:true});
  await page.waitForTimeout(460);await action(page,'korean-next').click();await expect(page.locator('.pronunciation-speaking h2')).toHaveText(text);
  await action(page,'home').click();
 }
});

test('old syllable progress opens the first new sentence and survives reload',async({page})=>{
 const id='15-3';await setup(page,320,{korean:{version:4,active:id,lessons:{[id]:{index:4,phase:'speak',selected:null,retry:false,started:true,completed:false}}}});
 await page.locator('.home-start-card[data-action="korean"]').click();
 await expect(page.locator('.pronunciation-focus h2')).toHaveText('저는 가수예요.');
 await expect(page.locator('.pronunciation-focus em')).toHaveText('가');
 await expect(page.locator('.pronunciation-meaning')).toHaveText('私は歌手です。');
 await action(page,'korean-next').click();await page.locator('[data-speaking-next]').click();
 await page.reload();await page.locator('.home-start-card[data-action="korean"]').click();
 await expect(page.locator('.pronunciation-focus h2')).toHaveText('카드로 낼게요.');
 expect((await saved(page)).korean.lessons[id].contentVersion).toBe(2);
});


test('pronunciation 1.5 waits for Android microphone readiness and distinguishes empty audio',async({page})=>{
 await setup(page);await page.evaluate(()=>{
  window.recognitionStatus={onDevice:true,available:true,permission:'granted',readyEvents:true};
  window.removedReady=0;window.Capacitor.addListener=(plugin,event,callback)=>{window.nativeReady=callback;return {remove(){window.removedReady++;}};};
 });
 await speak(page);const mic=page.locator('[data-speaking-record]'),next=page.locator('[data-speaking-next]');
 await mic.click();await expect(mic).toHaveAttribute('aria-pressed','false');await expect(mic).toBeDisabled();await expect(next).toBeEnabled();
 await page.evaluate(()=>window.nativeReady({requestId:window.recognitionCalls.find(c=>c.method==='recognize').args.requestId}));
 await expect(mic).toHaveAttribute('aria-pressed','true');await page.evaluate(()=>window.resolveRecognition({text:''}));
 await expect(page.locator('[data-speaking-status]')).toHaveText('声が聞き取れなかったよ。もう一度話してみてね。');await expect(next).toBeEnabled();
 await mic.click();await page.evaluate(()=>window.rejectRecognition({code:'START_FAILED'}));await expect(mic).toBeEnabled();
 await expect(page.locator('[data-speaking-status]')).toHaveText('音声認識を開始できなかったよ。もう一度試してね。');
 await next.click();expect((await saved(page)).korean.lessons['15-1'].index).toBe(1);
});
