import {esc} from './ui.js';
// Keep quoted Korean expressions together inside Japanese explanations.
// Oversized expressions can still wrap at spaces within the available width.
export function feedbackText(value){
 return value.split(/(「[^」\n]*[가-힣][^」\n]*」)/).map(part=>/^「[^」\n]*[가-힣][^」\n]*」$/.test(part)?`<span class="feedback-phrase${part.length<=12?' feedback-phrase-short':''}" lang="ko">${esc(part)}</span>`:esc(part)).join('');
}
