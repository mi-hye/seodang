import {test,expect} from '@playwright/test';

async function speaking(page,{width=390,uiLocale='ja',onDevice=false,permission='prompt',available=true,readyEvents=false,platform='android'}={}){
 await page.setViewportSize({width,height:844});
 await page.route('**/android-speaking-test',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/header.css"><link rel="stylesheet" href="/src/speaking.css"></head><body class="learning-app"><div id="root"></div></body></html>'}));
 await page.goto('/android-speaking-test');
 await page.evaluate(async config=>{
  document.documentElement.style.setProperty('--text-scale','1.2');
  window.calls=[];window.nativeStatus={onDevice:config.onDevice,permission:config.permission,available:config.available,readyEvents:config.readyEvents};window.nextCount=0;
  window.Capacitor={isNativePlatform:()=>true,getPlatform:()=> config.platform,nativePromise:async(plugin,method,args)=>{
   window.calls.push({plugin,method,args});
   if(method==='status')return window.nativeStatus;
   if(method==='recognize')return new Promise((resolve,reject)=>{window.heard=resolve;window.failed=reject;});
   return {};
  }};
  window.readyListeners=[];window.removedListeners=0;window.Capacitor.addListener=(plugin,event,callback)=>{window.readyListeners.push(callback);return {remove(){window.removedListeners++;}};};
  const m=await import('/src/korean-speaking.js');const root=document.querySelector('#root');
  root.innerHTML=m.renderKoreanSpeaking(()=>'',undefined,'ko-KR','',undefined,{uiLocale:config.uiLocale});
  window.disposeSpeech=m.mountKoreanSpeaking(root,{stop(){},advance(){window.nextCount++;}});
 },{uiLocale,onDevice,permission,available,readyEvents,platform});
}

for(const platform of ['ios','android'])test(`${platform} uses real alternatives and waits for microphone readiness`,async({page})=>{
 await speaking(page,{platform,onDevice:true,permission:'granted',readyEvents:true});
 const mic=page.locator('[data-speaking-record]'),status=page.locator('[data-speaking-status]');
 await mic.click();await expect(status).toHaveText('マイクを準備しているよ');await expect(mic).toBeDisabled();
 // An iOS permission overlay may hide the WebView before capture begins.
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 expect(await page.evaluate(()=>window.calls.some(c=>c.method==='cancel'))).toBe(false);
 await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));
  window.readyListeners.at(-1)({requestId:window.calls.find(c=>c.method==='recognize').args.requestId});
 });
 await expect(mic).toBeEnabled();await expect(mic).toHaveAttribute('aria-pressed','true');
 await page.evaluate(()=>window.heard({text:'저는 학성이에요',alternatives:['저는 학성이에요','저는 학생이에요.']}));
 await expect(page.locator('[data-speaking-next]')).toBeVisible();
 await expect(page.locator('[data-speaking-transcript]')).toHaveText('聞き取った文：저는 학생이에요.');
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 await mic.click();await page.evaluate(()=>window.heard({text:'저는 학생이 아니에요',alternatives:['저는 회사원이에요']}));
 await expect(page.locator('[data-speaking-next]')).toBeHidden();await expect(status).toHaveText('もう一度、話してみよう');
 await mic.click();await page.evaluate(()=>window.heard({text:'',alternatives:[]}));
 await expect(status).toHaveText('声が聞き取れなかったよ。もう一度話してみてね。');
 await expect(page.locator('[data-speaking-next]')).toBeHidden();
});

for(const uiLocale of ['ko','ja'])for(const width of [320,390])test(`Android ${uiLocale} permission recovery and consent at ${width}`,async({page})=>{
 await speaking(page,{width,uiLocale});
 const mic=page.locator('[data-speaking-record]'),settings=page.locator('[data-speaking-settings]');
 await mic.click();await expect(page.locator('.speaking-consent')).toBeVisible();
 expect(await page.evaluate(()=>window.calls.some(c=>c.method==='recognize'))).toBe(false);
 const buttons=await page.locator('.speaking-consent .button-pair button').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().top));expect(Math.abs(buttons[0]-buttons[1])).toBeLessThan(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:`output/mic-consent-${uiLocale}-${width}-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-decline]').click();await expect(mic).toBeEnabled();
 expect(await page.evaluate(()=>window.calls.some(c=>c.method==='recognize'))).toBe(false);
 await mic.click();await page.locator('[data-accept]').click();await expect(mic).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>window.calls.find(c=>c.method==='recognize').args)).toEqual({locale:'ko-KR',allowNetwork:true,preferSystem:false});
 await page.evaluate(()=>window.failed({code:'PERMISSION_DENIED'}));await expect(settings).toBeVisible();await expect(mic).toBeEnabled();
 await page.screenshot({path:`output/mic-permission-${uiLocale}-${width}-${test.info().project.name}.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await settings.click();expect(await page.evaluate(()=>window.calls.filter(c=>c.method==='openSettings').length)).toBe(1);
 await page.evaluate(()=>{window.nativeStatus.permission='granted';window.dispatchEvent(new Event('focus'));});await expect(settings).toBeHidden();
 expect(await page.evaluate(()=>window.calls.filter(c=>c.method==='recognize').length)).toBe(1);
 await mic.click();await expect(mic).toHaveAttribute('aria-pressed','true');await page.evaluate(()=>window.heard({text:'저는 학생이에요.'}));
 await expect(page.locator('[data-speaking-next]')).toBeVisible();await page.locator('[data-speaking-next]').click();expect(await page.evaluate(()=>window.nextCount)).toBe(1);
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});

test('Android permanent denial opens settings without a new recording or service consent',async({page})=>{
 await speaking(page,{permission:'denied'});await page.locator('[data-speaking-record]').click();await expect(page.locator('[data-speaking-settings]')).toBeVisible();await expect(page.locator('dialog')).toHaveCount(0);
 expect(await page.evaluate(()=>window.calls.some(c=>c.method==='recognize'))).toBe(false);
 await page.locator('[data-speaking-settings]').click();expect(await page.evaluate(()=>window.calls.some(c=>c.method==='openSettings'))).toBe(true);
});
test('Android on-device recognition never silently switches to network on language failure',async({page})=>{
 await speaking(page,{onDevice:true,permission:'granted'});await page.locator('[data-speaking-record]').click();await expect(page.locator('[data-speaking-record]')).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>window.calls.find(c=>c.method==='recognize').args.allowNetwork)).toBe(false);
 await page.evaluate(()=>window.failed({code:'LANGUAGE_UNAVAILABLE'}));await expect(page.locator('dialog')).toBeVisible();
 expect(await page.evaluate(()=>window.calls.filter(c=>c.method==='recognize').length)).toBe(1);
 await page.locator('[data-decline]').click();await expect(page.locator('[data-speaking-record]')).toBeEnabled();
 expect(await page.evaluate(()=>window.calls.filter(c=>c.method==='recognize').length)).toBe(1);
 await page.locator('[data-speaking-record]').click();await page.locator('[data-accept]').click();
 await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.method==='recognize').length)).toBe(2);
 expect(await page.evaluate(()=>window.calls.filter(c=>c.method==='recognize')[1].args)).toEqual({locale:'ko-KR',allowNetwork:true,preferSystem:true});
 await page.evaluate(()=>window.heard({text:'저는 학생이에요.'}));await expect(page.locator('[data-speaking-next]')).toBeVisible();
});
test('Android missing recognition service preserves skip and never records',async({page})=>{
 await speaking(page,{available:false});await page.locator('[data-speaking-record]').click();await expect(page.locator('[data-speaking-status]')).toHaveText('端末の音声認識を使えないよ');
 await page.locator('[data-speaking-skip]').click();expect(await page.evaluate(()=>window.nextCount)).toBe(1);
 expect(await page.evaluate(()=>window.calls.some(c=>c.method==='recognize'))).toBe(false);
});
test('closing consent or leaving the lesson cannot start a late recording',async({page})=>{
 await speaking(page);await page.locator('[data-speaking-record]').click();await expect(page.locator('dialog')).toBeVisible();await page.evaluate(()=>document.querySelector('dialog').dispatchEvent(new Event('cancel',{cancelable:true})));await expect(page.locator('dialog')).toHaveCount(0);
 await page.locator('[data-speaking-record]').click();await expect(page.locator('dialog')).toBeVisible();await page.evaluate(()=>window.disposeSpeech());await expect(page.locator('dialog')).toHaveCount(0);expect(await page.evaluate(()=>window.calls.some(c=>c.method==='recognize'))).toBe(false);
});


test('Android shows recording only after its matching native ready event',async({page})=>{
 await speaking(page,{onDevice:true,permission:'granted',readyEvents:true});
 const mic=page.locator('[data-speaking-record]'),status=page.locator('[data-speaking-status]');
 await mic.click();await expect(status).toHaveText('マイクを準備しているよ');await expect(mic).toBeDisabled();await expect(mic).toHaveAttribute('aria-pressed','false');
 await page.evaluate(()=>window.readyListeners[0]({requestId:'stale'}));await expect(mic).toHaveAttribute('aria-pressed','false');
 await page.evaluate(()=>window.readyListeners[0]({requestId:window.calls.find(c=>c.method==='recognize').args.requestId}));
 await expect(mic).toHaveAttribute('aria-pressed','true');await expect(mic).toBeEnabled();await expect(status).toHaveText('聞いているよ');
 await mic.click();expect(await page.evaluate(()=>window.calls.filter(c=>c.method==='finish').length)).toBe(1);
 await page.evaluate(()=>window.heard({text:'저는 학생이에요.'}));await expect(page.locator('[data-speaking-next]')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.removedListeners)).toBe(1);
});

test('an immediate Android startup failure stays idle and can be retried without stale ready events',async({page})=>{
 await speaking(page,{onDevice:true,permission:'granted',readyEvents:true});
 const mic=page.locator('[data-speaking-record]');await mic.click();
 await page.evaluate(()=>{window.firstId=window.calls.find(c=>c.method==='recognize').args.requestId;window.failed({code:'START_FAILED'});});
 await expect(page.locator('[data-speaking-status]')).toHaveText('音声認識を開始できなかったよ。もう一度試してね。');
 await expect(mic).toHaveAttribute('aria-pressed','false');await expect(mic).toBeEnabled();
 await mic.click();await page.evaluate(()=>{window.readyListeners[0]({requestId:window.firstId});window.readyListeners[1]({requestId:window.firstId});});
 await expect(mic).toBeDisabled();await expect(mic).toHaveAttribute('aria-pressed','false');
 await page.evaluate(()=>window.readyListeners[1]({requestId:window.calls.filter(c=>c.method==='recognize')[1].args.requestId}));
 await expect(mic).toHaveAttribute('aria-pressed','true');await page.evaluate(()=>window.heard({text:'저는 학생이에요.'}));
 await expect(page.locator('[data-speaking-next]')).toBeVisible();expect(await page.evaluate(()=>window.removedListeners)).toBe(2);
});

test('leaving during microphone preparation removes the listener and ignores a late ready event',async({page})=>{
 await speaking(page,{onDevice:true,permission:'granted',readyEvents:true});await page.locator('[data-speaking-record]').click();
 await page.evaluate(()=>{window.disposeSpeech();window.readyListeners[0]({requestId:window.calls.find(c=>c.method==='recognize').args.requestId});window.heard({text:'저는 학생이에요.'});});
 await expect(page.locator('[data-speaking-record]')).toHaveAttribute('aria-pressed','false');await expect(page.locator('[data-speaking-next]')).toBeHidden();
 expect(await page.evaluate(()=>window.removedListeners)).toBe(1);
});

for(const uiLocale of ['ko','ja'])for(const width of [320,390])test(`Android error feedback remains readable in ${uiLocale} at ${width}`,async({page})=>{
 await speaking(page,{width,uiLocale,onDevice:false,permission:'granted',readyEvents:true});
 const mic=page.locator('[data-speaking-record]'),status=page.locator('[data-speaking-status]');
 await mic.click();await page.locator('[data-accept]').click();
 await page.evaluate(()=>window.failed({code:'NETWORK_ERROR'}));
 await expect(status).toHaveText(uiLocale==='ko'?'인터넷 연결을 확인하고 다시 눌러 주세요.':'インターネット接続を確認して、もう一度試してね。');
 await expect(mic).toBeEnabled();await expect(mic).toHaveAttribute('aria-pressed','false');
 await page.screenshot({path:`output/mic-start-error-${uiLocale}-${width}-${test.info().project.name}.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 for(const code of ['AUDIO_ERROR','BUSY']){
  await mic.click();await page.evaluate(code=>window.failed({code}),code);
  await expect(status).toHaveText(uiLocale==='ko'?'마이크를 사용할 수 없어요. 잠시 후 다시 눌러 주세요.':'マイクを使えないよ。少し待って、もう一度試してね。');
  await expect(mic).toBeEnabled();
 }
 await mic.click();await page.evaluate(()=>{
  const requestId=window.calls.filter(c=>c.method==='recognize').at(-1).args.requestId;
  window.readyListeners.at(-1)({requestId});window.failed({code:'RECOGNITION_FAILED'});
 });
 await expect(status).toHaveText(uiLocale==='ko'?'다시 말해 봐요':'もう一度、話してみよう');
 await expect(mic).toBeEnabled();
 await mic.click();await page.evaluate(()=>window.heard({text:''}));
 await expect(status).toHaveText(uiLocale==='ko'?'목소리를 듣지 못했어요. 다시 말해 주세요.':'声が聞き取れなかったよ。もう一度話してみてね。');
 await expect(page.locator('[data-speaking-next]')).toBeHidden();
});
