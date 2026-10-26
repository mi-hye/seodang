import {t,setUILanguage,loadUILanguage,translateSetup} from './i18n.js';
import { showSheet, closeSheet } from "./sheet.js";
import {installAndroidBack} from './android-back.js';
import { selectedLevel } from "./kana-state.js";
import { renderHeader, installFocusModality } from "./header.js";
installFocusModality();
import { load, save } from './storage.js';
import { reduce, freshState } from './engine.js';
const form = document.querySelector('form');
const feedback = document.querySelector('#feedback');
const nextButton = document.querySelector('.primary');
const headerRoot = document.querySelector('#setup-header');
function updateHeader() {
  headerRoot.innerHTML = renderHeader(step === 1 ? '언어 선택 / 言語選択' : step === 2 ? '난이도 선택' : '학습 안내', { backAction: 'previous', backDisabled: step === 1, settingsHidden: true });
  if(step===1)headerRoot.querySelector('.app-header-title').innerHTML='<span lang="ko">언어 선택</span> / <span lang="ja">言語選択</span>';
  document.querySelector('.progress').setAttribute('aria-label',step===1?'설정 진행 / 設定の進み具合':t('설정 진행'));
}
function updateNextLabel(){if(step===1)nextButton.innerHTML='<span lang="ko">다음</span> / <span lang="ja">次へ</span>';else nextButton.textContent=(step===3&&guideLast?(form.elements.language.value==='ko'?'はじめる':'시작하기'):t('다음'));}

let storage, record, step = 1, disposeGuide, guideRequest = 0;
let guideStyles, guideAssets, guidePending=false,guideLast=false,guideIndex=0,guideTotal=4;
try { storage = window.localStorage; record = load(storage); }
catch { record = { blocked: true, error: '기기 저장소를 사용할 수 없어요. 저장 권한을 확인해 주세요.' }; }
if (record.state) {
  document.documentElement.classList.toggle('setup-reduced-motion',record.state.settings.motion==='off');
  form.elements.level.value = String(selectedLevel(record.state));
  form.elements.language.value = record.state.courseDirection==='ja-ko'?'ko':'ja';
}
function updateProgress() {
  const current=step===3?3+guideIndex:step;
  const progress=document.querySelector('.progress');
  progress.setAttribute('aria-valuenow',current);
  progress.setAttribute('aria-valuemax',2+guideTotal);
  progress.firstElementChild.style.width=`${current/(2+guideTotal)*100}%`;
}
function focusStep() {
  document.querySelector('.step-content').scrollTop=0;
  const heading=document.querySelector(step===3?'#onboarding-guide h2':`[data-step="${step}"] h1`);
  heading?.focus({preventScroll:true});
}
function syncPending() {
  const pending=guidePending||languagePending;
  nextButton.disabled=pending;
  if(pending)form.setAttribute('aria-busy','true');else form.removeAttribute('aria-busy');
}
function message(text) { feedback.textContent = t(text); feedback.hidden = !text; }
function activateStep(next) {
  step = next;
  updateHeader();
  for (const section of document.querySelectorAll('[data-step]')) section.hidden = Number(section.dataset.step) !== step;
  updateProgress();
  updateNextLabel();
  syncPending();
  message('');
  focusStep();
}
function showStep(next) {
  if(next===3){void showGuide();return;}
  disposeGuide?.();disposeGuide=null;
  guideRequest++;guidePending=false;form.removeAttribute('aria-busy');
  activateStep(next);
  // Warm only the next onboarding step, leaving the initial screen unchanged.
  if(next===2)void loadGuideAssets().catch(()=>{});
}
function loadGuideAssets(){
  guideAssets ||= (async()=>{
    guideStyles ||= new Promise((resolve,reject)=>{
      const link=document.createElement('link');link.rel='stylesheet';link.href='src/onboarding-guide.css';
      link.onload=resolve;link.onerror=()=>{link.remove();guideStyles=null;reject(Error('Styles unavailable'));};document.head.append(link);
    });
    const [module]=await Promise.all([import('./onboarding-guide.js'),guideStyles]);
    const image=new Image();image.src=module.guideMascot;await image.decode();
    return module;
  })().catch(error=>{guideAssets=null;throw error;});
  return guideAssets;
}
async function showGuide(initialIndex=0) {
  if(guidePending)return;
  const request=++guideRequest;
  guidePending=true;syncPending();message('');
  try {
    const {mountGuide}=await loadGuideAssets();
    const level=Number(form.elements.level.value),courseDirection=form.elements.language.value==='ko'?'ja-ko':'ko-ja';
    if(request!==guideRequest)return;
    disposeGuide?.();
    const root=document.querySelector('#onboarding-guide');
    // Mount while hidden, then reveal the fully styled, decoded first frame.
    disposeGuide=mountGuide(root,level,{initialIndex,
      reducedMotion:record.state?.settings.motion==='off',
      courseDirection,
      onChange:({index,last,total})=>{
        guideIndex=index;guideLast=last;guideTotal=total;
        if(step===3){updateNextLabel();updateProgress();focusStep();}
      },
    });
    activateStep(3);
  } catch {
    if(request===guideRequest){nextButton.disabled=false;message('안내를 불러오지 못했어요. 다음을 눌러 다시 시도해 주세요.');}
  } finally {
    if(request===guideRequest){guidePending=false;syncPending();}
  }
}

let languageRequest=0,languagePending=false;
async function updateLanguage(){
  // A changed choice invalidates any guide still being prepared.
  guideRequest++;guidePending=false;
  const request=++languageRequest,direction={courseDirection:form.elements.language.value==='ko'?'ja-ko':'ko-ja',onboardingLevel:0};languagePending=true;syncPending();try{await loadUILanguage(direction);if(request!==languageRequest)return;setUILanguage(direction);translateSetup();updateHeader();updateNextLabel();}catch{message('読み込めませんでした。言語を選び直してください。');}finally{if(request===languageRequest){languagePending=false;syncPending();}}}
form.elements.language.forEach(input=>input.addEventListener('change',updateLanguage));
form.elements.level.forEach(input=>input.addEventListener('change',updateLanguage));
const languageReady=updateLanguage();
window.addEventListener('pagehide', () => { guideRequest++;guidePending=false;form.removeAttribute('aria-busy');nextButton.disabled=false;disposeGuide?.(); });
window.addEventListener('pageshow',event=>{if(event.persisted){if(step===3)void showGuide(guideIndex);else showStep(step);}});
const settingsDialog = document.querySelector('.setup-settings');
headerRoot.addEventListener('click', async event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'previous' && step > 1) {
    if (step === 3 && disposeGuide?.previous()) return;
    showStep(step - 1);
  }
  if (action === 'settings') {
    try {
      const { renderPanel } = await import('./panels.js');
      settingsDialog.innerHTML = renderPanel('settings', record.state || freshState());
      showSheet(settingsDialog);
    } catch { message('설정을 불러오지 못했어요. 다시 눌러 주세요.'); }
  }
});
settingsDialog.addEventListener('click', async event => {
  if (event.target.closest('[data-action="voice-help"]')) {
    try {
      const { checkJapaneseVoice } = await import('./media.js');
      const result = await checkJapaneseVoice(true);
      if (result.highQuality === null) { closeSheet(settingsDialog); message('기기 TTS 설정에서 음성을 확인해 주세요.'); }
    } catch { closeSheet(settingsDialog); message('음성 정보를 확인하지 못했어요.'); }
    return;
  }
  if (event.target === settingsDialog) {
    const rect = settingsDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeSheet(settingsDialog);
  }
});
settingsDialog.addEventListener('change', event => {
  const el = event.target;
  const key = el.dataset.setting;
  if (!key) return;
  if (record.blocked) { message(record.error || '설정을 저장할 수 없어요.'); closeSheet(settingsDialog); return; }
  const value = el.type === 'checkbox' ? el.checked : key === 'textScale' ? Number(el.value) : el.value;
  const next = reduce(record.state, { type: 'setting', key, value });
  const error = save(storage, next);
  if (error) { message(error); closeSheet(settingsDialog); } else record.state = next;
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if(guidePending||languagePending)return;
  if (step === 1) { showStep(2); return; }
  if (record.blocked) { message(record.error || '기록을 읽지 못해 저장하지 않았어요. 기존 기록은 유지됩니다.'); return; }
  const level = Number(form.elements.level.value);
  if (!Number.isInteger(level) || level < 0 || level > 7) { message('난이도를 선택해 주세요.'); return; }
  if (step === 2) { showStep(3); return; }
  if (step === 3 && (nextButton.disabled || !disposeGuide || disposeGuide.next() || !guideLast)) return;
  // Finish the guide before saving setup and returning to the learning home.
  const directed=reduce(record.state,{type:'course',value:form.elements.language.value==='ko'?'ja-ko':'ko-ja'});
  const next = reduce(directed, { type: 'onboard', value: level <= 2 ? 'beginner' : 'phrase' });
  next.onboardingLevel = level;
  next.levelGuideSeen={...next.levelGuideSeen,[`${next.courseDirection}:${level}`]:1};
  if(next.courseDirection==='ja-ko')next.koreanGuideSeenVersion=1;
  delete next.uiGuideSeenVersion;
  const error = save(storage, next);
  if (error) { message(error); return; }
  nextButton.disabled = true;
  window.location.assign('playable.html#home');
});

await languageReady;
installAndroidBack(()=>{
 if(guidePending||languagePending)return true;
 if(step===1)return false;
 headerRoot.querySelector('[data-action="previous"]')?.click();return true;
});
if (window.location.hash === '#guide') showStep(3);
