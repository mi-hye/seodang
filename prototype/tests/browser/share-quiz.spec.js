import {test,expect} from '@playwright/test';
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`public quiz without onboarding ${direction} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844});
 await page.addInitScript(()=>{localStorage.setItem('seodang.web-prototype.v1','existing-records');Object.defineProperty(navigator,'share',{value:undefined,configurable:true});Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true});});
 await page.goto(`/quiz.html?direction=${direction}&q=gentle-decline`);await page.evaluate(()=>document.documentElement.style.fontSize='20px');
 await expect(page.locator('html')).toHaveAttribute('lang',direction==='ja-ko'?'ja':'ko');await expect(page.locator('[data-check]')).toBeDisabled();
 await page.locator('[data-answer="0"]').click();await page.locator('[data-check]').click();await expect(page.locator('.feedback')).toBeVisible();await expect(page.locator('[data-answer="1"]')).toHaveClass(/correct/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const tops=await page.locator('.button-pair button').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));expect(tops[0]).toBe(tops[1]);
 await page.locator('[data-share]').click();await expect(page.locator('textarea')).toBeVisible();expect(await page.locator('textarea').inputValue()).not.toContain('localhost');expect(await page.locator('textarea').inputValue()).toContain('https://mi-hye.github.io/seodang/quiz.html?');
 await page.screenshot({path:`output/share-quiz-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-next]').click();await expect(page.locator('.feedback')).toHaveCount(0);await expect(page.locator('[data-check]')).toBeDisabled();expect(await page.evaluate(()=>localStorage.getItem('seodang.web-prototype.v1'))).toBe('existing-records');
});
test('public quiz shares only a clean question link and provides working store destinations',async({page})=>{
 const {readFile}=await import('node:fs/promises');
 await page.route('https://quiz.example/**',async route=>{const path=new URL(route.request().url()).pathname;try{await route.fulfill({body:await readFile(new URL(`../..${path}`,import.meta.url)),contentType:path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html'});}catch{await route.fulfill({status:404,body:''});}});
 await page.addInitScript(()=>Object.defineProperty(navigator,'share',{value:async payload=>{window.sharedQuiz=payload;},configurable:true}));
 await page.goto('https://quiz.example/quiz.html?direction=ja-ko&q=gentle-decline&answer=private#private');
 await page.locator('[data-answer="1"]').click();await page.locator('[data-check]').click();await page.locator('[data-share]').click();
 const shared=await page.evaluate(()=>window.sharedQuiz);expect(shared.url).toBe('https://quiz.example/quiz.html?direction=ja-ko&q=gentle-decline');expect(shared.text).not.toContain('private');
 await expect(page.locator('.store-links a').first()).toHaveAttribute('href','https://apps.apple.com/app/id6780309771');await expect(page.locator('.store-links a').last()).toHaveAttribute('href','https://play.google.com/store/apps/details?id=com.mihye.seodang');
});
