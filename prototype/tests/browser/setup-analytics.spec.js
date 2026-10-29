import {test,expect} from '@playwright/test';
const key='seodang.analytics.v1';
async function finish(page){
 const next=page.locator('button[type=submit]');await next.click();
 for(let i=0;i<6;i++){
  if(await next.textContent().then(s=>/시작하기|はじめる/.test(s)))break;
  await next.click();
 }
 await next.click();await expect(page).toHaveURL(/playable.html#home/);
}
for(const language of ['ja','ko'])for(const share of [false,true])test(`setup optional analytics ${language} ${share}`,async({page})=>{
 const sent=[];await page.route('https://us.i.posthog.com/**',async route=>{sent.push(JSON.parse(route.request().postData()));await route.fulfill({status:200,body:'{}'});});
 await page.goto('/setup.html');await page.locator(`input[name=language][value=${language}]`).check({force:true});
 await page.locator('button[type=submit]').click();
 const input=page.locator('[name=analyticsSharing]');await expect(input).not.toBeChecked();
 await expect(page.locator('#setup-analytics')).toHaveAttribute('lang',language==='ja'?'ko':'ja');
 if(share)await input.check();
 expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBeNull();expect(sent).toHaveLength(0);
 await page.locator('[data-action=previous]').click();await page.locator('button[type=submit]').click();await expect(input).toBeChecked({checked:share});
 await finish(page);await expect(page.locator('.analytics-consent')).toHaveCount(0);
 if(share){await expect.poll(()=>sent.length).toBeGreaterThan(0);const events=sent.flatMap(x=>x.batch);expect(events.some(e=>e.event==='analytics_enabled')).toBe(true);expect(events.every(e=>e.distinct_id)).toBe(true);}
 else expect(sent).toHaveLength(0);
});
for(const width of [320,390])for(const language of ['ja','ko'])test(`setup analytics layout ${language} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:696});await page.goto('/setup.html');await page.locator(`input[name=language][value=${language}]`).check({force:true});await page.locator('button[type=submit]').click();
 await expect(page.locator('[name=analyticsSharing]')).toBeVisible();
 await page.addStyleTag({content:'.setup-analytics{font-size:16.8px}.analytics-choice{font-size:19.2px}'});
 await page.locator('#setup-analytics a').scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/setup-analytics-${language}-${width}.png`});
});
test('setup preserves existing consent and identity',async({page})=>{
 await page.goto('/setup.html');await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({consent:true,consent_version:3,id:'11111111-1111-4111-8111-111111111111',queue:[]})),key);
 await page.route('https://us.i.posthog.com/**',route=>route.fulfill({status:200,body:'{}'}));await page.reload();await page.locator('button[type=submit]').click();await expect(page.locator('[name=analyticsSharing]')).toBeChecked();await finish(page);
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);expect(saved.consent).toBe(true);expect(saved.id).toBe('11111111-1111-4111-8111-111111111111');
});
