import {caseLesson} from './case-lesson.js';
import {lessonExplanation} from './lesson-explanation.js';
import {renderKoreanSpeaking} from './korean-speaking.js';
export {mountKoreanSpeaking as mountScenarioSpeaking} from './korean-speaking.js';
import {normalizeAudioRate} from './media.js';
import {scenarioLessons,scenarioProgress,scenarioTitle} from './scenario-state.js';
import {scenarioContent,scenarioAudio} from './scenario-content.js';
import {japaneseLessonUI} from './curriculum.js';
import {button,icon,esc,phraseText} from './ui.js';
import {renderTokenBuilder} from './token-builder.js';
const text=x=>phraseText(x.replaceAll('|',''),x.includes('|')?x.split('|'):x.split(/(\n|(?<=[。！？])|\s+)/));
export const currentScenarioAudio=s=>{const p=scenarioProgress(s);return p.phase==='learn'||p.phase==='speak'||p.phase==='quiz'&&Number(s.scenarioActive)>=4?scenarioAudio(s.courseDirection,s.scenarioActive,p.index):null;};
export const scenarioIntroAudio=s=>s.scenarioActive==='2'&&scenarioProgress(s).phase==='intro'?[0,1,2].map(i=>scenarioAudio(s.courseDirection,'2',i)):null;
export function renderScenario(s,top){
 const l=scenarioLessons.find(l=>l.id===s.scenarioActive),p=scenarioProgress(s),c=scenarioContent[s.courseDirection][l.id],x=c.items[p.index],jp=japaneseLessonUI(s),lang=s.courseDirection==='ja-ko'?'ko':'ja';
 if(p.phase==='speak')return renderKoreanSpeaking(title=>`${top(title)}<div class="lesson-progress" role="progressbar" aria-label="${jp?'学習の進み具合':'학습 진행률'}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round((p.index*3+2)/9*100)}"><span style="width:${(p.index*3+2)/9*100}%"></span></div>`,x.text,lang==='ja'?'ja-JP':'ko-KR','',x.phrases,{audioAction:'scenario-audio',previousAction:'scenario-previous'});
 const title=scenarioTitle(s,l),label=(ko,ja)=>jp?ja:ko;
 const audio=button(icon('sound'),'scenario-audio','icon-button',`aria-label="${label('다시 듣기','もう一度聞く')}"`);
 const pause=Number(l.id)>=4?button(icon('pause'),'passage-pause','icon-button',`data-passage-pause data-pause-label="${label('일시정지','一時停止')}" data-resume-label="${label('이어서 재생','続きから再生')}" aria-label="${label('일시정지','一時停止')}" disabled`):'';
 const rate=normalizeAudioRate(s.settings?.audioRate),rateLabel=`${rate===1?label('일반','標準')+' ':''}${rate.toFixed(1)}×`;
 const speed=Number(l.id)>=4?`<label class="passage-speed"><span>${label('재생 속도','再生速度')} <output data-audio-rate-label data-normal-label="${label('일반','標準')}">${rateLabel}</output></span><input type="range" data-audio-rate min="0.5" max="2" step="0.1" value="${rate}" aria-label="${label('재생 속도','再生速度')}" aria-valuetext="${rateLabel}"></label>`:'';
 const article=`<div class="audio-text-row"><div lang="${lang}" class="scenario-text"><p>${x.phrases?phraseText(x.text,x.phrases):text(x.text)}</p></div><div class="scenario-audio-buttons">${audio}${pause}</div></div>${speed}`;
 let body;
 if(p.phase==='intro')body=`<h1>${esc(title)}</h1><p>${text(c.scene)}</p>${l.id==='2'?`<div class="audio-text-row"><p>${label('배울 문장을 들어요','これから学ぶ文を聞く')}</p>${audio}</div>`:''}${button(label('학습 시작하기','学習を始める'),'scenario-next')}`;
 else if(p.phase==='learn')body=`${article}${x.meaning?`<p class="scenario-meaning">${esc(x.meaning).replaceAll('\n','<br>')}</p>`:''}${x.words.length?`<section class="scenario-words"><h2>${label('문장 속 단어','文の中の単語')}</h2><dl>${x.words.map(([w,m])=>`<div><dt lang="${lang}">${esc(w)}</dt><dd>${esc(m)}</dd></div>`).join('')}</dl></section>`:''}${lessonExplanation(x.hint,jp)}${s.courseDirection==='ko-ja'&&Number(l.id)>=3?button(label('한자 뜻과 쓰기','漢字の意味と書き方'),'lesson-kanji','secondary',`data-id="scenario:${l.id}:${p.index}"`):''}<div class="button-pair">${button(label('이전','戻る'),'scenario-previous','secondary')}${button(label('연습하기','練習する'),'scenario-next')}</div>`;
 else {
  const options=[...x.others];options.splice(p.index,0,x.answer);
  body=`${Number(l.id)>=4?article:''}<h1>${text(x.prompt)}</h1>${x.parts?renderTokenBuilder({tokens:x.parts,selected:p.tokens,order:[2,0,1],locked:p.checked,lang,empty:label('말을 순서대로 눌러 주세요.','言葉を順番に押してください。'),choiceAttributes:i=>`data-action="scenario-token" data-id="${i}"`,selectedAttributes:i=>`data-action="scenario-token" data-id="${i}"`}):`<div class="scenario-choices">${options.map((o,i)=>button(text(o),'scenario-select',`secondary${p.selected===i?' selected':''}`,`data-id="${i}" lang="${lang}" aria-pressed="${p.selected===i}" ${p.checked?'disabled':''}`)).join('')}</div>`}${p.retry||p.checked?`<p role="status">${p.checked?label('맞아요.','正解です。'):label('다시 확인해 보세요.','もう一度確かめましょう。')} ${text(x.hint)}</p>`:''}<div class="button-pair">${button(label('다시 배우기','もう一度学ぶ'),'scenario-previous','secondary')}${p.checked?button(p.index===2&&l.id!=='2'?label('학습 마치기','学習を終える'):label('다음','次へ'),'scenario-next'):button(label('확인','確認'),'scenario-check','primary',(x.parts?p.tokens.length!==3:p.selected===null)?'disabled':'')}</div>`;
 }
 const ratio=p.phase==='done'?100:Math.round((p.index*(l.id==='2'?3:2)+(p.phase==='quiz'?1:0))/(l.id==='2'?9:6)*100);
 if(l.id==='3'&&p.phase==='learn')return `${top(`${l.number[s.courseDirection]}. ${title}`)}<div class="${['2','3'].includes(l.id)?'lesson-progress':'scenario-progress'}" role="progressbar" aria-label="${label('학습 진행률','学習の進み具合')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${ratio}"><span style="width:${ratio}%"></span></div>${caseLesson({index:p.index,count:l.count,image:c.image,content:article,meaning:x.meaning,words:x.words,lang,japanese:jp,explanation:x.hint,extra:s.courseDirection==='ko-ja'?button('한자 뜻과 쓰기','lesson-kanji','secondary',`data-id="scenario:${l.id}:${p.index}"`):'',actions:button(label('이전','戻る'),'scenario-previous','secondary')+button(label('연습하기','練習する'),'scenario-next')})}`;
 return `${top(`${l.number[s.courseDirection]}. ${title}`)}<div class="${['2','3'].includes(l.id)?'lesson-progress':'scenario-progress'}" role="progressbar" aria-label="${label('학습 진행률','学習の進み具合')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${ratio}"><span style="width:${ratio}%"></span></div><main class="page scenario-page ${p.phase==='quiz'?'scenario-quiz':''} ${c.image&&p.phase!=='done'?'scenario-illustrated':''}" lang="${jp?'ja':'ko'}">${['learn','quiz'].includes(p.phase)?`<div class="scenario-count">${p.index+1} / 3</div>`:''}${c.image&&p.phase!=='done'?`<img class="scenario-image" src="${c.image}" alt="">`:''}${body}</main>`;
}
