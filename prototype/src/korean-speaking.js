import {button,icon,phraseText,esc} from './ui.js';
import {showSheet,closeSheet} from './sheet.js';
const microphone=()=>'<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>';
const stopIcon=()=>'<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
export const speakingTarget='저는 학생이에요.';
const normalizeSpeech=text=>String(text||'').normalize('NFC').replace(/[\s\p{P}\p{S}]/gu,'');
export const matchesSpeakingTarget=(text,target=speakingTarget)=>Boolean(normalizeSpeech(target))&&normalizeSpeech(text)===normalizeSpeech(target);
const koCopy={'マイクの使用を許可してね':'마이크 사용을 허용해 주세요','マイクの権限がオフになっているよ':'마이크 권한이 꺼져 있어요','設定で「権限」→「マイク」を許可してね。':'설정에서 권한 → 마이크를 허용해 주세요.','設定を開く':'설정 열기','端末の音声認識を使いますか？':'기기의 음성 인식을 사용할까요?','音声が音声認識サービス提供元のサーバーに送信される場合があります。ソダンは録音や認識した文を保存しません。':'음성 인식 서비스 제공업체의 서버로 음성이 전송될 수 있어요. 서당은 녹음이나 인식한 문장을 저장하지 않아요.','あとで':'나중에','使う':'사용하기','端末の音声認識を使えないよ':'기기의 음성 인식을 사용할 수 없어요','端末でこの言語の音声認識を準備してね。':'기기에서 해당 언어의 음성 인식을 준비해 주세요.','設定→アプリ→ソダン→権限でマイクを許可してね。':'설정 → 앱 → 서당 → 권한에서 마이크를 허용해 주세요.','話してみよう':'말해 봐요','話す':'말하기','お手本を聞く':'예시 듣기','戻る':'이전','スキップ':'건너뛰기','次へ':'다음','録音を終える':'녹음 끝내기','聞いているよ':'듣고 있어요','聞いているよ…':'듣고 있어요…','もう一度、話してみよう':'다시 말해 봐요','よくできたね！':'잘했어요!','スキップして進もう':'건너뛰어도 괜찮아요','設定でマイクと音声認識を許可してね':'설정에서 마이크와 음성 인식을 허용해 주세요','聞き取った文：':'들은 문장: ','ソダン犬':'서당개','笑顔のソダン犬':'웃는 서당개','耳をすますソダン犬':'귀 기울이는 서당개','首をかしげるソダン犬':'고개를 기울이는 서당개'};
export function renderKoreanSpeaking(top,target=speakingTarget,locale='ko-KR',audioId='',parts,options={}){
 const japanese=locale==='ja-JP',koreanUI=options.uiLocale==='ko'||japanese,t=text=>koreanUI?(koCopy[text]||text):text,uiLang=koreanUI?'ko':'ja',lang=japanese?'ja':'ko';
 const audioAction=options.audioAction||(japanese?'sentence-audio':'korean-audio'),previousAction=options.previousAction||(japanese?'sentence-previous':'korean-previous');
 return `${top(t('話してみよう'))}<main class="page korean-speaking" data-speaking-locale="${locale}" data-speaking-ui="${uiLang}" data-speaking-free="${Boolean(options.freeSpeech)}" data-speaking-spoken="${esc(options.spoken||target)}"><div class="speaking-coach"><h1 lang="${uiLang}" role="status" aria-live="polite" data-speaking-status>${esc(options.prompt||t('話してみよう'))}</h1><span class="speaking-dog" data-speaking-mood="idle" role="img" aria-label="${t('ソダン犬')}"></span></div><button class="primary speaking-microphone" type="button" data-speaking-record aria-label="${t('話す')}" aria-pressed="false">${microphone()}</button><div class="audio-text-row"><h2 lang="${lang}">${phraseText(target,parts)}</h2>${button(icon('sound'),audioAction,'icon-button',`aria-label="${t('お手本を聞く')}" data-id="${esc(audioId)}" data-speaking-example`)}</div><p data-speaking-transcript lang="${lang}" hidden></p><div data-speaking-permission hidden><p data-speaking-permission-help lang="${uiLang}"></p><button class="secondary" type="button" data-speaking-settings>${t('設定を開く')}</button></div><div class="speaking-actions"><div class="button-pair speaking-navigation">${button(t('戻る'),previousAction,'text-button')}<button class="text-button" type="button" data-speaking-skip>${t('スキップ')}</button><button class="primary" type="button" data-speaking-next disabled hidden>${t('次へ')}</button></div></div></main>`;
}
export function mountKoreanSpeaking(root,{stop,advance,recognize,cancel,end}={}){
 const page=root.querySelector('.korean-speaking');if(!page)return()=>{};
 const locale=page.dataset.speakingLocale||'ko-KR',localize=text=>page.dataset.speakingUi==='ko'||locale==='ja-JP'?(koCopy[text]||text):text;
 const cap=globalThis.Capacitor,android=Boolean(cap?.isNativePlatform?.()&&cap.getPlatform?.()==='android');
 const supported=Boolean(recognize||cap?.isNativePlatform?.()&&['ios','android'].includes(cap.getPlatform?.()));
 const call=(method,options={})=>cap.nativePromise('SeodangRecognition',method,{locale,...options});
 let serviceConsent=false,preferSystem=false,consentDialog,resolveConsent;
 recognize ||= ()=>call('recognize',{allowNetwork:serviceConsent,preferSystem});cancel ||= ()=>call('cancel');end ||= ()=>call('finish');
 const record=page.querySelector('[data-speaking-record]'),next=page.querySelector('[data-speaking-next]'),status=page.querySelector('[data-speaking-status]'),transcript=page.querySelector('[data-speaking-transcript]'),example=page.querySelector('[data-speaking-example]');
 const permission=page.querySelector('[data-speaking-permission]'),permissionHelp=page.querySelector('[data-speaking-permission-help]'),settings=page.querySelector('[data-speaking-settings]');
 const dog=page.querySelector('[data-speaking-mood]');
 const tell=(text,mood='retry')=>{status.textContent=localize(text);dog.dataset.speakingMood=mood;dog.setAttribute('aria-label',localize(mood==='happy'?'笑顔のソダン犬':mood==='listening'?'耳をすますソダン犬':mood==='retry'?'首をかしげるソダン犬':'ソダン犬'));};
 const micState=active=>{record.innerHTML=active?stopIcon():microphone();record.setAttribute('aria-label',localize(active?'録音を終える':'話す'));record.setAttribute('aria-pressed',String(active));};
 const skip=page.querySelector('[data-speaking-skip]');
 const showNext=ready=>{next.disabled=!ready;next.hidden=!ready;skip.hidden=ready;};
 let alive=true,recording=false,preparing=false,request=0,advancing=false;
 const closeConsent=value=>{const done=resolveConsent;resolveConsent=null;if(consentDialog){closeSheet(consentDialog);consentDialog.remove();consentDialog=null;}done?.(value);};
 const askService=()=>new Promise(resolve=>{
  resolveConsent=resolve;consentDialog=document.createElement('dialog');consentDialog.className='speaking-consent';consentDialog.lang=page.dataset.speakingUi;
  consentDialog.setAttribute('aria-labelledby','speaking-consent-title');
  consentDialog.innerHTML=`<h2 id="speaking-consent-title">${localize('端末の音声認識を使いますか？')}</h2><p>${localize('音声が音声認識サービス提供元のサーバーに送信される場合があります。ソダンは録音や認識した文を保存しません。')}</p><div class="button-pair"><button class="secondary" data-decline>${localize('あとで')}</button><button class="primary" data-accept>${localize('使う')}</button></div>`;
  consentDialog.addEventListener('cancel',e=>{e.preventDefault();closeConsent(false);});
  consentDialog.querySelector('[data-decline]').onclick=()=>closeConsent(false);
  consentDialog.querySelector('[data-accept]').onclick=()=>closeConsent(true);
  document.body.append(consentDialog);showSheet(consentDialog);
 });
 const cancelRecording=()=>{request++;recording=false;preparing=false;closeConsent(false);if(supported)void Promise.resolve().then(cancel).catch(()=>{});record.disabled=!supported;micState(false);example.disabled=false;};
 const permissionError=blocked=>{
  tell(android?(blocked?'マイクの権限がオフになっているよ':'マイクの使用を許可してね'):'設定でマイクと音声認識を許可してね');
  if(android){permission.hidden=false;permissionHelp.textContent=localize('設定で「権限」→「マイク」を許可してね。');}
 };
 const refreshPermission=async()=>{
  if(!android||!alive||permission.hidden||recording||preparing)return;
  const id=request;
  try{const state=await call('status');if(alive&&id===request&&state.permission==='granted'){permission.hidden=true;tell('もう一度、話してみよう','idle');}}catch{}
 };
 if(!supported){record.disabled=true;tell('スキップして進もう','idle');}
 const click=async e=>{
  if(e.target.closest('[data-speaking-skip]')||e.target.closest('[data-speaking-next]')&&!next.disabled){if(advancing)return;advancing=true;cancelRecording();stop();advance();return;}
  if(e.target.closest('[data-speaking-settings]')){
   if(settings.disabled)return;cancelRecording();stop();settings.disabled=true;
   try{await call('openSettings');}catch{if(alive)permissionHelp.textContent=localize('設定→アプリ→ソダン→権限でマイクを許可してね。');}
   finally{if(alive)settings.disabled=false;}return;
  }
  if(!e.target.closest('[data-speaking-record]')||record.disabled||preparing)return;
  if(recording){record.disabled=true;tell('聞いているよ…','listening');try{await end();}catch{cancelRecording();tell('もう一度、話してみよう');}return;}
  stop();preparing=true;const id=++request;record.disabled=true;example.disabled=true;showNext(false);transcript.hidden=true;transcript.textContent='';permission.hidden=true;
  try{
   if(android){
    const state=await call('status');if(!alive||id!==request)return;
    if(state.permission==='denied')throw {code:'PERMISSION_BLOCKED'};
    if(!state.available)throw {code:'RECOGNITION_UNAVAILABLE'};
    if((!state.onDevice||preferSystem)&&!serviceConsent){
     serviceConsent=await askService();if(!alive||id!==request)return;
     if(!serviceConsent){tell('話してみよう','idle');return;}
    }
   }
   preparing=false;recording=true;record.disabled=false;micState(true);tell('聞いているよ','listening');
   let result;
   try{result=await recognize();}
   catch(error){
    if(!alive||id!==request)return;
    if(!android||preferSystem||error.code!=='LANGUAGE_UNAVAILABLE')throw error;
    // A device engine may exist without the lesson's language model.
    // Offer the system service explicitly; never fall back without consent.
    recording=false;preparing=true;record.disabled=true;micState(false);
    preferSystem=true;tell('端末でこの言語の音声認識を準備してね。');
    if(!serviceConsent)serviceConsent=await askService();
    if(!alive||id!==request)return;
    if(!serviceConsent)return;
    preparing=false;recording=true;record.disabled=false;micState(true);tell('聞いているよ','listening');
    result=await recognize();
   }
   if(!alive||id!==request)return;
   const heard=String(result.text||'').trim();transcript.textContent=heard?`${localize('聞き取った文：')}${heard}`:'';transcript.hidden=!heard;
   const free=page.dataset.speakingFree==='true';
   const matched=free?Boolean(heard):(matchesSpeakingTarget(heard,page.querySelector('h2').textContent)||matchesSpeakingTarget(heard,page.dataset.speakingSpoken));showNext(matched);
   tell(matched?(free?'생각을 들려줘서 고마워요':'よくできたね！'):'もう一度、話してみよう',matched?'happy':'retry');
  }catch(error){
   if(!alive||id!==request)return;
   if(['PERMISSION_DENIED','PERMISSION_BLOCKED'].includes(error.code))permissionError(error.code==='PERMISSION_BLOCKED');
   else if(error.code==='RECOGNITION_UNAVAILABLE')tell('端末の音声認識を使えないよ');
   else if(error.code==='LANGUAGE_UNAVAILABLE')tell('端末でこの言語の音声認識を準備してね。');
   else tell(error.code==='ON_DEVICE_UNAVAILABLE'?'スキップして進もう':'もう一度、話してみよう');
  }finally{if(alive&&id===request){preparing=false;recording=false;record.disabled=false;micState(false);example.disabled=false;}}
 };
 // Android cancels the mic natively on pause; its permission prompt must remain usable.
 const hidden=()=>{if(document.hidden&&!android&&(recording||preparing)){cancelRecording();tell('もう一度、話してみよう');}else if(!document.hidden)void refreshPermission();};
 page.addEventListener('click',click);document.addEventListener('visibilitychange',hidden);window.addEventListener('focus',refreshPermission);
 return()=>{alive=false;request++;closeConsent(false);if(supported)void Promise.resolve().then(cancel).catch(()=>{});page.removeEventListener('click',click);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('focus',refreshPermission);};
}
