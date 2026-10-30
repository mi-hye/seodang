import {t} from './i18n.js';
import { icon, esc, quotedText, phraseText } from './ui.js';
export function renderHeader(title, { backAction = 'home', backLabel = '이전 화면', backDisabled = false, backHidden = false, settingsHidden = false, titleParts } = {}) {
  const translated=t(title),numbered=translated.match(/^(\d+)\.\s+(.+)$/u);
  const heading=numbered?`<span class="header-lesson-number">${esc(numbered[1])}.</span><span class="header-lesson-name">${titleParts?phraseText(numbered[2],titleParts):quotedText(numbered[2])}</span>`:quotedText(translated);
  return `<header class="app-header">${backHidden ? '' : `<button type="button" class="app-header-back" data-action="${esc(backAction)}" aria-label="${esc(t(backLabel))}" ${backDisabled ? 'disabled' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg></button>`}<span class="app-header-title${title === '서당' ? ' app-header-brand' : ''}${numbered?' app-header-lesson':''}">${heading}</span>${settingsHidden ? '' : `<button type="button" class="app-header-settings" data-action="settings" aria-label="${t('설정 열기')}">${icon('settings')}</button>`}</header>`;
}

// Programmatic focus after a tap must not inherit Safari's keyboard focus ring.
export function installFocusModality(){
 const root=document.documentElement;
 if(root.dataset.inputModality)return;
 root.dataset.inputModality='pointer';
 document.addEventListener('pointerdown',()=>{root.dataset.inputModality='pointer';},true);
 document.addEventListener('keydown',event=>{
  if(['Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))root.dataset.inputModality='keyboard';
 },true);
}
