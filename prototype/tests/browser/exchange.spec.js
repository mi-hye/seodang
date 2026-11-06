import {test,expect} from '@playwright/test';
import {freshState} from '../../src/engine.js';
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',rid='33333333-3333-4333-8333-333333333333',mid='44444444-4444-4444-8444-444444444444';
async function setup(page,{direction='ko-ja',width=390,signed=true,existing=false,profileGate=null,nativeLanguage=direction==='ja-ko'?'ja':'ko'}={}){
 await page.setViewportSize({width,height:844});
 await page.addInitScript(({state,id})=>{localStorage.setItem('seodang.web-prototype.v1',JSON.stringify(state));localStorage.setItem('seodang.analytics.v1',JSON.stringify({consent:false,queue:[]}));localStorage.setItem('seodang.community.session.v1',JSON.stringify({user:{id},access_token:'test',refresh_token:'test',expires_at:Date.now()/1000+3600}));},{state:{...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection:direction,onboardingLevel:2,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}},id});
 let profile=signed?{id,nickname:'서당친구',native_language:nativeLanguage,learning_language:nativeLanguage==='ko'?'ja':'ko',bio:'',rules_version:1}:null;
 const peer={id:other,nickname:'はる',native_language:nativeLanguage==='ko'?'ja':'ko',learning_language:nativeLanguage};
 const control={pending:null,rooms:[],messages:[],writes:[],failSend:false,ambiguousMatch:false,blocks:[],match(){this.rooms=[{id:rid,requester_id:id,recipient_id:other,status:'accepted',peer,preview:'こんにちは！',updated_at:new Date().toISOString(),unread:1}];this.messages=[{id:mid,room_id:rid,author_id:other,body:'こんにちは！ <img src=x onerror=alert(1)>',created_at:new Date().toISOString()}];this.pending=null;}};
 if(existing)control.match();
 await page.route('**/auth/v1/**',r=>r.fulfill({json:r.request().url().endsWith('/user')?{id}:{user:{id},access_token:'test',refresh_token:'test',expires_at:Date.now()/1000+3600}}));
 await page.route('**/rest/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1),method=req.method(),body=req.postDataJSON();let result=[];
  if(method!=='GET')control.writes.push({name,body});
  if(name==='community_unread')result=control.rooms.some(r=>r.unread>0);
  else if(name==='community_conversations'){control.listReads=(control.listReads||0)+1;if(control.listGate)await control.listGate;if(control.failList){control.failList=false;return route.fulfill({status:503,json:{message:'offline'}});}result=control.rooms;}
  else if(name==='community_match'){
   if(body.p_action==='status')result={pending:control.pending};
   if(body.p_action==='start'){control.matchedProfile={...profile};control.pending||={id:body.p_request,body:body.p_body};result={status:'waiting',id:body.p_request};if(control.ambiguousMatch){control.ambiguousMatch=false;return route.abort();}}
   if(body.p_action==='cancel'){control.pending=null;result={status:'cancelled'};}
   if(body.p_action==='read'){control.rooms.forEach(r=>r.unread=0);result={};}
  }else if(name==='community_profiles'){if(profileGate)await profileGate;if(method==='POST'||method==='PATCH'){if(control.failProfileSave){control.failProfileSave=false;return route.fulfill({status:503,json:{message:'offline'}});}profile={...profile,id,...body};}result=profile?[profile]:[];}
  else if(name==='community_messages'){
   if(method==='POST'){if(control.sendGate)await control.sendGate;if(control.failSend){control.failSend=false;return route.fulfill({status:503,json:{message:'offline'}});}control.messages.push({...body,created_at:new Date().toISOString()});result=[control.messages.at(-1)];if(control.ambiguousSend){control.ambiguousSend=false;return route.abort();}}
   else {if(control.messageGate)await control.messageGate;if(control.failRead){control.failRead=false;return route.fulfill({status:503,json:{message:'offline'}});}result=url.searchParams.has('id')?control.messages.filter(m=>'eq.'+m.id===url.searchParams.get('id')):[...control.messages].reverse();}
  }else if(name==='community_blocks'){if(method==='POST'){control.blocks.push(body);control.rooms=[];result=[body];}else if(method==='DELETE'){control.blocks=[];}else result=control.blocks;}
  else if(name==='community_reports')result=[body];
  else if(name==='community_push_device')result=null;
  else throw Error('Unexpected data API request '+name);
  await route.fulfill({json:result});
 });
 await page.goto('/playable.html');await page.locator('[data-action=community]').click();return control;
}
async function pull(page,{selector='.exchange',dx=0,dy=100,cancel=false,count=1}={}){
 await page.evaluate(({selector,dx,dy,cancel,count})=>{
  const target=document.querySelector(selector),touch=(x,y,id=1)=>({identifier:id,target,clientX:x,clientY:y});
  const event=(name,touches)=>{const e=new Event(name,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:touches});target.dispatchEvent(e);};
  event('touchstart',[touch(100,220)]);event('touchmove',Array.from({length:count},(_,i)=>touch(100+dx,220+dy,i+1)));event(cancel?'touchcancel':'touchend',[]);
 },{selector,dx,dy,cancel,count});
}
for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`persistent conversation UI ${direction} ${width}`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const c=await setup(page,{direction,width});
 await expect(page.locator('[data-exchange=new]')).toBeVisible();await expect(page.locator('[data-post]')).toHaveCount(0);
 await expect(page.locator('.exchange-empty')).toHaveText(direction==='ko-ja'?'아직 대화가 없어요':'まだ会話がありません');
 await expect(page.locator('[data-exchange=new]')).toHaveAttribute('aria-label',direction==='ko-ja'?'새 대화':'新しい会話');
 const fab=await page.locator('.exchange-fab').boundingBox(),nav=await page.locator('.tabs').boundingBox();expect(fab.width).toBe(56);expect(fab.x+fab.width).toBeLessThanOrEqual(width-15);expect(nav.y-fab.y-fab.height).toBeGreaterThanOrEqual(15);
 await page.screenshot({path:`output/exchange-empty-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-exchange=new]').click();await expect(page.locator('.exchange-compose')).toBeVisible();await expect(page.locator('dialog[open]')).toHaveCount(0);await expect(page.locator('.tabs')).toBeHidden();await expect(page.locator('.exchange-first-send')).toBeDisabled();
 await expect(page.locator('.exchange-recipient strong')).toHaveText(direction==='ja-ko'?'韓国人に送ります':'일본인에게 보내요');await expect(page.locator('.exchange-recipient p')).toContainText(direction==='ja-ko'?'ランダム':'랜덤');
 await page.screenshot({path:`output/exchange-compose-${direction}-${width}-${test.info().project.name}.png`});
 await page.locator('[name=body]').fill('こんにちは。韓国語を勉強しています。');
 await page.locator('.exchange-first-send').click();await expect(page.locator('.exchange-waiting')).toContainText('こんにちは');await expect(page.locator('.tabs')).toBeVisible();await expect(page.locator('.exchange-first-send')).toBeHidden();
 await page.screenshot({path:`output/exchange-waiting-${direction}-${width}-${test.info().project.name}.png`});
 await page.reload();await page.locator('[data-action=community]').click();await expect(page.locator('.exchange-waiting')).toBeVisible();
 c.match();await pull(page);await expect(page.locator('.exchange-pull')).toBeHidden();await page.waitForTimeout(410);await page.locator('[data-exchange=room]').click();
 await expect(page.locator('.exchange-bubble')).toContainText('<img');await expect(page.locator('.exchange-bubble img')).toHaveCount(0);
 await page.locator('[name=body]').fill('한국어로 이야기해요!');await page.locator('[name=body]').focus();await page.locator('.exchange-send').click();await expect(page.locator('.exchange-bubble.mine')).toContainText('한국어로');await expect(page.locator('[name=body]')).toBeFocused();
 await expect(page.locator('[name=body]')).toHaveValue('');
 await expect(page.locator('.tabs')).toBeHidden();await page.locator('[name=body]').blur();await expect(page.locator('.tabs')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const dock=await page.locator('.exchange-composer').boundingBox(),tabs=await page.locator('.tabs').boundingBox();expect(dock.y+dock.height).toBeLessThanOrEqual(tabs.y+2);
 await page.screenshot({path:`output/exchange-chat-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-community-header-back]').click();await page.locator('[data-exchange=room]').click();await expect(page.locator('.exchange-bubble.mine')).toContainText('한국어로');
 expect(c.writes.filter(w=>w.name==='community_match'&&w.body.p_action==='start')).toHaveLength(1);expect(errors).toEqual([]);
});
test('ambiguous first-send retry retains UUID; cancellation and profile opt-in',async({page})=>{
 const c=await setup(page,{signed:false});await expect(page.locator('.exchange-empty')).toHaveText('아직 대화가 없어요');await expect(page.locator('[name=nickname]')).toHaveCount(0);await page.locator('[data-exchange=new]').click();await page.locator('[name=nickname]').fill('친구친구');await page.locator('[name=rules]').check();await page.locator('[data-exchange-form=profile] button[type=submit]').click();
 await page.locator('[name=body]').fill('안녕하세요');c.ambiguousMatch=true;
 await page.locator('.exchange-first-send').click();await expect(page.locator('[role=alert]')).toBeVisible();await expect(page.locator('[name=body]')).toHaveValue('안녕하세요');
 await page.locator('.exchange-first-send').click();await expect(page.locator('.exchange-waiting')).toBeVisible();
 const ids=c.writes.filter(w=>w.body?.p_action==='start').map(w=>w.body.p_request);expect(ids).toHaveLength(2);expect(ids[0]).toBe(ids[1]);
 await page.locator('[data-exchange=cancel]').click();await expect(page.locator('.exchange-waiting')).toHaveCount(0);
});
test('failed send preserves draft, report and block',async({page})=>{
 const c=await setup(page,{existing:true});await page.locator('[data-exchange=room]').click();await page.locator('[name=body]').fill('다시 보내요');c.failSend=true;
 await page.locator('.exchange-send').click();await expect(page.locator('[role=alert]')).toBeVisible();await expect(page.locator('.exchange-outbox')).toContainText('다시 보내요');await expect(page.locator('[name=body]')).toHaveValue('');
 await page.locator('[data-exchange=retry-message]').click();await expect(page.locator('.exchange-messages .exchange-bubble.mine')).toContainText('다시 보내요');
 const ids=c.writes.filter(w=>w.name==='community_messages').map(w=>w.body.id);expect(ids[0]).toBe(ids[1]);
 await page.locator('.exchange-menu summary').click();await page.locator('[data-exchange=report]').click();await page.locator('[data-exchange-form=report] button[type=submit]').click();
 expect(c.writes.find(w=>w.name==='community_reports').body.message_id).toBe(mid);
 page.once('dialog',d=>d.accept());await page.locator('.exchange-menu summary').click();await page.locator('[data-exchange=block]').click();await expect(page.locator('[data-exchange=room]')).toHaveCount(0);
});
test('Android Back and narrow header controls do not trap the conversation',async({page})=>{
 await page.addInitScript(()=>{window.Capacitor={getPlatform:()=> 'android',isNativePlatform:()=>false};});
 await setup(page,{existing:true,width:320,direction:'ja-ko'});await page.locator('[data-exchange=room]').click();
 await expect(page.locator('.app-header [data-action=community-profile]')).toBeHidden();
 await expect(page.locator('[data-community-header-back]')).toBeVisible();
 expect(await page.evaluate(()=>!window.dispatchEvent(new Event('seodang:back',{cancelable:true})))).toBe(true);
 await expect(page.locator('[data-exchange=room]')).toBeVisible();
 expect(await page.evaluate(()=>!window.dispatchEvent(new Event('seodang:back',{cancelable:true})))).toBe(true);
 await expect(page.locator('.learning-map')).toBeVisible();
});
test('incoming messages preserve the typed reply and focus',async({page})=>{
 await page.clock.install();const c=await setup(page,{existing:true});await page.locator('[data-exchange=room]').click();
 await page.locator('[name=body]').fill('아직 쓰는 중이에요');await page.locator('[name=body]').focus();
 c.messages.push({id:'55555555-5555-4555-8555-555555555555',room_id:rid,author_id:other,body:'오늘 뭐 했어요?',created_at:new Date(Date.now()+1000).toISOString()});
 await page.clock.fastForward(11000);await expect(page.locator('.exchange-messages')).toContainText('오늘 뭐 했어요?');
 await expect(page.locator('[name=body]')).toHaveValue('아직 쓰는 중이에요');await expect(page.locator('[name=body]')).toBeFocused();
});
test('new replies show a badge on learning tab and clear after reading',async({page})=>{
 const c=await setup(page,{existing:true});await expect(page.locator('.tabs [data-action=community] .tab-unread')).toBeVisible();
 await page.locator('[data-action=home]').click();await expect(page.locator('.tabs [data-action=community] .tab-unread')).toBeVisible();
 await page.locator('[data-action=community]').click();await page.locator('[data-exchange=room]').click();
 await expect(page.locator('.tabs [data-action=community] .tab-unread')).toHaveCount(0);expect(c.rooms[0].unread).toBe(0);
});
test('unsent first message survives Back and reopening',async({page})=>{
 await setup(page);await page.locator('[data-exchange=new]').click();await page.locator('[name=body]').fill('아직 보내지 않은 인사예요');await page.locator('[data-community-header-back]').click();await page.locator('[data-exchange=new]').click();await expect(page.locator('[name=body]')).toHaveValue('아직 보내지 않은 인사예요');
});
test('typing the next message during an ambiguous send never duplicates the first',async({page})=>{
 const c=await setup(page,{existing:true});await page.locator('[data-exchange=room]').click();let release;c.sendGate=new Promise(r=>release=r);c.ambiguousSend=true;
 await page.locator('[name=body]').fill('첫 번째 메시지');await page.locator('.exchange-send').click();await expect(page.locator('.exchange-outbox')).toContainText('첫 번째 메시지');
 await page.locator('[name=body]').fill('두 번째 메시지');release();await expect(page.locator('[data-exchange=retry-message]')).toBeVisible();
 await page.locator('[data-exchange=retry-message]').click();await expect(page.locator('.exchange-outbox')).toBeEmpty();await expect(page.locator('[name=body]')).toHaveValue('두 번째 메시지');
 await page.locator('.exchange-send').click();await expect(page.locator('.exchange-messages .mine')).toHaveCount(2);
 expect(c.messages.filter(m=>m.body==='첫 번째 메시지')).toHaveLength(1);expect(c.messages.filter(m=>m.body==='두 번째 메시지')).toHaveLength(1);
});

test('first-time profile can return to empty inbox without joining a queue',async({page})=>{
 const c=await setup(page,{signed:false,width:320});
 await expect(page.locator('.app-header-title')).toHaveText('대화');
 await page.locator('[data-exchange=new]').click();await expect(page.locator('[name=nickname]')).toBeVisible();
 await page.locator('[data-community-header-back]').click();await expect(page.locator('.exchange-empty')).toHaveText('아직 대화가 없어요');
 expect(c.writes.filter(w=>w.name==='community_match')).toHaveLength(0);
 await page.locator('[data-action=community-profile]').click();await page.locator('[name=nickname]').fill('서당친구');await page.locator('[name=rules]').check();await page.locator('[data-exchange-form=profile] button[type=submit]').click();
 await expect(page.locator('.exchange-empty')).toBeVisible();await expect(page.locator('[data-exchange-form=match]')).toHaveCount(0);
});

test('loading indicators cover initial fetch and room fetch, and a failed room can retry',async({page})=>{
 let releaseProfile;const profileGate=new Promise(r=>releaseProfile=r);const c=await setup(page,{existing:true,profileGate});
 await expect(page.locator('.exchange-loading')).toBeVisible();await expect(page.locator('.exchange-loading')).toHaveAttribute('aria-label','대화를 불러오는 중…');await expect(page.locator('.exchange-loading')).toHaveText('');
 releaseProfile();await expect(page.locator('[data-exchange=room]')).toBeVisible();
 let releaseMessages;c.messageGate=new Promise(r=>releaseMessages=r);c.failRead=true;await page.locator('[data-exchange=room]').click();await expect(page.locator('.exchange-loading')).toBeVisible();
 releaseMessages();await expect(page.locator('[role=alert]')).toBeVisible();await expect(page.locator('.exchange-loading')).toHaveCount(0);await expect(page.locator('[data-exchange=room]')).toBeEnabled();
 await page.locator('[data-exchange=room]').click();await expect(page.locator('.exchange-messages')).toContainText('こんにちは');
});
test('full screen compose returns with Android Back and keeps draft',async({page})=>{
 await page.addInitScript(()=>{window.Capacitor={getPlatform:()=> 'android',isNativePlatform:()=>false};});
 await setup(page,{width:320});await page.locator('[data-exchange=new]').click();await page.locator('[name=body]').fill('이어 쓸 메시지');
 expect(await page.evaluate(()=>document.body.style.position)).not.toBe('fixed');await expect(page.locator('.tabs')).toBeHidden();
 expect(await page.evaluate(()=>!window.dispatchEvent(new Event('seodang:back',{cancelable:true})))).toBe(true);
 await expect(page.locator('.exchange-compose')).toHaveCount(0);await expect(page.locator('.tabs')).toBeVisible();expect(await page.evaluate(()=>document.body.style.position)).not.toBe('fixed');await expect(page.locator('[data-exchange=new]')).toBeFocused();
 await page.locator('[data-exchange=new]').click();await expect(page.locator('[name=body]')).toHaveValue('이어 쓸 메시지');
 await page.setViewportSize({width:320,height:420});await expect.poll(async()=>{const box=await page.locator('.exchange-compose').boundingBox();return box.y+box.height;}).toBeLessThanOrEqual(420);const box=await page.locator('.exchange-compose').boundingBox();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(420);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('[data-community-header-back]').click();await page.locator('[data-action=home]').click();expect(await page.evaluate(()=>document.body.style.position)).not.toBe('fixed');
});

for(const direction of ['ko-ja','ja-ko'])test(`clean message layout and day groups ${direction}`,async({page})=>{
 const c=await setup(page,{direction,existing:true,width:390});
 const stamp=new Date();stamp.setHours(10,0,0,0);const today=stamp.getTime(),yesterday=today-86400000;
 c.messages=[
  {id:mid,room_id:rid,author_id:other,body:'안녕하세요! 한국어를 배우고 있어요.',created_at:new Date(yesterday).toISOString()},
  {id:'55555555-5555-4555-8555-555555555555',room_id:rid,author_id:id,body:'こんにちは！一緒に練習しましょう。',created_at:new Date(yesterday+60000).toISOString()},
  {id:'66666666-6666-4666-8666-666666666666',room_id:rid,author_id:other,body:'오늘은 어떤 하루였어요?',created_at:new Date(today).toISOString()},
  {id:'77777777-7777-4777-8777-777777777777',room_id:rid,author_id:other,body:'저는 친구와 카페에 갔어요 ☕',created_at:new Date(today+30000).toISOString()}
 ];
 await expect(page.locator('[data-exchange=room]')).toBeVisible();await page.screenshot({path:`output/exchange-inbox-polished-${direction}-${test.info().project.name}.png`});
 await page.locator('[data-exchange=room]').click();await expect(page.locator('.app-header-title strong')).toHaveText('はる');await expect(page.locator('.exchange-peer')).toHaveCount(0);
 await expect(page.locator('.exchange-day')).toHaveCount(2);await expect(page.locator('.exchange-message.is-joined')).toHaveCount(1);
 for(const label of await page.locator('.exchange-message-time').allTextContents())expect(label).toMatch(/^\d{2}:\d{2}$/);
 await expect(page.locator('.exchange-send')).toBeDisabled();await page.locator('[name=body]').fill('좋은 하루였네요!');await expect(page.locator('.exchange-send')).toBeEnabled();
 await page.screenshot({path:`output/exchange-chat-polished-${direction}-${test.info().project.name}.png`});
 await page.locator('.exchange-menu summary').click();await expect(page.locator('[data-exchange=report]')).toBeVisible();await page.locator('.exchange-menu summary').click();
 await page.locator('[data-community-header-back]').click();await expect(page.locator('.app-header-settings')).toBeVisible();await expect(page.locator('.exchange-header-tools')).toBeHidden();
});

for(const direction of ['ko-ja','ja-ko'])test(`new invitation aligns old profile with current learning direction ${direction}`,async({page})=>{
 const native=direction==='ko-ja'?'ko':'ja',c=await setup(page,{direction,nativeLanguage:native==='ko'?'ja':'ko',existing:true});
 await page.locator('[data-exchange=new]').click();await expect(page.locator('.exchange-recipient strong')).toHaveText(direction==='ko-ja'?'일본인에게 보내요':'韓国人に送ります');
 expect(c.writes.filter(w=>w.name==='community_profiles')).toHaveLength(0);
 await page.locator('[name=body]').fill('반가워요!');await page.locator('.exchange-first-send').click();await expect(page.locator('.exchange-waiting')).toBeVisible();
 expect(c.matchedProfile.native_language).toBe(native);expect(c.matchedProfile.learning_language).toBe(native==='ko'?'ja':'ko');expect(c.rooms).toHaveLength(1);
 const patch=c.writes.findIndex(w=>w.name==='community_profiles'),match=c.writes.findIndex(w=>w.name==='community_match'&&w.body.p_action==='start');expect(patch).toBeGreaterThanOrEqual(0);expect(match).toBeGreaterThan(patch);
});
test('profile alignment failure prevents wrong-language matching and keeps retry UUID',async({page})=>{
 const c=await setup(page,{nativeLanguage:'ja'});await page.locator('[data-exchange=new]').click();await page.locator('[name=body]').fill('일본어를 연습하고 싶어요');c.failProfileSave=true;
 await page.locator('.exchange-first-send').click();await expect(page.locator('[role=alert]')).toBeVisible();await expect(page.locator('[name=body]')).toHaveValue('일본어를 연습하고 싶어요');expect(c.writes.filter(w=>w.name==='community_match'&&w.body.p_action==='start')).toHaveLength(0);
 const draft=await page.evaluate(id=>JSON.parse(localStorage.getItem(`seodang.exchange.draft.${id}.new`)),id);
 await page.locator('.exchange-first-send').click();await expect(page.locator('.exchange-waiting')).toBeVisible();expect(c.writes.find(w=>w.name==='community_match'&&w.body.p_action==='start').body.p_request).toBe(draft.id);
});

for(const direction of ['ko-ja','ja-ko'])test(`new message banner opens its room without leaking body ${direction}`,async({page})=>{
 await page.clock.install();const c=await setup(page,{direction,width:320,existing:true});await expect(page.locator('.exchange-room')).toBeVisible();
 await page.locator('[data-action=home]').click();
 c.messages.push({id:'55555555-5555-4555-8555-555555555555',room_id:rid,author_id:other,body:'PRIVATE BODY',created_at:new Date(Date.now()+1000).toISOString()});c.rooms[0].unread=2;
 await page.clock.fastForward(21000);const banner=page.locator('.message-alert');await expect(banner).toBeVisible();await expect(banner).not.toContainText('PRIVATE BODY');
 expect(await banner.evaluate(e=>e.getBoundingClientRect().right<=innerWidth)).toBe(true);
 await page.screenshot({path:`output/message-alert-${direction}-${test.info().project.name}.png`});
 await banner.locator('button').first().click();await expect(page.locator('[data-active-room]')).toHaveAttribute('data-active-room',rid);await expect(banner).toHaveCount(0);
 await page.evaluate(room=>window.dispatchEvent(new CustomEvent('seodang:push-message',{detail:{room_id:room,opened:false}})),rid);await expect(banner).toHaveCount(0);
});
test('notification tap validates ID and opens an authorized room',async({page})=>{
 await setup(page,{existing:true});await expect(page.locator('.exchange-room')).toBeVisible();await page.locator('[data-action=home]').click();
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('seodang:push-message',{detail:{room_id:'not-a-room',opened:true}})));await expect(page.locator('.learning-map')).toBeVisible();
 await page.evaluate(room=>window.dispatchEvent(new CustomEvent('seodang:push-message',{detail:{room_id:room,opened:true}})),rid);await expect(page.locator('[data-active-room]')).toHaveAttribute('data-active-room',rid);
});
async function mockPush(page,{permission='prompt',result='granted'}={}){
 await page.route('**/src/message-push-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const messagePushConfig={ios:true};'}));
 await page.addInitScript(({permission,result})=>{const handlers={};window.pushPrompts=0;window.pushRegistrations=0;window.settingsOpened=0;window.Capacitor={getPlatform:()=> 'ios',isNativePlatform:()=>false,isPluginAvailable:name=>name==='PushNotifications',nativePromise:async()=>{window.settingsOpened++;},Plugins:{PushNotifications:{async addListener(n,f){handlers[n]=f;return {remove(){}};},async checkPermissions(){return {receive:permission};},async requestPermissions(){window.pushPrompts++;permission=result;return {receive:permission};},async register(){window.pushRegistrations++;setTimeout(()=>handlers.registration({value:'a'.repeat(64)}),0);},async unregister(){}}}};},{permission,result});
}
test('message push permission opens on conversation entry and manual opt-out stays off',async({page})=>{
 await mockPush(page);await setup(page);
 await expect.poll(()=>page.evaluate(()=>window.pushPrompts)).toBe(1);
 await expect(page.locator('.exchange-notification')).toHaveCount(0);
 await page.locator('[data-action=community-profile]').click();await expect(page.locator('.exchange-notification')).toContainText('메시지 알림 켜짐');
 await page.locator('[data-exchange=notifications-off]').click();await expect(page.locator('[data-exchange=notifications-on]')).toBeVisible();
 const registrations=await page.evaluate(()=>window.pushRegistrations);
 await page.locator('[data-community-header-back]').click();await expect(page.locator('.exchange-empty')).toBeVisible();await expect(page.locator('.exchange-notification')).toHaveCount(0);
 expect(await page.evaluate(()=>window.pushRegistrations)).toBe(registrations);
});
for(const direction of ['ko-ja','ja-ko'])test(`message push denied settings notice ${direction}`,async({page},testInfo)=>{
 await mockPush(page,{permission:'denied'});await setup(page,{direction,width:320});
 const dialog=page.locator('.exchange-permission');await expect(dialog).toBeVisible();
 const buttons=await dialog.locator('button').all();const a=await buttons[0].boundingBox(),b=await buttons[1].boundingBox();expect(Math.abs(a.y-b.y)).toBeLessThan(2);expect(a.width).toBeGreaterThan(44);expect(b.x+b.width).toBeLessThanOrEqual(320);
 await page.screenshot({path:`output/message-permission-${direction}-${testInfo.project.name}.png`});
 await dialog.locator('[data-notification-settings]').click();await expect(dialog).toHaveCount(0);await expect.poll(()=>page.evaluate(()=>window.settingsOpened)).toBe(1);
 await page.reload();await page.locator('[data-action=community]').click();await expect(page.locator('.exchange-empty')).toBeVisible();await expect(page.locator('.exchange-permission')).toHaveCount(0);expect(await page.evaluate(()=>window.pushPrompts)).toBe(0);
 await page.locator('[data-action=community-profile]').click();
 const panel=page.locator('.exchange-profile-panel'),settings=panel.locator('[data-exchange=notification-settings]');await expect(settings).toBeVisible();
 const panelBox=await panel.boundingBox(),settingsBox=await settings.boundingBox();expect(settingsBox.width).toBeGreaterThanOrEqual(44);expect(settingsBox.height).toBeGreaterThanOrEqual(44);expect(settingsBox.x+settingsBox.width).toBeLessThanOrEqual(panelBox.x+panelBox.width-15);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:`output/profile-claude-notification-${direction}-${testInfo.project.name}.png`,fullPage:true});
 await settings.click();await expect.poll(()=>page.evaluate(()=>window.settingsOpened)).toBe(1);
});
test('message push OS rejection is not followed by a second dialog or repeated permission',async({page})=>{
 await mockPush(page,{result:'denied'});await setup(page);await expect.poll(()=>page.evaluate(()=>window.pushPrompts)).toBe(1);await expect(page.locator('.exchange-permission')).toHaveCount(0);
 await page.reload();await page.locator('[data-action=community]').click();await expect(page.locator('.exchange-empty')).toBeVisible();expect(await page.evaluate(()=>window.pushPrompts)).toBe(0);await expect(page.locator('.exchange-permission')).toHaveCount(0);
});
test('message push waits for initial profile and does not interrupt first-message composition',async({page})=>{
 await mockPush(page);await setup(page,{signed:false});await expect(page.locator('.exchange-empty')).toBeVisible();expect(await page.evaluate(()=>window.pushPrompts)).toBe(0);
 await page.locator('[data-exchange=new]').click();await page.locator('[name=nickname]').fill('친구');await page.locator('[name=rules]').check();await page.locator('[data-exchange-form=profile] button[type=submit]').click();await expect(page.locator('.exchange-first')).toBeVisible();expect(await page.evaluate(()=>window.pushPrompts)).toBe(0);
 await page.locator('[data-community-header-back]').click();await expect.poll(()=>page.evaluate(()=>window.pushPrompts)).toBe(1);
});

for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`pull refresh retains list, guards duplicate pulls and recovers ${direction} ${width}`,async({page})=>{
 const c=await setup(page,{existing:true,direction,width});await expect(page.locator('.exchange-room')).toBeVisible();await expect(page.locator('[data-exchange=refresh]')).toHaveCount(0);
 let release;c.listGate=new Promise(r=>release=r);const before=c.listReads;
 await pull(page,{selector:'.exchange-room'});await expect(page.locator('.exchange-pull')).toBeVisible();await expect(page.locator('.exchange-room')).toBeVisible();await expect(page.locator('.exchange-loading')).toHaveCount(0);
 await pull(page);await expect.poll(()=>c.listReads).toBe(before+1);
 await page.screenshot({path:`output/exchange-pull-${direction}-${width}-${test.info().project.name}.png`});
 release();c.listGate=null;await expect(page.locator('.exchange-pull')).toBeHidden();await expect(page.locator('.exchange-room')).toBeEnabled();
 c.failList=true;await pull(page);await expect(page.locator('.exchange-feedback[role=alert]')).toBeVisible();await expect(page.locator('.exchange-room')).toBeVisible();
 await pull(page);await expect(page.locator('.exchange-feedback')).toHaveText('');await expect(page.locator('.exchange-pull')).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('pull refresh ignores accidental gestures and cleans up on navigation',async({page})=>{
 const c=await setup(page,{existing:true});await expect(page.locator('.exchange-room')).toBeVisible();const before=c.listReads;
 for(const config of [{dy:40},{dy:20,dx:90},{dy:-90},{count:2},{cancel:true}])await pull(page,config);
 expect(c.listReads).toBe(before);await expect(page.locator('.exchange-pull')).toBeHidden();
 await page.evaluate(()=>{document.querySelector('.exchange').style.minHeight='2000px';window.scrollTo(0,200);});await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0);await pull(page);expect(c.listReads).toBe(before);
 await page.locator('[data-action=home]').click();await expect(page.locator('.exchange-pull')).toHaveCount(0);
});
test('pull refresh chat preserves loaded history, draft and top position',async({page})=>{
 const c=await setup(page,{existing:true});await page.locator('.exchange-room').click();await expect(page.locator('.exchange-composer')).toBeVisible();await page.locator('[name=body]').fill('아직 쓰는 중');
 await page.evaluate(()=>{document.activeElement.blur();window.scrollTo(0,0);});
 const oldId=c.messages[0].id;c.messages=[{id:'55555555-5555-4555-8555-555555555555',room_id:rid,author_id:other,body:'새 대화 도착',created_at:new Date(Date.now()+1000).toISOString()}];
 await pull(page);await expect(page.locator('.exchange-messages')).toContainText('새 대화 도착');await expect(page.locator(`[data-message-id="${oldId}"]`)).toBeVisible();await expect(page.locator('[name=body]')).toHaveValue('아직 쓰는 중');expect(await page.evaluate(()=>scrollY)).toBe(0);
 const before=c.listReads;await pull(page,{selector:'textarea'});expect(c.listReads).toBe(before);await expect(page.locator('[data-exchange=refresh]')).toHaveCount(0);
});
test('native touch pull triggers one refresh without opening the touched room',async({page,context,browserName})=>{
 test.skip(browserName!=='chromium','CDP touch injection is Chromium-only; event behavior covered in both engines.');
 const c=await setup(page,{existing:true});await expect(page.locator('.exchange-room')).toBeVisible();const b=await page.locator('.exchange-room').boundingBox(),x=b.x+b.width/2,y=b.y+15;const before=c.listReads;
 const session=await context.newCDPSession(page);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(const dy of [15,35,65,90,110])await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect.poll(()=>c.listReads).toBe(before+1);await expect(page.locator('.exchange-inbox')).toBeVisible();await expect(page.locator('.exchange-pull')).toBeHidden();
});

test('pull refresh works on an empty inbox and unmounts while loading',async({page})=>{
 const c=await setup(page);await expect(page.locator('.exchange-empty')).toBeVisible();c.match();await pull(page);await expect(page.locator('.exchange-room')).toBeVisible();
 let release;c.listGate=new Promise(r=>release=r);await pull(page);await expect(page.locator('.exchange-pull')).toBeVisible();await page.locator('[data-action=home]').click();release();c.listGate=null;await expect(page.locator('.exchange-pull')).toHaveCount(0);await expect(page.locator('.learning-map')).toBeVisible();
});

for(const long of [false,true])test(`chat scroll target stays inside the document ${long?'long':'short'}`,async({page})=>{
 await page.addInitScript(()=>{const original=window.scrollTo.bind(window);window.__scrollTargets=[];window.scrollTo=(...args)=>{const y=typeof args[0]==='object'?args[0].top:args[1],root=document.scrollingElement||document.documentElement;window.__scrollTargets.push({y,max:Math.max(0,root.scrollHeight-root.clientHeight)});return original(...args);};});
 const c=await setup(page,{existing:true});await expect(page.locator('.exchange-room')).toBeVisible();
 c.messages[0].body=long?'긴 대화 내용을 확인해요. '.repeat(120):'안녕하세요! 서당 테스트 메시지예요. 대화 화면에 이 메시지가 보이면 정상적으로 도착한 거예요. 🐶';
 await page.evaluate(()=>window.__scrollTargets=[]);await page.locator('.exchange-room').click();await expect(page.locator('.exchange-composer')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__scrollTargets.length)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>window.__scrollTargets.every(({y,max})=>y>=0&&y<=max))).toBe(true);
 await page.locator('[name=body]').fill('답장을 쓰고 있어요');await expect(page.locator('.exchange-send')).toBeEnabled();
 await page.locator('[data-community-header-back]').click();await expect(page.locator('.exchange-inbox')).toBeVisible();
});

for(const mode of ['visual','native'])test(`chat keyboard hides tabs and keeps composer above keyboard ${mode}`,async({page})=>{
 if(mode==='visual')await page.addInitScript(()=>{window.__keyboardHeight=0;Object.defineProperty(visualViewport,'height',{get:()=>innerHeight-window.__keyboardHeight});});
 await setup(page,{existing:true});await page.locator('.exchange-room').click();await expect(page.locator('.exchange-composer')).toBeVisible();await page.locator('textarea').focus();
 if(mode==='visual')await page.evaluate(()=>{window.__keyboardHeight=320;visualViewport.dispatchEvent(new Event('resize'));});
 else await page.setViewportSize({width:390,height:524});
 await expect(page.locator('.tabs')).toBeHidden();const dock=await page.locator('.exchange-composer').boundingBox();expect(Math.abs(dock.y+dock.height-524)).toBeLessThanOrEqual(2);
 await page.locator('textarea').fill('키보드 테스트');await expect(page.locator('.exchange-send')).toBeEnabled();
 if(mode==='visual')await page.evaluate(()=>{window.__keyboardHeight=0;visualViewport.dispatchEvent(new Event('resize'));});else await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>document.activeElement.blur());await expect(page.locator('.tabs')).toBeVisible();
 await page.locator('[data-community-header-back]').click();await expect(page.locator('.exchange-inbox')).toBeVisible();await expect(page.locator('.tabs')).toBeVisible();
});

for(const width of [320,390])test(`iOS keyboard lifts only the composer and restores tabs after dismissal ${width}`,async({page})=>{
 await page.addInitScript(()=>{
  window.Capacitor={getPlatform:()=> 'ios',isNativePlatform:()=>true,isPluginAvailable:name=>name==='Keyboard'};
  window.__staleKeyboardInset=0;
  Object.defineProperty(visualViewport,'height',{get:()=>innerHeight-window.__staleKeyboardInset});
 });
 await setup(page,{existing:true,width});await page.locator('.exchange-room').click();await page.locator('textarea').focus();
 await page.evaluate(()=>window.dispatchEvent(Object.assign(new Event('keyboardWillShow'),{keyboardHeight:320})));
 // The page remains full size, even if visualViewport reports a different inset.
 await page.evaluate(()=>{window.__staleKeyboardInset=100;visualViewport.dispatchEvent(new Event('resize'));window.dispatchEvent(Object.assign(new Event('keyboardDidShow'),{keyboardHeight:320}));});
 expect(await page.evaluate(()=>innerHeight)).toBe(844);
 await expect(page.locator('.tabs')).toBeHidden();
 const dock=await page.locator('.exchange-composer').boundingBox();expect(Math.abs(dock.y+dock.height-524)).toBeLessThanOrEqual(2);
 await page.locator('textarea').fill('키보드 위에서 답장을 씁니다. '.repeat(12));await expect(page.locator('.exchange-send')).toBeEnabled();
 const field=await page.locator('textarea').boundingBox();expect(field.y).toBeGreaterThan(0);expect(field.y+field.height).toBeLessThan(524);
 await page.locator('.exchange-send').click();await expect(page.locator('.exchange-bubble.mine')).toBeVisible();await expect(page.locator('textarea')).toBeFocused();
 await page.evaluate(()=>{window.__staleKeyboardInset=0;window.dispatchEvent(new Event('keyboardDidHide'));});
 // OS dismissal can keep DOM focus; tabs must still return.
 await expect(page.locator('textarea')).toBeFocused();await expect(page.locator('.tabs')).toBeVisible();
 const restored=await page.locator('.exchange-composer').boundingBox(),tabs=await page.locator('.tabs').boundingBox();expect(restored.y+restored.height).toBeLessThanOrEqual(tabs.y+2);
 await page.locator('[data-community-header-back]').click();await expect(page.locator('.exchange-inbox')).toBeVisible();await expect(page.locator('.tabs')).toBeVisible();
 await page.locator('[data-action=home]').click();await page.evaluate(()=>window.dispatchEvent(new Event('keyboardWillShow')));await expect(page.locator('.exchange-typing')).toHaveCount(0);
});

for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`first message recipient stays above iOS overlay keyboard ${direction} ${width}`,async({page})=>{
 await page.addInitScript(()=>{window.Capacitor={getPlatform:()=> 'ios',isNativePlatform:()=>true,isPluginAvailable:name=>name==='Keyboard'};});
 await setup(page,{direction,width});await page.locator('[data-exchange=new]').click();const notice=page.locator('.exchange-recipient');await expect(notice).toBeVisible();
 await page.locator('textarea').fill('안녕하세요! 처음 인사드려요.');
 for(const keyboardHeight of [320,380]){
  await page.evaluate(height=>window.dispatchEvent(Object.assign(new Event('keyboardWillShow'),{keyboardHeight:height})),keyboardHeight);
  await expect.poll(async()=>{const box=await notice.boundingBox();return box.y+box.height;}).toBeLessThanOrEqual(844-keyboardHeight);
  const field=await page.locator('textarea').boundingBox(),info=await notice.boundingBox();expect(field.height).toBeGreaterThanOrEqual(96);expect(field.y+field.height).toBeLessThanOrEqual(info.y);
  expect(await page.evaluate(()=>innerHeight)).toBe(844);await expect(page.locator('textarea')).toHaveValue('안녕하세요! 처음 인사드려요.');await expect(page.locator('.exchange-first-send')).toBeEnabled();
 }
 await page.screenshot({path:`output/exchange-recipient-keyboard-${direction}-${width}-${test.info().project.name}.png`});
 await page.evaluate(()=>window.dispatchEvent(new Event('keyboardDidHide')));await expect(notice).toBeVisible();
 await expect.poll(async()=>{const box=await notice.boundingBox();return box.y+box.height;}).toBeGreaterThan(700);
 await page.locator('[data-community-header-back]').click();await expect(page.locator('.exchange-inbox')).toBeVisible();
});

for(const direction of ['ko-ja','ja-ko'])for(const width of [320,390])test(`profile overview and nickname editing ${direction} ${width}`,async({page})=>{
 await page.route('**/src/build-config.js',r=>r.fulfill({contentType:'application/javascript',body:"export const developmentMode=false;export const appVersion='test';"}));
 const c=await setup(page,{direction,width});await page.locator('[data-action=community-profile]').click();
 const form=page.locator('[data-exchange-form=profile]'),guide=page.locator('section.exchange-rules'),edit=page.locator('[data-exchange=edit-profile]');
 await expect(form).toHaveCount(0);await expect(edit).toHaveText('서당친구');
 await expect(page.locator('[name=learning_language]')).toHaveCount(0);
 await expect(page.locator('.exchange-profile-summary>.exchange-profile-language')).toHaveText(direction==='ja-ko'?'学習言語 · 韓国語':'학습 언어 · 일본어');
 await expect(guide).toHaveCount(0);
 await expect(page.locator('[data-exchange=blocks],[data-exchange=delete]')).toHaveCount(0);
 const footer=await page.locator('.exchange-profile-footer').boundingBox(),nav=await page.locator('.tabs').boundingBox();expect(nav.y-footer.y-footer.height).toBeGreaterThanOrEqual(15);expect(nav.y-footer.y-footer.height).toBeLessThanOrEqual(18);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:`output/profile-claude-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
 await edit.click();await expect(form.locator('input')).toBeFocused();await expect(form.locator('button')).toHaveCount(0);await expect(page.locator('.exchange-first-send')).toBeDisabled();await form.locator('input').fill('취소할이름');
 await page.locator('[data-community-header-back]').click();await expect(edit).toHaveText('서당친구');await expect(edit).toBeFocused();expect(c.writes.some(w=>w.name==='community_profiles')).toBe(false);
 await edit.click();await page.locator('[name=nickname]').fill('새닉네임');await expect(page.locator('.exchange-first-send')).toBeEnabled();
 await page.screenshot({path:`output/profile-claude-edit-${direction}-${width}-${test.info().project.name}.png`,fullPage:true});
 await page.locator('[data-exchange=rules]').click();
 await expect(page.locator('.app-header-title')).toHaveText(direction==='ja-ko'?'会話の利用について':'대화 이용 안내');
 await expect(guide.locator('p')).toHaveCount(4);await expect(guide.locator('a')).toHaveAttribute('href','analytics-privacy.html');await expect(guide.locator('h2')).toHaveCount(0);
 await page.locator('[data-community-header-back]').click();await expect(page.locator('[name=nickname]')).toHaveValue('새닉네임');
 c.failProfileSave=true;await page.locator('.exchange-first-send').click();await expect(page.locator('[role=alert]')).toBeVisible();await expect(page.locator('[name=nickname]')).toHaveValue('새닉네임');
 if(width===390)await page.locator('[name=nickname]').press('Enter');else await page.locator('.exchange-first-send').click();await expect(form).toHaveCount(0);await expect(edit).toHaveText('새닉네임');await expect(page.locator('.exchange-profile-summary [role=status]')).toHaveText(direction==='ja-ko'?'保存しました。':'저장했어요.');
 const save=c.writes.find(w=>w.name==='community_profiles');expect(save.body).toMatchObject({nickname:'새닉네임',native_language:direction==='ja-ko'?'ja':'ko',learning_language:direction==='ja-ko'?'ko':'ja',rules_version:1});
 await edit.click();await page.locator('[name=nickname]').fill('戻る');await page.locator('[data-community-header-back]').click();await expect(edit).toHaveText('새닉네임');await expect(page.locator('.exchange-profile')).toBeVisible();
 await page.locator('[data-community-header-back]').click();await expect(page.locator('.exchange-inbox')).toBeVisible();
});
for(const direction of ['ko-ja','ja-ko'])test(`first profile shows guide before required consent ${direction}`,async({page})=>{
 const c=await setup(page,{direction,width:320,signed:false});await page.locator('[data-exchange=new]').click();
 const form=page.locator('[data-exchange-form=profile]');await expect(form.locator('section.exchange-rules')).toBeVisible();await expect(form.locator('[name=rules]')).toHaveAttribute('required','');
 await page.locator('[name=nickname]').fill('새친구');await form.locator('[type=submit]').click();expect(c.writes.some(w=>w.name==='community_profiles')).toBe(false);
 await form.locator('[name=rules]').check();await form.locator('[type=submit]').click();await expect(page.locator('.exchange-compose')).toBeVisible();
});

for(const width of [320,390])test(`nickname keyboard does not lift the profile guide ${width}`,async({page})=>{
 await page.addInitScript(()=>{
  window.Capacitor={getPlatform:()=> 'ios',isNativePlatform:()=>true,isPluginAvailable:name=>name==='Keyboard'};
  window.profileKeyboardInset=0;Object.defineProperty(visualViewport,'height',{get:()=>innerHeight-window.profileKeyboardInset});
 });
 await setup(page,{direction:'ja-ko',width});await page.locator('[data-action=community-profile]').click();await page.locator('[data-exchange=edit-profile]').click();
 const field=page.locator('[name=nickname]'),guide=page.locator('.exchange-profile-footer');await expect(field).toBeFocused();const before=await guide.boundingBox();
 await page.evaluate(()=>{window.profileKeyboardInset=200;visualViewport.dispatchEvent(new Event('resize'));window.dispatchEvent(Object.assign(new Event('keyboardWillShow'),{keyboardHeight:320}));});
 await field.fill('새닉네임');const after=await guide.boundingBox(),inputBox=await field.boundingBox();expect(Math.abs(after.y-before.y)).toBeLessThanOrEqual(1);expect(inputBox.y+inputBox.height).toBeLessThan(524);
 await expect(field).toHaveValue('새닉네임');
 await page.evaluate(()=>{window.profileKeyboardInset=0;window.dispatchEvent(new Event('keyboardDidHide'));});
 expect(Math.abs((await guide.boundingBox()).y-before.y)).toBeLessThanOrEqual(1);
});
