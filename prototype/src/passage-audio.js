import {button,icon} from './ui.js';
import {normalizeAudioRate} from './media.js';
export function passageAudioControls(state,action,jp=false){
 const rate=normalizeAudioRate(state.settings?.audioRate),value=`${rate===1?(jp?'標準':'일반')+' ':''}${rate.toFixed(1)}×`;
 return `<div class="passage-player"><div class="button-pair passage-transport">${button(icon('sound'),action,'secondary icon-button',`aria-label="${jp?'本文を聞く':'본문 듣기'}"`)}${button(icon('pause'),'passage-pause','secondary icon-button',`data-passage-pause data-pause-label="${jp?'一時停止':'일시정지'}" data-resume-label="${jp?'続きから再生':'이어서 재생'}" aria-label="${jp?'一時停止':'일시정지'}" disabled`)}</div><label class="passage-speed"><span>${jp?'再生速度':'재생 속도'} <output data-audio-rate-label data-normal-label="${jp?'標準':'일반'}">${value}</output></span><input type="range" data-audio-rate min="0.5" max="2" step="0.1" value="${rate}" aria-label="${jp?'再生速度':'재생 속도'}" aria-valuetext="${value}"></label></div>`;
}
