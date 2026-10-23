import {button,esc,icon,quotedText} from './ui.js';
import {dialogueText} from './scenario-dialogue-text.js';
import {courseDisplayParts} from './course-expansion-display.js';
import {courseChoiceParts} from './course-choice-display.js';
import {scenarioProgress,scenarioTitle} from './scenario-state.js';
import {lessonNumberWithVideo} from './video-lesson-state.js';
import {courseVoice,expandedCourseContent} from './course-expansion-content.js';
import {mountLessonCorrect} from './lesson-answer-feedback.js';

export function currentCourseAudio(s,part='prompt'){
 const p=scenarioProgress(s),c=expandedCourseContent(s.courseDirection,s.scenarioActive),x=c?.items[p.index];
 if(!x||!['learn','quiz'].includes(p.phase))return null;
 const choice=/^choice:([0-2])$/.exec(part);
 const line=choice&&p.phase==='quiz'&&!p.checked?[x.answer,...x.others][Number(choice[1])]:part==='prompt'?x.text:part==='answer'&&(p.phase==='learn'||p.checked)?x.answer:null;
 return line?courseVoice(s.courseDirection,s.scenarioActive,`${p.index}.${part}`,line):null;
}
export function renderCourseExpansion(s,top,l,c){
 const p=scenarioProgress(s),x=c.items[p.index],jp=s.courseDirection==='ja-ko',ui=jp?'ja':'ko',lang=jp?'ko':'ja',label=(ko,ja)=>jp?ja:ko;
 const heading=top(`${lessonNumberWithVideo(s,l.number[s.courseDirection])}. ${scenarioTitle(s,l)}`);
 const audio=part=>button(icon('sound'),'scenario-audio','icon-button',`data-id="${part}" aria-label="${label('다시 듣기','もう一度聞く')}"`);
 const line=(value,parts)=>dialogueText(value,lang==='ja'?courseDisplayParts(parts||courseChoiceParts(value)):parts,lang);
 const bubble=(part,self=false)=>`<article class="dialogue-bubble ${self?'dialogue-self':''}"><small>${esc(self?label(c.activity==='reading'?'정리한 내용':'나',c.activity==='reading'?'読み取ったこと':'自分'):c.partner)}</small><div class="audio-text-row"><p lang="${lang}">${line(self?x.answer:x.text,self?x.answerParts:x.phrases)}</p>${audio(part)}</div><p class="dialogue-meaning" lang="${ui}">${quotedText(self?x.answerMeaning:x.meaning)}</p></article>`;
 let body;
 if(p.phase==='intro')body=`${c.image?`<img class="scenario-image" src="${esc(c.image)}" alt="">`:''}<h1>${esc(scenarioTitle(s,l))}</h1><p class="reading-intro">${quotedText(c.scene)}</p>${button(label('학습 시작하기','学習を始める'),'scenario-next')}`;
 else if(p.phase==='learn'){
  const title=c.activity==='reading'?label('읽고 표현 익히기','読んで表現を覚える'):c.activity==='repair'?label('뜻을 분명하게 전해요','意図が伝わる言い方'):c.activity==='words'?label('단어를 읽어요','単語を読む'):label('대화 익히기','会話を覚える');
  body=`<h1>${title}</h1>${bubble('prompt')}${bubble('answer',true)}<p class="scenario-learning-note">${quotedText(x.learnNote)}</p>${x.words?.length?`<dl class="course-words">${x.words.map(([word,meaning])=>`<div><dt lang="${lang}">${line(word)}</dt><dd>${quotedText(meaning)}</dd></div>`).join('')}</dl>`:''}<div class="button-pair">${button(label('이전','戻る'),'scenario-previous','secondary')}${button(label('연습하기','練習する'),'scenario-next')}</div>`;
 }else{
  const options=x.others.map((text,i)=>({text,audio:i+1}));options.splice(l.answers[p.index],0,{text:x.answer,audio:0});
  body=`<h1>${quotedText(x.prompt)}</h1>${c.activity!=='words'?`<article class="dialogue-bubble"><small>${esc(c.partner)}</small><div class="audio-text-row"><p lang="${lang}">${line(x.text,x.phrases)}</p>${audio('prompt')}</div></article>`:''}<div class="scenario-choices">${options.map((o,i)=>button(line(o.text,o.audio===0?x.answerParts:undefined),'scenario-select',`secondary${p.selected===i?' selected':''}${p.checked&&p.selected===i?' correct':''}`,`data-id="${i}" data-choice-audio="choice:${o.audio}" lang="${lang}" aria-pressed="${p.selected===i}" ${p.checked?'disabled':''}`)).join('')}</div>${p.checked?`<div class="audio-text-row course-answer"><p>${quotedText(x.answerMeaning)}</p>${audio('answer')}</div>`:''}<p class="scenario-feedback lesson-verdict${p.checked?' success':''}" role="status" aria-live="polite" ${p.checked||p.retry?'':'hidden'}>${p.checked?label('맞아요.','正解です。')+' '+quotedText(x.hint):p.retry?label('다시 생각해 보세요.','もう一度考えてみましょう。'):''}</p><div class="button-pair">${button(label('다시 배우기','もう一度学ぶ'),'scenario-previous','secondary')}${p.checked?button(p.index===2?label('복습하기','復習する'):label('다음','次へ'),'scenario-next'):button(label('확인','確認'),'scenario-check','primary',p.selected===null?'disabled':'')}</div>`;
 }
 // The shared lesson-session bar accounts for the six later review tasks.
 return `${heading}<main class="page scenario-page course-expansion scenario-learning${p.phase==='intro'&&c.image?' scenario-illustrated':''}" lang="${ui}" data-course-activity="${esc(c.activity)}">${body}</main>`;
}
export function mountCourseCorrect(root,s){
 return mountLessonCorrect(root,s,'.scenario-feedback');
}
