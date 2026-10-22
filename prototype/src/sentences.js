import {lessonExplanation} from './lesson-explanation.js';
import {renderKoreanSpeaking} from './korean-speaking.js';
export {mountKoreanSpeaking as mountSentenceSpeaking} from './korean-speaking.js';
import {renderTokenBuilder} from './token-builder.js';
import {sentenceCourse} from './sentence-content.js';
import {icon, button, bag, esc, phraseText} from './ui.js';
import {sentenceCase, sentenceAudio} from './sentence-content.js';
import {sentenceProgress} from './sentence-state.js';
export function currentSentenceAudio(state) {
  const s=sentenceProgress(state),course=sentenceCourse(state),{audio:sentenceAudio,sentences}=course;
  if(course.interaction==='choice'&&s.phase==='intro')return null;
  return s.phase==='intro'?sentenceAudio.intro:(s.phase==='learn'||course.interaction==='choice'&&s.phase==='arrange')?sentenceAudio[sentences[s.index].id]:null;
}
const listen=(id,sound)=>button(icon('sound'),'sentence-audio','icon-button',`data-id="${id}" aria-label="다시 듣기" ${sound?'':'disabled'}`);
const heading=(lesson,sound)=>`<div class="sentence-heading"><h2 lang="ja">${phraseText(lesson.text,lesson.parts.flatMap(([ja],i)=>i?[" ",ja]:[ja]))}</h2>${listen(lesson.id,sound)}</div>`;
const kanjiNotes={owner:[['私','わたし','나']],location:[['窓','まど','창문']], 'not-red':[['赤い','あかい','빨갛다']]};
const kanjiHint=lesson=>`<details class="sentence-kanji"><summary>한자 표기</summary>${(kanjiNotes[lesson.id]||[]).map(([word,reading,meaning])=>`<p><ruby lang="ja">${word}<rp>（</rp><rt>${reading}</rt><rp>）</rp></ruby><span>${meaning}</span></p>`).join('')}</details>`;
const artwork=lesson=>lesson.image?`<img class="sentence-image" src="${lesson.image}" alt="${lesson.alt}" width="1536" height="1024">`:`<div class="sentence-bag" aria-label="빨간 가방">${bag('red')}</div>`;
const sceneArtwork=course=>course.image?`<img class="sentence-image sentence-scene-image" src="${esc(course.image)}" alt="${esc(course.title)}" width="960" height="640" decoding="async">`:'';
export function renderSentences(state,top) {
  const s=sentenceProgress(state),course=sentenceCourse(state),{sentences,words:sentenceWords}=course,lesson=sentences[s.index],sound=state.settings.sound;
  if(s.phase==='speak')return renderKoreanSpeaking(top,lesson.text,'ja-JP',lesson.id,lesson.parts.flatMap(([text],i)=>i&&lesson.text.includes(' ')?[' ',text]:[text]),{spoken:lesson.spoken});
  let body='';
  if(s.phase==='intro'&&!course.scene) body=`<img class="sentence-image" src="${sentenceCase.image}" alt="가방이 남겨진 카페"><div class="audio-text-row"><h1>카페에 남겨진 가방</h1>${listen('intro',sound)}</div><p>손님이 가방을 찾고 있어요. 손님의 말을 듣고 어느 가방인지 찾아주세요.</p>${button('필요한 문장 배우기','sentence-next')}`;
  if(s.phase==='intro'&&course.scene)body=`${sceneArtwork(course)}<div class="audio-text-row"><h1>${esc(course.title)}</h1>${course.interaction==='choice'?'':listen('intro',sound)}</div><p>${esc(course.scene)}</p>${course.goals?`<ul>${course.goals.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${button('필요한 문장 배우기','sentence-next')}`;
  if(s.phase==='learn') body=`${course.scene?sceneArtwork(course):artwork(lesson)}${heading(lesson,sound)}${course.interaction!=='choice'&&lesson.kanaReading?`<p class="sentence-kana-reading" lang="ja">${phraseText(lesson.kanaReading)}</p>`:''}<p class="sentence-meaning">${lesson.meaning}</p><section class="case-words"><h2>문장 속 단어</h2><dl>${sentenceWords[s.index].map(([ja,ko])=>`<div><dt lang="ja">${phraseText(ja)}</dt><dd>${esc(ko)}</dd></div>`).join('')}</dl></section>${lessonExplanation(lesson.help)}${kanjiNotes[lesson.id]?kanjiHint(lesson):''}<div class="button-pair">${button('이전','sentence-previous','secondary')}${button(course.interaction==='choice'?'상황에서 쓰기':'다음','sentence-next')}</div>`;
  if(s.phase==='arrange'&&course.interaction!=='choice') body=`<h1>${lesson.meaning}</h1>${renderTokenBuilder({tokens:lesson.parts.map(([text])=>text),selected:s.tokens,order:lesson.order,locked:s.checked,empty:'말을 순서대로 골라주세요',answerClass:'sentence-answer',choicesClass:'sentence-choices',chipClass:'sentence-chip',answerAttributes:'aria-label="내가 만든 문장"',choiceAttributes:i=>`data-action="sentence-token" data-id="${i}"`,selectedAttributes:i=>`data-action="sentence-token" data-id="${i}" aria-label="${esc(lesson.parts[i][0])} 빼기"`})}${s.checked?`<div class="sentence-confirmed">${heading(lesson,sound)}</div>`:''}<div class="sentence-actions button-pair">${button('이전','sentence-previous','secondary')}${s.checked?button('다음','sentence-next'):button('확인','sentence-check','primary',s.tokens.length!==lesson.parts.length?'disabled':'')}</div>`;
  if(s.phase==='arrange'&&course.interaction==='choice'){
    const options=[...lesson.others];options.splice(s.index%3,0,lesson.text);
    body=`<div class="audio-text-row"><h1>${esc(lesson.question)}</h1>${listen(lesson.id,sound)}</div><div class="sentence-options">${options.map((option,i)=>button(phraseText(option),'sentence-select',`sentence-option${s.selected===String(i)?' selected':''}`,`data-id="${i}" lang="ja" aria-pressed="${s.selected===String(i)}"`)).join('')}</div><div class="button-pair">${button('이전','sentence-previous','secondary')}${button('확인','sentence-check','primary',s.selected===null?'disabled':'')}</div>`;
  }
  if(s.phase==='solve'&&!course.solve) body=`<h1>문장에 맞는 가방을 골라요</h1><div class="sentence-clues">${sentences.slice(1).map(l=>heading(l,sound)).join('')}</div><div class="sentence-bags">${[['window-red','red','창문 옆'],['door-blue','blue','문 옆'],['window-blue','blue','창문 옆']].map(([id,color,place])=>button(`${bag(color)}<span>${place}</span>`,'sentence-select',`sentence-bag-choice${s.selected===id?' selected':''}`,`data-id="${id}" aria-label="${place} ${color==='red'?'빨간':'파란'} 가방" aria-pressed="${s.selected===id}"`)).join('')}</div><div class="button-pair">${button('이전','sentence-previous','secondary')}${button('확인','sentence-submit','primary',s.selected?'':'disabled')}</div>`;
  if(s.phase==='solve'&&course.solve)body=`<h1>${esc(course.solve.prompt)}</h1>${course.solve.clue?`<p lang="ja">${phraseText(course.solve.clue)}</p>`:''}<div class="sentence-options">${course.solve.options.map((option,i)=>button(phraseText(option,sentences.find(x=>x.text===option)?.parts.map(([text])=>text)),'sentence-select',`sentence-option${s.selected===String(i)?' selected':''}`,`data-id="${i}" lang="${/[가-힣]/.test(option)?'ko':'ja'}" aria-pressed="${s.selected===String(i)}"`)).join('')}</div><div class="button-pair">${button('이전','sentence-previous','secondary')}${button('확인','sentence-submit','primary',s.selected===null?'disabled':'')}</div>`;
  if(s.phase==='summary') body=`<span class="sentence-complete">${icon('check')}</span><h1>학습 완료</h1><h2>배운 문장</h2>${sentences.map(l=>`<article class="sentence-review-item">${heading(l,sound)}<p>${l.meaning}</p></article>`).join('')}<div class="button-pair">${button('홈으로','home','secondary')}${button('다시 학습하기','sentence-restart')}</div>`;
  return `${top(course.title)}<main class="reading sentence-page sentence-${s.phase}${course.interaction==='choice'?' sentence-choice-course':''}">${body}${s.feedback?`<p class="sentence-feedback lesson-verdict" role="status">${esc(s.feedback)}</p>`:''}</main>`;
}
export function renderSentenceReview(state,top,tabs) {
 const s=sentenceProgress(state),{sentences}=sentenceCourse(state);
 return `${top('배운 문장')}<main class="page sentence-page">${s.learned.length?s.learned.map(i=>`<article class="sentence-review-item">${heading(sentences[i],state.settings.sound)}<p>${sentences[i].meaning}</p></article>`).join(''):'<h1>아직 배운 문장이 없어요.</h1>'}${button(s.phase==='summary'?'다시 학습하기':s.started?'학습 이어하기':'학습 시작하기',s.phase==='summary'?'sentence-restart':'sentence')}</main>${tabs()}`;
}
export {sentenceAudio};

export function sentenceAudioEntry(state,id){return sentenceCourse(state).audio[id];}
