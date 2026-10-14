import {lessonTitle} from './lesson-title.js';
import {readingCourses} from './reading-content.js';
import {readingProgress} from './reading-state.js';
import {selectedLevel} from './kana-state.js';
import {button,esc,phraseText,icon} from './ui.js';
import {renderHeader} from './header.js';
const ja=text=>phraseText(text.replaceAll('|',''),text.split('|'));
let advanced;
export async function prepareReading(level){if(level===7)advanced ||= await import('./reading-advanced.js');}
export function currentReadingAudio(state){if(selectedLevel(state)!==7||readingProgress(state,7).phase!=='read')return null;return advanced?.advancedAudio[Math.floor(readingProgress(state,7).index/2)];}
export function renderReading(state){
 const level=selectedLevel(state),jp=level>=6,course=level===7?advanced.advancedCourse:readingCourses[level],p=readingProgress(state,level);
 const text=t=>jp?ja(t):esc(t),passage=course.passages[Math.floor(p.index/2)],q=passage.questions[p.index%2];
 const header=renderHeader(lessonTitle(state,'reading',course.title),{backLabel:jp?'ホームへ':'학습 홈으로',settingsHidden:jp});
 let body;
 if(p.phase==='intro')body=`<h1>${text(course.title)}</h1><p class="reading-intro">${text(course.intro)}</p>${button(jp?'始める':'학습 시작하기','reading-next')}`;
 else body=`<div class="reading-count" aria-label="${jp?'問題':'문제'} ${p.index+1}/6">${p.index+1}/6</div>${level===7?`<section class="reading-listen" aria-label="音声"><h1>${text(passage.title)}</h1><div class="button-pair">${button(`聞く ${icon('sound')}`,'reading-audio','secondary')}${button('停止','reading-stop','secondary')}</div></section>`:`<article class="reading-passage"><h1>${text(passage.title)}</h1>${passage.paragraphs.map(t=>`<p lang="ja">${ja(t)}</p>`).join('')}</article>`}${!jp?`<p class="reading-words">${esc(passage.words)}</p>`:''}<h2 class="reading-question">${text(q.prompt)}</h2><div class="reading-options" role="group" aria-label="${jp?'答え':'답 고르기'}">${q.choices.map((c,i)=>button(ja(c),'reading-select',`reading-option${p.selected===i?' selected':''}`,`lang="ja" data-id="${i}" aria-pressed="${p.selected===i}"`)).join('')}</div>${p.retry?`<p class="reading-feedback" role="status">${text(q.hint)}</p>`:''}<div class="button-pair">${button(jp?'戻る':'이전',([5,7].includes(level)&&p.index===0?'home':'reading-previous'),'secondary')}${button(jp?'確認':'확인','reading-check','primary',p.selected===null?'disabled':'')}</div>`;
 return `${header}<main class="page reading-page" lang="${jp?'ja':'ko'}">${body}</main>`;
}
