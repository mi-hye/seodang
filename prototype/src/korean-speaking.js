import {button,icon,phraseText,esc} from './ui.js';
const microphone=()=>'<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>';
const stopIcon=()=>'<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
export const speakingTarget='저는 학생이에요.';
const normalizeSpeech=text=>String(text||'').normalize('NFC').replace(/[\s\p{P}\p{S}]/gu,'');
export const matchesSpeakingTarget=(text,target=speakingTarget)=>Boolean(normalizeSpeech(target))&&normalizeSpeech(text)===normalizeSpeech(target);
const koCopy={'話してみよう':'말해 봐요','話す':'말하기','お手本を聞く':'예시 듣기','戻る':'이전','スキップ':'건너뛰기','次へ':'다음','録音を終える':'녹음 끝내기','聞いているよ':'듣고 있어요','聞いているよ…':'듣고 있어요…','もう一度、話してみよう':'다시 말해 봐요','よくできたね！':'잘했어요!','スキップして進もう':'건너뛰어도 괜찮아요','設定でマイクと音声認識を許可してね':'설정에서 마이크와 음성 인식을 허용해 주세요','聞き取った文：':'들은 문장: ','ソダン犬':'서당개','笑顔のソダン犬':'웃는 서당개','耳をすますソダン犬':'귀 기울이는 서당개','首をかしげるソダン犬':'고개를 기울이는 서당개'};
export function renderKoreanSpeaking(top,target=speakingTarget,locale='ko-KR',audioId='',parts,options={}){
 const japanese=locale==='ja-JP',koreanUI=options.uiLocale==='ko'||japanese,t=text=>koreanUI?(koCopy[text]||text):text,uiLang=koreanUI?'ko':'ja',lang=japanese?'ja':'ko';
 const audioAction=options.audioAction||(japanese?'sentence-audio':'korean-audio'),previousAction=options.previousAction||(japanese?'sentence-previous':'korean-previous');
 return `${top(t('話してみよう'))}<main class="page korean-speaking" data-speaking-locale="${locale}" data-speaking-ui="${uiLang}" data-speaking-free="${Boolean(options.freeSpeech)}" data-speaking-spoken="${esc(options.spoken||target)}"><div class="speaking-coach"><h1 lang="${uiLang}" role="status" aria-live="polite" data-speaking-status>${esc(options.prompt||t('話してみよう'))}</h1><span class="speaking-dog" data-speaking-mood="idle" role="img" aria-label="${t('ソダン犬')}"></span></div><button class="primary speaking-microphone" type="button" data-speaking-record aria-label="${t('話す')}" aria-pressed="false">${microphone()}</button><div class="audio-text-row"><h2 lang="${lang}">${phraseText(target,parts)}</h2>${button(icon('sound'),audioAction,'icon-button',`aria-label="${t('お手本を聞く')}" data-id="${esc(audioId)}" data-speaking-example`)}</div><p data-speaking-transcript lang="${lang}" hidden></p><div class="speaking-actions"><div class="button-pair speaking-navigation">${button(t('戻る'),previousAction,'text-button')}<button class="text-button" type="button" data-speaking-skip>${t('スキップ')}</button><button class="primary" type="button" data-speaking-next disabled hidden>${t('次へ')}</button></div></div></main>`;
}
export function mountKoreanSpeaking(root,{stop,advance,recognize,cancel,end}={}){
 const page=root.querySelector('.korean-speaking');if(!page)return()=>{};
 const locale=page.dataset.speakingLocale||'ko-KR',localize=text=>page.dataset.speakingUi==='ko'||locale==='ja-JP'?(koCopy[text]||text):text;
 const cap=globalThis.Capacitor,supported=Boolean(recognize||cap?.isNativePlatform?.()&&cap.getPlatform?.()==='ios');
 const call=(method)=>cap.nativePromise('SeodangRecognition',method,{locale});
 recognize ||= ()=>call('recognize');cancel ||= ()=>call('cancel');end ||= ()=>call('finish');
 const record=page.querySelector('[data-speaking-record]'),next=page.querySelector('[data-speaking-next]'),status=page.querySelector('[data-speaking-status]'),transcript=page.querySelector('[data-speaking-transcript]'),example=page.querySelector('[data-speaking-example]');
 const dog=page.querySelector('[data-speaking-mood]');
 const tell=(text,mood='retry')=>{status.textContent=localize(text);dog.dataset.speakingMood=mood;dog.setAttribute('aria-label',localize(mood==='happy'?'笑顔のソダン犬':mood==='listening'?'耳をすますソダン犬':mood==='retry'?'首をかしげるソダン犬':'ソダン犬'));};
 const micState=active=>{record.innerHTML=active?stopIcon():microphone();record.setAttribute('aria-label',localize(active?'録音を終える':'話す'));record.setAttribute('aria-pressed',String(active));};
 const skip=page.querySelector('[data-speaking-skip]');
 const showNext=ready=>{next.disabled=!ready;next.hidden=!ready;skip.hidden=ready;};
 let alive=true,recording=false,request=0,advancing=false;
 const cancelRecording=()=>{request++;recording=false;if(supported)void Promise.resolve().then(cancel).catch(()=>{});record.disabled=!supported;micState(false);example.disabled=false;};
 if(!supported){record.disabled=true;tell('スキップして進もう','idle');}
 const click=async e=>{
  if(e.target.closest('[data-speaking-skip]')||e.target.closest('[data-speaking-next]')&&!next.disabled){if(advancing)return;advancing=true;cancelRecording();stop();advance();return;}
  if(!e.target.closest('[data-speaking-record]')||record.disabled)return;
  if(recording){record.disabled=true;tell('聞いているよ…','listening');try{await end();}catch{cancelRecording();tell('もう一度、話してみよう');}return;}
  stop();recording=true;const id=++request;example.disabled=true;showNext(false);transcript.hidden=true;transcript.textContent='';micState(true);tell('聞いているよ','listening');
  try{
   const result=await recognize();if(!alive||id!==request)return;
   const heard=String(result.text||'').trim();transcript.textContent=heard?`${localize('聞き取った文：')}${heard}`:'';transcript.hidden=!heard;
   const free=page.dataset.speakingFree==='true';
   const matched=free?Boolean(heard):(matchesSpeakingTarget(heard,page.querySelector('h2').textContent)||matchesSpeakingTarget(heard,page.dataset.speakingSpoken));showNext(matched);
   tell(matched?(free?'생각을 들려줘서 고마워요':'よくできたね！'):'もう一度、話してみよう',matched?'happy':'retry');
  }catch(error){if(!alive||id!==request)return;tell(error.code==='PERMISSION_DENIED'?'設定でマイクと音声認識を許可してね':error.code==='ON_DEVICE_UNAVAILABLE'?'スキップして進もう':'もう一度、話してみよう');}
  finally{if(alive&&id===request){recording=false;record.disabled=false;micState(false);example.disabled=false;}}
 };
 const hidden=()=>{if(document.hidden&&recording){cancelRecording();tell('もう一度、話してみよう');}};
 page.addEventListener('click',click);document.addEventListener('visibilitychange',hidden);
 return()=>{alive=false;request++;if(supported)void Promise.resolve().then(cancel).catch(()=>{});page.removeEventListener('click',click);document.removeEventListener('visibilitychange',hidden);};
}
