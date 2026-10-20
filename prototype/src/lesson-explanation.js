import {quotedText} from './ui.js';
import {memoryIcon} from './word-memory.js';
export function lessonExplanation(text,japanese=false){
 if(!text)return '';
 return `<details class="word-memory lesson-explanation"><summary>${memoryIcon}<span>${japanese?'説明を見る':'설명보기'}</span></summary><div class="word-memory-body" lang="${japanese?'ja':'ko'}"><p>${quotedText(text.replaceAll('|',''))}</p></div></details>`;
}
