import {videoLessons} from '../../src/video-lesson-state.js';import {videoContent} from '../../src/video-lesson-content.js';
import {test,expect} from '@playwright/test';import {freshState} from '../../src/engine.js';
for(const {id,direction,level,count,number} of videoLessons)for(const width of [320,390])test(`video ${id} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.addInitScript(s=>{if(!localStorage.getItem('seodang.web-prototype.v1'))localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,onboardingLevel:level,courseDirection:direction,koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
 // Test our navigation and layout independently of ads, region restrictions and network.
 await page.route('https://www.youtube.com/embed/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body style="background:#111;color:white">YouTube player test fixture</body>'}));
 await page.goto('/playable.html');await expect(page.locator('.map-choice[data-action]').nth(number-1)).toHaveAttribute('data-action','video');await expect(page.locator(`.map-choice[data-action="video"][data-id="${id}"]`)).toContainText(`${number}.`);await page.locator(`.map-choice[data-action="video"][data-id="${id}"]`).click();
 for(let i=0;i<count;i++){
  const line=videoContent[id][i];
  await expect(page.locator('.lesson-youtube')).toBeVisible();
  const src=new URL(await page.locator('.lesson-youtube').getAttribute('src'));
  expect(src.pathname).toBe(`/embed/${line.videoId}`);expect(src.searchParams.get('cc_load_policy')).toBe('0');
  expect(src.searchParams.get('start')).toBe(String(line.startSeconds));expect(src.searchParams.get('end')).toBe(String(line.endSeconds));
  await expect(page.locator('.video-original')).toHaveAttribute('href',`https://www.youtube.com/watch?v=${line.videoId}&t=${line.startSeconds}s`);
  for(const phase of ['watch','learn']){
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   const boxes=await page.locator('.video-lesson .button-pair>button').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,width:r.width};}));expect(boxes[0].top).toBe(boxes[1].top);expect(boxes[0].width).toBeGreaterThan(80);
   if(phase==='watch'){await page.locator('.video-dialogue summary').click();await expect(page.locator('.video-dialogue details p')).toBeVisible();await expect(page.locator('.video-support .video-source')).toBeHidden();await page.locator('.video-support summary').click();await expect(page.locator('.video-support .video-source')).toBeVisible();await expect(page.locator('.video-original')).toBeVisible();await page.locator('.video-support summary').click();await page.screenshot({path:`output/video-${id}-${width}-${test.info().project.name}.png`,fullPage:true});}
   if(phase==='learn'){await expect(page.locator('.video-example')).toBeVisible();if(direction==='ja-ko')await expect(page.locator('.video-lesson>p[lang=ja]').first()).toBeVisible();await page.screenshot({path:`output/video-learn-${id}-${width}-${test.info().project.name}.png`,fullPage:true});}
   await page.locator('[data-action="video-next"]').click();
  }
 }
 await expect(page.locator('.practice-complete h1')).toHaveText((direction==='ja-ko')?'学習が完了しました':'학습을 완료하셨습니다');await expect(page.locator('.practice-fireworks svg')).toBeVisible();await page.screenshot({path:`output/video-complete-${id}-${width}-${test.info().project.name}.png`,fullPage:true});await page.locator('[data-action="completed-next"]').click();await expect(page.locator('.lesson-youtube')).toHaveCount(0);
 await page.reload();await expect(page.locator(`.map-choice[data-action="video"][data-id="${id}"]`)).toContainText(direction==='ja-ko'?'完了':'완료');
});
test('unfinished video lesson resumes after reload and previous returns to original player',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));if(!localStorage.getItem('seodang.web-prototype.v1'))localStorage.setItem('seodang.web-prototype.v1',JSON.stringify({schemaVersion:1,levelLayoutVersion:3,courseDirection:'ko-ja',onboardingLevel:4,onboarded:true,support:'phrase',settings:{sound:false,motion:'off',textScale:1,audioRate:1},episode:{contentVersion:1,started:false,step:'intro',dialogue:0,lesson:0,clues:[],selected:null,attempts:0,hintLevel:0,solved:false,transfer:'not_attempted',transferAttempts:0,feedback:''},encountered:[]}));});
 await page.route('https://www.youtube.com/embed/**',r=>r.fulfill({body:'player'}));await page.goto('/playable.html');await page.locator('.map-choice[data-action="video"]').first().click();await page.locator('[data-action="video-next"]').click();await page.reload();await page.locator('.map-choice[data-action="video"]').first().click();await expect(page.locator('.video-example')).toBeVisible();await page.locator('[data-action="video-previous"]').click();await expect(page.locator('.lesson-youtube')).toBeVisible();
});
for(const width of [320,390])test(`iPhone ${width} embeds the player in the lesson and removes it on navigation`,async({page})=>{
 await page.setViewportSize({width,height:844});
 await page.addInitScript(s=>{
  localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));
  localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));
  window.videoCalls=[];
  window.Capacitor={getPlatform:()=> 'ios',isNativePlatform:()=>true,isPluginAvailable:name=>name==='SeodangVideo',nativePromise:async(plugin,method,args)=>{if(plugin==='SeodangVideo')window.videoCalls.push({method,args});return {};}};
 },{...freshState(),onboarded:true,onboardingLevel:7,courseDirection:'ja-ko',koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}});
 await page.goto('/playable.html');await page.locator('.map-choice[data-action="video"]').first().click();
 await expect(page.locator('[data-native-video]')).toBeVisible();
 await expect(page.locator('[data-action="video-open"]')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>window.videoCalls.filter(c=>c.method==='mount').length)).toBe(1);
 const mounted=await page.evaluate(()=>window.videoCalls.find(c=>c.method==='mount'));
 expect(mounted.args).toMatchObject({videoId:'xRlcrGXwtrA',startSeconds:143,endSeconds:148,hidden:false});
 expect(mounted.args.width).toBeGreaterThanOrEqual(200);expect(mounted.args.height).toBeGreaterThanOrEqual(200);
 const box=await page.locator('[data-native-video]').boundingBox();expect(mounted.args.x).toBeCloseTo(box.x,0);expect(mounted.args.y).toBeCloseTo(box.y,0);
 await page.getByRole('button',{name:'設定を開く'}).click();
 await expect.poll(()=>page.evaluate(()=>window.videoCalls.at(-1)?.args.hidden)).toBe(true);
 await page.keyboard.press('Escape');
 await expect.poll(()=>page.evaluate(()=>window.videoCalls.at(-1)?.args.hidden)).toBe(false);
 const next=await page.locator('[data-action="video-next"]').boundingBox();expect(next.y+next.height).toBeLessThanOrEqual(844);
 await page.screenshot({path:`output/video-native-${width}-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-action="video-next"]').click();await expect(page.locator('.video-example')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.videoCalls.at(-1)?.method)).toBe('remove');
 await page.locator('[data-action="video-replay"]').click();
 await expect.poll(()=>page.evaluate(()=>window.videoCalls.filter(c=>c.method==='mount').length)).toBe(2);
 expect(await page.evaluate(()=>window.videoCalls.filter(c=>c.method==='mount').map(c=>c.args.token))).toEqual(['1','2']);
});

for(const direction of ['ko-ja','ja-ko'])test(`level 2 ${direction} resumes the selected video independently`,async({page})=>{
 const lessons=videoLessons.filter(l=>l.direction===direction&&l.level===2).sort((a,b)=>a.number-b.number),[first,second]=lessons;
 await page.addInitScript(s=>{if(!localStorage.getItem('seodang.web-prototype.v1'))localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(s));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));},{...freshState(),onboarded:true,onboardingLevel:2,courseDirection:direction,koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1,audioRate:1}});
 await page.route('https://www.youtube.com/embed/**',r=>r.fulfill({body:'player'}));await page.goto('/playable.html');await expect(page.locator('.map-choice[data-action]')).toHaveCount(7);
 const enter=id=>page.locator(`.map-choice[data-action="video"][data-id="${id}"]`).click();const home=()=>page.locator('.app-header [data-action="home"]').click();
 await enter(first.id);await page.locator('[data-action="video-next"]').click();await home();await enter(second.id);await expect(page.locator('.video-example')).toHaveCount(0);await page.locator('[data-action="video-next"]').click();await home();await page.reload();
 await page.locator(`[data-action="video"][data-id="${second.id}"]`).first().click();await expect(page.locator('.video-example')).toBeVisible();await expect(page.locator('.app-header-title')).toContainText('6.');await page.locator('[data-action="video-next"]').click();await page.locator('[data-action="completed-next"]').click();
 await enter(first.id);await expect(page.locator('.video-example')).toBeVisible();await expect(page.locator('.app-header-title')).toContainText('3.');
});
