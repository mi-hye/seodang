import {operations} from './analytics.js';
import {esc,icon,quotedText} from './ui.js';
import {createConversationAPI} from './voice-conversation-api.js';
import {AudioPlayer} from './media.js';
import {speakingCoach,microphone} from './speaking-coach.js';
import {mountKoreanSpeaking} from './korean-speaking.js';
import {conversationTopics,topicIntroduction,topicImage} from './voice-conversation-topics.js';
import {courseVoicePath} from './course-voice-path.js';
let styles;
export function loadConversationStyles(){return styles ||= Promise.all(['voice-conversation','speaking'].map(name=>new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=`src/${name}.css`;link.onload=resolve;link.onerror=()=>{link.remove();styles=null;reject(Error('styles'));};document.head.append(link);})));}
const copy={
 ko:{title:'서당개랑 말해요',preview:'주제 듣기',other:'다른 주제',beforeTime:'주제를 듣는 동안에는 시간이 줄지 않아요.',intro:'하루 10분, 배운 말로 편하게 대화해요.',paid:'무료 체험 중 · 추후 유료 전환 예정',remaining:'오늘 남은 시간',start:'이야기 시작',end:'대화 마치기',done:'오늘 10분을 모두 사용했어요. 내일 다시 이야기해요.',preparing:'AI 회화를 준비하고 있어요',unavailable:'연결 준비가 끝나면 여기서 대화할 수 있어요.',privacy:'말한 내용은 음성 인식 서비스에서 글자로 바뀌고 대화를 위해 OpenAI로 전송돼요. AI의 답변에는 틀린 내용이 있을 수 있어요.',retention:'대화는 이 화면을 나가면 지워져요. 중복 요청을 막기 위해 AI 답변을 서버에 최대 24시간 임시 보관해요. OpenAI에는 자체 데이터 보관 정책이 적용돼요.',consent:'대화 내용의 OpenAI 전송에 동의해요.',details:'AI 이용 안내',clock:'한국·일본 시간으로 매일 자정에 10분이 새로 생겨요. 대화 중에는 듣기·생각하는 시간도 포함돼요.',connecting:'대화를 연결하고 있어요',thinking:'서당개가 대답을 생각하고 있어요',speak:'말해 봐요',send:'보내기',write:'글로 답하기',retry:'다시 확인',error:'연결을 확인해 주세요. 남은 시간은 다시 연결한 뒤 확인할 수 있어요.',capacity:'지금은 AI 회화를 이용할 수 없어요. 잠시 후 다시 와 주세요.',finished:'대화를 마쳤어요',home:'학습으로',listen:'답변 듣기',translation:'뜻 보기',voiceError:'소리를 재생하지 못했어요. 답변 오른쪽에서 다시 들을 수 있어요.',resumed:'이전 대화를 마쳤어요. 남은 시간으로 새로 시작할 수 있어요.',placeholder:'하고 싶은 말을 적어 주세요',expired:'오늘의 회화 시간이 끝났어요.'},
 ja:{title:'ソダン犬と話そう',preview:'話題を聞く',other:'別の話題',beforeTime:'話題を聞いている間は時間が減りません。',intro:'1日10分、習った言葉で気軽に話してみよう。',paid:'無料体験中 · 今後有料化予定',remaining:'今日の残り時間',start:'話し始める',end:'会話を終える',done:'今日の10分を使い切りました。明日また話しましょう。',preparing:'AI会話を準備しています',unavailable:'接続の準備ができたら、ここで会話できます。',privacy:'話した内容は音声認識サービスで文字に変換され、会話のためにOpenAIへ送られます。AIの返事には誤りがある場合があります。',retention:'会話はこの画面を離れると消えます。重複したリクエストを防ぐため、AIの返事をサーバーに最大24時間保存します。OpenAIには独自のデータ保存方針が適用されます。',consent:'会話内容をOpenAIへ送信することに同意します。',details:'利用について',clock:'韓国・日本時間の毎日午前0時に10分に戻ります。会話中は聞く時間・考える時間も含まれます。',connecting:'会話につないでいます',thinking:'ソダン犬が返事を考えています',speak:'話してみよう',send:'送る',write:'文字で答える',retry:'もう一度確認',error:'接続を確認してください。残り時間は再接続後に確認できます。',capacity:'今はAI会話を利用できません。しばらくしてからお試しください。',finished:'会話が終わりました',home:'学習へ',listen:'返事を聞く',translation:'意味を見る',voiceError:'音声を再生できませんでした。返事の右側からもう一度聞けます。',resumed:'前の会話を終了しました。残り時間で新しく始められます。',placeholder:'話したいことを書いてください',expired:'今日の会話時間が終了しました。'}
};
export const conversationTime=seconds=>`${Math.floor(Math.max(0,seconds)/60)}:${String(Math.floor(Math.max(0,seconds)%60)).padStart(2,'0')}`;
export function mountConversation(root,state,{api=createConversationAPI(),player=new AudioPlayer(),now=()=>performance.now(),tickMs=250}={}){
 const japanese=state.courseDirection==='ja-ko',c=copy[japanese?'ja':'ko'],locale=japanese?'ko-KR':'ja-JP',lang=japanese?'ko':'ja';
 let alive=true,stage=api.enabled?'loading':'unavailable',remaining=null,deadline=0,sessionId=null,consented=false,busy=false,error='',messages=[],pending=null,draft='',disposeSpeech,controller,secondsTimer,requestVersion=0,startingId=null,micBusy=false,micRecording=false,paused=false,heartbeatBusy=false,heartbeatTimer,topic=conversationTopics[0],introSpeaking=false,introVersion=0;
 root.dataset.direction=state.courseDirection;
 const native=Boolean(globalThis.Capacitor?.isNativePlatform?.());
 const left=()=>sessionId?Math.max(0,Math.ceil((deadline-now())/1000)):remaining;
 function updateTime(){const value=left();const el=root.querySelector('[data-talk-time]');if(el)el.textContent=value===null?'—':conversationTime(value);if(sessionId&&value<=0)void end(true);}
 function sync(data){remaining=Math.ceil(data.remainingSeconds);if(sessionId)deadline=now()+remaining*1000;}
 function stopMedia(){introVersion++;introSpeaking=false;disposeSpeech?.();disposeSpeech=null;void player.stop();syncIntroControls();}
 function shell(body){return `<p class="talk-time">${c.remaining} <strong data-talk-time>${left()===null?'—':conversationTime(left())}</strong></p>${body}${['ready','finished','introduction'].includes(stage)?`<p class="talk-paid">${c.paid}</p>`:''}`;}
 const artwork=()=>`<img class="talk-topic-art" src="${topicImage(topic)}" width="152" height="152" alt="">`;
 const intro=()=>topicIntroduction(topic,state.courseDirection);
 const details=()=>`<details class="talk-details"><summary>${c.details}</summary><p>${c.privacy}</p><p>${c.retention}</p><p>${c.beforeTime}</p><p>${c.clock}</p><p>VOICEVOX Nemo 男声1 / Supertonic 3 M1</p></details>`;
 function syncIntroControls(){const start=root.querySelector('[data-talk-start]');if(start)start.disabled=!consented||introSpeaking;const listen=root.querySelector('[data-talk-intro-listen]');if(listen){listen.setAttribute('aria-pressed',String(introSpeaking));listen.innerHTML=icon(introSpeaking?'pause':'sound');}}
 const dog=()=>'<img class="talk-dog" src="assets/mascot/seodang-sitting-v1.png" width="100" height="100" alt="">';
 function render(){
  if(!alive)return;stopMedia();
  let body='';
  if(stage==='unavailable')body=`<section class="talk-intro">${dog()}<h2>${c.preparing}</h2><p>${c.unavailable}</p><p>${c.intro}</p></section>`;
  else if(stage==='loading')body=`<p class="talk-status" role="status">${c.connecting}</p>`;
  else if(stage==='ready'||stage==='finished')body=`<section class="talk-topics"><div class="talk-topic-grid" aria-label="${c.preview}">${conversationTopics.map(t=>`<button type="button" class="talk-topic" data-talk-topic="${t.id}" aria-pressed="${t.id===topic.id}"><img src="${topicImage(t)}" width="112" height="112" alt=""><span>${japanese?t.ja:t.ko}</span></button>`).join('')}</div><button class="primary" data-talk-preview>${c.preview}</button></section>`;
  else if(stage==='introduction')body=`<section class="talk-intro-preview">${artwork()}<h2>${japanese?topic.ja:topic.ko}</h2><article class="talk-reply"><div class="audio-text-row"><p lang="${lang}">${quotedText(intro().text)}</p><button class="icon-button" data-talk-intro-listen aria-label="${c.listen}" aria-pressed="false">${icon('sound')}</button></div><details><summary>${c.translation}</summary><p>${quotedText(intro().meaning)}</p></details></article><label class="talk-consent"><input type="checkbox" data-talk-consent ${consented?'checked':''}><span>${c.consent}</span></label>${details()}<p class="talk-error" role="status">${error}</p><div class="button-pair"><button class="secondary" data-talk-other>${c.other}</button><button class="primary" data-talk-start ${consented?'':'disabled'}>${c.start}</button></div></section>`;
  else if(stage==='done')body=`<section class="talk-intro">${dog()}<h2>${c.done}</h2><button class="primary" data-action="home">${c.home}</button></section>`;
  else if(stage==='permission')body=`<section class="talk-intro">${dog()}<p>${japanese?'会話を始める前に、設定でマイクと音声認識を許可してください。':'대화를 시작하기 전에 설정에서 마이크와 음성 인식을 허용해 주세요.'}</p><div class="button-pair"><button class="secondary" data-talk-settings>${japanese?'設定':'설정 열기'}</button><button class="primary" data-talk-refresh>${c.retry}</button></div></section>`;
  else if(stage==='error')body=`<section class="talk-intro">${dog()}<p role="status">${error}</p><button class="primary" data-talk-refresh>${c.retry}</button></section>`;
  else body=`<div class="talk-log" role="log" aria-live="polite">${messages.map((message,i)=>message.role==='user'?`<p class="talk-user" lang="${lang}">${esc(message.text)}</p>`:`<article class="talk-reply"><div class="audio-text-row"><p lang="${lang}">${quotedText(message.text)}</p><button type="button" class="icon-button" data-talk-listen="${i}" aria-label="${c.listen}">${icon('sound')}</button></div><details><summary>${c.translation}</summary><p>${quotedText(message.meaning||'')}</p></details></article>`).join('')}</div>${busy?`<p class="talk-status" role="status">${c.thinking}</p>`:`<section class="korean-speaking talk-speaking" data-speaking-locale="${locale}" data-speaking-ui="${japanese?'ja':'ko'}" data-speaking-free="true"><h2 hidden></h2>${speakingCoach({text:c.speak,lang:japanese?'ja':'ko'})}<button type="button" class="primary speaking-microphone" data-speaking-record aria-label="${c.speak}" aria-pressed="false">${microphone()}</button><button hidden data-speaking-example></button><p hidden data-speaking-transcript></p><div data-speaking-permission hidden><p data-speaking-permission-help></p><button class="secondary" data-speaking-settings>${japanese?'設定を開く':'설정 열기'}</button></div><button hidden data-speaking-next></button><button hidden data-speaking-skip></button></section><form class="talk-form"><div class="talk-input-row"><textarea id="talk-answer" aria-label="${c.write}" lang="${lang}" maxlength="400" rows="2" placeholder="${c.placeholder}">${esc(draft)}</textarea><button class="primary" type="submit" ${draft.trim()?'':'disabled'}>${c.send}</button></div></form>`}<p class="talk-error" role="status">${error}</p>${pending&&!busy?`<button class="secondary" data-talk-retry>${c.retry}</button>`:''}<button class="text-button" data-talk-end>${c.end}</button>`;
  root.innerHTML=shell(body);root.lang=japanese?'ja':'ko';root.setAttribute('aria-label',c.title);root.dataset.stage=stage;
  if(stage==='talking'&&!busy&&!paused)disposeSpeech=mountKoreanSpeaking(root,{observe:()=>operations.start('speech_recognition',{course_direction:state.courseDirection}),stop:()=>player.stop(),onBusyChange:value=>{micBusy=value;if(!value&&document.hidden&&sessionId)void end();},onRecordingChange:value=>{micRecording=value;},allowNetwork:consented,blocked:()=>busy||!!pending||left()<=0,onRecognized:text=>{draft=text;queueMicrotask(()=>{if(alive&&stage==='talking')render();});}});
  if(!native&&root.querySelector('[data-speaking-status]'))root.querySelector('[data-speaking-status]').textContent=japanese?'文字で話そう':'글로 이야기해요';
  const log=root.querySelector('.talk-log');if(log)log.scrollTop=log.scrollHeight;
 }
 function messageFor(e){return ['capacity_limit','credit_unavailable','unavailable'].includes(e.message)?c.capacity:e.message==='daily_limit'?c.done:c.error;}
 async function refresh(){
  stage='loading';error='';render();
  const version=++requestVersion;controller=new AbortController();
  try{let data=await api.request('status',{}, {signal:controller.signal});if(!alive||version!==requestVersion)return;
   // After reload/background, close an old lease before starting a new one.
   if(data.sessionId)data=await api.request('end',{sessionId:data.sessionId});
   if(!alive||version!==requestVersion)return;sync(data);stage=remaining>0?'ready':'done';
  }catch(e){if(!alive||version!==requestVersion)return;stage='error';error=messageFor(e);}render();
 }
 async function playIntro(){
  if(stage!=='introduction'||paused)return;
  if(introSpeaking){stopMedia();return;}
  stopMedia();const version=++introVersion;introSpeaking=true;syncIntroControls();
  const text=intro().text;let failed=false;
  try{
   await player.play({status:'ready',audioFile:courseVoicePath(locale,text),bundled:true,locale,text},true,()=>{failed=true;});
   if(failed&&alive&&stage==='introduction'&&version===introVersion&&!paused){await player.play({status:'device-tts',locale,text},true,()=>{error=c.voiceError;const e=root.querySelector('.talk-error');if(e)e.textContent=error;});}
  }finally{if(alive&&version===introVersion){introSpeaking=false;syncIntroControls();}}
 }
 function preview(){if(!['ready','finished'].includes(stage))return;error='';stage='introduction';render();void playIntro();}
 async function start(){
  if(busy||!consented||introSpeaking||stage!=='introduction')return;
  busy=true;stage='loading';render();const version=++requestVersion;controller=new AbortController();
  let id;
  try{
   if(native){
    const cap=globalThis.Capacitor;
    const permissions=await cap.nativePromise('SeodangRecognition','requestPermissions',{permissions:['microphone']});
    if(!alive||version!==requestVersion)return;
    if((permissions.microphone??permissions.permission)!=='granted')throw Error('permission');
   }
   if(document.hidden){busy=false;stage='introduction';render();return;}
   id=startingId=crypto.randomUUID();
   const data=await api.request('start',{sessionId:id,direction:state.courseDirection,consent:true}, {signal:controller.signal});
   if(!alive||version!==requestVersion){void api.request('end',{sessionId:id},{keepalive:true}).catch(()=>{});return;}
   sessionId=data.sessionId;startingId=null;sync(data);messages=[{...intro(),introduction:true}];stage='talking';busy=false;render();
  }catch(e){startingId=null;if(id)void api.request('end',{sessionId:id},{keepalive:true}).catch(()=>{});if(!alive||version!==requestVersion)return;busy=false;stage=e.message==='permission'?'permission':'error';error=messageFor(e);render();}
 }
 async function turn(){
  if(busy||!sessionId||left()<=0||(!pending&&!draft.trim()))return;
  if(!pending){pending={requestId:crypto.randomUUID(),sessionId,direction:state.courseDirection,topic:topic.id,first:false,messages:messages.filter(m=>!m.introduction).slice(-12).map(({role,text})=>({role,text})),text:draft.trim()};}
  busy=true;error='';stopMedia();render();controller=new AbortController();const version=++requestVersion;
  try{const data=await api.request('turn',pending,{signal:controller.signal});if(!alive||version!==requestVersion)return;
   sync(data);if(left()<=0){await end(true);return;}
   if(!pending.first)messages.push({role:'user',text:pending.text});messages.push({role:'assistant',text:data.reply.text,meaning:data.reply.meaning});pending=null;draft='';busy=false;render();
   if(!paused)await player.play({status:'device-tts',locale,text:data.reply.text},true,()=>{if(alive){error=c.voiceError;const el=root.querySelector('.talk-error');if(el)el.textContent=error;}});
  }catch(e){if(!alive||version!==requestVersion)return;busy=false;error=messageFor(e);if(['daily_limit','session_expired','capacity_limit','credit_unavailable'].includes(e.message)){await end(e.message==='daily_limit'||e.message==='session_expired');return;}render();}
 }
 async function end(exhausted=false){
  if(!sessionId)return;const id=sessionId;sessionId=null;requestVersion++;controller?.abort();stopMedia();busy=false;pending=null;draft='';messages=[];remaining=exhausted?0:Math.max(0,Math.ceil((deadline-now())/1000));stage=exhausted?'done':'loading';render();
  try{const data=await api.request('end',{sessionId:id},{keepalive:true});if(!alive)return;sync(data);stage=remaining>0?'finished':'done';}
  catch(e){if(!alive)return;remaining=null;stage='error';error=messageFor(e);}render();
 }
 function click(event){const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.hasAttribute('data-talk-topic')&&['ready','finished'].includes(stage)){topic=conversationTopics.find(t=>t.id===button.dataset.talkTopic)||topic;root.querySelectorAll('[data-talk-topic]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.talkTopic===topic.id)));}
  if(button.hasAttribute('data-talk-preview'))preview();
  if(button.hasAttribute('data-talk-intro-listen'))void playIntro();
  if(button.hasAttribute('data-talk-other')&&stage==='introduction'){stage='ready';error='';render();}
  if(button.hasAttribute('data-talk-start'))void start();
  if(button.hasAttribute('data-talk-settings'))void globalThis.Capacitor?.nativePromise('SeodangRecognition','openSettings',{}).catch(()=>{});
  if(button.hasAttribute('data-talk-refresh'))void refresh();
  if(button.hasAttribute('data-talk-retry'))void turn();
  if(button.hasAttribute('data-talk-end'))void end();
  if(button.hasAttribute('data-talk-listen')){const m=messages[Number(button.dataset.talkListen)];if(m&&sessionId&&left()>0){render();void player.play(m.introduction?{status:'ready',audioFile:courseVoicePath(locale,m.text),bundled:true,locale,text:m.text}:{status:'device-tts',locale,text:m.text},true,()=>{});}}
 }
 const change=event=>{if(event.target.matches('[data-talk-consent]')){consented=event.target.checked;syncIntroControls();}};
 const input=event=>{if(event.target.id==='talk-answer'){draft=event.target.value;root.querySelector('[type="submit"]').disabled=!draft.trim();}};
 const submit=event=>{event.preventDefault();if(!event.isComposing)void turn();};
 const hidden=()=>{if(!document.hidden)return;if(stage==='introduction')stopMedia();if(sessionId&&!(native&&micBusy&&!micRecording))void end();else if(startingId){const id=startingId;startingId=null;requestVersion++;controller?.abort();busy=false;stage='introduction';void api.request('end',{sessionId:id},{keepalive:true}).catch(()=>{});render();}};
 const pagehide=()=>{stopMedia();if(sessionId)void end();};
 root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('input',input);root.addEventListener('submit',submit);document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',pagehide);
 heartbeatTimer=setInterval(async()=>{if(!alive||!sessionId||heartbeatBusy||document.hidden)return;heartbeatBusy=true;const id=sessionId;try{const data=await api.request('heartbeat',{sessionId:id,direction:state.courseDirection});if(alive&&sessionId===id)sync(data);}catch(e){if(alive&&sessionId===id&&['session_expired','daily_limit','unauthorized'].includes(e.message))void end();}finally{heartbeatBusy=false;}},15000);
 secondsTimer=setInterval(updateTime,tickMs);render();if(api.enabled)void refresh();
 const dispose=()=>{alive=false;requestVersion++;controller?.abort();stopMedia();clearInterval(secondsTimer);clearInterval(heartbeatTimer);if(sessionId||startingId)void api.request('end',{sessionId:sessionId||startingId},{keepalive:true}).catch(()=>{});sessionId=null;messages=[];pending=null;root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('input',input);root.removeEventListener('submit',submit);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',pagehide);};
 dispose.pause=()=>{paused=true;stopMedia();};dispose.resume=()=>{paused=false;render();};return dispose;
}
