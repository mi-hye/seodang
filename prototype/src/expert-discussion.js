import {t} from './i18n.js';
import {lessonNumberWithVideo} from './video-lesson-state.js';
import {expertProgress,expertPercent} from './expert-state.js';
import {button,esc,phraseText,icon} from './ui.js';
import {renderKoreanSpeaking} from './korean-speaking.js';
const text=(t,ja)=>ja?phraseText(t,t.match(/[^、。！？]+[、。！？]?/gu)||[t]):phraseText(t);
export function discussionAudio(d,p,locale){const line=p.phase==='perspective'?d.perspectives[p.part]:p.phase==='expression'?d.expressions[p.part]:p.phase==='speak'?d.expressions[0]:null;return line?{id:`discussion.${line.audioFile}`,text:line.text,audioFile:line.audioFile,locale,status:'ready'}:null;}
export function renderDiscussion(s,d,top){
 const p=expertProgress(s),ja=s.courseDirection==='ko-ja',lang=ja?'ja':'ko',value=expertPercent(s);
 const header=`${top(`${lessonNumberWithVideo(s,(s.expertActive??0)+1)}. ${t(d.title)}`)}<div class="lesson-progress" role="progressbar" aria-label="${t('학습 진행률')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><span style="width:${value}%"></span></div>`;
 const nav=label=>`<div class="button-pair">${button(t('이전'),'expert-previous','secondary')}${button(t(label),'expert-next')}</div>`;
 const aids=line=>`<details class="word-memory"><summary>${t(ja?'번역 · 한자 뜻 보기':'번역 보기')}</summary><div class="word-memory-body"><p lang="${ja?'ko':'ja'}">${text(line.translation,!ja)}</p>${ja?button('한자 뜻과 쓰기','lesson-kanji','secondary',`data-id="${line.kanjiKey}"`):''}</div></details>`;
 const spoken=line=>`<div class="audio-text-row"><p lang="${lang}">${text(line.text,ja)}</p>${button(icon('sound'),'expert-audio','icon-button',`aria-label="${t('예시 듣기')}"`)}</div>`;
 const scene=d.image&&['intro','perspective','expression'].includes(p.phase)?`<img class="discussion-image" src="${esc(d.image)}" alt="${esc(d.imageAlt||'')}" width="960" height="640" decoding="async">`:'';
 let body;
 if(p.phase==='intro')body=`<h1>${esc(t(d.title))}</h1><p class="reading-intro">${text(t(d.situation),!ja)}</p>${button(t('친구들의 이야기'),'expert-next')}`;
 else if(p.phase==='perspective'){const line=d.perspectives[p.part];body=`<div class="reading-count">${p.part+1} / 2</div><h1>${esc(t(line.speaker))}</h1>${spoken(line)}${aids(line)}${nav(p.part===0?'다른 친구의 이야기':'이럴 때 쓰는 표현')}`;}
 else if(p.phase==='expression'){const line=d.expressions[p.part];body=`<div class="reading-count">${p.part+1} / 2</div><h1>${t('이렇게 말해 볼까요?')}</h1><p class="discussion-pattern" lang="${lang}">${text(line.pattern,ja)}</p><p>${esc(t(line.usage))}</p>${spoken(line)}${aids(line)}${nav(p.part===0?'다른 표현':'내 생각 말하기')}`;}
 else if(p.phase==='speak')return renderKoreanSpeaking(()=>header,d.expressions[0].text,ja?'ja-JP':'ko-KR','',undefined,{freeSpeech:true,uiLocale:ja?'ko':'ja',prompt:t(d.speakingPrompt),audioAction:'expert-audio',previousAction:'expert-previous'});
 else if(p.phase==='reflection')body=`<div class="discussion-coach"><span class="speaking-dog" data-speaking-mood="happy" role="img" aria-label="${t('웃는 서당개')}"></span><h1>${t('내 생각에 이유를 더해요')}</h1><p>${esc(t(d.wrap))}</p></div><section class="expert-translation"><h2>${t('오늘 쓴 표현')}</h2>${d.expressions.map(line=>`<p lang="${lang}">${text(line.pattern,ja)}</p>`).join('')}</section>${nav('학습 마치기')}`;
 return `${header}<main class="page reading-page expert-page expert-discussion" lang="${ja?'ko':'ja'}">${scene}${body}</main>`;
}
