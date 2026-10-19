import {test,expect} from '@playwright/test';import {freshState} from '../../src/engine.js';
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])for(const id of [0,1,2,3])test(`discussion ${direction} ${id} at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,koreanGuideSeenVersion:1,onboardingLevel:7,courseDirection:direction,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
 await page.route('**/assets/audio/catalog.json',async r=>{const response=await r.fetch(),c=await response.json();await r.fulfill({json:{...c,packs:{}}});});
 await page.goto('/playable.html');await page.locator(`[data-action="expert"][data-id="${id}"]`).first().click();await expect(page.locator('.discussion-image')).toBeVisible();await expect(page.locator('.discussion-image')).toHaveJSProperty('complete',true);
 const next=async()=>{await page.waitForTimeout(500);await page.locator('[data-action="expert-next"]').click();};await next();await expect(page.locator('[data-action="expert-opinion"]')).toHaveCount(0);await expect(page.locator('.expert-discussion h1')).toHaveText(['새 맛집이 궁금한 친구','많이 둘러보고 싶은 친구','답장을 기다린 친구','주말에 만나고 싶은 친구'][id]);
 for(let i=0;i<4;i++){
  await expect(page.locator('.discussion-image')).toBeVisible();await expect(page.locator('.discussion-image')).toHaveJSProperty('naturalWidth',960);
  await expect(page.locator('.word-memory')).not.toHaveAttribute('open');await expect(page.locator('.audio-text-row')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.locator('.word-memory summary').click();await expect(page.locator('.word-memory-body p')).toBeVisible();if(direction==='ko-ja'){await page.locator('[data-action="lesson-kanji"]').click();await expect(page.locator('.kanji-definition')).toBeVisible();await page.locator('[data-kanji-close]').click();}else await expect(page.locator('[data-action="lesson-kanji"]')).toHaveCount(0);
  if(i===0){await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:`output/discussion-${direction}-${id}-${width}-${test.info().project.name}.png`,fullPage:true});}
  await next();
 }
 await expect(page.locator('[data-speaking-record]')).toBeVisible();await expect(page.locator('[data-speaking-status]')).toHaveText('건너뛰어도 괜찮아요');await page.locator('[data-speaking-skip]').click();await expect(page.locator('.discussion-coach')).toBeVisible();await next();await expect(page.locator('.practice-complete')).toBeVisible();await expect(page.locator('.practice-complete h1')).toHaveText('학습을 완료하셨습니다');
});
test('free opinion accepts a different sentence without marking it incorrect',async({page})=>{
 await page.route('**/speech-test',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));await page.goto('/speech-test');await page.evaluate(async()=>{const m=await import('/src/korean-speaking.js');document.body.innerHTML=m.renderKoreanSpeaking(()=>'', '상담의 질이 좋아진 것은 아니에요.','ko-KR','',undefined,{freeSpeech:true,uiLocale:'ko'});m.mountKoreanSpeaking(document.body,{stop:()=>{},advance:()=>{},recognize:async()=>({text:'저는 이용을 그만둔 사람의 생각도 듣고 싶어요.'}),cancel:async()=>{},end:async()=>{}});});
 await page.locator('[data-speaking-record]').click();await expect(page.locator('[data-speaking-next]')).toBeEnabled();await expect(page.locator('[data-speaking-status]')).toHaveText('생각을 들려줘서 고마워요');await expect(page.locator('[data-speaking-transcript]')).toContainText('이용을 그만둔 사람');
});
