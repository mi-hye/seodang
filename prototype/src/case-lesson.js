import {esc} from './ui.js';
import {lessonExplanation} from './lesson-explanation.js';
// Shared learning layout for level-three conversations and check-in scenes.
export function caseLesson({image,content,meaning,words,lang,japanese=false,explanation,extra='',actions}){
 return `<main class="page case-lesson" lang="${japanese?'ja':'ko'}"><img class="case-lesson-image" src="${esc(image)}" alt=""><div class="case-lesson-content">${content}</div>${meaning?`<p class="case-lesson-meaning">${esc(meaning)}</p>`:''}${words?.length?`<section class="case-words case-lesson-words"><h2>${japanese?'文の中の単語':'문장 속 단어'}</h2><dl>${words.map(([word,meaning])=>`<div><dt lang="${lang}">${esc(word)}</dt><dd>${esc(meaning)}</dd></div>`).join('')}</dl></section>`:''}${lessonExplanation(explanation,japanese)}${extra}<div class="button-pair">${actions}</div></main>`;
}
