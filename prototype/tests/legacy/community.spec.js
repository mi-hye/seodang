import {readFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',postID='33333333-3333-4333-8333-333333333333',roomID='44444444-4444-4444-8444-444444444444';
const profile={id,nickname:'서당친구',native_language:'ko',learning_language:'ja',bio:'일본어로 이야기하고 싶어요.',rules_version:1};
const friend={id:other,nickname:'はる',native_language:'ja',learning_language:'ko',bio:'한국어를 배우고 있어요.'};
const post={id:postID,author_id:other,profile:friend,body:'오늘은 커피를 마셨어요. <img src=x onerror=alert(1)>',language:'ko',wants_correction:true,created_at:'2026-10-19T09:00:00Z'};
test('Android Back leaves composition and profile before returning from feed to home',async({page})=>{
 await page.addInitScript(()=>{window.Capacitor={getPlatform:()=> 'android',isNativePlatform:()=>false};});
 await setup(page);
 const back=()=>page.evaluate(()=>!window.dispatchEvent(new Event('seodang:back',{cancelable:true})));
 await page.locator('[data-action=community]').click();await expect(page.locator('[data-post]')).toBeVisible();
 await page.locator('[data-community=compose]').click();await expect(page.locator('[name=body]')).toBeVisible();
 expect(await back()).toBe(true);await expect(page.locator('[data-post]')).toBeVisible();
 await page.locator('.app-header [data-action=settings]').click();await page.locator('[data-action=community-profile]').click();
 await expect(page.locator('[name=nickname]')).toBeVisible();expect(await back()).toBe(true);
 await expect(page.locator('[data-post]')).toBeVisible();expect(await back()).toBe(true);
 await expect(page.locator('.learning-map')).toBeVisible();expect(await back()).toBe(false);
});
async function setup(page,{signed=true,direction='ko-ja',width=390,posts=[post]}={}){
 await page.setViewportSize({width,height:844});
 await page.addInitScript(({state,signed,id})=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(state));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));if(signed)localStorage.setItem('seodang.community.session.v1',JSON.stringify({user:{id},access_token:'test',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600}));},{state:{...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:direction,onboardingLevel:2,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}},signed,id});
 const writes=[];let room={id:roomID,requester_id:other,recipient_id:id,status:'pending',requester:friend,recipient:profile};let messages=[];
 await page.route('**/auth/v1/**',r=>r.fulfill({json:r.request().url().endsWith('/user')?{id,is_anonymous:true}:{user:{id,is_anonymous:true},access_token:'test',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600}}));
 await page.route('**/rest/v1/community_*',async route=>{
  const req=route.request(),url=new URL(req.url()),table=url.pathname.split('community_')[1],method=req.method(),body=req.postDataJSON();
  if(method!=='GET')writes.push({table,method,body});
  let result=[];
  if(table==='profiles')result=signed?[profile]:method==='POST'?[{...body}]:[];
  if(table==='posts')result=method==='POST'?[{...body,profile,created_at:new Date().toISOString()}]:url.searchParams.has('id')?posts.filter(p=>url.searchParams.get('id')==='eq.'+p.id):posts;
  if(table==='rooms'){if(method==='PATCH')room={...room,...body};result=[room];}
  if(table==='messages'){if(method==='POST')messages.push({...body,id:'55555555-5555-4555-8555-555555555555',created_at:new Date().toISOString()});result=url.searchParams.has('id')?messages.filter(m=>url.searchParams.get('id')==='eq.'+m.id):[...messages].reverse();}
  if(['replies','reports','blocks'].includes(table)&&method==='POST')result=[{...body,id:'66666666-6666-4666-8666-666666666666'}];
  await route.fulfill({status:method==='POST'?201:200,json:result});
 });
 await page.goto('/playable.html');return writes;
}
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`community feed and composition ${direction} ${width}`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const writes=await setup(page,{direction,width});
 const requests=[];page.on('request',r=>requests.push(r.url()));
 await expect(page.locator('[data-action=community]')).toBeVisible();expect(requests.some(x=>x.includes('/community.js'))).toBe(false);
 await page.locator('[data-action=community]').click();await expect(page.locator('[data-post]')).toBeVisible();
 await expect(page.locator('.community-body')).toContainText('<img src=x onerror=alert(1)>');await expect(page.locator('.community-body img')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`output/community-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-community=compose]').click();
 await expect(page.locator('.app-header [data-community-header-back]')).toBeVisible();
 await expect(page.locator('.community [data-community=back]')).toHaveCount(0);
 await expect(page.locator('[data-action=community-inbox]')).toBeHidden();
 await page.locator('[name=body]').fill('今日は友達とコーヒーを飲みました。');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`output/community-compose-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-community-header-back]').click();await expect(page.locator('[data-action=community-inbox]')).toBeVisible();
 await page.locator('[data-community=compose]').click();await expect(page.locator('[name=body]')).toHaveValue('今日は友達とコーヒーを飲みました。');
 await page.locator('[data-community-form=post] button[type=submit]').click();
 await expect.poll(()=>writes.filter(x=>x.table==='posts').length).toBe(1);expect(writes.find(x=>x.table==='posts').body.wants_correction).toBe(true);
 await page.locator('[data-community=post]').click();await page.screenshot({path:`output/community-detail-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});await expect(page.locator('[name=correction]')).toHaveCount(0);await page.locator('[data-community=reply-correction]').click();await page.locator('[data-community=select-correction]').first().click();await page.locator('[name=correction]').fill('오늘');await page.locator('[name=body]').fill('이렇게 말해도 자연스러워요.');await page.locator('[data-community-form=reply] button[type=submit]').click();
 await expect.poll(()=>writes.filter(x=>x.table==='replies').length).toBe(1);expect(errors).toEqual([]);
});
test('request acceptance gates composer and message delivery',async({page})=>{
 const writes=await setup(page);await page.locator('[data-action=community]').click();await page.locator('[data-action=community-inbox]').click();await page.locator('[data-community=room]').click();
 await expect(page.locator('[data-community-form=message]')).toHaveCount(0);await page.locator('[data-community=accept]').click();await expect(page.locator('[data-community-form=message]')).toBeVisible();await page.locator('[name=body]').fill('안녕하세요!');await page.locator('[data-community-form=message] button[type=submit]').click();await expect(page.locator('.community-message')).toContainText('안녕하세요!');expect(writes.find(x=>x.table==='rooms').body.status).toBe('accepted');
});
test('network error retains draft and navigation still works',async({page})=>{
 await setup(page);await page.locator('[data-action=community]').click();await page.locator('[data-community=compose]').click();await page.locator('[name=body]').fill('失敗しても残る下書き');await page.route('**/rest/v1/community_posts',r=>r.abort());await page.locator('[data-community-form=post] button[type=submit]').click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.locator('[name=body]')).toHaveValue('失敗しても残る下書き');await page.locator('[data-action=home]').click();await expect(page.locator('.view-home')).toBeVisible();
});
test('first visit automatically authenticates and asks only for a profile',async({page})=>{
 await setup(page,{signed:false,posts:[]});const before=await page.evaluate(()=>localStorage.getItem('seodang.web-prototype.v1'));await page.locator('[data-action=community]').click();await expect(page.locator('[data-community-form=profile]')).toBeVisible();await expect(page.locator('input[type=email],input[type=password]')).toHaveCount(0);await expect(page.locator('[data-community=compose]')).toHaveCount(0);expect(await page.evaluate(()=>Boolean(localStorage.getItem('seodang.community.session.v1')))).toBe(true);expect(await page.evaluate(()=>localStorage.getItem('seodang.web-prototype.v1'))).toBe(before);await page.locator('[name=nickname]').fill('첫 친구');await page.locator('[name=rules]').check();await page.locator('[data-community-form=profile] button[type=submit]').click();await expect(page.locator('[data-community=compose]')).toBeVisible();await expect(page.locator('.community-empty')).toBeVisible();await expect(page.locator('.community-segments')).toHaveCount(0);
});
test('cached feed appears immediately and background refresh does not interrupt profile editing',async({page})=>{
 await setup(page);await page.locator('[data-action=community]').click();await expect(page.locator('[data-post]')).toBeVisible();await page.locator('[data-action=home]').click();
 let release;const gate=new Promise(resolve=>release=resolve);await page.route('**/rest/v1/community_posts?**',async r=>{await gate;await r.fulfill({json:[{...post,body:'새로 받은 글'}]});});
 await page.locator('[data-action=community]').click();await expect(page.locator('[data-post]')).toContainText('오늘은 커피');await expect(page.locator('.community-segments')).toHaveCount(0);await expect(page.getByText('불러오는 중…',{exact:true})).toHaveCount(0);
 await page.locator('.app-header [data-action=settings]').click();await page.locator('[data-action=community-profile]').click();await expect(page.locator('label').filter({has:page.locator('select[name=native_language]')})).toContainText('모국어');await page.locator('[name=nickname]').fill('편집 중');release();await page.waitForTimeout(150);await expect(page.locator('[name=nickname]')).toHaveValue('편집 중');
 await page.locator('[data-community=back]').click();await expect(page.locator('[data-post]')).toContainText('새로 받은 글');
});
test('offline reentry keeps previous posts visible',async({page})=>{
 await setup(page);await page.locator('[data-action=community]').click();await expect(page.locator('[data-post]')).toBeVisible();await page.locator('[data-action=home]').click();await page.route('**/auth/v1/user',r=>r.abort());await page.locator('[data-action=community]').click();await expect(page.locator('[data-post]')).toBeVisible();await expect(page.locator('[data-action=community-inbox]')).toBeEnabled();await expect(page.getByText('불러오는 중…',{exact:true})).toHaveCount(0);
});
test('one feed with bottom-right compose and pull-to-refresh',async({page})=>{
 await setup(page);let reads=0;await page.route('**/rest/v1/community_posts?**',r=>{reads++;expect(new URL(r.request().url()).searchParams.has('language')).toBe(false);return r.fulfill({json:[{...post,body:reads===1?'이전 글':'새 글'}]});});
 await page.locator('[data-action=community]').click();await expect(page.locator('[data-post]')).toContainText('이전 글');
 await expect(page.locator('select[name=filter],[data-community=refresh]')).toHaveCount(0);
 const compose=await page.locator('[data-community=compose]').boundingBox(),nav=await page.locator('.tabs').boundingBox();expect(compose.x).toBeGreaterThan(195);expect(compose.y+compose.height).toBeLessThan(nav.y);
 const drag=async(distance,cancel=false)=>page.locator('[data-community-root]').evaluate((host,{distance,cancel})=>{const fire=(name,y,touches=true)=>{const e=new Event(name,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:touches?[{clientX:160,clientY:y}]:[]});host.dispatchEvent(e);};fire('touchstart',150);fire('touchmove',150+distance);fire(cancel?'touchcancel':'touchend',150+distance,false);},{distance,cancel});
 await drag(50);expect(reads).toBe(1);await drag(160,true);expect(reads).toBe(1);await drag(160);await expect(page.locator('[data-post]')).toContainText('새 글');expect(reads).toBe(2);
 // A drag that starts below the top only scrolls; it must not refresh.
 await page.locator('[data-community-root]').evaluate(el=>el.style.minHeight='1800px');await page.evaluate(()=>window.scrollTo(0,250));await drag(160);expect(reads).toBe(2);
});

test('post and author details use the header back button',async({page})=>{
 await setup(page);await page.locator('[data-action=community]').click();await page.locator('[data-community=post]').click();
 await expect(page.locator('.app-header [data-community-header-back]')).toBeVisible();await expect(page.locator('.community [data-community=back]')).toHaveCount(0);
 await page.locator('[data-community=person]').first().click();await expect(page.locator('[data-community=request]')).toBeVisible();
 await expect(page.locator('.community [data-community=back]')).toHaveCount(0);await page.locator('[data-community-header-back]').click();
 await expect(page.locator('[data-community-form=reply]')).toBeVisible();await page.locator('[data-community-header-back]').click();
 await expect(page.locator('[data-community=compose]')).toBeVisible();await expect(page.locator('[data-action=community-inbox]')).toBeVisible();
 await page.locator('[data-community=person]').first().click();await page.locator('[data-community-header-back]').click();await expect(page.locator('[data-community=compose]')).toBeVisible();
});

test('sentence selection preserves other sentences and can be cleared',async({page})=>{
 const writes=await setup(page,{posts:[{...post,body:'오늘은 커피를 마셨어요. 내일은 차를 마실 거예요.'}]});await page.locator('[data-action=community]').click();await page.locator('[data-community=post]').click();
 await page.locator('[name=body]').fill('이 표현이 자연스러워요.');
 await expect(page.locator('[data-community-form=reply] [data-community=select-correction]')).toHaveCount(0);
 await page.locator('[data-community=reply-correction]').click();await page.locator('[data-community-form=reply] [data-community=select-correction]').filter({hasText:'오늘은'}).click();
 await expect(page.locator('.community-sentence[aria-pressed=true]')).toHaveText('오늘은 커피를 마셨어요. ');
 await page.locator('[name=correction]').fill('어제는 차를 마셨어요.');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`output/community-correction-${test.info().project.name}.png`,fullPage:true});await page.locator('[data-community-form=reply] button[type=submit]').click();
 await expect.poll(()=>writes.filter(x=>x.table==='replies').length).toBe(1);expect(writes.find(x=>x.table==='replies').body.correction).toBe('어제는 차를 마셨어요. 내일은 차를 마실 거예요.');
 await expect(page.locator('.community-help-sheet')).toHaveCount(0);await page.locator('[data-community=reply-correction]').click();await page.locator('[data-community=select-correction]').first().click();await page.locator('[data-community=clear-correction]').click();await expect(page.locator('[name=correction]')).toHaveCount(0);
});
for(const width of [320,390])test(`correction comparison and selectable body ${width}`,async({page})=>{
 await setup(page,{width,posts:[{...post,body:'안녕하세요. 오늘은 커피를 먹었어요. 내일 또 만나요.'}]});
 await page.route('**/rest/v1/community_replies?**',r=>r.fulfill({json:[{id:'66666666-6666-4666-8666-666666666666',author_id:other,profile:friend,body:'음료에는 마시다를 써요.',correction:'안녕하세요. 오늘은 커피를 마셨어요. <img src=x onerror=alert(1)> 내일 또 만나요.'}]}));
 await page.locator('[data-action=community]').click();await page.locator('[data-community=post]').click();
 const comparison=page.locator('.community-correction-comparison');await expect(comparison.locator('del')).toContainText('먹었');await expect(comparison.locator('ins')).toHaveCount(2);await expect(comparison.locator('img')).toHaveCount(0);
 await page.locator('[data-community=reply-correction]').click();
 expect(await page.locator('.community-sentence').first().evaluate(el=>getComputedStyle(el).textDecorationLine)).toBe('underline');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`output/community-diff-${width}-${test.info().project.name}.png`,fullPage:true});
});

test('reply comparison omits unchanged sentences',async({page})=>{
 await setup(page,{posts:[{...post,body:'안녕하세요. 오늘은 커피를 먹었어요. 내일 또 만나요.'}]});
 await page.route('**/rest/v1/community_replies?**',r=>r.fulfill({json:[{id:'66666666-6666-4666-8666-666666666666',author_id:other,profile:friend,body:'마시다가 자연스러워요.',correction:'안녕하세요. 오늘은 커피를 마셨어요. 내일 또 만나요.'}]}));
 await page.locator('[data-action=community]').click();await page.locator('[data-community=post]').click();
 const comparison=page.locator('.community-correction-comparison');await expect(comparison).not.toContainText('안녕하세요');await expect(comparison).not.toContainText('내일 또');await expect(comparison.locator('p').first()).toHaveText('오늘은 커피를 먹었어요.');await expect(comparison.locator('p').last()).toHaveText('오늘은 커피를 마셨어요.');
});
test('correction grows with text and can be submitted without explanation',async({page})=>{
 const writes=await setup(page,{width:320,posts:[{...post,body:'커피를 먹었어요.'}]});await page.locator('[data-action=community]').click();await page.locator('[data-community=post]').click();
 await page.locator('[data-community=reply-correction]').click();await expect(page.locator('[name=body]')).not.toHaveAttribute('required');
 await page.locator('[data-community-form=reply] button[type=submit]').click();await expect(page.getByRole('alert')).toContainText('문장을 선택하고 고친 표현');expect(writes.filter(x=>x.table==='replies')).toHaveLength(0);
 await page.locator('[data-community=select-correction]').click();const field=page.locator('[name=correction]');const short=(await field.boundingBox()).height;
 await field.fill('오늘은 친구와 함께 카페에 가서 따뜻한 커피를 마시면서 이야기를 나눴어요. '.repeat(3));expect((await field.boundingBox()).height).toBeGreaterThan(short);
 await field.fill('커피를 마셨어요.');expect((await field.boundingBox()).height).toBeLessThanOrEqual(short+1);
 await page.locator('[data-community-form=reply] button[type=submit]').click();await expect.poll(()=>writes.filter(x=>x.table==='replies').length).toBe(1);const reply=writes.find(x=>x.table==='replies').body;expect(reply.body).toBe('');expect(reply.correction).toBe('커피를 마셨어요.');
});

test('reply explanation grows and shrinks with its content',async({page})=>{
 await setup(page,{width:320});await page.locator('[data-action=community]').click();await page.locator('[data-community=post]').click();
 const field=page.locator('[data-community-form=reply] [name=body]'),initial=(await field.boundingBox()).height;
 await field.fill('이 표현은 친구와 이야기할 때 자연스럽게 쓸 수 있어요. '.repeat(5));expect((await field.boundingBox()).height).toBeGreaterThan(initial);
 expect((await field.boundingBox()).height).toBeLessThanOrEqual(144);expect(await field.evaluate(el=>getComputedStyle(el).overflowY)).toBe('auto');
 await field.fill('짧은 답글');expect((await field.boundingBox()).height).toBeLessThanOrEqual(initial+1);
 await field.fill('');expect((await field.boundingBox()).height).toBeLessThanOrEqual(initial+1);
});
for(const width of [320,390])test(`conversation feed layout ${width}`,async({page})=>{
 await setup(page,{width,posts:[{...post,body:'오늘 처음으로 한국어로 커피를 주문했어요. 조금 긴장했지만 뿌듯해요 ☕️'},{...post,id:'33333333-3333-4333-8333-333333333334',profile:{...profile,nickname:'서당친구'},author_id:id,language:'ja',body:'今日は近所の公園を散歩しました。皆さんは週末、何をしますか？',wants_correction:false},{...post,id:'33333333-3333-4333-8333-333333333335',profile:{...friend,nickname:'ゆき'},body:'「수고했어요」と「고생했어요」は、どう使い分けますか？',language:'ja'}]});
 await page.locator('[data-action=community]').click();await expect(page.locator('[data-post]')).toHaveCount(3);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`output/community-feed-style-${width}-${test.info().project.name}.png`,fullPage:true});
 const first=page.locator('[data-post]').first();await expect(first.locator('[data-community=report-post]')).toBeHidden();await first.locator('summary').click();await expect(first.locator('[data-community=report-post]')).toBeVisible();await first.locator('summary').click();
 await first.locator('[data-community=post]').click();await expect(page.locator('[data-community-form=reply]')).toBeVisible();
});
test('attach up to two photos, remove previews and publish a photo-only post',async({page})=>{
 await setup(page,{width:320,posts:[]});
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
 const file={name:'cafe.jpg',mimeType:'image/jpeg',buffer:readFileSync(new URL('../../assets/cafe-dusk-v2.jpg',import.meta.url))};let saved=[],uploads=0;
 await page.route('**/storage/v1/**',r=>{if(r.request().method()==='POST'){uploads++;return r.fulfill({json:{Key:'saved'}});}return r.fulfill({contentType:'image/png',body:png});});
 await page.route('**/rest/v1/community_posts**',r=>{if(r.request().method()==='POST')saved=[{...r.request().postDataJSON(),profile,created_at:new Date().toISOString()}];const wanted=new URL(r.request().url()).searchParams.get('id');return r.fulfill({json:wanted?saved.filter(p=>wanted==='eq.'+p.id):saved});});
 await page.locator('[data-action=community]').click();await page.locator('[data-community=compose]').click();
 await page.locator('[data-photo-input]').setInputFiles([file,file]);await expect(page.locator('.community-photo-previews img')).toHaveCount(2);await expect(page.locator('[data-community=add-photo]')).toBeDisabled();
 await page.locator('[data-photo-input]').setInputFiles(file);await expect(page.getByRole('alert')).toContainText('2장');await expect(page.locator('.community-photo-previews img')).toHaveCount(2);
 await page.screenshot({path:`output/community-photo-compose-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-community=remove-photo]').first().click();await expect(page.locator('.community-photo-previews img')).toHaveCount(1);
 await page.locator('[data-community-form=post] button[type=submit]').click();await expect(page.locator('.community-post-photos img.ready')).toHaveCount(1);expect(saved[0].image_paths).toHaveLength(1);expect(saved[0].body).toBe('');expect(saved[0].wants_correction).toBe(false);expect(uploads).toBe(1);
});
test('failed photo upload preserves text and previews for retry',async({page})=>{
 await setup(page,{posts:[]});const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
 await page.route('**/storage/v1/**',r=>r.fulfill({status:503,json:{error:'offline'}}));
 await page.locator('[data-action=community]').click();await page.locator('[data-community=compose]').click();await page.locator('[name=body]').fill('사진과 함께 남겨요.');
 await page.locator('[data-photo-input]').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:png});await expect(page.locator('.community-photo-previews img')).toHaveCount(1);
 await page.locator('[data-community-form=post] button[type=submit]').click();await expect(page.getByRole('alert')).toContainText('업로드');await expect(page.locator('[name=body]')).toHaveValue('사진과 함께 남겨요.');await expect(page.locator('.community-photo-previews img')).toHaveCount(1);
});

test('whole post opens by pointer or keyboard and returns to the same feed position',async({page})=>{
 const posts=Array.from({length:18},(_,i)=>({...post,id:`33333333-3333-4333-8333-${String(i).padStart(12,'0')}`,body:`게시물 ${i}입니다.\n읽던 위치를 유지해요.\n세 번째 줄이에요.`}));
 await setup(page,{posts});await page.locator('[data-action=community]').click();
 const card=page.locator('[data-post]').nth(10);await card.scrollIntoViewIfNeeded();const before=await page.evaluate(()=>scrollY);expect(before).toBeGreaterThan(500);
 await card.locator('.community-body').click();await expect(page.locator('.community-post-detail')).toContainText('게시물 10');await page.locator('[data-community-header-back]').click();await expect(page.locator('[data-post]')).toHaveCount(18);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(before,0);
 await card.focus();await card.press('Enter');await expect(page.locator('.community-post-detail')).toBeVisible();await page.locator('[data-community-header-back]').click();
 await card.locator('summary').click();await expect(page.locator('.community-post-detail')).toHaveCount(0);await card.locator('summary').click();
 await card.locator('[data-community=person]').click();await expect(page.locator('.community-post-detail')).toHaveCount(0);await expect(page.locator('[data-community=request]')).toBeVisible();
});

test('draft text language correction setting and photos survive navigation and reload, then clear after publish',async({page})=>{
 const writes=await setup(page);await page.locator('[data-action=community]').click();await page.locator('[data-community=compose]').click();
 await page.locator('[name=body]').fill('앱을 닫아도 남는 글 <script>');await page.locator('[name=language]').selectOption('ko');await page.locator('[name=wants_correction]').uncheck();
 await page.locator('[data-photo-input]').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:readFileSync('assets/brand/seodang-language-favicon-v1.png')});
 await expect(page.locator('.community-photo-previews img')).toHaveCount(1);await expect(page.locator('[data-draft-status]')).toHaveText('초안 저장됨');await page.locator('[data-action=home]').click();await page.reload();await page.locator('[data-action=community]').click();await page.locator('[data-community=compose]').click();
 await expect(page.locator('[name=body]')).toHaveValue('앱을 닫아도 남는 글 <script>');await expect(page.locator('[name=language]')).toHaveValue('ko');await expect(page.locator('[name=wants_correction]')).not.toBeChecked();await expect(page.locator('.community-photo-previews img')).toHaveCount(1);expect(writes.filter(x=>x.table==='posts')).toHaveLength(0);
 await page.locator('[data-community=remove-photo]').click();await page.locator('[data-community-form=post] button[type=submit]').click();await expect.poll(()=>writes.filter(x=>x.table==='posts').length).toBe(1);
 await page.reload();await page.locator('[data-action=community]').click();await page.locator('[data-community=compose]').click();await expect(page.locator('[name=body]')).toHaveValue('');await expect(page.locator('.community-photo-previews img')).toHaveCount(0);
});

test('switching back to a comment never sends a hidden correction',async({page})=>{
 const writes=await setup(page);await page.locator('[data-action=community]').click();await page.locator('.community-body').click();
 await expect(page.locator('[data-community=select-correction]')).toHaveCount(0);await page.locator('[data-community=reply-correction]').click();await page.locator('[data-community=select-correction]').first().click();await page.locator('[name=correction]').fill('커피를 마셨어요.');await page.locator('[data-community=reply-comment]').click();
 await expect(page.locator('[name=correction]')).toHaveCount(0);await page.locator('[name=body]').fill('반가워요!');await page.locator('[data-community-form=reply] button[type=submit]').click();await expect.poll(()=>writes.filter(x=>x.table==='replies').length).toBe(1);expect(writes.find(x=>x.table==='replies').body.correction).toBe('');
});

test('draft store isolates accounts and languages and coalesces rapid writes',async({page})=>{
 await setup(page);const result=await page.evaluate(async()=>{const {draftKey,saveDraft,readDraft,clearDraft}=await import('/src/community-draft.js');const a=draftKey('a','ko-ja'),b=draftKey('a','ja-ko'),c=draftKey('b','ko-ja');await Promise.all(Array.from({length:20},(_,i)=>saveDraft(a,{body:String(i),language:'ja',wants_correction:true,photos:[]})));const last=await readDraft(a),otherLanguage=await readDraft(b),otherAccount=await readDraft(c);await clearDraft(a);return {last:last.body,otherLanguage,otherAccount,cleared:await readDraft(a)};});expect(result).toEqual({last:'19',otherLanguage:null,otherAccount:null,cleared:null});
});

test('a late publish cannot erase a newer draft',async({page})=>{
 await setup(page);const result=await page.evaluate(async()=>{const {saveDraft,readDraft,clearDraft}=await import('/src/community-draft.js');const key='late:ko-ja',sent={id:'old',body:'보낸 글',language:'ja',wants_correction:true,photos:[]};await saveDraft(key,sent);await saveDraft(key,{...sent,id:'new',body:'새 초안'});await clearDraft(key,sent);const next=await readDraft(key);await clearDraft(key,next);return {next:next.body,cleared:await readDraft(key)};});expect(result).toEqual({next:'새 초안',cleared:null});
});
test('storage failure is visible without clearing the composer',async({page})=>{
 await setup(page);await page.evaluate(()=>{Object.defineProperty(window,'indexedDB',{value:{open(){throw Error('blocked');}},configurable:true});});await page.locator('[data-action=community]').click();await page.locator('[data-community=compose]').click();await page.locator('[name=body]').fill('지우면 안 되는 글');await expect(page.locator('[data-draft-error]')).toContainText('저장할 수 없어요');await expect(page.locator('[name=body]')).toHaveValue('지우면 안 되는 글');
});

test('correction sheet traps focus, closes with Escape, and retains input',async({page})=>{
 await setup(page,{width:320});await page.locator('[data-action=community]').click();await page.locator('[data-community=post]').click();
 const dock=page.locator('.community-comment-dock');await expect(dock).toBeVisible();const box=await dock.boundingBox(),tabs=await page.locator('.tabs').boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(tabs.y+1);
 await page.locator('[data-community=reply-correction]').click();await expect(page.getByRole('dialog')).toBeVisible();await page.locator('[data-community=select-correction]').first().click();await page.locator('[name=correction]').fill('커피를 마셨어요.');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(dock).toBeVisible();await expect(page.locator('[data-community=reply-correction]')).toBeFocused();await page.locator('[data-community=reply-correction]').click();await expect(page.locator('[name=correction]')).toHaveValue('커피를 마셨어요.');
});
test('post photos reuse decoded nodes and downloads across detail and tab navigation',async({page})=>{
 const path=`${other}/${postID}-${id}.jpg`;await setup(page,{posts:[{...post,image_paths:[path]}]});let downloads=0;
 await page.route('**/storage/v1/object/authenticated/**',r=>{downloads++;return r.fulfill({contentType:'image/png',body:readFileSync('assets/brand/seodang-language-favicon-v1.png')});});
 await page.locator('[data-action=community]').click();await expect(page.locator('[data-post-photo].ready')).toHaveCount(1);
 await page.evaluate(()=>window.firstPhoto=document.querySelector('[data-post-photo]'));
 await page.locator('[data-community=post]').click();await expect(page.locator('[data-community-form=reply]')).toBeVisible();
 expect(await page.evaluate(()=>window.firstPhoto===document.querySelector('[data-post-photo]'))).toBe(true);
 expect(await page.locator('[data-post-photo]').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 await page.locator('[data-community-header-back]').click();await expect(page.locator('[data-post]')).toBeVisible();expect(downloads).toBe(1);
 await page.locator('[data-action=home]').click();await page.locator('[data-action=community]').click();await expect(page.locator('[data-post-photo].ready')).toHaveCount(1);expect(downloads).toBe(1);
});
for(const corrupt of [false,true])test(`failed photo ${corrupt?'decode':'request'} can recover on the next redraw`,async({page})=>{
 const path=`${other}/${postID}-${id}.jpg`;await setup(page,{posts:[{...post,image_paths:[path]}]});let downloads=0;
 await page.route('**/storage/v1/object/authenticated/**',r=>{downloads++;return downloads===1?r.fulfill({status:corrupt?200:503,contentType:'image/png',body:'invalid image'}):r.fulfill({contentType:'image/png',body:readFileSync('assets/brand/seodang-language-favicon-v1.png')});});
 await page.locator('[data-action=community]').click();await expect(page.locator('[data-post-photo].failed')).toHaveCount(1);
 await page.locator('[data-community=post]').click();await expect(page.locator('[data-post-photo].ready')).toHaveCount(1);expect(downloads).toBe(2);
});
test('a decoded photo node is not reused after account or cache scope changes',async({page})=>{
 await setup(page);const result=await page.evaluate(async()=>{
  const {retainPostPhotos}=await import('/src/community-photos.js');const host=document.createElement('div');document.body.append(host);host.innerHTML='<img data-post-photo="same" class="ready" data-photo-scope="old:0">';const old=host.firstChild;
  const restore=retainPostPhotos(host,{session:{user:{id:'new'}},photoCacheVersion:0});host.innerHTML='<img data-post-photo="same">';restore();const reused=host.firstChild===old;host.remove();return reused;
 });expect(result).toBe(false);
});
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`composer saving keeps its footer still ${direction} ${width}`,async({page})=>{
 await setup(page,{direction,width});await page.locator('[data-action=community]').click();await page.locator('[data-community=compose]').click();
 const field=page.locator('.community-composer-body'),footer=page.locator('.community-composer-footer');
 await field.focus();const before=await footer.boundingBox();
 await page.evaluate(()=>{window.draftLabels=[];new MutationObserver(()=>window.draftLabels.push(document.querySelector('[data-draft-status]').textContent)).observe(document.querySelector('[data-draft-status]'),{childList:true,subtree:true});});
 await field.pressSequentially(direction==='ko-ja'?'今日はいい天気です。':'오늘은 날씨가 좋아요.',{delay:40});
 await expect(page.locator('[data-draft-status]')).toHaveText(direction==='ko-ja'?'초안 저장됨':'下書き保存済み');
 const after=await footer.boundingBox();expect(Math.abs(before.y-after.y)).toBeLessThan(1);await expect(field).toBeFocused();
 expect(await page.evaluate(()=>window.draftLabels.some(x=>x.includes('중')||x.includes('保存中')))).toBe(false);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`output/composer-stable-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
});
test('slow photos show a blurred placeholder without moving the layout',async({page})=>{
 const path=`${other}/${postID}-${id}.jpg`;await setup(page,{width:320,posts:[{...post,image_paths:[path]}]});let release;
 const gate=new Promise(resolve=>release=resolve);
 await page.route('**/storage/v1/object/authenticated/**',async r=>{await gate;await r.fulfill({contentType:'image/png',body:readFileSync('assets/brand/seodang-language-favicon-v1.png')});});
 await page.locator('[data-action=community]').click();const frame=page.locator('.community-photo-frame');await expect(frame).toHaveAttribute('aria-busy','true');
 const before=await frame.boundingBox();expect(await page.locator('.community-photo-placeholder').evaluate(el=>getComputedStyle(el).filter)).toContain('blur');
 await page.screenshot({path:`output/community-photo-loading-${test.info().project.name}.png`,fullPage:true});release();
 await expect(frame).toHaveAttribute('aria-busy','false');await expect(page.locator('[data-post-photo]')).toHaveClass(/ready/);
 const after=await frame.boundingBox();expect(after.height).toBe(before.height);expect(after.y).toBe(before.y);
 expect(await page.locator('[data-post-photo]').evaluate(el=>getComputedStyle(el).filter)).toBe('none');
 await page.screenshot({path:`output/community-photo-loaded-${test.info().project.name}.png`,fullPage:true});
});
