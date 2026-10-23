import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
import {openMapLesson} from './learning-map-fixture.js';
import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
for(const width of [320,390])test(`quoted explanations stay together at ${width}px with large text`,async({page})=>{
 await page.setViewportSize({width,height:844});
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,courseDirection:'ja-ko',onboardingLevel:4,koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
 await useCatalogWithoutPacks(page);
 await page.goto('/playable.html');await openMapLesson(page,{kind:'scenario',id:'6'});await page.locator('[data-action="scenario-next"]').click();await page.locator('.lesson-explanation summary').click();
 const quotes=page.locator('.lesson-explanation .quoted-text');await expect(quotes).toHaveCount(3);
 for(const quote of await quotes.all())expect(await quote.evaluate(el=>el.getBoundingClientRect().height/parseFloat(getComputedStyle(el).lineHeight))).toBeLessThan(1.5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:`output/quoted-explanation-${width}-${test.info().project.name}.png`,fullPage:true});
 const long='「とても長い文章でも画面の幅を超えずに内容を省略せず最後まで読めるように表示します」';
 await page.evaluate(async text=>{const {quotedText}=await import('/src/ui.js');const p=document.querySelector('.lesson-explanation p');p.innerHTML=quotedText(text);},long);
 await expect(page.locator('.lesson-explanation p')).toHaveText(long);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

for(const width of [320,390])for(const index of [0,1,2])test(`3-5 explanation and answer feedback preserve quotes at ${width}px item ${index}`,async({page})=>{
 await page.setViewportSize({width,height:844});
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,courseDirection:'ja-ko',onboardingLevel:4,koreanGuideSeenVersion:1,scenarioActive:'7',scenarios:{'ja-ko:scenario:7':{version:1,started:true,phase:'learn',index,selected:null,tokens:[],checked:false,retry:false,completed:false,attempts:0}},settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
 await useCatalogWithoutPacks(page);
 await page.goto('/playable.html');await openMapLesson(page,{kind:'scenario',id:'7'});await page.locator('[data-choice="resume"]').click();await page.locator('.lesson-explanation summary').click();
 const check=async selector=>{
  const quotes=page.locator(`${selector} .quoted-text`);expect(await quotes.count()).toBeGreaterThan(0);
  for(const quote of await quotes.all()){
   const bounds=await quote.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);return [...r.getClientRects()].map(b=>({top:b.top,bottom:b.bottom}));});
   expect(new Set(bounds.map(b=>Math.round(b.top))).size).toBe(1);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 };
 await check('.lesson-explanation');const hint=await page.locator('.lesson-explanation p').textContent();await page.locator('[data-action="scenario-next"]').click();
 for(const choice of [(index+1)%3,index]){
  await page.locator(`[data-action="scenario-select"][data-id="${choice}"]`).click();await page.locator('[data-action="scenario-check"]').click();
  if(choice===index){await expect(page.locator('.scenario-feedback')).toContainText(hint);await check('.scenario-feedback');}else await expect(page.locator('.scenario-feedback')).not.toContainText(hint);await expect(page.locator('.scenario-feedback .text-phrase')).toHaveCount(0);
 }
 await page.screenshot({path:`output/quoted-level35-${index}-${width}-${test.info().project.name}.png`,fullPage:true});
});
