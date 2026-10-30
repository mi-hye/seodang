import {microphone,stopIcon,speakingCoach} from './speaking-coach.js';
import {button,icon,phraseText,esc} from './ui.js';
import {showSheet,closeSheet} from './sheet.js';
let recognitionSerial=0;
export const speakingTarget='저는 학생이에요.';
const normalizeSpeech=text=>String(text||'').normalize('NFC').replace(/[\s\p{P}\p{S}]/gu,'');
export const matchesSpeakingTarget=(text,target=speakingTarget)=>Boolean(normalizeSpeech(target))&&normalizeSpeech(text)===normalizeSpeech(target);
// Only consider alternatives actually returned for this utterance. Never infer
// the expected sentence from a similarity score or a missing recognition result.
export function speakingResult(result,targets=[],free=false){
 const candidates=[result?.text,...(Array.isArray(result?.alternatives)?result.alternatives:[])]
  .filter(text=>typeof text==='string'&&text.trim()).map(text=>text.trim());
 const heard=[...new Set(candidates)].slice(0,3);
 const accepted=free?heard[0]:heard.find(text=>targets.some(target=>matchesSpeakingTarget(text,target)));
 return {text:accepted||heard[0]||'',matched:Boolean(accepted)};
}
const koCopy={'声が聞き取れなかったよ。もう一度話してみてね。':'목소리를 듣지 못했어요. 다시 말해 주세요.','マイクを準備しているよ':'마이크를 준비하고 있어요','インターネット接続を確認して、もう一度試してね。':'인터넷 연결을 확인하고 다시 눌러 주세요.','マイクを使えないよ。少し待って、もう一度試してね。':'마이크를 사용할 수 없어요. 잠시 후 다시 눌러 주세요.','音声認識を開始できなかったよ。もう一度試してね。':'음성 인식을 시작하지 못했어요. 다시 눌러 주세요.','マイクの使用を許可してね':'마이크 사용을 허용해 주세요','マイクの権限がオフになっているよ':'마이크 권한이 꺼져 있어요','設定で「権限」→「マイク」を許可してね。':'설정에서 권한 → 마이크를 허용해 주세요.','設定を開く':'설정 열기','端末の音声認識を使いますか？':'기기의 음성 인식을 사용할까요?','音声が音声認識サービス提供元のサーバーに送信される場合があります。ソダンは録音や認識した文を保存しません。':'음성 인식 서비스 제공업체의 서버로 음성이 전송될 수 있어요. 서당은 녹음이나 인식한 문장을 저장하지 않아요.','あとで':'나중에','使う':'사용하기','端末の音声認識を使えないよ':'기기의 음성 인식을 사용할 수 없어요','端末でこの言語の音声認識を準備してね。':'기기에서 해당 언어의 음성 인식을 준비해 주세요.','設定→アプリ→ソダン→権限でマイクを許可してね。':'설정 → 앱 → 서당 → 권한에서 마이크를 허용해 주세요.','話してみよう':'말해 봐요','話す':'말하기','お手本を聞く':'예시 듣기','戻る':'이전','スキップ':'건너뛰기','次へ':'다음','録音を終える':'녹음 끝내기','聞いているよ':'듣고 있어요','聞いているよ…':'듣고 있어요…','もう一度、話してみよう':'다시 말해 봐요','よくできたね！':'잘했어요!','スキップして進もう':'건너뛰어도 괜찮아요','設定でマイクと音声認識を許可してね':'설정에서 마이크와 음성 인식을 허용해 주세요','聞き取った文：':'들은 문장: ','ソダン犬':'서당개','笑顔のソダン犬':'웃는 서당개','耳をすますソダン犬':'귀 기울이는 서당개','首をかしげるソダン犬':'고개를 기울이는 서당개'};
export function renderKoreanSpeaking(top,target=speakingTarget,locale='ko-KR',audioId='',parts,options={}){
 const japanese=locale==='ja-JP',koreanUI=options.uiLocale==='ko'||japanese,t=text=>koreanUI?(koCopy[text]||text):text,uiLang=koreanUI?'ko':'ja',lang=japanese?'ja':'ko';
 const audioAction=options.audioAction||(japanese?'sentence-audio':'korean-audio'),previousAction=options.previousAction||(japanese?'sentence-previous':'korean-previous');
 const coach=`${speakingCoach({text:options.prompt||t('話してみよう'),lang:uiLang,dogLabel:t('ソダン犬')})}<button class="primary speaking-microphone" type="button" data-speaking-record aria-label="${t('話す')}" aria-pressed="false">${microphone()}</button>`,targetMarkup=`<div class="audio-text-row"><h2 lang="${lang}">${phraseText(target,parts)}</h2>${button(icon('sound'),audioAction,'icon-button',`aria-label="${t('お手本を聞く')}" data-id="${esc(audioId)}" data-speaking-example`)}</div>`;
 return `${top(t('話してみよう'))}<main class="page korean-speaking speaking-page${options.extraClass?` ${esc(options.extraClass)}`:''}" data-speaking-locale="${locale}" data-speaking-ui="${uiLang}" data-speaking-free="${Boolean(options.freeSpeech)}" data-speaking-practice="${Boolean(options.practice)}" data-speaking-spoken="${esc(options.spoken||target)}">${options.targetFirst?targetMarkup+coach:coach+targetMarkup}<p data-speaking-transcript lang="${lang}" hidden></p><div data-speaking-permission hidden><p data-speaking-permission-help lang="${uiLang}"></p><button class="secondary" type="button" data-speaking-settings>${t('設定を開く')}</button></div>${options.targetFirst?options.extra||'':''}<div class="speaking-actions"><div class="button-pair speaking-navigation">${button(t('戻る'),previousAction,'text-button')}<button class="text-button" type="button" data-speaking-skip>${t('スキップ')}</button><button class="primary" type="button" data-speaking-next disabled hidden>${t('次へ')}</button></div></div>${options.targetFirst?'':options.extra||''}</main>`;
}
export function mountKoreanSpeaking(root,{stop,advance,recognize,cancel,end,onBusyChange=()=>{},blocked=()=>false}={}){
 const page=root.querySelector('.korean-speaking');if(!page)return()=>{};
 const locale=page.dataset.speakingLocale||'ko-KR',localize=text=>page.dataset.speakingUi==='ko'||locale==='ja-JP'?(koCopy[text]||text):text;
 const cap=globalThis.Capacitor,android=Boolean(cap?.isNativePlatform?.()&&cap.getPlatform?.()==='android');
 const nativeIos=Boolean(cap?.isNativePlatform?.()&&cap.getPlatform?.()==='ios');
 const supported=Boolean(recognize||cap?.isNativePlatform?.()&&['ios','android'].includes(cap.getPlatform?.()));
 const call=(method,options={})=>cap.nativePromise('SeodangRecognition',method,{locale,...options});
 const customRecognition=Boolean(recognize);
 let serviceConsent=false,preferSystem=false,consentDialog,resolveConsent,readyEvents=false,readyListener,activeAttempt='';
 recognize ||= ()=>call('recognize',{allowNetwork:serviceConsent,preferSystem,...(activeAttempt?{requestId:activeAttempt}:{})});cancel ||= ()=>call('cancel');end ||= ()=>call('finish');
 const record=page.querySelector('[data-speaking-record]'),next=page.querySelector('[data-speaking-next]'),status=page.querySelector('[data-speaking-status]'),transcript=page.querySelector('[data-speaking-transcript]'),example=page.querySelector('[data-speaking-example]');
 const permission=page.querySelector('[data-speaking-permission]'),permissionHelp=page.querySelector('[data-speaking-permission-help]'),settings=page.querySelector('[data-speaking-settings]');
 const dog=page.querySelector('[data-speaking-mood]');
 const tell=(text,mood='retry')=>{status.textContent=localize(text);dog.dataset.speakingMood=mood;dog.setAttribute('aria-label',localize(mood==='happy'?'笑顔のソダン犬':mood==='listening'?'耳をすますソダン犬':mood==='retry'?'首をかしげるソダン犬':'ソダン犬'));};
 const micState=active=>{record.innerHTML=active?stopIcon():microphone();record.setAttribute('aria-label',localize(active?'録音を終える':'話す'));record.setAttribute('aria-pressed',String(active));};
 const skip=page.querySelector('[data-speaking-skip]');
 const practice=page.dataset.speakingPractice==='true';
 const showNext=ready=>{ready=practice||ready;next.disabled=!ready;next.hidden=!ready;skip.hidden=ready;};
 if(practice)showNext(true);
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
 const releaseReadyListener=()=>{
  activeAttempt='';const listener=readyListener;readyListener=null;
  if(listener)try{void Promise.resolve(listener.remove()).catch(()=>{});}catch{}
 };
 const listen=async id=>{
  releaseReadyListener();
  const listening=()=>{preparing=false;recording=true;record.disabled=false;micState(true);tell('聞いているよ','listening');};
  if(readyEvents){
   preparing=true;recording=false;record.disabled=true;micState(false);tell('マイクを準備しているよ','idle');
   const attempt=activeAttempt=String(++recognitionSerial);
   readyListener=cap.addListener('SeodangRecognition','ready',event=>{
    if(alive&&id===request&&activeAttempt===attempt&&event?.requestId===attempt&&preparing)listening();
   });
  }else listening();
  const attempt=activeAttempt;
  try{return await recognize();}finally{if(attempt&&activeAttempt===attempt)releaseReadyListener();}
 };
 const cancelRecording=()=>{releaseReadyListener();
  const id=++request;recording=false;preparing=false;closeConsent(false);record.disabled=true;micState(false);example.disabled=false;
  if(!supported){onBusyChange(false);return;}
  onBusyChange(true);
  // Keep the optional recorder locked until the native microphone is released.
  void Promise.resolve().then(cancel).catch(()=>{}).then(()=>{if(alive&&id===request){record.disabled=blocked();onBusyChange(false);}});
 };
 const permissionError=blocked=>{
  tell(android?(blocked?'マイクの権限がオフになっているよ':'マイクの使用を許可してね'):'設定でマイクと音声認識を許可してね');
  if(android){permission.hidden=false;permissionHelp.textContent=localize('設定で「権限」→「マイク」を許可してね。');}
 };
 const refreshPermission=async()=>{
  if(!android||!alive||permission.hidden||recording||preparing)return;
  const id=request;
  try{const state=await call('status');if(alive&&id===request&&state.permission==='granted'){permission.hidden=true;tell('もう一度、話してみよう','idle');}}catch{}
 };
 if(!supported){record.disabled=true;tell(practice?'お手本を聞いて、声に出してみよう':'スキップして進もう','idle');}
 const click=async e=>{
  if(e.target.closest('[data-speaking-skip]')||e.target.closest('[data-speaking-next]')&&!next.disabled){if(advancing)return;advancing=true;cancelRecording();stop();advance();return;}
  if(e.target.closest('[data-speaking-settings]')){
   if(settings.disabled)return;cancelRecording();stop();settings.disabled=true;
   try{await call('openSettings');}catch{if(alive)permissionHelp.textContent=localize('設定→アプリ→ソダン→権限でマイクを許可してね。');}
   finally{if(alive)settings.disabled=false;}return;
  }
  if(!e.target.closest('[data-speaking-record]')||record.disabled||preparing||!recording&&blocked())return;
  if(recording){record.disabled=true;tell('聞いているよ…','listening');try{await end();}catch{cancelRecording();tell('もう一度、話してみよう');}return;}
  stop();onBusyChange(true);preparing=true;const id=++request;record.disabled=true;example.disabled=true;showNext(false);transcript.hidden=true;transcript.textContent='';permission.hidden=true;
  try{
   if(nativeIos&&!customRecognition){
    // Older installed bridges have no status method; retain their result flow.
    const state=await call('status').catch(()=>({}));if(!alive||id!==request)return;
    readyEvents=state.readyEvents===true&&typeof cap.addListener==='function';
   }
   if(android){
    const state=await call('status');if(!alive||id!==request)return;
    readyEvents=state.readyEvents===true&&!customRecognition&&typeof cap.addListener==='function';
    if(state.permission==='denied')throw {code:'PERMISSION_BLOCKED'};
    if(!state.available)throw {code:'RECOGNITION_UNAVAILABLE'};
    if((!state.onDevice||preferSystem)&&!serviceConsent){
     serviceConsent=await askService();if(!alive||id!==request)return;
     if(!serviceConsent){tell('話してみよう','idle');return;}
    }
   }
   let result;
   try{result=await listen(id);}
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
    result=await listen(id);
   }
   if(!alive||id!==request)return;
   const free=page.dataset.speakingFree==='true';
   const {text:heard,matched}=speakingResult(result,[page.querySelector('h2').textContent,page.dataset.speakingSpoken],free);
   transcript.textContent=heard?`${localize('聞き取った文：')}${heard}`:'';transcript.hidden=!heard;
   if(!heard){tell('声が聞き取れなかったよ。もう一度話してみてね。','idle');return;}
   showNext(matched);
   tell(practice?(matched?'聞き取れたよ':'お手本と聞き比べてみよう'):matched?(free?'생각을 들려줘서 고마워요':'よくできたね！'):'もう一度、話してみよう',matched?'happy':practice?'idle':'retry');
  }catch(error){
   if(!alive||id!==request)return;
   if(['PERMISSION_DENIED','PERMISSION_BLOCKED'].includes(error.code))permissionError(error.code==='PERMISSION_BLOCKED');
   else if(error.code==='RECOGNITION_UNAVAILABLE')tell('端末の音声認識を使えないよ');
   else if(error.code==='NETWORK_ERROR')tell('インターネット接続を確認して、もう一度試してね。');
   else if(['AUDIO_ERROR','BUSY'].includes(error.code))tell('マイクを使えないよ。少し待って、もう一度試してね。');
   else if(error.code==='START_FAILED')tell('音声認識を開始できなかったよ。もう一度試してね。');
   else if(error.code==='LANGUAGE_UNAVAILABLE')tell('端末でこの言語の音声認識を準備してね。');
   else tell(error.code==='ON_DEVICE_UNAVAILABLE'?(practice?'お手本を聞いて、声に出してみよう':'スキップして進もう'):'もう一度、話してみよう');
  }finally{if(alive&&id===request){preparing=false;recording=false;record.disabled=blocked();micState(false);example.disabled=false;onBusyChange(false);}}
 };
 // Android cancels the mic natively on pause; its permission prompt must remain usable.
 const hidden=()=>{if(document.hidden&&!android&&(recording||preparing&&!nativeIos)){cancelRecording();tell('もう一度、話してみよう');}else if(!document.hidden)void refreshPermission();};
 page.addEventListener('click',click);document.addEventListener('visibilitychange',hidden);window.addEventListener('focus',refreshPermission);
 return()=>{alive=false;request++;releaseReadyListener();closeConsent(false);if(supported)void Promise.resolve().then(cancel).catch(()=>{});page.removeEventListener('click',click);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('focus',refreshPermission);};
}
