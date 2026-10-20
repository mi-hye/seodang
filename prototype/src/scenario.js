import {renderReplyRepair} from './scenario-repair.js';
import {renderListeningIntent} from './scenario-intent.js';
import {renderMessageBuilder} from './scenario-message.js';
import {renderRoleplay} from './scenario-roleplay.js';
import {lessonNumberWithVideo} from './video-lesson-state.js';
import {readingPassage,readingOptions} from './reading-layout.js';
import {caseLesson} from './case-lesson.js';
import {lessonExplanation} from './lesson-explanation.js';
import {renderKoreanSpeaking} from './korean-speaking.js';
export {mountKoreanSpeaking as mountScenarioSpeaking} from './korean-speaking.js';
import {normalizeAudioRate} from './media.js';
import {scenarioLessons,scenarioProgress,scenarioTitle,scenarioHasSpeaking} from './scenario-state.js';
import {scenarioContent,scenarioAudio,scenarioRoleAudio} from './scenario-content.js';
import {japaneseLessonUI} from './curriculum.js';
import {button,icon,esc,phraseText,quotedText} from './ui.js';
import {renderTokenBuilder} from './token-builder.js';
const text=x=>phraseText(x.replaceAll('|',''),x.includes('|')?x.split('|'):x.split(/(\n|(?<=[。！？])|\s+)/));
export const currentScenarioAudio=(s,part='prompt')=>{const p=scenarioProgress(s);if(s.scenarioActive==='10')return p.phase==='quiz'?scenarioAudio(s.courseDirection,'10',p.index):null;if(['9','11'].includes(s.scenarioActive))return p.phase==='quiz'?scenarioAudio(s.courseDirection,s.scenarioActive,p.index,p.checked&&part==='answer'):null;if(s.scenarioActive==='8')return p.phase==='quiz'?scenarioRoleAudio(s.courseDirection,p.index,p.checked&&['answer','reply'].includes(part)?part:'prompt'):null;return p.phase==='learn'||p.phase==='speak'||p.phase==='quiz'&&['4','5'].includes(s.scenarioActive)?scenarioAudio(s.courseDirection,s.scenarioActive,p.index,p.phase==='speak'):null;};
export const scenarioIntroAudio=s=>s.scenarioActive==='2'&&scenarioProgress(s).phase==='intro'?[0,1,2].map(i=>scenarioAudio(s.courseDirection,'2',i)):null;
export function renderScenario(s,top){
 const l=scenarioLessons.find(l=>l.id===s.scenarioActive),p=scenarioProgress(s),c=scenarioContent[s.courseDirection][l.id],x=c.items[p.index],jp=japaneseLessonUI(s),lang=s.courseDirection==='ja-ko'?'ko':'ja';
 if(c.mode==='reply-repair')return renderReplyRepair(s,top,l,c);
 if(c.mode==='listening-intent')return renderListeningIntent(s,top,l,c);
 if(c.mode==='message-builder')return renderMessageBuilder(s,top,l,c);
 if(c.mode==='roleplay')return renderRoleplay(s,top,l,c);
 if(p.phase==='speak')return renderKoreanSpeaking(title=>`${top(x.speaking?`${lessonNumberWithVideo(s,l.number[s.courseDirection])}. ${scenarioTitle(s,l)}`:title)}<div class="lesson-progress" role="progressbar" aria-label="${jp?'学習の進み具合':'학습 진행률'}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round((p.index*3+2)/9*100)}"><span style="width:${(p.index*3+2)/9*100}%"></span></div>`,x.speaking?x.answer:x.text,lang==='ja'?'ja-JP':'ko-KR','',x.speaking?x.speaking?.phrases:x.phrases,{prompt:x.speaking?x.prompt:undefined,audioAction:'scenario-audio',previousAction:'scenario-previous'});
 const title=scenarioTitle(s,l),label=(ko,ja)=>jp?ja:ko;
 if(l.id==='4'){
  const heading=top(`${lessonNumberWithVideo(s,l.number[s.courseDirection])}. ${title}`),ratio=p.phase==='intro'?0:Math.round((p.index*2+(p.phase==='quiz'?1:0))/6*100);
  const progress=`<div class="lesson-progress" role="progressbar" aria-label="${label('학습 진행률','学習の進み具合')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${ratio}"><span style="width:${ratio}%"></span></div>`;
  const passage=readingPassage(s,{content:`<p>${x.phrases?phraseText(x.text,x.phrases):text(x.text)}</p>`,lang,action:'scenario-audio',japanese:jp});
  const options=[...x.others];options.splice(p.index,0,x.answer);
  let content;
  if(p.phase==='intro')content=`<h1>${esc(title)}</h1><p class="reading-intro">${text(c.scene)}</p>${button(label('필요한 문장 읽기','必要な文を読む'),'scenario-next')}`;
  else if(p.phase==='learn')content=`${jp?`<div class="reading-count">${p.index+1} / ${l.count}</div>`:''}${passage}<section class="case-words"><h2>${label('문장 속 단어','文の中の単語')}</h2>${jp?`<dl>${x.words.map(([w,m])=>`<div><dt lang="ko">${esc(w)}</dt><dd lang="ja">${esc(m)}</dd></div>`).join('')}</dl>`:`<p>${x.words.map(([w,m])=>`${esc(w)} ${esc(m)}`).join(' · ')}</p>`}</section>${lessonExplanation(x.hint,jp)}${s.courseDirection==='ko-ja'?button('한자 뜻과 쓰기','lesson-kanji','secondary',`data-id="scenario:${l.id}:${p.index}"`):''}${jp?`<div class="button-pair">${button('戻る','scenario-previous','secondary')}${button('場面で使う','scenario-next')}</div>`:button('사건 해결하기','scenario-next')}`;
  else content=`<div class="reading-count">${p.index+1} / ${l.count}</div>${passage}<h2 class="reading-question">${text(x.prompt)}</h2>${readingOptions({options:options.map(text),selected:p.selected,action:'scenario-select',lang,japanese:jp,disabled:p.checked})}${p.retry||p.checked?`<p class="reading-feedback scenario-feedback" lang="${jp?'ja':'ko'}" role="status">${quotedText(x.hint)}</p>`:''}<div class="button-pair">${button(label('이전','戻る'),'scenario-previous','secondary')}${p.checked?button(p.index===2?label('학습 마치기','学習を終える'):label('다음','次へ'),'scenario-next'):button(label('확인','確認'),'scenario-check','primary',p.selected===null?'disabled':'')}</div>`;
  return `${heading}${progress}<main class="page reading-page" lang="${jp?'ja':'ko'}">${content}</main>`;
 }
 const audio=button(icon('sound'),'scenario-audio','icon-button',`aria-label="${label('다시 듣기','もう一度聞く')}"`);
 const pause=['4','5'].includes(l.id)?button(icon('pause'),'passage-pause','icon-button',`data-passage-pause data-pause-label="${label('일시정지','一時停止')}" data-resume-label="${label('이어서 재생','続きから再生')}" aria-label="${label('일시정지','一時停止')}" disabled`):'';
 const rate=normalizeAudioRate(s.settings?.audioRate),rateLabel=`${rate===1?label('일반','標準')+' ':''}${rate.toFixed(1)}×`;
 const speed=['4','5'].includes(l.id)?`<label class="passage-speed"><span>${label('재생 속도','再生速度')} <output data-audio-rate-label data-normal-label="${label('일반','標準')}">${rateLabel}</output></span><input type="range" data-audio-rate min="0.5" max="2" step="0.1" value="${rate}" aria-label="${label('재생 속도','再生速度')}" aria-valuetext="${rateLabel}"></label>`:'';
 const article=`<div class="audio-text-row"><div lang="${lang}" class="scenario-text"><p>${x.phrases?phraseText(x.text,x.phrases):text(x.text)}</p></div><div class="scenario-audio-buttons">${audio}${pause}</div></div>${speed}`;
 let body;
 if(p.phase==='intro')body=`<h1>${esc(title)}</h1><p>${text(c.scene)}</p>${l.id==='2'?`<div class="audio-text-row"><p>${label('배울 문장을 들어요','これから学ぶ文を聞く')}</p>${audio}</div>`:''}${button(label('학습 시작하기','学習を始める'),'scenario-next')}`;
 else if(p.phase==='learn')body=`${article}${x.meaning?`<p class="scenario-meaning">${esc(x.meaning).replaceAll('\n','<br>')}</p>`:''}${x.words.length?`<section class="scenario-words"><h2>${label('문장 속 단어','文の中の単語')}</h2><dl>${x.words.map(([w,m])=>`<div><dt lang="${lang}">${esc(w)}</dt><dd>${esc(m)}</dd></div>`).join('')}</dl></section>`:''}${lessonExplanation(x.hint,jp)}${s.courseDirection==='ko-ja'&&['3','4','5'].includes(l.id)?button(label('한자 뜻과 쓰기','漢字の意味と書き方'),'lesson-kanji','secondary',`data-id="scenario:${l.id}:${p.index}"`):''}<div class="button-pair">${button(label('이전','戻る'),'scenario-previous','secondary')}${button(label('연습하기','練習する'),'scenario-next')}</div>`;
 else {
  const options=[...x.others];options.splice(p.index,0,x.answer);
  body=`${['4','5'].includes(l.id)?article:''}<h1>${text(x.prompt)}</h1>${x.parts?renderTokenBuilder({tokens:x.parts,selected:p.tokens,order:[2,0,1],locked:p.checked,lang,empty:label('말을 순서대로 눌러 주세요.','言葉を順番に押してください。'),choiceAttributes:i=>`data-action="scenario-token" data-id="${i}"`,selectedAttributes:i=>`data-action="scenario-token" data-id="${i}"`}):`<div class="scenario-choices">${options.map((o,i)=>button(text(o),'scenario-select',`secondary${p.selected===i?' selected':''}`,`data-id="${i}" lang="${lang}" aria-pressed="${p.selected===i}" ${p.checked?'disabled':''}`)).join('')}</div>`}${p.retry||p.checked?`<p class="scenario-feedback" lang="${jp?'ja':'ko'}" role="status">${p.checked?label('맞아요.','正解です。'):label('다시 확인해 보세요.','もう一度確かめましょう。')} ${quotedText(x.hint)}</p>`:''}<div class="button-pair">${button(label('다시 배우기','もう一度学ぶ'),'scenario-previous','secondary')}${p.checked?button(p.index===2&&!scenarioHasSpeaking(l.id)?label('학습 마치기','学習を終える'):label('다음','次へ'),'scenario-next'):button(label('확인','確認'),'scenario-check','primary',(x.parts?p.tokens.length!==3:p.selected===null)?'disabled':'')}</div>`;
 }
 const ratio=p.phase==='done'?100:Math.round((p.index*(scenarioHasSpeaking(l.id)?3:2)+(p.phase==='quiz'?1:0))/(scenarioHasSpeaking(l.id)?9:6)*100);
 if(l.level===4&&p.phase==='learn')return `${top(`${lessonNumberWithVideo(s,l.number[s.courseDirection])}. ${title}`)}<div class="${['2','3','6','7'].includes(l.id)?'lesson-progress':'scenario-progress'}" role="progressbar" aria-label="${label('학습 진행률','学習の進み具合')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${ratio}"><span style="width:${ratio}%"></span></div>${caseLesson({index:p.index,count:l.count,image:c.image,content:article,meaning:x.meaning,words:x.words,lang,japanese:jp,explanation:x.hint,extra:s.courseDirection==='ko-ja'&&l.id==='3'?button('한자 뜻과 쓰기','lesson-kanji','secondary',`data-id="scenario:${l.id}:${p.index}"`):'',actions:button(label('이전','戻る'),'scenario-previous','secondary')+button(label('연습하기','練習する'),'scenario-next')})}`;
 return `${top(`${lessonNumberWithVideo(s,l.number[s.courseDirection])}. ${title}`)}<div class="${['2','3','6','7'].includes(l.id)?'lesson-progress':'scenario-progress'}" role="progressbar" aria-label="${label('학습 진행률','学習の進み具合')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${ratio}"><span style="width:${ratio}%"></span></div><main class="page scenario-page ${p.phase==='quiz'?'scenario-quiz':''} ${c.image&&p.phase!=='done'?'scenario-illustrated':''}" lang="${jp?'ja':'ko'}">${['learn','quiz'].includes(p.phase)?`<div class="scenario-count">${p.index+1} / 3</div>`:''}${c.image&&p.phase!=='done'?`<img class="scenario-image" src="${c.image}" alt="">`:''}${body}</main>`;
}
