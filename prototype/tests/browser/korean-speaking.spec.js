import {test,expect} from '@playwright/test';import {freshState} from '../../src/engine.js';import {freshKoreanProgress} from '../../src/korean-state.js';
for(const width of [320,390])test(`first answer opens speaking and skip continues at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});const s={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:'ja-ko',onboardingLevel:2,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1},korean:{version:4,active:'3-1',lessons:{'3-1':{...freshKoreanProgress('3-1'),phase:'quiz',started:true,caseSeen:true}}}};
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},s);
 await page.goto('/playable.html');await page.locator('[data-action="korean"][data-id="3-1"]').first().click();await page.locator('[data-choice="resume"]').click();
 await page.locator('[data-action="korean-select"][data-id="0"]').click();await page.locator('[data-action="korean-check"]').click();
 await expect(page.locator('.korean-speaking h1')).toHaveText('スキップして進もう');await expect(page.locator('[data-speaking-next]')).toBeDisabled();await expect(page.locator('[data-speaking-next]')).toBeHidden();const tops=await page.locator('.speaking-navigation button:visible').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().top));expect(tops).toHaveLength(2);expect(Math.abs(tops[0]-tops[1])).toBeLessThan(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const positions=await page.evaluate(()=>({mic:document.querySelector('[data-speaking-record]').getBoundingClientRect().bottom,text:document.querySelector('.korean-speaking h2').getBoundingClientRect().top}));expect(positions.mic).toBeLessThan(positions.text);
 await page.screenshot({path:`output/korean-speaking-${width}-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-speaking-skip]').click();await expect(page.locator('.korean-learn')).toContainText('저는 일본 사람이에요.');
});
test('speech UI handles mismatch, success, denied permission and cancellation without storing transcript',async({page})=>{
 await page.route('**/speaking-test',r=>r.fulfill({contentType:'text/html',body:'<html><body><div id="root"></div></body></html>'}));await page.goto('/speaking-test');
 await page.evaluate(async()=>{
  const m=await import('/src/korean-speaking.js');window.speechModule=m;window.nextCount=0;window.cancelCount=0;
  document.querySelector('#root').innerHTML=m.renderKoreanSpeaking(()=> '');window.disposeSpeech=m.mountKoreanSpeaking(document.querySelector('#root'),{stop(){},advance(){window.nextCount++;},recognize(){return new Promise((resolve,reject)=>{window.recognizeResolve=resolve;window.recognizeReject=reject;});},cancel:async()=>{window.cancelCount++;},end:async()=>{}});
 });
 const mic=page.locator('[data-speaking-record]'),next=page.locator('[data-speaking-next]'),status=page.locator('[data-speaking-status]');
 await mic.click();await expect(mic).toHaveAttribute('aria-label','録音を終える');await expect(mic.locator('svg')).toBeVisible();await page.evaluate(()=>window.recognizeResolve({text:'저는 회사원이에요'}));await expect(status).toHaveText('もう一度、話してみよう');await expect(page.locator('[data-speaking-mood]')).toHaveAttribute('data-speaking-mood','retry');await expect(next).toBeDisabled();
 await mic.click();await page.evaluate(()=>window.recognizeReject({code:'PERMISSION_DENIED'}));await expect(status).toContainText('許可');await expect(next).toBeDisabled();
 await mic.click();await page.evaluate(()=>window.recognizeResolve({text:'저는 학생이에요.'}));await expect(status).toHaveText('よくできたね！');await expect(page.locator('[data-speaking-mood]')).toHaveAttribute('data-speaking-mood','happy');await expect(next).toBeEnabled();await expect(next).toBeVisible();await expect(page.locator('[data-speaking-skip]')).toBeHidden();await next.click();expect(await page.evaluate(()=>window.nextCount)).toBe(1);
 await page.evaluate(()=>{window.disposeSpeech();window.recognizeResolve({text:'late'});});expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});
for(const width of [320,390])test(`both languages use current sentence and native locale at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.route('**/speaking-all',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/learning-map.css"><link rel="stylesheet" href="/src/header.css"></head><body class="learning-app"></body></html>'}));await page.goto('/speaking-all');await page.evaluate(()=>document.documentElement.style.setProperty('--text-scale','1.2'));
 await page.evaluate(async()=>{
  const style=document.createElement('link');style.rel='stylesheet';style.href='/src/speaking.css';document.head.append(style);
  window.speechModule=await import('/src/korean-speaking.js');
  const ko=(await import('/src/korean-content.js')).koreanContent,scenarios=(await import('/src/scenario-content.js')).scenarioContent;
  window.koLines=['3-1','3-4','3-2','3-3'].flatMap(id=>ko[id]).concat(scenarios['ja-ko']['2'].items);
  const {sentenceCourse}=await import('/src/sentence-content.js');window.jaLines=[3,0,1,2].flatMap(id=>sentenceCourse({sentenceActive:id}).sentences).concat(scenarios['ko-ja']['2'].items.map(item=>({...item,parts:item.phrases.map(text=>[text])})));
  window.Capacitor={isNativePlatform:()=>true,getPlatform:()=> 'ios',nativePromise:async(name,method,options)=>{if(method==='recognize'){window.usedLocale=options.locale;return {text:window.targetText};}return {};}};
 });
 for(const locale of ['ko-KR','ja-JP'])for(let index=0;index<18;index++){
  const target=await page.evaluate(({locale,index})=>{window.disposeSpeech?.();const item=(locale==='ko-KR'?window.koLines:window.jaLines)[index];window.targetText=item.spoken||item.text;document.body.innerHTML=window.speechModule.renderKoreanSpeaking(()=>'',item.text,locale,item.id,locale==='ja-JP'?item.parts.flatMap(([text],i)=>i&&item.text.includes(' ')?[' ',text]:[text]):undefined,{spoken:item.spoken});window.disposeSpeech=window.speechModule.mountKoreanSpeaking(document.body,{stop(){},advance(){}});return item.text;},{locale,index});
  await expect(page.locator('.korean-speaking h2')).toHaveText(target);
  await page.locator('[data-speaking-record]').click();await expect(page.locator('[data-speaking-next]')).toBeVisible();expect(await page.evaluate(()=>window.usedLocale)).toBe(locale);
  await expect(page.locator('[data-speaking-status]')).toHaveText(locale==='ja-JP'?'잘했어요!':'よくできたね！');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  if(index===17)await page.screenshot({path:`output/speaking-${locale}-${width}-${test.info().project.name}.png`,fullPage:true});
 }
});
