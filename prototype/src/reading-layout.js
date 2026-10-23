import {passageAudioControls} from './passage-audio.js';
import {button,icon} from './ui.js';
export function readingPassage(state,{content,title='',lang,action,japanese=false,compact=false}){
 if(compact)return `<section class="passage-audio reading-document"><article class="reading-passage"><div class="audio-text-row"><h2 lang="${japanese?'ja':'ko'}">${title||(japanese?'本文を聞く':'본문 듣기')}</h2>${button(icon('sound'),action,'icon-button',`aria-label="${japanese?'本文を聞く':'본문 듣기'}"`)}</div><div lang="${lang}">${content}</div></article><details class="reading-playback"><summary>${japanese?'再生速度':'재생 속도'}</summary>${passageAudioControls(state,action,japanese,true)}</details></section>`;
 return `<div class="passage-audio"><article class="reading-passage" lang="${lang}">${title?`<h1>${title}</h1>`:''}${content}</article>${passageAudioControls(state,action,japanese)}</div>`;
}
export function readingOptions({options,selected,action,lang,japanese=false,disabled=false,correct=null}){
 return `<div class="reading-options" role="group" aria-label="${japanese?'答え':'답 고르기'}">${options.map((content,i)=>button(content,action,`reading-option${selected===i?' selected':''}${correct===i?' correct':''}`,`data-id="${i}" lang="${lang}" aria-pressed="${selected===i}" ${disabled?'disabled':''}`)).join('')}</div>`;
}
