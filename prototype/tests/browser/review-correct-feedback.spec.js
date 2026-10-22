import {test,expect} from '@playwright/test';
for(const [sound,motion,reduce] of [[true,'on',false],[false,'on',false],[true,'off',false],[true,'on',true]])test(`2-1 correct cue sound=${sound} motion=${motion} reduce=${reduce}`,async({page})=>{
 await page.emulateMedia({reducedMotion:reduce?'reduce':'no-preference'});
 await page.route('**/cue-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/practice.css"></head><body></body></html>'}));
 await page.goto('/cue-fixture');await page.evaluate(async({sound,motion})=>{
  window.cues={haptics:0,tones:0,contexts:0,closed:0,next:0};
  window.Capacitor={isNativePlatform:()=>true,getPlatform:()=> 'ios',nativePromise:(plugin,method)=>{if(plugin!=='SeodangUI'||method!=='correctAnswer')throw Error('Wrong native method');window.cues.haptics++;return Promise.resolve();}};
  const AudioContext=window.AudioContext||window.webkitAudioContext;
  window.AudioContext=class extends AudioContext{constructor(){super();window.cues.contexts++;}createOscillator(){window.cues.tones++;return super.createOscillator();}close(){window.cues.closed++;return super.close();}};
  const {freshState}=await import('/src/engine.js'),{prepareContent,caseTasks}=await import('/src/practice-content.js'),{renderIntroductionReview,mountIntroductionReview}=await import('/src/introduction-review.js');
  const s={...freshState(),courseDirection:'ko-ja',sentenceActive:3,onboardingLevel:2,settings:{sound,motion}},p={index:9,count:21};await prepareContent('sentence');const task=caseTasks(s,'sentence')[9];window.answerLength=task.answerLength;document.body.innerHTML=renderIntroductionReview(s,task,p,()=> '');
  window.disposeCue=mountIntroductionReview(document.body,s,task,p,{play:async(entry,onError)=>{if(window.failReviewAudio)onError('failed');},stop(){},advance:async()=>{window.cues.next++;}});
 },{sound,motion});
 const count=await page.evaluate(()=>window.answerLength);
 for(let i=count-1;i>=0;i--)await page.locator(`[data-review-token="${i}"]`).click();
 await page.locator('[data-review-confirm]').click();expect(await page.evaluate(()=>window.cues.haptics)).toBe(0);await expect(page.locator('.review-correct-mark')).toHaveCount(0);
 for(let i=0;i<count;i++)await page.locator('[data-review-undo]').click();
 for(let i=0;i<count;i++)await page.locator(`[data-review-token="${i}"]`).click();await page.locator('[data-review-confirm]').click();
 await expect(page.locator('.review-correct-mark')).toBeVisible();expect(await page.evaluate(()=>window.cues.haptics)).toBe(1);
 if(sound)await expect.poll(()=>page.evaluate(()=>window.cues.tones)).toBe(2);else expect(await page.evaluate(()=>window.cues.contexts)).toBe(0);
 await expect(page.locator('.review-correct-motion')).toHaveCount(motion==='on'&&!reduce?1:0);
 await page.evaluate(()=>window.failReviewAudio=true);await page.locator('.review-result [data-review-audio]').click();await expect(page.locator('.review-audio-error')).toBeVisible();await expect(page.locator('[data-review-feedback-text]')).toHaveText('맞아요.');await page.evaluate(()=>window.failReviewAudio=false);await page.locator('.review-result [data-review-audio]').click();await expect(page.locator('.review-audio-error')).toBeHidden();await expect(page.locator('.review-correct-mark')).toBeVisible();expect(await page.evaluate(()=>window.cues.haptics)).toBe(1);
 if(sound)await expect.poll(()=>page.evaluate(()=>window.cues.closed)).toBe(1);
 await page.locator('[data-review-confirm]').click();expect(await page.evaluate(()=>window.cues)).toMatchObject({haptics:1,next:1});await page.evaluate(()=>window.disposeCue());
});
test('leaving while the sound is resuming cancels it',async({page})=>{
 await page.route('**/cue-cancel',r=>r.fulfill({contentType:'text/html',body:'<div class="practice-feedback"></div>'}));await page.goto('/cue-cancel');
 const result=await page.evaluate(async()=>{
  let resume,tones=0,closed=0;window.AudioContext=class{state='suspended';resume(){return new Promise(r=>resume=r);}close(){closed++;return Promise.resolve();}createOscillator(){tones++;throw Error('Should not create tone after leaving');}};
  const {createReviewCorrectFeedback}=await import('/src/review-correct-feedback.js');const cue=createReviewCorrectFeedback(document.body,{sound:true,motion:'off'});cue.play();cue.dispose();resume();await Promise.resolve();return {tones,closed};
 });expect(result).toEqual({tones:0,closed:1});
});
test('completion fanfare covers expanded level two and respects sound off',async({page})=>{
 await page.route('**/completion-cue',r=>r.fulfill({contentType:'text/html',body:'<body></body>'}));await page.goto('/completion-cue');
 const result=await page.evaluate(async()=>{
  let tones=0,closed=0;window.AudioContext=class{state='running';currentTime=0;destination={};createOscillator(){tones++;return {frequency:{},connect(){},start(){},stop(){}};}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}close(){closed++;return Promise.resolve();}};
  const {freshState}=await import('/src/engine.js'),{playIntroductionCompletionSound}=await import('/src/practice.js');const s={...freshState(),sentenceActive:3,settings:{sound:true}};
  const jp=playIntroductionCompletionSound(s,'sentence');const first=tones;jp();
  const ko=playIntroductionCompletionSound({...s,courseDirection:'ja-ko',korean:{active:'3-1'}},'korean');const second=tones;ko();
  playIntroductionCompletionSound({...s,sentenceActive:1},'sentence')();playIntroductionCompletionSound({...s,courseDirection:'ja-ko',korean:{active:'4-1'}},'korean')();playIntroductionCompletionSound({...s,settings:{sound:false}},'sentence')();
  playIntroductionCompletionSound({...s,sentenceActive:0},'sentence')();
  playIntroductionCompletionSound({...s,courseDirection:'ja-ko',korean:{active:'3-4'}},'korean')();
  return {first,second,tones,closed};
 });expect(result).toEqual({first:6,second:12,tones:30,closed:5});
});
