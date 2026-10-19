import {japaneseLessonUI} from './curriculum.js';
import {readingPassage,readingOptions} from './reading-layout.js';

import {lessonTitle} from './lesson-title.js';
import {readingCourses,readingScenes,readingWords6} from './reading-content.js';
import {readingProgress} from './reading-state.js';
import {selectedLevel} from './kana-state.js';
import {button, esc, phraseText} from './ui.js';
import {renderHeader} from './header.js';
const ja=text=>phraseText(text.replaceAll('|',''),text.includes('|')?text.split('|'):text.split(/(?<=[、。])/u));
let advanced;
export async function prepareReading(level){if(level===7)advanced ||= await import('./reading-advanced.js');}
export function currentReadingAudio(state){
 const level=selectedLevel(state),p=readingProgress(state,level),index=Math.floor(p.index/2);
 if(level===7)return ['learn','read'].includes(p.phase)?advanced?.advancedAudio[index]:null;
 if(![5,6].includes(level)||!['learn','read'].includes(p.phase))return null;
 return {id:`reading.${level}.${index}`,text:readingCourses[level].passages[index].paragraphs.join('').replaceAll('|',''),locale:'ja-JP',status:'ready',voiceId:'VOICEVOX Nemo 男声1',audioFile:`assets/audio/reading/reading.${level}.${index}.wav`};
}
export function renderReading(state){
 const level=selectedLevel(state),jp=japaneseLessonUI(state),course=level===7?advanced.advancedCourse:readingCourses[level],p=readingProgress(state,level);
 const text=t=>level===7?ja(t):esc(t),passage=course.passages[Math.floor(p.index/2)],q=passage.questions[p.index%2];
 const header=renderHeader(lessonTitle(state,'reading',course.title),{backLabel:jp?'ホームへ':'학습 홈으로',settingsHidden:jp});
 const spokenPassage=readingPassage(state,{title:text(passage.title),content:(passage.paragraphs||[]).map(t=>`<p>${ja(t)}</p>`).join(''),lang:'ja',action:'reading-audio',japanese:jp});
 let body;
 if(p.phase==='learn')body=`${spokenPassage}<section class="case-words"><h2>${level===7?'글 속 단어':jp?'文の中の単語':'문장 속 단어'}</h2><p lang="${level===7?'ko':jp?'ja':'ko'}">${esc(passage.words||readingWords6[Math.floor(p.index/2)]||'')}</p></section>${button(jp?'漢字の意味と書き方':'한자 뜻과 쓰기','lesson-kanji','secondary',`data-id="reading:${level}:${Math.floor(p.index/2)}"`)}${button(jp?'場面を解決する':'사건 해결하기','reading-next')}`;
 else if(p.phase==='intro')body=`<h1>${text(passage.title)}</h1><p class="reading-intro">${jp?phraseText(readingScenes[level]?.[Math.floor(p.index/2)]||course.intro,(readingScenes[level]?.[Math.floor(p.index/2)]||course.intro).match(/[^。]+。?/g)):text(readingScenes[level]?.[Math.floor(p.index/2)]||course.intro)}</p>${button(jp?'必要な文を読む':'필요한 문장 읽기','reading-next')}`;
 else body=`<div class="reading-count" aria-label="${jp?'問題':'문제'} ${p.index+1}/6">${p.index+1}/6</div>${spokenPassage}${!jp?`<p class="reading-words">${esc(passage.words||readingWords6[Math.floor(p.index/2)]||'')}</p>`:''}<h2 class="reading-question">${text(q.prompt)}</h2>${readingOptions({options:q.choices.map(ja),selected:p.selected,action:'reading-select',lang:'ja',japanese:jp})}${p.retry?`<p class="reading-feedback" role="status">${text(q.hint)}</p>`:''}<div class="button-pair">${button(jp?'戻る':'이전','reading-previous','secondary')}${button(jp?'確認':'확인','reading-check','primary',p.selected===null?'disabled':'')}</div>`;
 return `${header}<main class="page reading-page" lang="${jp?'ja':'ko'}">${body}</main>`;
}
