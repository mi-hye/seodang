import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
import {openMapLesson} from './learning-map-fixture.js';
import {useCatalogWithoutPacks} from './audio-catalog-fixture.js';
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`audio loading feedback ${direction} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844});
 const state={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:direction,onboardingLevel:2,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}};
 await page.addInitScript(state=>{
  localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(state));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
  window.playCalls=0;window.Audio=class{pause(){}play(){window.playCalls++;window.testAudio=this;return new Promise((resolve,reject)=>{window.audioReady=resolve;window.audioFail=reject;});}};
 },state);
 await useCatalogWithoutPacks(page);await page.goto('/playable.html');
 await openMapLesson(page,{kind:'scenario',id:'course20-2-19'});await page.locator('[data-action="scenario-next"]').click();
 const button=page.locator('[data-action="scenario-audio"][data-id="prompt"]'),spinner=page.locator('.audio-loading-button');
 const before=await button.boundingBox();await button.click();await expect(page.locator('.audio-loading-status')).toHaveCount(0);await expect(spinner).toHaveCount(1);await expect(button).toHaveAttribute('aria-busy','true');
 await expect.poll(()=>page.evaluate(()=>window.playCalls)).toBe(1);await button.click();await button.click();expect(await page.evaluate(()=>window.playCalls)).toBe(1);
 const after=await button.boundingBox();expect(after).toEqual(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:`output/audio-loading-${direction}-${width}-${test.info().project.name}.png`});
 await page.evaluate(()=>window.audioReady());await expect(spinner).toHaveCount(0);await expect(button).not.toHaveAttribute('aria-busy','true');
 await page.evaluate(()=>window.testAudio.onended());
 await page.evaluate(()=>{window.spinnerFlashed=false;window.spinnerObserver=new MutationObserver(records=>{if(records.some(r=>r.target.classList?.contains('audio-loading-button')))window.spinnerFlashed=true;});window.spinnerObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});});
 await button.click();await page.evaluate(()=>window.audioReady());await page.waitForTimeout(400);expect(await page.evaluate(()=>window.spinnerFlashed)).toBe(false);await expect(spinner).toHaveCount(0);await page.evaluate(()=>{window.spinnerObserver.disconnect();window.testAudio.onended();});
 await button.click();await expect(spinner).toHaveCount(1);await page.evaluate(()=>window.audioFail(Error('network')));await expect(spinner).toHaveCount(0);
 await page.locator('[data-action="scenario-audio"][data-id="prompt"]').click();await expect(spinner).toHaveCount(1);await page.locator('[data-action="home"]').first().click();await expect(spinner).toHaveCount(0);await page.evaluate(()=>window.audioReady());await expect(spinner).toHaveCount(0);
});

test('download wait and failure use the same loading state and can be retried',async({page})=>{
 let requests=0,release;let hold=new Promise(r=>release=r);
 await page.route('**/__loading.html',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));
 await page.route('**/assets/audio/catalog.json',async route=>{requests++;await hold;await route.fulfill({status:503,body:'offline'});});
 await page.goto('/__loading.html');
 await page.evaluate(async()=>{
  const {AudioPlayer}=await import('/src/media.js');const {mountAudioLoading}=await import('/src/audio-loading.js');
  window.errors=[];window.player=new AudioPlayer();const ui=mountAudioLoading(window.player);window.player.onStateChange=ui.update;
  window.entry={status:'ready',audioFile:'assets/audio/unavailable.wav'};
  void window.player.play(window.entry,true,e=>window.errors.push(e));
 });
 await expect.poll(()=>page.evaluate(()=>window.player.state)).toBe('loading');await expect(page.locator('.audio-loading-status')).toHaveCount(0);await expect.poll(()=>requests).toBe(1);
 await page.evaluate(()=>void window.player.play(window.entry,true,e=>window.errors.push(e)));expect(requests).toBe(1);
 release();await expect.poll(()=>page.evaluate(()=>window.player.state)).toBe('idle');await expect.poll(()=>page.evaluate(()=>window.errors.length)).toBe(1);
 await page.evaluate(()=>void window.player.play(window.entry,true,e=>window.errors.push(e)));await expect.poll(()=>requests).toBe(2);await expect.poll(()=>page.evaluate(()=>window.errors.length)).toBe(2);await expect.poll(()=>page.evaluate(()=>window.player.state)).toBe('idle');
});
