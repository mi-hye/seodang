import {test,expect} from '@playwright/test';import {freshState} from '../../src/engine.js';import {scenarioContent} from '../../src/scenario-content.js';
for(const id of ['6','7','13'])for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`${direction} hotel ${id} speaking at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.addInitScript(({s})=>{
 localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
 window.Capacitor={isNativePlatform:()=>true,getPlatform:()=> 'ios',isPluginAvailable:()=>false,nativePromise:async(plugin,method,args)=>{if(plugin==='SeodangRecognition'&&method==='recognize'){window.usedLocale=args.locale;return {text:document.querySelector('[data-speaking-spoken]').dataset.speakingSpoken};}return {};}};
 },{s:{...freshState(),onboarded:true,courseDirection:direction,onboardingLevel:id==='13'?2:4,koreanGuideSeenVersion:1,scenarioActive:id,scenarios:{[`${direction}:scenario:${id}`]:{version:1,started:true,phase:'speak',index:0,selected:null,tokens:[],checked:false,retry:false,completed:false,attempts:1}},settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}}});
 await page.route('**/assets/audio/catalog.json',async r=>{const res=await r.fetch(),c=await res.json();await r.fulfill({json:{...c,packs:{}}});});
 await page.goto('/playable.html');await page.locator(`[data-action="scenario"][data-id="${id}"]`).first().click();await page.locator('[data-choice="resume"]').click();
 const line=scenarioContent[direction][id].items[0];await expect(page.locator('.korean-speaking h2')).toHaveText(line.answer);await expect(page.locator('[data-speaking-status]')).toHaveText(line.prompt);await expect(page.locator('.app-header-title')).toContainText(id==='13'?'11.':id==='6'?'4.':'5.');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const boxes=await page.locator('.korean-speaking .audio-text-row').evaluate(el=>{const text=el.querySelector('h2').getBoundingClientRect(),speaker=el.querySelector('button').getBoundingClientRect();return {text:text.right,speaker:speaker.left};});expect(boxes.speaker).toBeGreaterThanOrEqual(boxes.text-1);
 await page.screenshot({path:`output/hotel-speaking-${id}-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-speaking-record]').click();await expect(page.locator('[data-speaking-next]')).toBeEnabled();expect(await page.evaluate(()=>window.usedLocale)).toBe(direction==='ko-ja'?'ja-JP':'ko-KR');await page.locator('[data-speaking-next]').click();await expect(page.locator('.case-lesson-count, .scenario-count')).toHaveCount(0);
});
