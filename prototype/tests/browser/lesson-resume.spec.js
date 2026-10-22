import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {scenarioLessons} from '../../src/scenario-state.js';
for(const direction of ['ko-ja','ja-ko'])for(const lesson of scenarioLessons.filter(l=>l.id!=='5'))test(`shared resume ${direction} scenario ${lesson.id}`,async({page})=>{
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,koreanGuideSeenVersion:1,onboardingLevel:lesson.level,courseDirection:direction,settings:{sound:false,motion:'off',textScale:1,audioRate:1}});
 await useCatalogWithoutPacks(page);
 const enter=async()=>{await page.locator(`[data-action="scenario"][data-id="${lesson.id}"]`).first().click();await expect(page.locator('.view-scenario, .lesson-resume')).toBeVisible();};const home=async()=>{await page.locator('[data-action="home"]').first().click();await expect(page.locator('.view-home')).toBeVisible();};
 await page.goto('/playable.html');await enter();await expect(page.locator('.lesson-resume')).toHaveCount(0);
 await home();await enter();await expect(page.locator('.lesson-resume')).toHaveCount(0);
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));
 const key=`${direction}:scenario:${lesson.id}`;
 // Lessons 8-12 go straight from intro to quiz; earlier lessons pass through learn first.
 const phase=async()=>(await state()).scenarios?.[key]?.phase;
 for(let i=0;i<2&&await phase()!=='quiz';i++){const before=await phase();await page.locator('[data-action="scenario-next"]').click();await expect.poll(phase).not.toBe(before);}
 const saved=(await state()).scenarios[key];expect(saved.phase).toBe('quiz');
 await home();await enter();await expect(page.locator('.lesson-resume')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.view-home')).toBeVisible();
 await enter();await page.locator('[data-choice="resume"]').click();await expect(page.locator('.view-scenario')).toBeVisible();await expect.poll(async()=>(await state()).scenarios[key]).toEqual(saved);
 await home();await enter();await page.locator('[data-choice="restart"]').click();await expect(page.locator('.view-scenario')).toBeVisible();await expect.poll(async()=>(await state()).scenarios[key].phase).toBe('intro');
 await home();await enter();await expect(page.locator('.lesson-resume')).toHaveCount(0);
});
