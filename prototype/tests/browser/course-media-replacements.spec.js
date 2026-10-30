import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {freshScenario} from '../../src/scenario-state.js';
import {freshExpert} from '../../src/expert-state.js';
import {valid} from '../../src/storage.js';
import {collectMapLessons} from './learning-map-fixture.js';

for(const direction of ['ko-ja','ja-ko'])for(const level of [4,7])test(`replaced ${direction}/${level} old progress stays saved without taking over home`,async({page})=>{
 const state={...freshState(),onboarded:true,courseDirection:direction,onboardingLevel:level,koreanGuideSeenVersion:1},id=level===4?'course3-9':3,kind=level===4?'scenario':'expert',key=`${direction}:${kind}:${id}`;
 if(level===4){state.scenarioActive=id;state.scenarios={[key]:{...freshScenario(),started:true}};state.practices={[key]:{version:1,round:0,mode:0,index:1,count:9,action:{type:'scenario-next'}}};}
 else{state.expertActive=id;state.experts={[key]:{...freshExpert(),started:true}};}
 expect(valid(state)).toBe(true);
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},state);
 await page.goto('/playable.html');
 const lessons=await collectMapLessons(page);expect(lessons).toHaveLength(20);expect(lessons.some(l=>l.kind===kind&&String(l.id)===String(id))).toBe(false);
 const card=page.locator('.home-start-card');await expect(card).not.toHaveAttribute('data-action','practice-resume');
 const current=page.locator('.map-choice[aria-current="step"]');expect(await card.getAttribute('data-action')).toBe(await current.getAttribute('data-action'));
 expect((await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1'))))[level===4?'scenarios':'experts'][key].started).toBe(true);
 await card.click();await expect(page.locator('.learning-map')).toHaveCount(0);
});
