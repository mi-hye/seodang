import { showSheet, closeSheet } from "./sheet.js";
import { selectedLevel } from "./kana-state.js";
import { renderHeader } from "./header.js";
import { load, save } from './storage.js';
import { reduce, freshState } from './engine.js';
const form = document.querySelector('form');
const feedback = document.querySelector('#feedback');
const nextButton = document.querySelector('.primary');
const headerRoot = document.querySelector('#setup-header');
function updateHeader() {
  headerRoot.innerHTML = renderHeader(step === 1 ? '언어 선택' : step === 2 ? '난이도 선택' : '학습 안내', { backAction: 'previous', backDisabled: step === 1, settingsHidden: true });
}
let storage, record, step = 1, disposeGuide, guideRequest = 0;
let guideStyles, guideAssets, guidePending=false;
try { storage = window.localStorage; record = load(storage); }
catch { record = { blocked: true, error: '기기 저장소를 사용할 수 없어요. 저장 권한을 확인해 주세요.' }; }
if (record.state) {
  form.elements.level.value = String(selectedLevel(record.state));
}
function message(text) { feedback.textContent = text; feedback.hidden = !text; }
function activateStep(next) {
  step = next;
  updateHeader();
  for (const section of document.querySelectorAll('[data-step]')) section.hidden = Number(section.dataset.step) !== step;
  const progress = document.querySelector('.progress');
  progress.setAttribute('aria-valuenow', step);
  progress.firstElementChild.style.width = `${step / 3 * 100}%`;
  nextButton.textContent = '다음';
  nextButton.disabled = false;
  message('');
  document.querySelector('.step-content').scrollTop = 0;
  document.querySelector(`[data-step="${step}"] h1`).focus({ preventScroll: true });
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
async function showGuide() {
  if(guidePending)return;
  const request=++guideRequest;
  guidePending=true;nextButton.disabled=true;form.setAttribute('aria-busy','true');message('');
  try {
    const {mountGuide}=await loadGuideAssets();
    if(request!==guideRequest)return;
    disposeGuide?.();
    const root=document.querySelector('#onboarding-guide');
    // Mount while hidden, then reveal the fully styled, decoded first frame.
    disposeGuide=mountGuide(root,Number(form.elements.level.value),{
      reducedMotion:record.state?.settings.motion==='off',
      onChange:({last})=>{nextButton.textContent=last?'학습 홈으로':'다음';nextButton.disabled=false;document.querySelector('.step-content').scrollTop=0;},
    });
    activateStep(3);
  } catch {
    if(request===guideRequest){nextButton.disabled=false;message('안내를 불러오지 못했어요. 다음을 눌러 다시 시도해 주세요.');}
  } finally {
    if(request===guideRequest){guidePending=false;form.removeAttribute('aria-busy');}
  }
}

updateHeader();
window.addEventListener('pagehide', () => { guideRequest++;guidePending=false;form.removeAttribute('aria-busy');nextButton.disabled=false;disposeGuide?.(); });
window.addEventListener('pageshow',event=>{if(event.persisted)showStep(step);});
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
  if(guidePending)return;
  if (step === 1) { showStep(2); return; }
  if (record.blocked) { message(record.error || '기록을 읽지 못해 저장하지 않았어요. 기존 기록은 유지됩니다.'); return; }
  const level = Number(form.elements.level.value);
  if (!Number.isInteger(level) || level < 1 || level > 7) { message('난이도를 선택해주세요.'); return; }
  if (step === 2) { showStep(3); return; }
  if (step === 3 && (nextButton.disabled || disposeGuide?.next())) return;
  // Finish the guide before saving setup and returning to the learning home.
  const next = reduce(record.state, { type: 'onboard', value: level <= 2 ? 'beginner' : 'phrase' });
  next.onboardingLevel = level;
  delete next.uiGuideSeenVersion;
  const error = save(storage, next);
  if (error) { message(error); return; }
  nextButton.disabled = true;
  window.location.assign('playable.html#home');
});

if (window.location.hash === '#guide') showStep(3);
