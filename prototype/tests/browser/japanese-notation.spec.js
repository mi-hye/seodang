import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {freshSentence} from '../../src/sentence-state.js';
import {sentenceCourse} from '../../src/sentence-content.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
import {openMapLesson} from './learning-map-fixture.js';

for(const id of [3,0])for(const width of [320,390])test(`Japanese notation and reading ${id===3?'2-1':'2-2'} ${width}`,async({page})=>{
 const progress={...freshSentence(),started:true,phase:'learn',index:id===3?0:1};
 const s={...freshState(),onboarded:true,courseDirection:'ko-ja',onboardingLevel:2,sentenceActive:id,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1},...(id===0?{sentence:progress}:{sentenceLessons:{[id]:progress}})};
 const lesson=sentenceCourse(s).sentences[progress.index];
 await page.setViewportSize({width,height:width===320?640:844});
 await page.addInitScript(s=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));window.played=[];window.Audio=class{constructor(src){this.src=src;}play(){window.played.push(this.src);queueMicrotask(()=>this.onended?.());return Promise.resolve();}pause(){}};},s);
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');await openMapLesson(page,{kind:'sentence',id});await page.locator('[data-choice="resume"]').click();
 await expect(page.locator('.sentence-heading h2')).toHaveText(lesson.parts.map(([text])=>text).join(' '));
 await expect(page.locator('.sentence-kana-reading')).toHaveText(lesson.kanaReading);
 await expect(page.locator('.sentence-kanji')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const row=await page.locator('.sentence-heading').evaluate(el=>{const t=el.querySelector('h2').getBoundingClientRect(),b=el.querySelector('button').getBoundingClientRect();return {right:t.right,left:b.left,width:b.width};});expect(row.left).toBeGreaterThanOrEqual(row.right-1);expect(row.width).toBeGreaterThanOrEqual(44);
 const pair=await page.locator('.sentence-learn .button-pair button').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().top));expect(pair[0]).toBe(pair[1]);
 await page.screenshot({path:`output/notation-${id}-${width}-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-action="sentence-next"]').click();
 await expect(page.locator('.sentence-kana-reading')).toHaveCount(0);
 if(id===0){for(let i=0;i<lesson.parts.length;i++)await page.locator(`[data-action="sentence-token"][data-id="${i}"]`).click();await page.locator('[data-action="sentence-check"]').click();await expect(page.locator('.sentence-confirmed h2')).toHaveText(lesson.parts.map(([text])=>text).join(' '));}
 else{await page.waitForTimeout(500); // Respect the app's 450 ms double-tap guard after changing phases.
 await page.locator('[data-action="sentence-select"][data-id="0"]').click();await page.locator('[data-action="sentence-check"]').click();await expect(page.locator('[data-speaking-skip]')).toBeVisible();}
});
