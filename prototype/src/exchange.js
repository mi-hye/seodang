import {mountPullRefresh} from './exchange-pull-refresh.js';
import {esc,icon,phraseText} from './ui.js';
import {showSheet,closeSheet} from './sheet.js';
import {japaneseLessonUI} from './curriculum.js';
import {createCommunityAPI,validText} from './community-api.js';
import {getMessagePush} from './message-push.js';
import {exchangeCopy,reportReasons} from './exchange-copy.js';
let sharedAPI;
export function mountCommunity(host,state,{api=(sharedAPI ||= createCommunityAPI()),initialScreen='inbox',initialRoom=null,pollMs=10000}={}){
 const locale=japaneseLessonUI(state)?'ja':'ko',t=exchangeCopy(locale),me=()=>api.session?.user?.id;
 // Keep the iOS page full size; lift only the reply dock by the OS keyboard height.
 // Web/Android retain visualViewport fallback.
 const nativeKeyboard=window.Capacitor?.getPlatform?.()==='ios'&&window.Capacitor?.isPluginAvailable?.('Keyboard');
 let keyboardVisible=null,nativeKeyboardHeight=0;
 let pulling=false;
 let live=true,busy=false,polling=false,epoch=0,screen=initialScreen==='profile'?'profile':'inbox',profile=null,rooms=[],pending=null,room=null,messages=[],blocks=[],more=false,roomMore=false,loading=true,error='',notice='',reportID=null;
 const matchingLanguages=state.courseDirection==='ja-ko'?{native_language:'ja',learning_language:'ko'}:{native_language:'ko',learning_language:'ja'};
 const push=getMessagePush();
 let entryChecked=false,notificationDialog=null;
 const drafts=new Map();let profileDraft=null,startAfterProfile=false,inboxScroll=0;
 const h=key=>esc(t(key)),btn=(key,action,extra='',cls='')=>`<button type="button" class="exchange-button ${cls}" data-exchange="${action}" ${extra}>${h(key)}</button>`;
 const header=host.parentElement?.querySelector('.app-header'),title=header?.querySelector('.app-header-title'),originalTitle=title?.textContent;
 const profileButton=header?.querySelector('[data-action="community-profile"]');
 const backButton=document.createElement('button');backButton.type='button';backButton.className='app-header-back';backButton.dataset.communityHeaderBack='';backButton.setAttribute('aria-label',t('back'));backButton.innerHTML=icon('back');
 // The shared icon set uses arrow for forward; this explicit chevron is unambiguous.
 backButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
 header?.prepend(backButton);
 const chatTools=document.createElement('div');chatTools.className='exchange-header-tools';chatTools.hidden=true;header?.append(chatTools);
 const firstSend=document.createElement('button');firstSend.type='submit';firstSend.className='exchange-first-send';firstSend.setAttribute('form','exchange-first-form');firstSend.hidden=true;header?.append(firstSend);
 const draftKey=()=>screen==='compose'?'new':room?.id;
 const storageKey=key=>`seodang.exchange.draft.${me()}.${key}`;
 function draft(key=draftKey()){
  if(!key)return {body:''};if(!drafts.has(key)){try{drafts.set(key,JSON.parse(localStorage.getItem(storageKey(key)))||{body:''});}catch{drafts.set(key,{body:''});}}
  return drafts.get(key);
 }
 function saveDraft(value,key=draftKey()){drafts.set(key,value);try{value.body?localStorage.setItem(storageKey(key),JSON.stringify(value)):localStorage.removeItem(storageKey(key));}catch{} }
 const dayKey=value=>new Date(value).toDateString();
 const time=value=>value?new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value)):'';
 const day=value=>new Intl.DateTimeFormat(locale,{year:new Date(value).getFullYear()===new Date().getFullYear()?undefined:'numeric',month:'long',day:'numeric'}).format(new Date(value));
 const date=value=>!value?'':dayKey(value)===new Date().toDateString()?time(value):new Intl.DateTimeFormat(locale,{month:'numeric',day:'numeric'}).format(new Date(value));
 const avatar=p=>`<span class="exchange-avatar" aria-hidden="true">${esc(Array.from(p?.nickname||'?')[0])}</span>`;
 const language=p=>p?t(p.native_language):'';
 const rules=(standalone=false)=>`<section class="exchange-rules" aria-label="${h('rules')}">${standalone?'':`<h2>${h('rules')}</h2>`}${standalone?`<p>${h('languageNote')}</p>`:''}<p>${h('respect')}</p><p>${h('privacy')}</p><p>${h('device')}</p><a href="analytics-privacy.html" target="_blank" rel="noopener">${locale==='ja'?'プライバシーポリシー':'개인정보처리방침'}</a></section>`;
 const feedback=()=>`<p class="exchange-feedback" role="${error?'alert':'status'}">${esc(error||notice)}</p>`;
 function notificationRow(){
  const status=push.state;if(status==='unsupported'||!profile)return '';
  const denied=status==='denied';return `<div class="exchange-notification"><span>${h(status==='on'?'notificationsOn':denied?'notificationsDenied':'notifications')}</span>${btn(status==='on'?'turnOff':status==='error'?'retry':denied?'settings':'turnOn',denied?'notification-settings':status==='on'?'notifications-off':'notifications-on',status==='busy'?'disabled aria-busy="true"':'')}</div>`;
 }
 function list(){return `${pending?`<section class="exchange-waiting"><span class="exchange-waiting-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg></span><div><strong>${h('waiting')}</strong><blockquote title="${esc(pending.body)}">${esc(pending.body)}</blockquote></div>${btn('cancelShort','cancel',`aria-label="${h('cancel')}"`)}</section>`:''}${rooms.length?`<div class="exchange-list">${rooms.map(r=>`<button type="button" class="exchange-room ${r.unread?'unread':''}" data-exchange="room" data-id="${esc(r.id)}" aria-label="${esc(r.peer?.nickname)}${r.unread?' · '+h('unread')+' '+r.unread:''}">${avatar(r.peer)}<span class="exchange-preview"><strong>${esc(r.peer?.nickname)}</strong><small>${esc(language(r.peer))}</small><span>${r.status==='pending'?h('pending'):esc(r.preview||'')}</span></span><span class="exchange-meta"><time>${esc(date(r.updated_at))}</time>${r.unread?`<span class="exchange-unread">${r.unread>9?'9+':r.unread}</span>`:''}</span></button>`).join('')}</div>${roomMore?btn('more','more-rooms'):''}`:!pending?`<section class="exchange-empty"><p>${h('empty')}</p></section>`:''}${!pending?`<button type="button" class="exchange-fab primary" data-exchange="new" aria-label="${h('new')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg></button>`:''}`;}
 function composer(first=false){const d=draft();return `<form ${first?'id="exchange-first-form"':''} data-exchange-form="${first?'match':'message'}" class="${first?'exchange-first':'exchange-composer'}"><textarea ${first?'aria-describedby="exchange-recipient"':''} name="body" rows="${first?8:1}" maxlength="1000" required aria-label="${h(first?'first':'message')}" placeholder="${h(first?'placeholder':'message')}">${esc(d.body||'')}</textarea>${first?`<div id="exchange-recipient" class="exchange-recipient"><strong>${h(matchingLanguages.learning_language==='ja'?'toJapanesePerson':'toKoreanPerson')}</strong><p>${h(matchingLanguages.learning_language==='ja'?'randomJapanesePerson':'randomKoreanPerson')}</p></div>`:''}${first?'':`<button class="exchange-send" type="submit" ${draft('outbox:'+room?.id).body||!d.body?.trim()?'disabled':''} aria-label="${h(busy?'sending':'send')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 4 15 8-15 8 3-8-3-8Z"/><path d="M8 12h12"/></svg></button>`}</form>`;}
 const messageHTML=(items=messages,previous=null)=>items.map(m=>{
  const newDay=!previous||dayKey(previous.created_at)!==dayKey(m.created_at),joined=!newDay&&previous.author_id===m.author_id&&new Date(m.created_at)-new Date(previous.created_at)<60000;
  previous=m;const mine=m.author_id===me();
  return `${newDay?`<div class="exchange-day"><time datetime="${esc(m.created_at)}">${esc(day(m.created_at))}</time></div>`:''}<div class="exchange-message${mine?' is-mine':''}${joined?' is-joined':''}"><article class="exchange-bubble${mine?' mine':''}" data-message-id="${esc(m.id)}"><p>${esc(m.body)}</p></article><time class="exchange-message-time" datetime="${esc(m.created_at)}" title="${esc(day(m.created_at)+' '+time(m.created_at))}">${esc(time(m.created_at))}</time></div>`;
 }).join('');
 function updateLog(){
  const log=host.querySelector('.exchange-messages');if(!log)return;
  const present=new Set([...log.querySelectorAll('[data-message-id]')].map(n=>n.dataset.messageId));
  if([...present].some(id=>!messages.some(m=>m.id===id))){log.innerHTML=messageHTML();return;}
  log.insertAdjacentHTML('beforeend',messageHTML(messages.filter(m=>!present.has(m.id)),messages.findLast(m=>present.has(m.id))));
 }
 function outboxHTML(){const queued=draft('outbox:'+room?.id);return queued.body?`<article class="exchange-bubble mine"><p>${esc(queued.body)}</p>${busy?`<small>${h('sending')}</small>`:btn('retry','retry-message')}</article>`:'';}
 function updateOutbox(){const node=host.querySelector('.exchange-outbox');if(node)node.innerHTML=outboxHTML();}
 const roomMenu=()=>`<details class="exchange-menu"><summary aria-label="${h('menu')}">⋯</summary><div>${messages.some(m=>m.author_id!==me())?btn('report','report'):''}${btn('block','block')}</div></details>`;
 function chat(){if(!room)return `<p>${h('unavailable')}</p>`;return room.status==='pending'?(room.recipient_id===me()?`<p>${h('pending')}</p><div class="button-pair">${btn('decline','decline')}${btn('accept','accept','','primary')}</div>`:`<p>${h('awaitAccept')}</p>`):`${more?btn('older','older'):''}<div class="exchange-messages" role="log" aria-label="${h('title')}" aria-live="polite" aria-relevant="additions">${messageHTML()}</div><div class="exchange-outbox" role="status">${outboxHTML()}</div>${composer()}`;}
 function profileForm(){
  const editing=profileDraft||profile;
  const languageInfo=`<div class="exchange-profile-language"><dl><div><dt>${h('learning')}</dt><dd>${esc(t(matchingLanguages.learning_language))}</dd></div></dl></div>`;
  const nickname=`<input id="exchange-nickname" name="nickname" aria-label="${h('nickname')}" enterkeyhint="done" autocomplete="nickname" minlength="2" maxlength="20" value="${esc(editing?.nickname||'')}" required>`;
  if(!profile)return `<form data-exchange-form="profile"><label for="exchange-nickname">${h('nickname')}${nickname}</label>${languageInfo}${rules()}<label class="exchange-agree"><input type="checkbox" name="rules" required>${h('agree')}</label><button type="submit" class="exchange-button primary">${h('save')}</button></form>`;
  const name=profileDraft?`<form id="exchange-profile-form" data-exchange-form="profile" class="exchange-profile-edit">${nickname}</form>`:`<button type="button" class="exchange-profile-name" data-exchange="edit-profile" aria-label="${h('nickname')}: ${esc(profile.nickname)}"><span>${esc(profile.nickname)}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/><path d="m14 6 4 4"/></svg></button>`;
  return `<section class="exchange-profile-summary">${avatar(profile)}${feedback()}${name}<p class="exchange-profile-language">${h('learning')} · ${esc(t(matchingLanguages.learning_language))}</p></section>${notificationRow()?`<div class="exchange-profile-panel">${notificationRow()}</div>`:''}<footer class="exchange-profile-footer"><button type="button" class="exchange-profile-guide" data-exchange="rules"><span>${h('rules')}</span>${icon('arrow')}</button></footer>`;
 }

 function report(){const incoming=messages.filter(m=>m.author_id!==me());return `<form data-exchange-form="report"><label>${h('reportMessage')}<select name="message_id">${incoming.map(m=>`<option value="${esc(m.id)}" ${m.id===reportID?'selected':''}>${esc(m.body.slice(0,90))}</option>`).join('')}</select></label><label>${h('reason')}<select name="reason">${reportReasons.map(pair=>`<option value="${esc(pair[0])}">${esc(pair[locale==='ja'?1:0])}</option>`).join('')}</select></label><button type="submit" class="exchange-button primary">${h('report')}</button></form>`;}
 const writingScreen=()=>screen==='compose'||(screen==='profile'&&startAfterProfile);
 const loader=()=>`<div class="exchange-loading" role="status" aria-label="${h('loading')}"><span class="exchange-spinner" aria-hidden="true"></span></div>`;
 const inbox=list;
 function draw(){if(!live)return;
  const active=host.contains(document.activeElement)?document.activeElement:null,field=active?.name,start=active?.selectionStart,end=active?.selectionEnd;
  const writing=writingScreen();
  host.className=`community exchange exchange-${screen}`;host.lang=locale;if(screen==='chat'&&room)host.dataset.activeRoom=room.id;else delete host.dataset.activeRoom;
  host.parentElement?.classList.toggle('exchange-writing',writing);
  host.setAttribute('aria-busy',String(loading));
  backButton.hidden=screen==='inbox';backButton.disabled=busy;
  if(profileButton)profileButton.hidden=screen!=='inbox';
  const inChat=screen==='chat'&&room&&!loading,editingProfile=screen==='profile'&&!!profile&&!!profileDraft;
  header?.classList.toggle('exchange-chat-header',!!inChat);header?.classList.toggle('exchange-compose-header',screen==='compose');header?.classList.toggle('exchange-profile-edit-header',editingProfile);chatTools.hidden=!inChat;chatTools.innerHTML=inChat?roomMenu():'';
  firstSend.hidden=screen!=='compose'&&!editingProfile;firstSend.setAttribute('form',editingProfile?'exchange-profile-form':'exchange-first-form');firstSend.textContent=t(editingProfile?'save':busy?'sending':'send');firstSend.setAttribute('aria-busy',String(busy));
  if(title){if(inChat)title.innerHTML=`<strong>${esc(room.peer?.nickname)}</strong><small>${esc(language(room.peer))}</small>`;else title.textContent=t(screen==='compose'?'newMessage':screen==='profile'?'profile':screen==='guide'?'rules':screen==='report'?'report':screen==='blocks'?'blocks':'title');}
  if(title&&screen==='guide'&&locale==='ja')title.innerHTML=phraseText(t('rules'),['会話の','利用について']);
  const blockView=()=>blocks.length?blocks.map((b,i)=>`<div class="exchange-block"><span>${h('blockedUser')} ${i+1}</span>${btn('unblock','unblock',`data-id="${esc(b.blocked_id)}"`)}</div>`).join(''):`<p>${h('noBlocks')}</p>`;
  host.innerHTML=(screen==='profile'&&profile&&!loading?'':feedback())+(loading?loader():!profile&&error?btn('retry','retry'):({inbox,compose:()=>composer(true),chat,profile:profileForm,guide:()=>rules(true),blocks:blockView,report}[screen]||list)());
  if(busy)host.querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=true);
  if(field){const target=host.querySelector(`[name="${field}"]`);if(target){target.focus({preventScroll:true});if(typeof target.setSelectionRange==='function'&&start!==null)try{target.setSelectionRange(start,end);}catch{}}}
  resize();position();updateSendButton();if(window.scrollY>scrollLimit())scrollWindow(window.scrollY);
 }
 function canAskNotifications(){return live&&!loading&&!busy&&!error&&!!profile&&screen==='inbox'&&!document.hidden&&!document.querySelector('dialog[open]');}
 async function askNotifications(){
  if(entryChecked||!canAskNotifications())return;
  entryChecked=true;
  const result=await push.enter(locale,canAskNotifications);
  if(result!=='settings'||!canAskNotifications())return;
  const focus=document.activeElement,dialog=document.createElement('dialog');notificationDialog=dialog;
  dialog.className='exchange-permission';dialog.lang=locale;dialog.setAttribute('aria-labelledby','exchange-permission-title');
  dialog.innerHTML=`<h2 id="exchange-permission-title">${h('notifications')}</h2><p>${h('notificationsDenied')}</p><div class="button-pair"><button type="button" class="secondary" data-notification-close>${h('cancelShort')}</button><button type="button" class="primary" data-notification-settings>${h('settings')}</button></div>`;
  dialog.addEventListener('click',e=>{
   if(e.target.closest('[data-notification-settings]')){closeSheet(dialog);void run(()=>action('notification-settings'));}
   else if(e.target===dialog||e.target.closest('[data-notification-close]'))closeSheet(dialog);
  });
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeSheet(dialog);});
  dialog.addEventListener('close',()=>{dialog.remove();if(notificationDialog===dialog)notificationDialog=null;if(live&&focus?.isConnected)focus.focus({preventScroll:true});},{once:true});
  document.body.append(dialog);showSheet(dialog);dialog.querySelector('[data-notification-close]').focus();
 }
 function showFeedback(){const node=host.querySelector('.exchange-feedback');if(node){node.textContent=error||notice;node.setAttribute('role',error?'alert':'status');}}
 function friendly(e){if(/match_daily_limit/.test(e.message))return t('limit');if(/community_rate_limit/.test(e.message)||e.status===429)return t('rate');if(e.status===403||e.code==='42501')return t('unavailable');return t('failed');}
 async function run(fn,{showLoading=false}={}){if(busy||!live)return;busy=true;epoch++;error='';notice='';const previous=screen,wasWriting=writingScreen(),wasEditing=!!profile&&!!profileDraft;if(showLoading){loading=true;draw();}firstSend.disabled=true;firstSend.setAttribute('aria-busy','true');if(screen==='compose')firstSend.textContent=t('sending');backButton.disabled=true;host.querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=true);try{await fn();}catch(e){if(live)error=friendly(e);}finally{busy=false;if(showLoading)loading=false;if(live){draw();if(screen==='profile'&&profile){if(profileDraft&&!wasEditing){const field=host.querySelector('[name=nickname]');field?.focus();field?.select();}else if(wasEditing&&!profileDraft)host.querySelector('[data-exchange=edit-profile]')?.focus({preventScroll:true});}if(screen!==previous){scrollWindow(wasWriting&&screen==='inbox'?inboxScroll:0);if(screen==='compose')host.querySelector('[name=body]')?.focus({preventScroll:true});if(wasWriting&&screen==='inbox')host.querySelector('[data-exchange=new],[data-exchange=cancel]')?.focus({preventScroll:true});}if(screen==='chat'&&screen!==previous)bottom();void askNotifications();}}}
 async function refreshList(){const [list,status]=await Promise.all([api.conversations(),api.match('status')]);if(!live)return;rooms=list;roomMore=list.length===50;pending=status.pending;if(pending&&pending.id===draft('new').id)saveDraft({body:''},'new');}
 async function openRoom(id){const target=(await api.conversations(0,id))[0];if(!live)return;if(!target){notice=t('unavailable');screen='inbox';return;}const latest=target.status==='accepted'?await api.conversationMessages(id):[];if(!live)return;room=target;screen='chat';messages=latest.reverse();more=latest.length===50;if(room.status==='accepted'){const queued=draft('outbox:'+id);if(messages.some(m=>m.id===queued.id))saveDraft({body:''},'outbox:'+id);await markRead();}}
 async function markRead(){if(!live||document.hidden||screen!=='chat'||!messages.length)return;await api.match('read',{message:messages.at(-1).id});if(room){room.unread=0;window.dispatchEvent(new CustomEvent('seodang:message-read',{detail:{room_id:room.id}}));}window.dispatchEvent(new Event('seodang:conversation-change'));}
 // WKWebView can keep an out-of-range programmatic offset even for a short page.
 const scrollLimit=()=>{const root=document.scrollingElement||document.documentElement;return Math.max(0,root.scrollHeight-root.clientHeight);};
 function scrollWindow(y){window.scrollTo(0,Math.min(scrollLimit(),Math.max(0,y)));}
 function bottom(){requestAnimationFrame(()=>{if(live&&screen==='chat')scrollWindow(scrollLimit());});}
 async function initialize(){loading=true;draw();try{await api.ensureDeviceSession();await api.verify();const p=await api.profile();if(!live)return;profile=p;window.dispatchEvent(new Event('seodang:conversation-change'));if(profile){void push.sync(locale);await refreshList();if(initialRoom){const id=initialRoom;initialRoom=null;await openRoom(id);}}}catch(e){if(live)error=friendly(e);}finally{loading=false;draw();void askNotifications();}}
 async function action(a,id){
  if(a==='notifications-on'){await push.enable(locale);return;}
  if(a==='notifications-off'){await push.disable();return;}
  if(a==='notification-settings'){await globalThis.Capacitor?.nativePromise('SeodangRecognition','openSettings',{});return;}

  if(a==='retry'){await initialize();return;}
  if(a==='edit-profile'){profileDraft={nickname:profile.nickname};return;}
  if(a==='back'){if(screen==='profile'&&profile&&profileDraft){profileDraft=null;return;}if(writingScreen()){startAfterProfile=false;screen='inbox';return;}startAfterProfile=false;if(screen==='guide'){screen='profile';return;}screen=screen==='report'?'chat':screen==='blocks'?'profile':'inbox';if(profile)await refreshList();return;}
  if(a==='rules'){screen='guide';return;}
  if(a==='new'){inboxScroll=window.scrollY;startAfterProfile=!profile;screen=profile?'compose':'profile';return;}
  if(a==='room'){await openRoom(id);return;}
  if(a==='cancel'){const cancelledId=pending.id;const result=await api.match('cancel',{id:cancelledId});if(draft('new').id===cancelledId)saveDraft({body:''},'new');await refreshList();if(result.status==='matched')await openRoom(result.room_id);else notice=t('cancelled');return;}
  if(a==='more-rooms'){const next=await api.conversations(rooms.length);rooms=[...new Map([...rooms,...next].map(r=>[r.id,r])).values()];roomMore=next.length===50;return;}
  if(a==='older'){const older=(await api.conversationMessages(room.id,messages[0])).reverse();messages=[...older,...messages];more=older.length===50;return;}
  if(a==='block'){if(!window.confirm(t('blockConfirm')))return;await api.block(room.peer.id);screen='inbox';room=null;messages=[];await refreshList();notice=t('blocked');window.dispatchEvent(new Event('seodang:conversation-change'));return;}
  if(a==='report'){reportID=messages.findLast(m=>m.author_id!==me())?.id;screen='report';return;}
  if(a==='blocks'){blocks=await api.blocks();screen='blocks';return;}
  if(a==='unblock'){await api.unblock(id);blocks=await api.blocks();return;}
  if(a==='accept'||a==='decline'){await api.respond(room.id,a==='accept'?'accepted':'declined');await refreshList();if(a==='accept')await openRoom(room.id);else screen='inbox';return;}
  if(a==='delete'){if(!window.confirm(t('deleteConfirm')))return;const owner=me();await api.deleteAccount();try{Object.keys(localStorage).filter(k=>k.startsWith(`seodang.exchange.draft.${owner}.`)).forEach(k=>localStorage.removeItem(k));}catch{}profile=null;rooms=[];messages=[];pending=null;room=null;drafts.clear();screen='inbox';await initialize();}
 }
 async function submit(kind,data){
  if(kind==='profile'){const existing=!!profile,nickname=String(data.get('nickname')||'').trim();if(!validText(nickname,20)||nickname.length<2)return;profile=await api.saveProfile({nickname,...matchingLanguages,bio:profile?.bio||'',rules_version:1});profileDraft=null;await refreshList();screen=existing?'profile':startAfterProfile&&!pending?'compose':'inbox';startAfterProfile=false;notice=screen!=='compose'?t('saved'):'';return;}
  if(kind==='report'){await api.report({reported_user_id:room.peer.id,message_id:data.get('message_id'),reason:data.get('reason')});screen='chat';notice=t('reported');return;}
  const key=draftKey(),d=draft(key),body=String(data.get('body')||'').trim();if(!validText(body,1000))return;
  const payload={body,id:d.id||crypto.randomUUID()};saveDraft(payload,key);
  try{
   // A previous app language can remain in the persisted exchange profile.
   // Align only when the user sends a new invitation; existing rooms stay intact.
   if(profile.native_language!==matchingLanguages.native_language||profile.learning_language!==matchingLanguages.learning_language){
    profile=await api.saveProfile({nickname:profile.nickname,...matchingLanguages,bio:profile.bio||'',rules_version:profile.rules_version||1});
    if(!live)return;
   }
   const result=await api.match('start',payload);
   if(result.status==='cancelled'){saveDraft({body},key);notice=t('cancelled');return;}
   saveDraft({body:''},key);await refreshList();screen='inbox';if(result.status==='matched')await openRoom(result.room_id);
  }catch(e){if(/already_waiting/.test(e.message)){await refreshList();screen='inbox';notice=t('waiting');}else throw e;}
 }
 // The composer is never replaced or disabled while sending: native keyboards stay open.
 async function sendReply(data,retry=false){
  if(busy||!live)return;
  const key=room.id,outboxKey='outbox:'+key,queued=draft(outboxKey);
  if(!retry&&queued.body)return;
  const body=retry?queued.body:String(data.get('body')||'').trim();if(!validText(body,1000))return;
  const payload=retry?queued:{body,id:crypto.randomUUID(),room_id:key};
  saveDraft(payload,outboxKey);
  if(!retry){saveDraft({body:''},key);host.querySelector('[name=body]').value='';}
  busy=true;epoch++;error='';notice='';const send=host.querySelector('.exchange-send');send.disabled=true;send.setAttribute('aria-busy','true');
  showFeedback();updateOutbox();resize();position();bottom();
  try{
   const sent=await api.message(payload);saveDraft({body:''},outboxKey);
   if(!live||room?.id!==key)return;
   messages=[...new Map([...messages,sent].map(m=>[m.id,m])).values()];updateLog();updateOutbox();
   bottom();await markRead().catch(()=>{});
  }catch(e){if(live){error=friendly(e);showFeedback();}}
  finally{busy=false;if(live){updateSendButton();send.removeAttribute('aria-busy');updateOutbox();}}
 }
 const click=e=>{const b=e.target.closest('[data-exchange]');if(b&&(host.contains(b)||chatTools.contains(b))){if(b.dataset.exchange==='retry-message')void sendReply(null,true);else void run(()=>action(b.dataset.exchange,b.dataset.id),{showLoading:b.dataset.exchange==='room'});}};
 const pointer=e=>{if(e.target.closest('.exchange-send')&&document.activeElement===host.querySelector('.exchange-composer textarea'))e.preventDefault();};
 const submission=e=>{const form=e.target.closest('[data-exchange-form]');if(!form)return;e.preventDefault();const data=new FormData(form);if(form.dataset.exchangeForm==='message')void sendReply(data);else void run(()=>submit(form.dataset.exchangeForm,data));};
 const input=e=>{if(e.target.name==='nickname'){profileDraft={nickname:e.target.value};updateSendButton();}if(e.target.name==='body'){saveDraft({body:e.target.value});resize();position();updateSendButton();}};
 const goBack=()=>{void run(()=>action('back'));};
 function updateSendButton(){const editingProfile=screen==='profile'&&!!profile&&!!profileDraft,nickname=profileDraft?.nickname?.trim()||'';firstSend.disabled=busy||(editingProfile?nickname===profile.nickname||nickname.length<2||!validText(nickname,20):!host.querySelector('.exchange-first textarea')?.value.trim());const send=host.querySelector('.exchange-send');if(send)send.disabled=busy||!!draft('outbox:'+room?.id).body||!host.querySelector('.exchange-composer textarea')?.value.trim();}
 function resize(){const field=host.querySelector('.exchange-composer textarea');if(field){field.style.height='auto';field.style.height=Math.min(140,field.scrollHeight+2)+'px';}}
 function position(){
  const v=window.visualViewport,keyboard=v?Math.max(0,innerHeight-v.height-v.offsetTop):0;
  const focused=screen==='chat'&&document.activeElement===host.querySelector('.exchange-composer textarea');
  const typing=screen==='chat'&&(nativeKeyboard&&keyboardVisible!==null?keyboardVisible:focused||keyboard>100);
  host.parentElement?.classList.toggle('exchange-typing',typing);
  const nav=writingScreen()?0:host.parentElement?.querySelector('.tabs')?.getBoundingClientRect().height||72;
  const set=(name,value)=>{if(host.style.getPropertyValue(name)!==value)host.style.setProperty(name,value);};
  set('--exchange-profile-height',`${Math.max(180,innerHeight-(header?.getBoundingClientRect().height||74))}px`);
  set('--exchange-nav-height',`${nav}px`);
  const writingHeight=nativeKeyboard?innerHeight-nativeKeyboardHeight:(v?.height||innerHeight);
  set('--exchange-writing-height',`${Math.max(180,writingHeight-(header?.getBoundingClientRect().height||74))}px`);
  set('--exchange-bottom',`${typing?(nativeKeyboard?nativeKeyboardHeight:keyboard):keyboard>100&&!nativeKeyboard?keyboard:nav}px`);
  const dock=host.querySelector('.exchange-composer');set('--exchange-composer-height',`${dock?.getBoundingClientRect().height||80}px`);
 }
 let focusFrame=0;
 const focusPosition=e=>{if(e?.type==='focusin')keyboardVisible=null;cancelAnimationFrame(focusFrame);focusFrame=requestAnimationFrame(()=>{if(live)position();});};
 const keyboardShown=e=>{const height=Number(e.keyboardHeight);if(Number.isFinite(height))nativeKeyboardHeight=Math.max(0,height);keyboardVisible=nativeKeyboardHeight>0;position();};
 const keyboardHidden=()=>{keyboardVisible=false;nativeKeyboardHeight=0;position();if(window.scrollY>scrollLimit())scrollWindow(window.scrollY);};
 const keyboardEvents=[['keyboardWillShow',keyboardShown],['keyboardDidShow',keyboardShown],['keyboardDidHide',keyboardHidden]];
 if(nativeKeyboard)for(const [name,handler] of keyboardEvents)window.addEventListener(name,handler);

 async function poll(){if(!live||busy||pulling||polling||loading||!profile||document.hidden||!['inbox','chat'].includes(screen))return;polling=true;const ticket=epoch,id=room?.id,atBottom=innerHeight+scrollY>=document.documentElement.scrollHeight-100;
  try{const list=await api.conversations(0,screen==='chat'?id:null),status=screen==='inbox'?await api.match('status'):{pending};if(!live||busy||pulling||ticket!==epoch)return;pending=status.pending;
   if(screen==='inbox'){rooms=list;roomMore=list.length===50;draw();return;}
   const current=list.find(r=>r.id===id);if(!current){room=null;messages=[];screen='inbox';await refreshList();notice=t('unavailable');draw();return;}
   if(current.status!==room.status){room=current;await openRoom(id);draw();bottom();return;}room=current;
   if(room.status!=='accepted')return;
   const fresh=(await api.conversationMessages(id)).reverse();if(!live||busy||pulling||ticket!==epoch)return;
   const queued=draft('outbox:'+id);if(queued.body&&fresh.some(m=>m.id===queued.id)){saveDraft({body:''},'outbox:'+id);updateOutbox();updateSendButton();error='';const feedback=host.querySelector('.exchange-feedback');if(feedback)feedback.textContent='';}
   if(fresh.some(m=>!messages.some(old=>old.id===m.id))){const overlap=fresh.some(m=>messages.some(old=>old.id===m.id));messages=overlap?[...new Map([...messages,...fresh].map(m=>[m.id,m])).values()]:fresh;if(!overlap)more=fresh.length===50;updateLog();if(atBottom){await markRead();bottom();}}
  }catch{/* The explicit refresh action shows errors; background updates never interrupt typing. */}finally{polling=false;}
 }
 async function refreshPulled(){
  if(busy||!live)return;busy=true;epoch++;error='';notice='';
  let redraw=false;const previous=screen,id=room?.id,offset=Math.max(0,window.scrollY);updateSendButton();showFeedback();
  try{
   if(screen==='inbox'){await refreshList();redraw=true;}
   else{
    const [list,latest]=await Promise.all([api.conversations(0,id),api.conversationMessages(id)]);
    if(!live)return;const current=list.find(r=>r.id===id);
    if(!current){screen='inbox';room=null;messages=[];await refreshList();notice=t('unavailable');redraw=true;return;}
    const changed=room.status!==current.status;room=current;
    if(room.status==='accepted'){
     messages=[...new Map([...messages,...latest.reverse()].map(m=>[m.id,m])).values()];
     updateLog();const queued=draft('outbox:'+id);
     if(messages.some(m=>m.id===queued.id)){saveDraft({body:''},'outbox:'+id);updateOutbox();}
     if(innerHeight+scrollY>=document.documentElement.scrollHeight-100)await markRead().catch(()=>{});
    }
    if(changed)redraw=true;
   }
  }catch(e){if(live)error=friendly(e);}
  finally{busy=false;if(live){if(redraw)draw();showFeedback();updateSendButton();if(screen===previous)scrollWindow(offset);}}
 }
 const stopPull=mountPullRefresh(host,{label:t('loading'),enabled:()=>live&&!busy&&!loading&&!!profile&&['inbox','chat'].includes(screen),refresh:refreshPulled,onActive:value=>{pulling=value;}});
 const outside=e=>{if(!e.target.closest('.exchange-menu'))chatTools.querySelectorAll('.exchange-menu[open]').forEach(menu=>menu.open=false);};
 const visible=()=>{if(!document.hidden){void poll();if(profile)void push.sync(locale);}};
 const pushChanged=()=>{if(live&&!busy&&['inbox','profile'].includes(screen))draw();};window.addEventListener('seodang:push-state',pushChanged);
 host.addEventListener('focusin',focusPosition);host.addEventListener('focusout',focusPosition);host.addEventListener('click',click);chatTools.addEventListener('click',click);host.addEventListener('pointerdown',pointer);host.addEventListener('submit',submission);host.addEventListener('input',input);backButton.addEventListener('click',goBack);window.addEventListener('resize',position);window.visualViewport?.addEventListener('resize',position);window.visualViewport?.addEventListener('scroll',position);document.addEventListener('visibilitychange',visible);document.addEventListener('pointerdown',outside);
 void initialize();const timer=setInterval(poll,pollMs);
 return ()=>{if(nativeKeyboard)for(const [name,handler] of keyboardEvents)window.removeEventListener(name,handler);cancelAnimationFrame(focusFrame);host.removeEventListener('focusin',focusPosition);host.removeEventListener('focusout',focusPosition);host.parentElement?.classList.remove('exchange-typing');stopPull();window.removeEventListener('seodang:push-state',pushChanged);live=false;if(notificationDialog){const dialog=notificationDialog;closeSheet(dialog);dialog.remove();notificationDialog=null;}epoch++;clearInterval(timer);host.removeEventListener('click',click);host.removeEventListener('pointerdown',pointer);host.removeEventListener('submit',submission);host.removeEventListener('input',input);backButton.remove();chatTools.removeEventListener('click',click);chatTools.remove();header?.classList.remove('exchange-chat-header','exchange-compose-header','exchange-profile-edit-header');host.parentElement?.classList.remove('exchange-writing');firstSend.remove();if(profileButton)profileButton.hidden=false;if(title)title.textContent=originalTitle;window.removeEventListener('resize',position);window.visualViewport?.removeEventListener('resize',position);window.visualViewport?.removeEventListener('scroll',position);document.removeEventListener('visibilitychange',visible);document.removeEventListener('pointerdown',outside);};
}
