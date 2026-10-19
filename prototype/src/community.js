import {MAX_PHOTOS,preparePhoto,mountPostPhotos} from './community-photos.js';
import {correctionDiff,correctedSentencePair} from './community-diff.js';
import {japaneseLessonUI} from './curriculum.js';
import {esc,icon} from './ui.js';
import {createCommunityAPI,validText} from './community-api.js';
import {readCommunityCache,saveCommunityCache,clearCommunityCache} from './community-cache.js';
import {mountPullRefresh} from './community-pull-refresh.js';
import {communityCopy} from './community-copy.js';

let sharedAPI;
export function mountCommunity(host,state,{api=(sharedAPI ||= createCommunityAPI()),initialScreen='feed'}={}){
 const locale=japaneseLessonUI(state)?'ja':'ko',nativeLanguage=state.courseDirection==='ja-ko'?'ja':'ko',t=communityCopy(locale);
 let connected=false,live=true,busy=false,epoch=0,screen=initialScreen,profile=null,posts=[],replies=[],rooms=[],messages=[],blocks=[],selected=null,room=null,person=null,reportTarget=null,error='',notice='',more=false,replyMore=false,messageMore=false,loading=true;
 let feedKnown=false;
 const cached=readCommunityCache(api.session?.user?.id);
 if(cached){feedKnown=true;profile=cached.profile;posts=cached.posts;connected=true;more=posts.length===20;}
 const remember=()=>saveCommunityCache(api.session?.user?.id,profile,posts);
 const drafts={};let photos=[],disposePhotoViews=()=>{};
 const releasePhotos=()=>{const old=photos;photos=[];old.forEach(p=>URL.revokeObjectURL(p.preview));return old;};
 const cleanupPhotos=items=>{const paths=items.map(p=>p.uploadedPath).filter(Boolean);if(paths.length)void api.removePhotos(paths).catch(()=>{});};
 const me=()=>api.session?.user?.id;
 const text=(key)=>esc(t(key));
 const btn=(label,action,extra='',cls='community-button')=>`<button type="button" class="${cls}" data-community="${action}" ${extra}>${text(label)}</button>`;
 const field=(label,name,value='',type='text',extra='')=>`<label>${text(label)}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
 const area=(label,name,value='',max=600)=>`<label>${text(label)}<textarea name="${name}" maxlength="${max}" rows="3" required>${esc(value)}</textarea></label>`;
 const languages=(name,value)=>`<select name="${name}"><option value="ko" ${value==='ko'?'selected':''}>${text('한국어')}</option><option value="ja" ${value==='ja'?'selected':''}>${text('일본어')}</option></select>`;
 const languageName=code=>t(code==='ko'?'한국어':'일본어');
 const subtitle=p=>p?`${languageName(p.native_language)} → ${languageName(p.learning_language)}`:'';
 const time=value=>new Intl.DateTimeFormat(locale,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
 const badge=p=>`<span class="community-avatar" aria-hidden="true">${esc((p?.nickname||'?').slice(0,1))}</span>`;
 const personRow=p=>`<button type="button" class="community-person" data-community="person" data-id="${esc(p?.id||'')}">${badge(p)}<span><strong>${esc(p?.nickname||'—')}</strong><small>${esc(subtitle(p))}</small></span></button>`;
 const submit=label=>`<button class="community-button primary" type="submit">${text(label)}</button>`;
 const back=()=>btn('뒤로','back','','community-back');
 const rules=()=>`<details class="community-rules"><summary>${text('함께 지켜요')}</summary><p>${text('상대의 표현을 존중하고, 요청한 글에만 교정해 주세요. 괴롭힘·혐오·성적인 내용·광고는 금지해요. 전화번호나 주소 등 개인정보를 올리지 마세요.')}</p><h3>${text('공개 범위')}</h3><p>${text('닉네임·언어·자기소개·글·사진·댓글은 커뮤니티 회원에게 보여요. 이메일은 공개하지 않아요. 1:1 대화는 참여자만 볼 수 있고, 신고 처리 시 운영자가 확인할 수 있어요.')}</p><p class="community-muted">${text('이 기기에 연결된 계정이에요. 앱을 삭제하거나 기기를 바꾸면 기존 글과 대화에 다시 접속하지 못할 수 있어요.')}</p></details>`;
 const empty=heading=>`<section class="community-empty"><span aria-hidden="true">${icon('people')}</span><h2>${text(heading)}</h2></section>`;
 const form=(kind,body)=>`<form data-community-form="${kind}">${body}</form>`;
 function reconnect(){return `<section class="community-card"><h2>${text('연결을 다시 확인해 주세요')}</h2>${btn('다시 연결','reconnect','','community-button primary')}</section>`;}
 function profileForm(){const p=drafts.profile||profile||{native_language:nativeLanguage,learning_language:nativeLanguage==='ko'?'ja':'ko'};return `${profile?back():''}<h2>${text(profile?'내 정보 수정':'교류 시작하기')}</h2>${form('profile',field('닉네임','nickname',p.nickname||'','text','minlength="2" maxlength="20" required autocomplete="nickname"')+`<label>${text('모국어')}${languages('native_language',p.native_language)}</label><p class="community-muted">${text('배우는 언어')} · <span data-learning-language>${esc(languageName(p.native_language==='ko'?'ja':'ko'))}</span></p><label>${text('자기소개')}<textarea name="bio" maxlength="160" rows="2">${esc(p.bio||'')}</textarea></label>${rules()}<label class="community-checkbox"><input type="checkbox" name="rules" required ${profile?'checked':''}>${text('이 약속에 동의해요')}</label>`+submit('저장'))}${profile?`<div class="community-account">${btn('차단 관리','blocks')}${btn('계정 삭제','delete-account','','community-button danger')}</div>`:''}`;}
 function postPhotos(p){const paths=Array.isArray(p.image_paths)?p.image_paths.slice(0,MAX_PHOTOS):[];return paths.length?`<div class="community-post-photos" data-count="${paths.length}">${paths.map(path=>`<img data-post-photo="${esc(path)}" alt="${text('첨부 사진')}" loading="lazy" decoding="async">`).join('')}</div>`:'';}
 function photoAttachments(){return `<div class="community-photo-previews">${photos.map((p,i)=>`<div><img src="${esc(p.preview)}" alt="${text('첨부 사진')} ${i+1}"><button type="button" data-community="remove-photo" data-id="${p.id}" aria-label="${text('사진 삭제')} ${i+1}">${icon('close')}</button></div>`).join('')}</div><div class="community-photo-toolbar"><button type="button" class="community-photo-add" data-community="add-photo" aria-label="${text('사진 첨부')}" ${photos.length>=MAX_PHOTOS?'disabled':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-5 5 6"/></svg><span>${text('사진 첨부')}</span></button><span>${photos.length} / ${MAX_PHOTOS}</span><input type="file" data-photo-input accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple hidden></div>`;}
 function postCard(p,detail=false){return `<article class="community-post ${detail?'community-post-detail':''}" data-post="${esc(p.id)}"><div class="community-post-head">${personRow(p.profile)}<div class="community-post-meta"><time datetime="${esc(p.created_at)}">${esc(new Intl.DateTimeFormat(locale,{month:'short',day:'numeric'}).format(new Date(p.created_at)))}</time><details class="community-post-menu"><summary aria-label="${text('글 메뉴')}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></summary><div>${p.author_id===me()?btn('삭제','delete-post',`data-id="${esc(p.id)}"`):btn('신고','report-post',`data-id="${esc(p.id)}"`)}</div></details></div></div><div class="community-post-content"><p class="community-body" lang="${p.language}">${detail&&p.wants_correction?correctionSource():esc(p.body)}</p>${postPhotos(p)}<div class="community-post-footer">${detail?'':`<button type="button" class="community-comment-button" data-community="post" data-id="${esc(p.id)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l1.8-3.5A8.5 8.5 0 1 1 21 11.5Z"/></svg><span>${text('댓글')}</span></button>`}${p.wants_correction?`<span class="community-post-tag">${text('표현 도움 요청')}</span>`:''}</div></div></article>`;}
 function feed(){return `<div class="community-pull-refresh" data-pull-refresh role="status" aria-live="polite"></div>${posts.length?posts.map(p=>postCard(p)).join(''):feedKnown?empty('아직 글이 없어요'):''}${more?btn('더 보기','more'):''}<button type="button" data-community="compose" class="community-button primary community-compose-fab" aria-label="${text('글 쓰기')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5L8 21H3v-5L16 3Zm-3 3 5 5"/></svg></button>`;}
 function compose(){const d=drafts.post||{};return `<div class="community-composer">${form('post',`<div class="community-composer-meta">${badge(profile)}<strong>${esc(profile.nickname)}</strong><label><span class="community-visually-hidden">${text('글의 언어')}</span>${languages('language',d.language||profile.learning_language)}</label></div><textarea class="community-composer-body" name="body" aria-label="${text('이야기')}" maxlength="600" rows="7">${esc(d.body||'')}</textarea>${photoAttachments()}<div class="community-composer-footer"><label class="community-checkbox"><input type="checkbox" name="wants_correction" ${d.wants_correction===undefined||d.wants_correction?'checked':''}>${text('자연스러운 표현을 알려 주세요')}</label>${submit('게시')}</div>`)}</div>`;}
 function correctionTokens(){return [...new Intl.Segmenter(selected.language,{granularity:'sentence'}).segment(selected.body)];}
 function correctionSource(){const d=drafts.reply||{};return correctionTokens().map(({segment},i)=>/^\s+$/.test(segment)?esc(segment):`<button class="community-sentence" type="button" data-community="select-correction" data-id="${i}" aria-pressed="${d.start===i}" aria-label="${text('고칠 문장')}：${esc(segment.trim())}">${esc(segment)}</button>`).join('');}
 function correctionPicker(){const d=drafts.reply||{};if(d.start===undefined)return '';return `<div class="community-correction-picker"><div class="community-correction-selected"><span>${esc(correctionTokens()[d.start].segment.trim())}</span>${btn('선택 해제','clear-correction')}</div><label>${text('고친 표현')}<textarea name="correction" class="community-autogrow" maxlength="600" rows="1" required>${esc(d.correction||'')}</textarea></label></div>`;}
 function correctionComparison(corrected){const pair=correctedSentencePair(selected.body,corrected,selected.language);if(!pair.original&&!pair.corrected)return '';const parts=correctionDiff(pair.original,pair.corrected);const before=parts.filter(p=>p.type!=='added').map(p=>p.type==='removed'?`<del>${esc(p.text)}</del>`:esc(p.text)).join(''),after=parts.filter(p=>p.type!=='removed').map(p=>p.type==='added'?`<ins>${esc(p.text)}</ins>`:esc(p.text)).join('');return `<blockquote class="community-correction-comparison"><small>${text('원문')}</small><p lang="${selected.language}">${before}</p><small>${text('고친 문장')}</small><p lang="${selected.language}">${after}</p></blockquote>`;}
 function postDetail(){if(!selected)return `<p>${text('글이 삭제되었거나 볼 수 없어요.')}</p>`;return `${postCard(selected,true)}<h2>${text('댓글')}</h2>${replies.length?replies.map(r=>`<article class="community-reply">${personRow(r.profile)}${r.correction?correctionComparison(r.correction):''}${r.body?`<p class="community-body">${esc(r.body)}</p>`:''}${r.author_id===me()?btn('삭제','delete-reply',`data-id="${esc(r.id)}"`):btn('신고','report-reply',`data-id="${esc(r.id)}"`)}</article>`).join(''):''}${replyMore?btn('더 보기','more-replies'):''}${form('reply',(selected.wants_correction?correctionPicker():'')+`<label>${text('설명이나 답글 (선택)')}<textarea name="body" class="community-autogrow" maxlength="600" rows="1">${esc(drafts.reply?.body||'')}</textarea></label>`+submit('등록'))}`;}
 const peer=r=>r.requester_id===me()?r.recipient:r.requester;
 const status=r=>r.status==='accepted'?'대화 중':r.status==='declined'?'종료된 요청':r.recipient_id===me()?'대화 요청이 왔어요':'수락 대기';
 function inbox(){return `<div class="community-toolbar"><h2>${text('대화')}</h2>${btn('새로고침','refresh')}</div>${rooms.length?rooms.map(r=>`<button class="community-room" type="button" data-community="room" data-id="${esc(r.id)}">${badge(peer(r))}<span><strong>${esc(peer(r)?.nickname||'—')}</strong><small>${text(status(r))}</small></span>${icon('arrow')}</button>`).join(''):empty('대화가 아직 없어요')}`;}
 function messageList(){return messages.length?messages.map(m=>`<article class="community-message ${m.author_id===me()?'mine':''}"><p>${esc(m.body)}</p><small>${esc(time(m.created_at))}</small>${m.author_id!==me()?btn('신고','report-message',`data-id="${esc(m.id)}"`):''}</article>`).join(''):'';}
 function chat(){if(!room)return `${back()}<p>${text('대화를 불러오지 못했어요.')}</p>`;return `${back()}<div class="community-card-head">${personRow(peer(room))}${btn('새로고침','refresh')}</div>${room.status==='pending'?(room.recipient_id===me()?`<div class="button-pair">${btn('거절','decline')}${btn('수락','accept','','community-button primary')}</div>`:`<p>${text('수락 대기')}</p>`):room.status==='declined'?`<p>${text('종료된 요청')}</p>`:`${messageMore?btn('이전 메시지','older'):''}<div class="community-messages" aria-live="polite" aria-relevant="additions" role="log">${messageList()}</div>${form('message',area('메시지','body',drafts.message?.body||'',1000)+submit('보내기'))}`}`;}
 function personDetail(){return `<section class="community-card">${badge(person)}<h2>${esc(person.nickname)}</h2><p>${esc(subtitle(person))}</p><p class="community-body">${esc(person.bio)}</p>${person.id===me()?'':`<div class="button-pair">${btn('대화 요청','request','','community-button primary')}${btn('차단','block')}</div>`}</section>`;}
 function reportForm(){return `${back()}<h2>${text('신고')}</h2>${form('report',`<label>${text('신고 이유')}<select name="reason">${['괴롭힘·혐오 표현','성적인 내용','광고·사기','개인정보 노출','기타'].map(s=>`<option value="${esc(s)}">${text(s)}</option>`).join('')}</select></label>`+submit('신고 보내기'))}`;}
 function blockList(){return `${back()}<h2>${text('차단 관리')}</h2>${blocks.length?blocks.map((b,i)=>`<div class="community-toolbar"><span>${text('차단한 사용자')} ${i+1}</span>${btn('차단 해제','unblock',`data-id="${esc(b.blocked_id)}"`)}</div>`).join(''):`<p>${text('차단한 사용자가 없어요.')}</p>`}`;}
 const header=host.parentElement?.querySelector('.app-header');
 const headerTitle=header?.querySelector('.app-header-title');
 const originalTitle=headerTitle?.textContent;
 const inboxButton=header?.querySelector('[data-action="community-inbox"]');
 const headerBack=document.createElement('button');
 headerBack.type='button';headerBack.className='app-header-back';
 headerBack.setAttribute('aria-label',t('뒤로'));
 headerBack.dataset.communityHeaderBack='';
 headerBack.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
 headerBack.hidden=true;inboxButton?.before(headerBack);
 const leaveDetail=()=>{if(busy)return;epoch++;screen=screen==='person'?returnScreen:'feed';error='';notice='';draw();window.scrollTo(0,0);if(screen==='feed')void backgroundFeed();};
 headerBack.addEventListener('click',leaveDetail);
 function resizeReplyInputs(){for(const field of host.querySelectorAll('.community-autogrow')){field.style.height='auto';const style=getComputedStyle(field);field.style.height=`${field.scrollHeight+parseFloat(style.borderTopWidth)+parseFloat(style.borderBottomWidth)}px`;}}
 window.addEventListener('resize',resizeReplyInputs);
 function draw(){
  if(!live)return;
  const views={feed,compose,post:postDetail,inbox,chat,profile:profileForm,person:personDetail,report:reportForm,blocks:blockList};
  const content=profile?(views[screen]||feed)():loading?profileForm():(!connected||!api.session)?reconnect():profileForm();
  const composing=!!profile&&screen==='compose',detail=!!profile&&['compose','post','person'].includes(screen);
  headerBack.hidden=!detail;headerBack.disabled=busy;
  if(inboxButton)inboxButton.hidden=detail;
  if(headerTitle)headerTitle.textContent=composing?t('글 쓰기'):originalTitle;
  host.lang=locale;
  disposePhotoViews();
  host.innerHTML=`<p class="community-feedback" role="${error?'alert':'status'}">${esc(error||notice)}</p><div class="community-content" aria-busy="${busy}">${content}</div>`;
  disposePhotoViews=mountPostPhotos(host,api,t('사진을 불러오지 못했어요'));
  resizeReplyInputs();
  if(busy)host.querySelectorAll('button').forEach(b=>b.disabled=true);else if(loading&&!profile)host.querySelectorAll('button[type=submit]').forEach(b=>b.disabled=true);
 }
 function friendly(e){if(e.message.includes('community_photo_expired'))return t('사진 보관 기간이 지났어요. 사진을 다시 첨부해 주세요.');const photoErrors={photo_limit:'사진은 2장까지 첨부할 수 있어요.',photo_format:'이 사진을 열 수 없어요. JPG 또는 PNG 사진을 선택해 주세요.',photo_size:'사진 용량이 너무 커요. 20MB 이하 사진을 선택해 주세요.',photo_upload:'사진 업로드에 실패했어요. 다시 시도해 주세요.'};if(photoErrors[e.message])return t(photoErrors[e.message]);if(e.message==='device_storage_unavailable')return t('계정을 이 기기에 저장할 수 없어요. 앱의 저장 공간을 확인해 주세요.');if(e.message==='device_session_required'||e.status===401)return t('연결을 다시 확인해 주세요');if(e.message.includes('community_rate_limit')||e.status===429)return t('잠시 후 다시 보내 주세요.');if(e.status===403||e.code==='42501'||e.message==='room_changed')return t('처리할 수 없어요. 새로고침한 뒤 다시 시도해 주세요.');return t('연결을 확인하고 다시 시도해 주세요. 작성한 내용은 이 화면에 남아 있어요.');}
 async function run(task){if(busy||!live)return;busy=true;error='';notice='';const ticket=++epoch,previousScreen=screen,hadProfile=!!profile;host.querySelectorAll('button').forEach(b=>b.disabled=true);try{await task();}catch(e){if(live&&ticket===epoch)error=friendly(e);}finally{busy=false;if(live&&ticket===epoch){draw();if(screen!==previousScreen||hadProfile!==!!profile)window.scrollTo(0,0);}}}
 async function refresh(){if(screen==='feed'){posts=await api.feed();feedKnown=true;more=posts.length===20;}else if(screen==='post'){selected=await api.post(selected.id);replies=selected?await api.replies(selected.id):[];replyMore=replies.length===30;}else if(screen==='inbox'){rooms=await api.rooms();}else if(screen==='chat'){rooms=await api.rooms();room=rooms.find(r=>r.id===room.id);messages=room?.status==='accepted'?(await api.messages(room.id)).reverse():[];messageMore=messages.length===50;}else if(screen==='blocks')blocks=await api.blocks();remember();}
 function findPerson(id){return [profile,...posts.map(p=>p.profile),selected?.profile,...replies.map(r=>r.profile),...rooms.flatMap(r=>[r.requester,r.recipient])].find(p=>p?.id===id);}
 let returnScreen='feed';
 async function action(a,id){
  if(a==='reconnect'){await initialize();return;}
  if(['feed','inbox','profile'].includes(a)){screen=a;await refresh();return;}
  if(a==='back'){screen=['chat'].includes(screen)?'inbox':['person','report'].includes(screen)?returnScreen:'feed';await refresh();return;}
  if(a==='select-correction'){const i=Number(id);if(!selected?.wants_correction||!Number.isInteger(i)||!correctionTokens()[i])return;const d=drafts.reply||={};delete d.id;
   d.start=i;d.end=i;d.correction=correctionTokens()[i].segment.trim();return;}
  if(a==='clear-correction'){const d=drafts.reply||={};delete d.start;delete d.end;delete d.correction;delete d.id;return;}
  if(a==='remove-photo'){const index=photos.findIndex(p=>p.id===id);if(index>=0){const removed=photos.splice(index,1);removed.forEach(p=>URL.revokeObjectURL(p.preview));cleanupPhotos(removed);}return;}
  if(a==='refresh'){await refresh();return;}
  if(a==='compose'){if(!profile){screen='profile';notice=t('먼저 내 소개를 저장해 주세요.');return;}screen='compose';return;}
  if(a==='post'){selected=posts.find(p=>p.id===id);drafts.reply={};screen='post';await refresh();return;}
  if(a==='person'){person=findPerson(id);if(person){returnScreen=screen;screen='person';}return;}
  if(a==='more'){const rows=await api.feed('',posts.length);posts=[...posts,...rows.filter(p=>!posts.some(x=>x.id===p.id))];more=rows.length===20;return;}
  if(a==='more-replies'){const rows=await api.replies(selected.id,replies.length);replies=[...replies,...rows.filter(p=>!replies.some(x=>x.id===p.id))];replyMore=rows.length===30;return;}
  if(a==='delete-post'&&confirm(t('이 글을 삭제할까요?'))){await api.deletePost(id);posts=posts.filter(p=>p.id!==id);remember();screen='feed';await refresh();return;}
  if(a==='delete-reply'&&confirm(t('이 댓글을 삭제할까요?'))){await api.deleteReply(id);await refresh();return;}
  if(a==='request'&&confirm(t('대화를 요청할까요? 상대가 수락하면 메시지를 보낼 수 있어요.'))){room=await api.requestRoom(person.id);if(!room)throw Error('room_changed');screen='chat';await refresh();return;}
  if(a==='room'){room=rooms.find(r=>r.id===id);drafts.message={};screen='chat';await refresh();return;}
  if(a==='accept'||a==='decline'){await api.respond(room.id,a==='accept'?'accepted':'declined');await refresh();return;}
  if(a==='older'){const rows=await api.messages(room.id,messages.length);messages=[...rows.reverse().filter(m=>!messages.some(x=>x.id===m.id)),...messages];messageMore=rows.length===50;return;}
  if(a==='block'&&confirm(t('차단하면 서로의 글과 대화가 보이지 않아요. 차단할까요?'))){await api.block(person.id);posts=[];clearCommunityCache();screen='feed';selected=null;room=null;rooms=[];replies=[];messages=[];await refresh();notice=t('차단했어요.');return;}
  if(a==='blocks'){screen='blocks';await refresh();return;}
  if(a==='unblock'){await api.unblock(id);await refresh();return;}
  if(a.startsWith('report-')){const type=a.slice(7),item=type==='post'?[selected,...posts].find(p=>p?.id===id):type==='reply'?replies.find(r=>r.id===id):messages.find(m=>m.id===id);if(item){reportTarget={type,item};returnScreen=screen;screen='report';}return;}
  if(a==='delete-account'&&confirm(t('계정과 글·댓글·대화를 삭제할까요? 되돌릴 수 없어요. 기기의 학습 기록은 유지돼요.'))){await api.deleteAccount();clearCommunityCache();profile=null;posts=[];rooms=[];messages=[];replies=[];Object.keys(drafts).forEach(k=>delete drafts[k]);}
 }
 function correctedReply(data){const d=drafts.reply;if(!selected.wants_correction||d?.start===undefined)return '';const tokens=correctionTokens(),start=tokens[d.start].index,last=tokens[d.end],end=last.index+last.segment.length;return selected.body.slice(0,start)+(tokens[d.start].segment.match(/^\s*/)?.[0]||'')+(data.correction||'').trim()+(last.segment.match(/\s*$/)?.[0]||'')+selected.body.slice(end);}
 async function submitForm(kind,data,signup){
  if(kind==='profile'){if(!validText(data.nickname,20)||[...data.nickname.trim()].length<2){error=t('닉네임은 2~20자로 적어 주세요.');return;}if(!data.rules){error=t('약속에 동의해 주세요.');return;}profile=await api.saveProfile({nickname:data.nickname.trim(),bio:data.bio.trim(),native_language:data.native_language,learning_language:data.native_language==='ko'?'ja':'ko',rules_version:1});delete drafts.profile;screen='feed';await refresh();return;}
  if(kind==='post'){if((!data.body.trim()&&!photos.length)||(data.body.trim()&&!validText(data.body,600))){error=t('내용이나 사진을 추가해 주세요.');return;}drafts.post||={};drafts.post.id ||= crypto.randomUUID();const body={id:drafts.post.id,body:data.body.trim(),language:data.language,wants_correction:!!data.wants_correction&&!!data.body.trim()};if(photos.length)await api.publishPhotos(body,photos);else await api.publish(body);releasePhotos();delete drafts.post;screen='feed';await refresh();return;}
  if(kind==='reply'){if(drafts.reply?.start!==undefined&&!validText(correctedReply(data),600)){error=t('고친 글은 600자 이내로 적어 주세요.');return;}if((data.body.trim()&&!validText(data.body,600))||(!data.body.trim()&&!correctedReply(data))){error=t('고친 표현이나 답글을 입력해 주세요.');return;}drafts.reply||={};drafts.reply.id ||= crypto.randomUUID();await api.reply({id:drafts.reply.id,post_id:selected.id,body:data.body.trim(),correction:correctedReply(data)});delete drafts.reply;await refresh();return;}
  if(kind==='message'){if(!validText(data.body,1000)){error=t('내용을 입력해 주세요.');return;}drafts.message||={};drafts.message.id ||= crypto.randomUUID();await api.message({id:drafts.message.id,room_id:room.id,body:data.body.trim()});delete drafts.message;await refresh();return;}
  if(kind==='report'){const {type,item}=reportTarget;await api.report({[`${type}_id`]:item.id,reported_user_id:item.author_id,reason:data.reason});screen=returnScreen;notice=t('신고를 접수했어요.');}
 }
 const click=e=>{const b=e.target.closest('[data-community]');if(!b||b.disabled)return;
  const a=b.dataset.community;
  if(a==='add-photo'){if(!busy)host.querySelector('[data-photo-input]')?.click();return;}
  if(['feed','inbox','profile'].includes(a)&&!busy){epoch++;screen=a;error='';notice='';draw();
   if(a==='feed'&&profile)void backgroundFeed();
   if(a==='inbox'&&profile){const ticket=epoch;void api.rooms().then(fresh=>{if(live&&epoch===ticket&&screen==='inbox'){rooms=fresh;draw();}}).catch(e=>{if(live&&epoch===ticket){error=friendly(e);draw();}});}
   return;
  }
  if(loading&&!profile)return;
  void run(()=>action(a,b.dataset.id));
 };
 const input=e=>{if(e.target.matches('.community-autogrow'))resizeReplyInputs();const f=e.target.closest('form');if(f){const kind=f.dataset.communityForm;drafts[kind]={...drafts[kind],...Object.fromEntries(new FormData(f))};if(kind!=='post')delete drafts[kind].id;if(kind==='post')drafts[kind].wants_correction=f.elements.wants_correction.checked;}if(e.target.name==='native_language'){host.querySelector('[data-learning-language]').textContent=languageName(e.target.value==='ko'?'ja':'ko');}};
 const change=e=>{if(!e.target.matches('[data-photo-input]')){input(e);return;}const files=[...e.target.files];e.target.value='';if(!files.length||busy)return;void run(async()=>{if(photos.length+files.length>MAX_PHOTOS)throw Error('photo_limit');const prepared=[];try{for(const file of files)prepared.push(await preparePhoto(file));if(!live){prepared.forEach(p=>URL.revokeObjectURL(p.preview));return;}photos.push(...prepared);}catch(error){prepared.forEach(p=>URL.revokeObjectURL(p.preview));throw error;}});};
 const submission=e=>{if(!e.target.matches('[data-community-form]'))return;e.preventDefault();const data=Object.fromEntries(new FormData(e.target));void run(()=>submitForm(e.target.dataset.communityForm,data,e.submitter?.name==='signup'));};
 host.addEventListener('click',click);host.addEventListener('input',input);host.addEventListener('change',change);host.addEventListener('submit',submission);
 async function initialize(){
  try{
   const previousOwner=api.session?.user?.id;
   await api.ensureDeviceSession();await api.verify();
   if(!live)return;
   if(previousOwner&&previousOwner!==api.session?.user?.id){clearCommunityCache();profile=null;posts=[];}
   const owner=api.session?.user?.id,freshProfile=await api.profile();if(!live||api.session?.user?.id!==owner)return;
   profile=freshProfile;connected=true;loading=false;
   if(!profile){posts=[];clearCommunityCache();draw();return;}
   remember();if(!host.querySelector('form')||!drafts.profile)draw();
   // Never replace a form or change tabs when background authentication finishes.
   if(screen==='feed')await backgroundFeed();else if(screen==='inbox'){const ticket=epoch,fresh=await api.rooms();if(live&&epoch===ticket&&screen==='inbox'){rooms=fresh;draw();}}
  }catch(e){if(!live)return;loading=false;
   if(!api.session||e.status===401||e.status===403){clearCommunityCache();profile=null;posts=[];connected=false;}
   error=friendly(e);if(!host.querySelector('form'))draw();
  }
 }
 let feedRequest=0;
 async function backgroundFeed(){
  const ticket=epoch,request=++feedRequest;
  try{const fresh=await api.feed();
   if(!live||ticket!==epoch||screen!=='feed'||request!==feedRequest)return;
   posts=fresh;feedKnown=true;more=posts.length===20;remember();draw();
  }catch(e){if(live&&ticket===epoch&&request===feedRequest&&screen==='feed'){if(e.status===401||e.status===403||!api.session){clearCommunityCache();profile=null;posts=[];connected=false;}error=friendly(e);draw();}}
 }
 const disposePullRefresh=mountPullRefresh(host,{canRefresh:()=>live&&screen==='feed'&&!!profile&&!busy&&!loading,refresh:()=>{error='';return backgroundFeed();},label:phase=>t({pull:'아래로 당겨 새로고침',release:'놓으면 새로고침',refreshing:'새 글을 확인하고 있어요'}[phase])});
 draw();void initialize();
 // Poll only an open conversation. Update the log alone so typing and focus remain untouched.
 const timer=setInterval(async()=>{if(!live||busy||document.hidden||screen!=='chat'||room?.status!=='accepted')return;const ticket=epoch,roomId=room.id;try{const fresh=(await api.messages(roomId)).reverse();if(!live||busy||epoch!==ticket||screen!=='chat'||room?.id!==roomId)return;if(JSON.stringify(fresh.map(m=>m.id))===JSON.stringify(messages.slice(-50).map(m=>m.id)))return;messages=fresh;messageMore=fresh.length===50;const log=host.querySelector('.community-messages');if(log)log.innerHTML=messageList();}catch{/* Manual refresh exposes actionable errors without interrupting composition. */}},15000);
 return ()=>{disposePhotoViews();cleanupPhotos(releasePhotos());window.removeEventListener('resize',resizeReplyInputs);headerBack.removeEventListener('click',leaveDetail);headerBack.remove();if(inboxButton)inboxButton.hidden=false;if(headerTitle)headerTitle.textContent=originalTitle;live=false;epoch++;disposePullRefresh();clearInterval(timer);host.removeEventListener('click',click);host.removeEventListener('input',input);host.removeEventListener('change',change);host.removeEventListener('submit',submission);};
}
