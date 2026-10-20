import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
const click=(page,action)=>page.locator(`[data-action="${action}"]`).first().click();
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`whole lesson review ${direction} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:740});
 const id=direction==='ko-ja'?'frieren-uncertainty':'queen-condition',key=`${direction}:video:${id}`;
 await page.addInitScript(({direction,id,key,state})=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('seodang.web-prototype.v1',JSON.stringify({...state,courseDirection:direction,onboarded:true,uiGuideSeenVersion:2,koreanGuideSeenVersion:1,onboardingLevel:2,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1},videoLessons:{[id]:{version:1,started:true,completed:true,index:0,phase:'done'}},studyTools:{[direction]:{lessons:{[key]:{completedOn:'2020-01-01'}}}}}));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));sessionStorage.setItem('seeded','1');}},{direction,id,key,state:freshState()});
 await page.route('**/www.youtube.com/**',r=>r.fulfill({body:'',contentType:'text/html'}));
 await page.goto('/playable.html');await click(page,'my');await click(page,'study-review');await expect(page.locator('.study-card')).toContainText('4-3');await expect(page.locator('[data-action=study-reveal]')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`output/whole-review-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
 await click(page,'study-lesson');await expect(page.locator('.view-video')).toBeVisible();await expect(page.locator('.app-header-title')).toContainText('3.');
 await click(page,'home');await click(page,'my');await click(page,'study-review');await expect(page.locator('.study-card')).toHaveCount(1);
 await click(page,'study-lesson');await click(page,'video-next');await click(page,'video-next');await expect(page.locator('.practice-complete')).toBeVisible();
 await click(page,'home');await click(page,'my');await click(page,'study-review');await expect(page.locator('.study-card')).toHaveCount(0);await expect(page.locator('.study-empty')).toBeVisible();
 await page.reload();await click(page,'my');await click(page,'study-review');await expect(page.locator('.study-card')).toHaveCount(0);
});
