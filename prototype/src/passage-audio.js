import {button,icon} from './ui.js';
export function passageAudioControls(state,action,jp=false,omitPlay=false){
 return `<div class="passage-player"><div class="button-pair passage-transport${omitPlay?' passage-pause-only':''}">${omitPlay?'':button(icon('sound'),action,'secondary icon-button',`aria-label="${jp?'本文を聞く':'본문 듣기'}"`)}${button(icon('pause'),'passage-pause','secondary icon-button',`data-passage-pause data-pause-label="${jp?'一時停止':'일시정지'}" data-resume-label="${jp?'続きから再生':'이어서 재생'}" aria-label="${jp?'一時停止':'일시정지'}" disabled`)}</div></div>`;
}
