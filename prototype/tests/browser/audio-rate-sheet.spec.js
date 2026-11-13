import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {openMapLesson,collectMapLessons} from './learning-map-fixture.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
import {chooseAudioRate} from './audio-rate-fixture.js';
for(const width of [320,390])test(`speed sheet dismisses, restores focus and nests over pronunciation ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:width===320?640:844});
 await page.addInitScript(state=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(state));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:'ja-ko',onboardingLevel:8,settings:{sound:false,motion:'off',textScale:1.2,audioRate:.7}});
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');await openMapLesson(page,{kind:'korean',id:'15-1'});
 const trigger=page.locator('.app-header [data-audio-rate]'),sheet=page.locator('.audio-rate-sheet');
 await expect(trigger).toHaveText('');await trigger.click();
 await expect(sheet.locator('[data-rate-choice="0.7"]')).toHaveAttribute('aria-pressed','true');
 await expect(sheet.locator('[data-rate-choice="0.7"]')).toBeFocused();
 const bounds=await sheet.boundingBox();expect(Math.abs(bounds.y+bounds.height-(width===320?640:844))).toBeLessThan(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`output/audio-rate-sheet-${width}-${info.project.name}.png`});
 await page.keyboard.press('Escape');await expect(sheet).toHaveCount(0);await expect(trigger).toBeFocused();await expect(trigger).toHaveAttribute('data-audio-rate','0.7');
 await trigger.click();await sheet.locator('[data-rate-close]').click();await expect(trigger).toBeFocused();
 await trigger.click();await expect(sheet).toBeVisible();await page.mouse.click(2,2);await expect(sheet).toHaveCount(0);
 await page.locator('.pronunciation-diagram-link').click();
 const parent=page.locator('.pronunciation-sheet'),nested=parent.locator('[data-audio-rate]');await expect(parent).toBeVisible();
 await chooseAudioRate(page,nested,.3);await expect(parent).toBeVisible();await expect(nested).toBeFocused();
 expect(await page.evaluate(()=>document.body.style.position)).toBe('fixed');
 await parent.locator('[data-pronunciation="close"]').click();await expect(parent).toHaveCount(0);
 expect(await page.evaluate(()=>document.body.style.position)).not.toBe('fixed');await expect(trigger).toHaveAttribute('data-audio-rate','0.3');
});

for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`home has separate speed, letters and settings ${direction} ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:844});
 await page.addInitScript(state=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(state));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:direction,onboardingLevel:2,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');
 const header=page.locator('.app-header'),speed=header.locator('[data-audio-rate]'),letters=header.locator('[data-action="kana-chart"]'),settings=header.locator('[data-action="settings"]');
 for(const control of [speed,letters,settings])await expect(control).toBeVisible();
 const boxes=await Promise.all([speed,letters,settings].map(x=>x.boundingBox()));
 for(let i=0;i<boxes.length;i++){expect(boxes[i].height).toBeGreaterThanOrEqual(44);if(i)expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i-1].x+boxes[i-1].width);expect(Math.abs(boxes[i].y-boxes[0].y)).toBeLessThan(1);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`output/home-audio-speed-${direction}-${width}-${info.project.name}.png`});
 await chooseAudioRate(page,speed,.6);await letters.click();await expect(page.locator('#chart-content')).toBeVisible();await page.locator('#panel [data-action="close"]').click();
 const lessons=await collectMapLessons(page);const lesson=lessons.find(l=>!['video','song'].includes(l.kind));await openMapLesson(page,{...lesson,id:lesson.id??undefined});await expect(page.locator('.app-header [data-audio-rate]')).toHaveAttribute('data-audio-rate','0.6');
});
