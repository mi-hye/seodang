import {passageAudioControls} from './passage-audio.js';
import {button} from './ui.js';
export function readingPassage(state,{content,title='',lang,action,japanese=false}){
 return `<div class="passage-audio"><article class="reading-passage" lang="${lang}">${title?`<h1>${title}</h1>`:''}${content}</article>${passageAudioControls(state,action,japanese)}</div>`;
}
export function readingOptions({options,selected,action,lang,japanese=false,disabled=false,correct=null}){
 return `<div class="reading-options" role="group" aria-label="${japanese?'答え':'답 고르기'}">${options.map((content,i)=>button(content,action,`reading-option${selected===i?' selected':''}${correct===i?' correct':''}`,`data-id="${i}" lang="${lang}" aria-pressed="${selected===i}" ${disabled?'disabled':''}`)).join('')}</div>`;
}
