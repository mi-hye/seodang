import {button,esc,icon,phraseText,quotedText} from './ui.js';
import {videoLesson,videoProgress} from './video-lesson-state.js';
import {videoContent} from './video-lesson-content.js';
import {videoSceneContent} from './video-scene-content.js';
import {createReviewCorrectFeedback} from './review-correct-feedback.js';

export function renderVideoScene(s,top,frame){
 const l=videoLesson(s),p=videoProgress(s),line=videoContent[l.id][p.index],content=Array.isArray(videoSceneContent[l.id])?videoSceneContent[l.id][p.index]:videoSceneContent[l.id];
 const jp=l.direction==='ja-ko',ui=jp?'ja':'ko',lang=jp?'ko':'ja',label=(ko,ja)=>jp?ja:ko;
 const text=(value,parts)=>jp?esc(value):phraseText(value,parts),question=content[p.phase];
 const stages=['watch','meaning','learn','use'],step=stages.indexOf(p.resume||p.phase),pct=Math.round((p.index*4+step)/(l.count*4)*100);
 // Lesson titles and translations can give away the first answer. Keep this header neutral.
 const header=top(`${l.number}. ${label('표현 배우기','表現を学ぶ')}`)+`<div class="lesson-progress" role="progressbar" aria-label="${label('학습 진행률','学習の進み具合')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>`;
 const quote=`<section class="video-dialogue video-scene-quote"><blockquote lang="${lang}">${text(line.quote,line.parts)}</blockquote></section>`;
 const support=`<details class="video-support"><summary>${label('출처·재생 안내','出典・再生について')}</summary><p class="video-source">${esc(line.work)} · ${esc(line.channel)}</p><p class="video-help">${label('재생 버튼을 눌러 장면 속 대사를 들어 보세요. 인터넷 연결이 필요해요.','再生ボタンを押して場面のセリフを聞きましょう。インターネット接続が必要です。')}</p><a class="video-original" href="https://www.youtube.com/watch?v=${line.videoId}&t=${line.startSeconds}s" target="_blank" rel="noopener noreferrer">${label('재생이 안 되면 공식 유튜브에서 보기','再生できないときは公式YouTubeで見る')}</a></details>`;
 const example=`<section class="video-example"><h2>${label('응용 예문 · 서당','応用例文・ソダン')}</h2><p lang="${lang}">${text(line.example,line.exampleParts)}</p><details><summary>${label('번역 보기','訳を見る')}</summary><p lang="${ui}">${quotedText(line.exampleTranslation)}</p></details></section>`;
 const replay=button(label('장면 다시 보기','場面をもう一度'),'video-replay','text-button');
 const nextLabel=p.phase==='watch'?(p.resume==='learn'?label('표현 배우기','表現に戻る'):p.resume?label('문제로 돌아가기','続きに戻る'):label('뜻 알아보기','意味を考える')):p.phase==='meaning'?label('표현 배우기','表現を学ぶ'):p.phase==='learn'?label('언제 쓸까요?','どんなときに使う？'):p.index+1<l.count?label('다음 장면','次の場面'):label('학습 완료','学習完了');
 const nav=`<div class="button-pair">${button(label('이전','戻る'),'video-previous','secondary',p.phase==='watch'&&(!p.index||p.resume)?'disabled':'')}${question&&!p.checked?button(label('확인','確認'),'video-check','primary',p.selected===null?'disabled':''):button(nextLabel,'video-next')}</div>`;
 let body;
 if(p.phase==='watch')body=`<h1>${label('장면 속 대사','場面のセリフ')}</h1>${frame(line)}${quote}${support}${nav}`;
 else if(question){
  const verdict=p.checked||p.retry?`<div class="lesson-verdict video-scene-feedback${p.checked?' success':''}" role="status">${p.checked?`<span class="review-correct-mark" aria-hidden="true">${icon('check')}<i></i><i></i><i></i><i></i></span>`:''}<div><p class="video-detective-verdict">${p.checked?label('정답이에요','正解です'):label('다시 생각해 봐요','もう一度考えましょう')}</p>${p.checked?`<p>${quotedText(question.explanation)}</p>`:''}</div></div>`:'';
  body=`<h1>${quotedText(question.question)}</h1>${quote}<div class="video-detective-choices video-scene-choices">${question.options.map((option,i)=>button(quotedText(option),'video-select',`secondary${p.selected===i?' selected':''}${p.checked&&p.selected===i?' correct':''}`,`data-id="${i}" aria-pressed="${p.selected===i}" ${p.checked?'disabled':''}`)).join('')}</div>${verdict}${p.phase==='use'&&p.checked?example:''}${replay}${nav}`;
 }else if(p.phase==='learn')body=`<h1>${quotedText(line.title)}</h1>${quote}<p class="video-scene-translation" lang="${ui}">${quotedText(line.translation)}</p><p lang="${ui}">${quotedText(line.usage)}</p><p lang="${ui}">${quotedText(line.note)}</p>${replay}${nav}`;
 return `${header}<main class="page video-lesson video-scene video-phase-${p.phase}" lang="${ui}">${body||''}</main>`;
}

// Called in the click handler only, after the changed view is mounted.
export function playVideoSceneFeedback(root,before,after){
 const mode=videoLesson(after)?.mode;if(!['scene','detective'].includes(mode))return;
 const a=videoProgress(before),b=videoProgress(after);
 if(a.phase===b.phase&&!a.checked&&b.checked){
  const cue=createReviewCorrectFeedback(root,after.settings,mode==='scene'?'.video-scene-feedback':'.video-detective-feedback');cue.play();return ()=>cue.dispose();
 }
}
