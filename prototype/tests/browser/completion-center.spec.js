import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`completion visible group is vertically centered ${direction} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===320?640:844});const id=direction==='ko-ja'?'frieren-permission':'blackdog-confirmation';
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,onboardingLevel:4,courseDirection:direction,koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
 await page.route('https://www.youtube.com/embed/**',r=>r.fulfill({body:'player'}));await page.goto('/playable.html');await page.locator(`.map-choice[data-id="${id}"]`).click();for(let i=0;i<2;i++)await page.locator('[data-action="video-next"]').click();
 await expect(page.locator('.practice-complete')).toBeVisible();await expect(page.locator('[data-action="completed-next"]')).toBeInViewport();
 const geometry=await page.locator('.practice-complete').evaluate(el=>{const m=el.getBoundingClientRect(),style=getComputedStyle(el),paw=el.querySelector('.practice-fireworks>span').getBoundingClientRect(),button=el.querySelector('button').getBoundingClientRect();return {group:(paw.top+button.bottom)/2,area:(m.top+parseFloat(style.paddingTop)+m.bottom-parseFloat(style.paddingBottom))/2,overflow:document.documentElement.scrollHeight-innerHeight};});
 expect(Math.abs(geometry.group-geometry.area)).toBeLessThan(2);expect(geometry.overflow).toBeLessThan(2);
 await page.screenshot({path:`output/completion-center-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});await page.locator('[data-action="completed-next"]').click();await expect(page.locator('.view-home')).toBeVisible();
});
