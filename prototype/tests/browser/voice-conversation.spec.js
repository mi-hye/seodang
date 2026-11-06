import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
async function fixture(page,{direction='ko-ja',width=390,remaining=600,mode='ok'}={}){
 await page.setViewportSize({width,height:740});
 await page.route('**/__voice.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/header.css"><link rel="stylesheet" href="/src/library.css"></head><body class="learning-app library-theme"><main class="page voice-conversation" id="voice"></main></body></html>'}));
 await page.goto('/__voice.html');
 await page.evaluate(async({direction,remaining,mode})=>{
  const {mountConversation,loadConversationStyles}=await import('/src/voice-conversation.js');await loadConversationStyles();
  document.documentElement.style.setProperty('--text-scale','1.2');
  window.voiceTest={calls:[],now:0,remaining,session:null,stops:0,plays:[],mode};
  const nativeInterval=window.setInterval.bind(window);window.setInterval=(fn,ms,...args)=>{if(ms===15000)window.voiceTest.heartbeat=fn;return nativeInterval(fn,ms,...args);};
  window.Capacitor={isNativePlatform:()=>true,getPlatform:()=> 'ios',nativePromise:async(plugin,method)=>method==='requestPermissions'?{microphone:'granted'}:method==='recognize'?{text:direction==='ja-ko'?'커피가 좋아요.':'コーヒーが好きです。'}:method==='status'?{}:{}};
  const api={enabled:mode!=='disabled',request:async(action,body={},options={})=>{
   const t=window.voiceTest;t.calls.push({action,body});
   if(action==='status')return{remainingSeconds:t.remaining};
   if(action==='start'){t.session=body.sessionId;return{sessionId:t.session,remainingSeconds:t.remaining};}
   if(action==='end'){t.session=null;return{remainingSeconds:Math.max(0,t.remaining-t.now/1000)};}
   if(action==='heartbeat'&&t.heartbeatError)throw Error(t.heartbeatError);
   if(t.mode==='offline'){t.mode='ok';throw Error('timeout');}
   if(t.mode==='hold')return new Promise((resolve,reject)=>{t.resolve=resolve;options.signal.addEventListener('abort',()=>reject(Error('aborted')));});
   return{remainingSeconds:Math.max(0,t.remaining-t.now/1000),reply:{text:direction==='ja-ko'?'안녕하세요. 오늘은 어땠어요?':'こんにちは。今日はどうでしたか？',meaning:direction==='ja-ko'?'こんにちは。今日はどうでしたか？':'안녕하세요. 오늘은 어땠어요?'}};
  }};
  window.voiceDispose=mountConversation(document.querySelector('#voice'),{courseDirection:direction},{api,now:()=>window.voiceTest.now,tickMs:10,player:{stop:()=>{window.voiceTest.stops++;return Promise.resolve();},play:async entry=>{window.voiceTest.plays.push(entry.text);}}});
 },{direction,remaining,mode});
}
async function start(page){await page.locator('[data-talk-preview]').click();if(await page.locator('[data-talk-intro-listen]').getAttribute('aria-pressed')==='true')await page.locator('[data-talk-intro-listen]').click();await expect(page.locator('[data-talk-start]')).toBeDisabled();await page.locator('[data-talk-consent]').check();await page.locator('[data-talk-start]').click();}
test('transient heartbeat failure preserves conversation; confirmed expiry ends it',async({page})=>{
 await fixture(page);await start(page);await expect(page.locator('.talk-reply')).toBeVisible();
 await page.evaluate(async()=>{window.voiceTest.heartbeatError='unavailable';await window.voiceTest.heartbeat();});
 await expect(page.locator('.talk-reply')).toBeVisible();expect(await page.evaluate(()=>window.voiceTest.calls.filter(c=>c.action==='end').length)).toBe(0);
 await page.evaluate(async()=>{window.voiceTest.heartbeatError=null;await window.voiceTest.heartbeat();});await expect(page.locator('.talk-reply')).toBeVisible();
 await page.evaluate(async()=>{window.voiceTest.heartbeatError='session_expired';await window.voiceTest.heartbeat();});
 await expect(page.locator('[data-talk-preview]')).toBeVisible();expect(await page.evaluate(()=>window.voiceTest.calls.filter(c=>c.action==='end').length)).toBe(1);
});
async function fit(page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);for(const button of await page.locator('button:visible').all())expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(43.9);}
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`voice conversation ${direction} ${width}: consent, heard text, reply and 600s cutoff`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await fixture(page,{direction,width});
 await expect(page.locator('[data-talk-time]')).toHaveText('10:00');await expect(page.locator('.talk-paid')).toContainText(direction==='ja-ko'?'有料':'유료');await fit(page);await page.screenshot({path:`output/voice-ready-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
 expect(await page.evaluate(()=>window.voiceTest.calls.map(c=>c.action))).toEqual(['status']);await start(page);
 await expect(page.locator('.talk-reply')).toHaveCount(1);await page.locator('[data-speaking-record]').click();await expect(page.locator('#talk-answer')).not.toHaveValue('');
 expect(await page.evaluate(()=>window.voiceTest.calls.filter(c=>c.action==='turn').length)).toBe(0);
 await page.locator('.talk-form [type=submit]').click();await expect(page.locator('.talk-reply')).toHaveCount(2);await expect(page.locator('.talk-user')).toHaveCount(1);await fit(page);
 await page.screenshot({path:`output/voice-active-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
 await page.evaluate(()=>window.voiceTest.now=600001);await expect(page.locator('[data-talk-time]')).toHaveText('0:00');await expect(page.locator('[data-speaking-record]')).toHaveCount(0);await expect(page.locator('[data-talk-start]')).toHaveCount(0);expect(errors).toEqual([]);
});
test('voice retry keeps request ID; stop aborts delayed reply',async({page})=>{await fixture(page,{mode:'offline'});await start(page);await page.locator('#talk-answer').fill('コーヒーが好きです。');await page.locator('.talk-form [type=submit]').click();await expect(page.locator('[data-talk-retry]')).toBeVisible();await page.locator('[data-talk-retry]').click();await expect(page.locator('.talk-reply')).toHaveCount(2);const ids=await page.evaluate(()=>window.voiceTest.calls.filter(c=>c.action==='turn').map(c=>c.body.requestId));expect(ids[0]).toBe(ids[1]);await page.evaluate(()=>window.voiceTest.mode='hold');await page.locator('#talk-answer').fill('hello');await page.locator('.talk-form [type=submit]').click();await expect(page.locator('.talk-status')).toBeVisible();await page.locator('[data-talk-end]').click();await expect(page.locator('[data-talk-preview]')).toBeVisible();await expect(page.locator('.talk-reply')).toHaveCount(0);});
test('empty daily quota and disabled configuration do not start recording',async({page})=>{await fixture(page,{remaining:0});await expect(page.locator('[data-talk-start]')).toHaveCount(0);await expect(page.locator('#voice')).toContainText('내일');await fixture(page,{mode:'disabled'});await expect(page.locator('#voice')).toContainText('준비');expect(await page.evaluate(()=>window.voiceTest.calls)).toEqual([]);});
for(const direction of ['ko-ja','ja-ko'])test(`nav moves letters next to settings ${direction}`,async({page})=>{
 await page.route('**/src/voice-conversation-config.js',r=>r.fulfill({contentType:'application/javascript',body:'export const voiceConversationConfig={enabled:false};'}));
 await page.setViewportSize({width:320,height:740});await page.addInitScript(({state,direction})=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify({...state,courseDirection:direction,onboarded:true,uiGuideSeenVersion:2,koreanGuideSeenVersion:1,onboardingLevel:2,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}}));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{state:freshState(),direction});
 await page.goto('/playable.html');await expect(page.locator('.tabs [data-action=kana-chart]')).toHaveCount(0);await expect(page.locator('.app-header-letters + .app-header-settings')).toHaveCount(1);await page.locator('.app-header-letters').click();await expect(page.locator('dialog[open]')).toBeVisible();await page.keyboard.press('Escape');await page.locator('.tabs [data-action=conversation]').click();await expect(page.locator('[data-conversation-root]')).toBeVisible();await expect(page.locator('.tabs [data-action=conversation]')).toHaveAttribute('aria-current','page');await fit(page);
});

test('native permission preflight cannot spend time before approval',async({page})=>{
 await fixture(page);await page.evaluate(()=>{const original=window.Capacitor.nativePromise;window.Capacitor.nativePromise=async(p,m,a)=>m==='requestPermissions'?{microphone:'denied'}:original(p,m,a);});
 await start(page);await expect(page.locator('[data-talk-settings]')).toBeVisible();expect(await page.evaluate(()=>window.voiceTest.calls.some(c=>c.action==='start'||c.action==='turn'))).toBe(false);
});
test('permission overlay keeps active session, real background ends it',async({page})=>{
 await fixture(page);await start(page);await expect(page.locator('.talk-reply')).toBeVisible();
 await page.evaluate(()=>{window.Capacitor.addListener=()=>({remove(){}});const original=window.Capacitor.nativePromise;window.Capacitor.nativePromise=async(p,m,a)=>m==='status'?{readyEvents:true}:m==='recognize'?new Promise(resolve=>{window.resolveVoice=resolve;}):original(p,m,a);});
 await page.locator('[data-speaking-record]').click();await expect(page.locator('[data-speaking-record]')).toBeDisabled();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});expect(await page.evaluate(()=>window.voiceTest.calls.filter(c=>c.action==='end').length)).toBe(0);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));window.resolveVoice({text:'hello'});});await expect(page.locator('#talk-answer')).toHaveValue('hello');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('[data-talk-preview]')).toBeVisible();expect(await page.evaluate(()=>window.voiceTest.calls.filter(c=>c.action==='end').length)).toBe(1);
});
test('header panels and global setting renders preserve active conversation',async({page})=>{
 await page.addInitScript(({state})=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify({...state,onboarded:true,uiGuideSeenVersion:2,onboardingLevel:2,settings:{sound:false,motion:'off',textScale:1,audioRate:1}}));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));localStorage.setItem('seodang.community.session.v1',JSON.stringify({access_token:'test',refresh_token:'test',expires_at:9999999999,user:{id:'11111111-1111-4111-8111-111111111111'}}));},{state:freshState()});
 await page.route('**/src/voice-conversation-config.js',r=>r.fulfill({contentType:'application/javascript',body:"export const voiceConversationConfig={enabled:true,url:'https://voice.invalid/talk',authURL:'https://voice.invalid',key:'public'};"}));
 const calls=[];await page.route('https://voice.invalid/talk',r=>{const body=r.request().postDataJSON();calls.push(body);return r.fulfill({json:{remainingSeconds:580,...(body.action==='start'?{sessionId:body.sessionId}:{}),...(body.action==='turn'?{reply:{text:'こんにちは。元気ですか？',meaning:'안녕하세요. 잘 지내요?'}}:{})}});});
 await page.goto('/playable.html');await page.locator('.tabs [data-action=conversation]').click();await start(page);await expect(page.locator('.talk-reply')).toBeVisible();
 await page.locator('.app-header-letters').click();await expect(page.locator('dialog[open]')).toBeVisible();await page.locator('dialog [data-action=close]').click();await expect(page.locator('dialog[open]')).toHaveCount(0);await expect(page.locator('.talk-reply')).toBeVisible();
 await page.locator('.app-header-settings').click();await page.locator('[data-setting=textScale]').selectOption('1.2');await page.keyboard.press('Escape');await expect(page.locator('.talk-reply')).toBeVisible();expect(calls.filter(c=>c.action==='end')).toHaveLength(0);
 await page.locator('.tabs [data-action=home]').click();await expect.poll(()=>calls.filter(c=>c.action==='end').length).toBe(1);
});

test('topic introductions, replay and switching never start the clock or send an AI request',async({page})=>{
 await fixture(page);await page.locator('[data-talk-topic=cafe]').click();await page.locator('[data-talk-preview]').click();
 await expect(page.locator('.talk-reply')).toContainText('カフェに来ました');await expect(page.locator('[data-talk-consent]')).not.toBeChecked();
 await page.evaluate(()=>window.voiceTest.now=900000);await expect(page.locator('[data-talk-time]')).toHaveText('10:00');
 await page.locator('[data-talk-intro-listen]').click();await page.locator('[data-talk-other]').click();await page.locator('[data-talk-topic=travel]').click();await page.locator('[data-talk-preview]').click();
 await expect(page.locator('.talk-reply')).toContainText('旅行');expect(await page.evaluate(()=>window.voiceTest.calls.map(c=>c.action))).toEqual(['status']);
 await page.locator('[data-talk-consent]').check();await page.locator('[data-talk-start]').click();await page.locator('#talk-answer').fill('京都に行きたいです');await page.locator('.talk-form [type=submit]').click();
 const turn=await page.evaluate(()=>window.voiceTest.calls.find(c=>c.action==='turn').body);expect(turn.topic).toBe('travel');expect(turn.first).toBe(false);expect(turn.messages).toEqual([]);
});
test('intro playback blocks start until stopped and background stops it without a lease',async({page})=>{
 await fixture(page);await page.evaluate(()=>{window.voiceDispose();window.voiceTest.calls=[];});
 await page.evaluate(async()=>{const {mountConversation}=await import('/src/voice-conversation.js');window.voiceDispose=mountConversation(document.querySelector('#voice'),{courseDirection:'ja-ko'},{api:{enabled:true,request:async action=>{window.voiceTest.calls.push(action);return {remainingSeconds:600};}},player:{stop:async()=>{window.voiceTest.releaseIntro?.();},play:()=>new Promise(resolve=>{window.voiceTest.releaseIntro=resolve;})}});});
 await page.locator('[data-talk-preview]').click();await page.locator('[data-talk-consent]').check();await expect(page.locator('[data-talk-start]')).toBeDisabled();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('[data-talk-intro-listen]')).toHaveAttribute('aria-pressed','false');expect(await page.evaluate(()=>window.voiceTest.calls)).toEqual(['status']);
});
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`topic screens with app header ${direction} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844});
 await page.addInitScript(({state,direction})=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify({...state,courseDirection:direction,onboarded:true,uiGuideSeenVersion:2,koreanGuideSeenVersion:1,onboardingLevel:2,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}}));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));localStorage.setItem('seodang.community.session.v1',JSON.stringify({access_token:'test',refresh_token:'test',expires_at:9999999999,user:{id:'11111111-1111-4111-8111-111111111111'}}));},{state:freshState(),direction});
 await page.route('**/src/voice-conversation-config.js',r=>r.fulfill({contentType:'application/javascript',body:"export const voiceConversationConfig={enabled:true,url:'https://voice.invalid/talk',authURL:'https://voice.invalid',key:'public'};"}));
 const calls=[];await page.route('https://voice.invalid/talk',r=>{calls.push(r.request().postDataJSON());return r.fulfill({json:{remainingSeconds:600}});});
 await page.goto('/playable.html');await page.locator('.tabs [data-action=conversation]').click();await expect(page.locator('[data-talk-preview]')).toBeVisible();await page.locator('.talk-topic img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await fit(page);
 await page.screenshot({path:`output/topic-ready-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-talk-topic=cafe]').click();await page.locator('[data-talk-preview]').click();await expect(page.locator('.talk-intro-preview')).toBeVisible();await page.locator('.talk-topic-art').evaluate(i=>i.decode());await fit(page);
 const pair=page.locator('.talk-intro-preview .button-pair');expect(await pair.evaluate(el=>getComputedStyle(el).flexDirection)).toBe('row');await page.screenshot({path:`output/topic-intro-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
 expect(calls.map(c=>c.action)).toEqual(['status']);await expect(page.locator('[data-talk-time]')).toHaveText('10:00');
});

// Human-message badge is independent of AI conversation and must never hit production in this suite.
test.beforeEach(async({page})=>{await page.route('**/rpc/community_unread',route=>route.fulfill({json:false}));});

for(const developmentMode of [false,true])for(const direction of ['ko-ja','ja-ko'])test(`AI conversation is development-only ${developmentMode} ${direction}`,async({page})=>{
 await page.route('**/src/build-config.js',route=>route.fulfill({contentType:'application/javascript',body:`export const developmentMode=${developmentMode};export const appVersion='test';`}));
 await page.setViewportSize({width:390,height:844});await page.addInitScript(({state,direction})=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify({...state,courseDirection:direction,onboarded:true,uiGuideSeenVersion:2,koreanGuideSeenVersion:1,onboardingLevel:2,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}}));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{state:freshState(),direction});
 const requests=[];page.on('request',r=>requests.push(r.url()));await page.goto('/playable.html');
 await expect(page.locator('.tabs>.tab')).toHaveCount(developmentMode?4:3);await expect(page.locator('.tabs [data-action=conversation]')).toHaveCount(developmentMode?1:0);
 for(const width of [320,390])for(const scale of [1,1.2]){
  await page.setViewportSize({width,height:844});
  await page.evaluate(scale=>document.documentElement.style.setProperty('--text-scale',String(scale)),scale);
  const offsets=await page.locator('.tabs').evaluate(nav=>{
   const box=nav.getBoundingClientRect(),style=getComputedStyle(nav);
   const top=box.top+parseFloat(style.borderTopWidth)+parseFloat(style.paddingTop);
   const bottom=box.bottom-parseFloat(style.paddingBottom);
   return [...nav.querySelectorAll('.tab')].map(tab=>{
    const icon=tab.querySelector('svg').getBoundingClientRect(),label=tab.querySelector('span').getBoundingClientRect();
    return Math.abs((icon.top+label.bottom)/2-(top+bottom)/2);
   });
  });
  for(const offset of offsets)expect(offset).toBeLessThanOrEqual(0.5);
 }
 expect(await page.evaluate(async()=>{const {voiceConversationConfig}=await import('/src/voice-conversation-config.js');return voiceConversationConfig.enabled;})).toBe(developmentMode);
 if(!developmentMode){
  await page.evaluate(()=>{const button=document.createElement('button');button.dataset.action='conversation';document.querySelector('.shell').append(button);button.click();button.remove();});
  await expect(page.locator('[data-conversation-root]')).toHaveCount(0);await expect(page.locator('.learning-map')).toBeVisible();
  const result=await page.evaluate(async()=>{const {createConversationAPI}=await import('/src/voice-conversation-api.js');let calls=0;const api=createConversationAPI({fetcher:()=>{calls++;},auth:{ensureDeviceSession:()=>{calls++;}}});try{await api.request('status');return {calls};}catch(error){return {calls,error:error.message};}});
  expect(result).toEqual({calls:0,error:'unavailable'});expect(requests.some(url=>url.includes('/voice-conversation.js')||url.includes('/functions/v1/voice-conversation'))).toBe(false);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);for(const tab of await page.locator('.tabs>.tab').all())expect((await tab.boundingBox()).height).toBeGreaterThanOrEqual(44);await page.screenshot({path:`output/release-no-ai-${direction}-${test.info().project.name}.png`});
 }
});
