import {test,expect} from '@playwright/test';

async function openGuide(page,language='ko'){
 await page.setViewportSize({width:324,height:696});
 await page.goto('/setup.html');
 await page.locator(`label:has(input[name="language"][value="${language}"])`).click();
 const next=page.locator('button[type="submit"]');
 await next.click();
 await expect(page.locator('[data-step="2"]')).toBeVisible();
 await next.click();
 await expect(page.locator('.dog-guide')).toBeVisible();
 return next;
}

for(const language of ['ko','ja'])test(`onboarding completes when final character pose and cleanup throw (${language})`,async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/src/onboarding-character.js',route=>route.fulfill({contentType:'text/javascript',body:`
 export function mountOnboardingCharacter(host){
  host.dataset.renderer='rive';const canvas=document.createElement('canvas');canvas.className='guide-rive-canvas';host.append(canvas);
  const dispose=()=>{throw Error('Renderer cleanup failed');};
  dispose.setPose=pose=>{if(pose==='happy')throw Error('Renderer pose failed');};
  return dispose;
 }`}));
 const next=await openGuide(page,language),pages=language==='ko'?5:4;
 for(let i=1;i<pages;i++)await next.click();
 await expect(page.locator('.dog-guide')).toHaveAttribute('data-guide-type','ready');
 await expect(next).toHaveText(language==='ko'?'はじめる':'시작하기');
 await expect(page.locator('.progress')).toHaveAttribute('aria-valuenow',String(pages+2));
 await expect(page.locator('.guide-scene')).toHaveAttribute('data-renderer','fallback');
 await expect(page.locator('.guide-rive-canvas')).toHaveCount(0);
 await page.locator('.app-header-back').click();
 await expect(next).toHaveText(language==='ko'?'次へ':'다음');
 await next.click();
 await expect(next).toHaveText(language==='ko'?'はじめる':'시작하기');
 await next.click();
 await expect(page).toHaveURL(/playable\.html#home$/);
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('seodang.web-prototype.v1')));
 expect(state.onboarded).toBe(true);
 expect(state.courseDirection).toBe(language==='ko'?'ja-ko':'ko-ja');
 expect(errors).toEqual([]);
});

for(const failure of ['none','snapshot'])test(`real character allows Japanese onboarding completion (${failure})`,async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.emulateMedia({reducedMotion:'no-preference'});
 const next=await openGuide(page);
 await expect(page.locator('.guide-scene')).toHaveAttribute('data-renderer','rive');
 for(let i=0;i<3;i++)await next.click();
 await expect(page.locator('.dog-guide')).toHaveAttribute('data-guide-type','learn');
 if(failure==='snapshot')await page.evaluate(()=>{
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(kind,...args){
   if(kind==='2d'&&this.className==='guide-rive-canvas'&&this.style.zIndex==='1')return null;
   return original.call(this,kind,...args);
  };
 });
 await next.click();
 await expect(next).toHaveText('はじめる');
 await expect(page.locator('.progress')).toHaveAttribute('aria-valuenow','7');
 await expect(page.locator('.guide-scene')).toHaveAttribute('data-renderer',failure==='none'?'rive':'fallback');
 await next.click();
 await expect(page).toHaveURL(/playable\.html#home$/);
 expect(errors).toEqual([]);
});

for(const failure of ['mount','replay'])test(`guide recovers from character ${failure} failure`,async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/src/onboarding-character.js',route=>route.fulfill({contentType:'text/javascript',body:`
 export function mountOnboardingCharacter(host){
  if('${failure}'==='mount')throw Error('Renderer unavailable');
  const dispose=()=>{};dispose.replay=()=>{throw Error('Replay unavailable');};return dispose;
 }`}));
 const next=await openGuide(page);
 if(failure==='replay')await page.locator('.guide-replay').click();
 await expect(page.locator('.guide-scene')).toHaveAttribute('data-renderer','fallback');
 for(let i=0;i<4;i++)await next.click();
 await expect(next).toHaveText('はじめる');
 await next.click();
 await expect(page).toHaveURL(/playable\.html#home$/);
 expect(errors).toEqual([]);
});
