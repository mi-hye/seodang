import {sentenceWords} from './sentence-content.js';
import {icon, button, bag, esc, phraseText} from './ui.js';
import {sentenceCase, sentences, sentenceAudio} from './sentence-content.js';
import {sentenceProgress} from './sentence-state.js';
export function currentSentenceAudio(state) {
  const s=sentenceProgress(state);
  return s.phase==='intro'?sentenceAudio.intro:s.phase==='learn'?sentenceAudio[sentences[s.index].id]:null;
}
const listen=(id,sound)=>button(icon('sound'),'sentence-audio','icon-button',`data-id="${id}" aria-label="다시 듣기" ${sound?'':'disabled'}`);
const heading=(lesson,sound)=>`<div class="sentence-heading"><h2 lang="ja">${phraseText(lesson.text,lesson.parts.flatMap(([ja],i)=>i?[" ",ja]:[ja]))}</h2>${listen(lesson.id,sound)}</div>`;
const kanjiNotes={owner:[['私','わたし','나']],location:[['窓','まど','창문']], 'not-red':[['赤い','あかい','빨갛다']]};
const kanjiHint=lesson=>`<details class="sentence-kanji"><summary>한자 표기</summary>${kanjiNotes[lesson.id].map(([word,reading,meaning])=>`<p><ruby lang="ja">${word}<rp>（</rp><rt>${reading}</rt><rp>）</rp></ruby><span>${meaning}</span></p>`).join('')}</details>`;
const artwork=lesson=>lesson.image?`<img class="sentence-image" src="${lesson.image}" alt="${lesson.alt}" width="1536" height="1024">`:`<div class="sentence-bag" aria-label="빨간 가방">${bag('red')}</div>`;
export function renderSentences(state,top) {
  const s=sentenceProgress(state),lesson=sentences[s.index],sound=state.settings.sound;
  const progress=`<div class="sentence-step" aria-label="전체 6단계 중 ${s.index*2+(s.phase==='arrange'?2:1)}단계">${s.index*2+(s.phase==='arrange'?2:1)}/6</div>`;
  let body='';
  if(s.phase==='intro') body=`<img class="sentence-image" src="${sentenceCase.image}" alt="가방이 남겨진 카페"><div class="audio-text-row"><h1>카페에 남겨진 가방</h1>${listen('intro',sound)}</div><p>손님이 가방을 찾고 있어요. 손님의 말을 듣고 어느 가방인지 찾아주세요.</p>${button('필요한 문장 배우기','sentence-next')}`;
  if(s.phase==='learn') body=`${progress}${artwork(lesson)}${heading(lesson,sound)}<p class="sentence-meaning">${lesson.meaning}</p><section class="case-words"><h2>문장 속 단어</h2><dl>${sentenceWords[s.index].map(([ja,ko])=>`<div><dt lang="ja">${phraseText(ja)}</dt><dd>${esc(ko)}</dd></div>`).join('')}</dl></section><p class="sentence-help">${lesson.help}</p>${kanjiHint(lesson)}<div class="button-pair">${button('이전','sentence-previous','secondary')}${button('다음','sentence-next')}</div>`;
  if(s.phase==='arrange') body=`${progress}<h1>${lesson.meaning}</h1><div class="sentence-answer" aria-label="내가 만든 문장" aria-live="polite">${s.tokens.length?s.tokens.map(i=>button(phraseText(lesson.parts[i][0]),'sentence-token','sentence-chip',`lang="ja" data-id="${i}" aria-label="${esc(lesson.parts[i][0])} 빼기" ${s.checked?'disabled':''}`)).join(''):'<span>말을 순서대로 골라주세요</span>'}</div><div class="sentence-choices">${lesson.order.map(i=>button(phraseText(lesson.parts[i][0]),'sentence-token','sentence-chip',`lang="ja" data-id="${i}" ${s.tokens.includes(i)||s.checked?'disabled':''}`)).join('')}</div>${s.checked?`<div class="sentence-confirmed">${heading(lesson,sound)}</div>`:''}<div class="sentence-actions button-pair">${button('이전','sentence-previous','secondary')}${s.checked?button('다음','sentence-next'):button('확인','sentence-check','primary',s.tokens.length!==lesson.parts.length?'disabled':'')}</div>`;
  if(s.phase==='solve') body=`<h1>문장에 맞는 가방을 골라요</h1><div class="sentence-clues">${sentences.slice(1).map(l=>heading(l,sound)).join('')}</div><div class="sentence-bags">${[['window-red','red','창문 옆'],['door-blue','blue','문 옆'],['window-blue','blue','창문 옆']].map(([id,color,place])=>button(`${bag(color)}<span>${place}</span>`,'sentence-select',`sentence-bag-choice${s.selected===id?' selected':''}`,`data-id="${id}" aria-label="${place} ${color==='red'?'빨간':'파란'} 가방" aria-pressed="${s.selected===id}"`)).join('')}</div><div class="button-pair">${button('이전','sentence-previous','secondary')}${button('확인','sentence-submit','primary',s.selected?'':'disabled')}</div>`;
  if(s.phase==='summary') body=`<span class="sentence-complete">${icon('check')}</span><h1>학습 완료</h1><h2>배운 문장</h2>${sentences.map(l=>`<article class="sentence-review-item">${heading(l,sound)}<p>${l.meaning}</p></article>`).join('')}<div class="button-pair">${button('홈으로','home','secondary')}${button('다시 학습하기','sentence-restart')}</div>`;
  return `${top(sentenceCase.title)}<main class="reading sentence-page sentence-${s.phase}">${body}${s.feedback?`<p class="sentence-feedback" role="status">${esc(s.feedback)}</p>`:''}</main>`;
}
export function renderSentenceReview(state,top,tabs) {
 const s=sentenceProgress(state);
 return `${top('배운 문장')}<main class="page sentence-page">${s.learned.length?s.learned.map(i=>`<article class="sentence-review-item">${heading(sentences[i],state.settings.sound)}<p>${sentences[i].meaning}</p></article>`).join(''):'<h1>아직 배운 문장이 없어요.</h1>'}${button(s.phase==='summary'?'다시 학습하기':s.started?'학습 이어하기':'학습 시작하기',s.phase==='summary'?'sentence-restart':'sentence')}</main>${tabs()}`;
}
export {sentenceAudio};
