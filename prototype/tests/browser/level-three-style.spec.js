import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
import {test,expect} from '@playwright/test';import {freshState} from '../../src/engine.js';
for(const width of [320,390])for(const direction of ['ko-ja','ja-ko'])for(const lesson of ['cafe','hotel'])test(`${direction} level-three ${lesson} shared layout ${width}`,async({page})=>{
 page.setDefaultTimeout(5000);
 await page.setViewportSize({width,height:844});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,koreanGuideSeenVersion:1,onboardingLevel:4,courseDirection:direction,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
 await useCatalogWithoutPacks(page);
 await page.goto('/playable.html');const kind=lesson==='hotel'?'scenario':direction==='ko-ja'?'dialogue':'korean';const id=lesson==='hotel'?'3':kind==='korean'?'4-1':null;
 await page.locator(`[data-action="${kind}"]${id?`[data-id="${id}"]`:''}`).first().click();await page.locator(`[data-action="${kind}-next"]`).click();
 const progress=page.locator('.lesson-progress');await expect(progress).toHaveCount(1);
 expect(await progress.evaluate(el=>({height:getComputedStyle(el).height,margin:getComputedStyle(el).marginLeft,fill:getComputedStyle(el.firstElementChild).backgroundColor,amber:getComputedStyle(document.documentElement).getPropertyValue('--amber').trim()}))).toMatchObject({height:'5px',margin:'20px'});
 const main=page.locator('.case-lesson');await expect(main).toBeVisible();await expect(main.locator('.case-lesson-image')).toBeVisible();
 await expect(main.locator('.case-lesson-count')).toHaveCount(0);
 expect(await main.locator('.case-words').evaluate(el=>getComputedStyle(el).borderTopWidth)).toBe('1px');
 for(const detail of await main.locator('.lesson-explanation').all()){await expect(detail).not.toHaveAttribute('open','');await detail.locator('summary').click({position:{x:20,y:20}});await expect(detail.locator('p')).toBeVisible();await detail.locator('summary').click({position:{x:20,y:20}});}
 const layout=await main.evaluate(el=>({overflow:document.documentElement.scrollWidth>innerWidth+1,image:el.querySelector('img').getBoundingClientRect().height,pairs:[...el.querySelectorAll('.button-pair>button')].map(x=>x.getBoundingClientRect().top),speakers:[...el.querySelectorAll('.audio-text-row')].every(row=>{const b=row.querySelector('button'),t=row.firstElementChild;return !b||b.getBoundingClientRect().left>=t.getBoundingClientRect().right-1;})}));expect(layout.overflow).toBe(false);expect(layout.image).toBeCloseTo(135.04,0);expect(Math.abs(layout.pairs[0]-layout.pairs[1])).toBeLessThan(2);expect(layout.speakers).toBe(true);
 await page.screenshot({timeout:5000,path:`output/level-three-${direction}-${lesson}-${width}-${test.info().project.name}.png`,fullPage:true});
 // Respect the application's 450 ms double-tap guard between deliberate advances.
 for(let i=0;i<(kind==='dialogue'?3:1);i++){await page.waitForTimeout(500);await page.locator(`[data-action="${kind}-next"]`).click();}
 await expect(page.locator(`[data-action="${kind}-check"]`)).toBeVisible();await expect(page.locator('.case-lesson-image, .scenario-image')).toBeVisible();expect(errors).toEqual([]);
});
