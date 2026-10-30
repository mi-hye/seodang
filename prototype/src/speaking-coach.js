import {esc} from './ui.js';
export const microphone=()=>'<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>';
export const stopIcon=()=>'<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
// Visuals only: speech recognition and local recordings keep their own controllers.
export const speakingCoach=({text,lang='ja',dogLabel='ソダン犬',live=true,attribute='data-speaking-status'})=>`<div class="speaking-coach"><h1 lang="${lang}" ${live?'role="status" aria-live="polite"':''} ${attribute}>${esc(text)}</h1><span class="speaking-dog" data-speaking-mood="idle" role="img" aria-label="${esc(dogLabel)}"></span></div>`;
