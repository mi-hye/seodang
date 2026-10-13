import { icon, esc } from './ui.js';
export function renderHeader(title, { backAction = 'home', backLabel = '이전 화면', backDisabled = false, backHidden = false, settingsHidden = false } = {}) {
  return `<header class="app-header">${backHidden ? '' : `<button type="button" class="app-header-back" data-action="${esc(backAction)}" aria-label="${esc(backLabel)}" ${backDisabled ? 'disabled' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg></button>`}<span class="app-header-title">${esc(title)}</span>${settingsHidden ? '' : `<button type="button" class="app-header-settings" data-action="settings" aria-label="설정 열기">${icon('settings')}</button>`}</header>`;
}
