import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {freshScenario} from '../../src/scenario-state.js';
import {prepareCourseExpansion} from '../../src/course-expansion-content.js';
import {courseExpansionReview} from '../../src/course-expansion-review.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
import {collectMapLessons,scrollMapSection} from './learning-map-fixture.js';
const key='seodang.web-prototype.v1';
async function setup(page,direction,width,extra={}){
 const s={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:direction,onboardingLevel:4,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1},...extra};
 await page.setViewportSize({width,height:740});await page.addInitScript(({key,s})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{key,s});
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');await expect(page.locator('.learning-map')).toBeVisible();
}
const resume=(direction,id='course3-11')=>({scenarioActive:id,scenarios:{[`${direction}:scenario:${id}`]:{...freshScenario(id),started:true,phase:'learn'}}});
async function wheelIntent(page,delta){
 const cancelled=await page.locator('.map-sections').evaluate((e,delta)=>{const event=new WheelEvent('wheel',{deltaY:delta,bubbles:true,cancelable:true});e.dispatchEvent(event);return event.defaultPrevented;},delta);
 expect(cancelled).toBe(false);
}
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`lazy sections ${direction} ${width}: current only, upward loading preserves anchor, no range navigation`,async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('seodang.map-pages.v1',JSON.stringify({'ko-ja:4':0,'ja-ko:4':0})));
 await setup(page,direction,width,resume(direction));
 const pages=page.locator('[data-map-page]'),anchor=page.locator('.map-choice[data-id="course3-11"]');
 await expect(pages).toHaveCount(1);await expect(pages).toHaveAttribute('data-map-page','1');
 await expect(page.locator('.map-section-heading,[data-action="map-page"],.map-dots')).toHaveCount(0);
 expect(await page.evaluate(()=>scrollY)).toBe(0);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(pages).toHaveCount(1);await page.screenshot({path:`output/lazy-map-current-${direction}-${width}-${test.info().project.name}.png`});
 const overview=page.locator('.map-overview'),before=await overview.boundingBox();await anchor.evaluate(e=>window.mapAnchor=e);
 await wheelIntent(page,-80);await expect(pages).toHaveCount(2);
 expect(Math.abs((await overview.boundingBox()).y-before.y)).toBeLessThan(2);
 expect(await anchor.evaluate(e=>e===window.mapAnchor)).toBe(true);
 expect((await collectMapLessons(page)).map(l=>l.number)).toEqual(Array.from({length:17},(_,i)=>i+1));
 await scrollMapSection(page,0);await wheelIntent(page,-80);await expect(pages).toHaveCount(2);
 await page.locator('[data-action="map-locate"]').click();await expect(anchor).toBeFocused();
 const located=await anchor.boundingBox();expect(located.y).toBeGreaterThan(64);expect(located.y+located.height).toBeLessThan(640);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.reload();await expect(pages).toHaveCount(1);await expect(pages).toHaveAttribute('data-map-page','1');
});
for(const direction of ['ko-ja','ja-ko'])test(`lazy append ${direction}: downwards input adds next section once`,async({page})=>{
 await setup(page,direction,390);
 const pages=page.locator('[data-map-page]');await expect(pages).toHaveCount(1);await expect(pages).toHaveAttribute('data-map-page','0');
 await page.evaluate(()=>{window.firstMapNode=document.querySelector('.map-choice');scrollTo(0,document.documentElement.scrollHeight);});
 await expect(pages).toHaveCount(1);const before=await page.locator('.map-choice').nth(9).boundingBox();
 await wheelIntent(page,100);await expect(pages).toHaveCount(2);
 expect(Math.abs((await page.locator('.map-choice').nth(9).boundingBox()).y-before.y)).toBeLessThan(2);
 expect(await page.evaluate(()=>window.firstMapNode===document.querySelector('.map-choice'))).toBe(true);
 await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await wheelIntent(page,100);await expect(pages).toHaveCount(2);
 await expect(page.locator('.map-coming-soon')).toHaveCount(1);
});

test('touch pull at document top loads earlier section without cancelling the gesture',async({page})=>{
 await setup(page,'ko-ja',390,resume('ko-ja'));
 const anchor=page.locator('.map-overview'),before=await anchor.boundingBox();
 const cancelled=await page.locator('.map-sections').evaluate(e=>{
  return ['touchstart','touchmove','touchend'].map((type,i)=>{const event=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(event,'touches',{value:i===2?[]:[{clientX:180,clientY:i===0?280:350}]});e.dispatchEvent(event);return event.defaultPrevented;});
 });
 expect(cancelled).toEqual([false,false,false]);await expect(page.locator('[data-map-page]')).toHaveCount(2);
 expect(Math.abs((await anchor.boundingBox()).y-before.y)).toBeLessThan(2);
});

test('keyboard can load earlier lessons with the focus-only edge control',async({page})=>{
 await setup(page,'ko-ja',320,resume('ko-ja'));
 const previous=page.locator('[data-map-load=previous]');await previous.focus();await page.keyboard.press('Enter');
 await expect(page.locator('[data-map-page]')).toHaveCount(2);
 const last=page.locator('[data-map-page="0"] .map-choice').last();await expect(last).toBeFocused();
 await page.keyboard.press(test.info().project.name==='webkit'?'Alt+Tab':'Tab');
 await expect(page.locator('.map-choice[data-id="course3-11"]')).toBeFocused();
});

test('native touch at the top can reveal the previous section',async({page,browserName})=>{
 test.skip(browserName!=='chromium','CDP native touch injection is available only in Chromium; WebKit passive-event handling is tested separately.');
 await setup(page,'ko-ja',390,resume('ko-ja'));
 const session=await page.context().newCDPSession(page);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:310}]});
 for(const y of [330,350,370,390])await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(page.locator('[data-map-page]')).toHaveCount(2);
 await expect(page.locator('[data-map-page="0"]')).toHaveCount(1);
 await session.detach();
});

test('settings rerender retains loaded range and language switch starts its own range',async({page})=>{
 await setup(page,'ko-ja',390,{...resume('ko-ja'),courseLevels:{'ja-ko':4},levelGuideSeen:{'ja-ko:4':true}});await wheelIntent(page,-100);
 await expect(page.locator('[data-map-page]')).toHaveCount(2);
 await page.locator('.app-header [data-action="settings"]').click();
 await page.locator('[data-setting="motion"]').selectOption('system');
 await expect(page.locator('[data-map-page]')).toHaveCount(2);
 await page.locator('[data-setting="course"]').selectOption('ja-ko');
 await expect(page.locator('[data-map-page]')).toHaveCount(1);await expect(page.locator('[data-map-page]')).toHaveAttribute('data-map-page','0');
});

test('prepending while overview is offscreen preserves the visible lesson position',async({page})=>{
 await setup(page,'ko-ja',390,resume('ko-ja'));
 const anchor=page.locator('.map-choice[data-id="course3-11"]');
 await page.evaluate(()=>scrollTo(0,400));const before=await anchor.boundingBox();
 expect((await page.locator('.map-overview').boundingBox()).y+(await page.locator('.map-overview').boundingBox()).height).toBeLessThan(64);
 await wheelIntent(page,-100);await expect(page.locator('[data-map-page]')).toHaveCount(2);
 expect(Math.abs((await anchor.boundingBox()).y-before.y)).toBeLessThan(2);
 await expect(page.locator('[data-map-page="0"] .map-stop').last().locator('.map-trail')).toBeVisible();
});

const cases=[['ko-ja','course3-8',4,'video','scene-jp3-9'],['ja-ko','course3-8',4,'video','scene-ko3-9'],['ko-ja','course4-11',5,'video','scene-jp4-12'],['ja-ko','course4-17',5,'expert',0],['ko-ja','course5-16',7,'scenario','course5-17'],['ja-ko','course1-17',0,'korean','3-1'],['ko-ja','course5-17',7,null,null]];
for(const [direction,id,level,nextKind,nextId]of cases)test(`completion follows map ${direction} ${id}`,async({page})=>{
 await prepareCourseExpansion(id);const progressKey=`${direction}:scenario:${id}`,tasks=courseExpansionReview(progressKey),last=tasks.at(-1);
 const scenarios={[progressKey]:{...freshScenario(id),started:true,phase:'quiz',index:2,checked:true,selected:0}},practices={[progressKey]:{version:1,caseVersion:1,count:6,index:5,round:0,mode:0,action:{type:'scenario-next'}}};
 await setup(page,direction,390,{onboardingLevel:level,scenarioActive:id,scenarios,practices});
 await page.locator(`.home-start-card[data-action="scenario"][data-id="${id}"]`).click();await expect(page.locator('.introduction-review')).toBeVisible();
 await page.locator(`[data-review-choice="${last.answer}"]`).click();await page.locator('[data-review-confirm]').click();await page.locator('[data-review-confirm]').click();
 const next=page.locator('[data-action="completed-next"]');await expect(page.locator('.practice-complete')).toBeVisible();
 await expect(next).toHaveText(nextKind?(direction==='ja-ko'?'次のレッスン':'다음 수업'):(direction==='ja-ko'?'学習ホームへ':'학습 홈으로'));
 await next.click();await expect(page.locator(`.view-${nextKind==='video'?'scenario':nextKind||'home'}`)).toBeVisible();
 if(nextKind)await expect.poll(async()=>{const state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);return nextKind==='korean'?state.korean.active:nextKind==='expert'?state.expertActive:nextKind==='video'?state.videoActive:state.scenarioActive;}).toBe(nextId);
});
