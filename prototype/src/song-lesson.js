import {button,esc,icon,phraseText,quotedText} from './ui.js';
import {songLesson,songProgress,nextSongStage,songStageIndex} from './song-state.js';
import {songContent} from './song-lesson-content.js';
import {renderVideoFrame,mountYouTubePlayer} from './youtube-player.js';
import {createReviewCorrectFeedback} from './review-correct-feedback.js';

export function renderSongLesson(s,top){
 const l=songLesson(s),p=songProgress(s),c=songContent[l.id],jp=l.direction==='ja-ko',ui=jp?'ja':'ko',lang=jp?'ko':'ja';
 const label=(ko,ja)=>jp?ja:ko,text=(str,parts)=>jp?esc(str):phraseText(str,parts||[str]);
 const pct=songStageIndex(l.id,p)*20;
 const header=top(`${l.number}. ${label('노래로 배우기','歌で学ぶ')}`)+`<div class="lesson-progress" role="progressbar" aria-label="${label('학습 진행률','学習の進み具合')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>`;
 const support=`<details class="video-support"><summary>${label('출처·재생 안내','出典・再生について')}</summary><p class="video-source">${esc(c.artist)} · ${esc(c.work)}<br>${esc(c.channel)}</p><p class="video-help">${label('인터넷 연결이 필요해요.','インターネット接続が必要です。')}</p><a class="video-original" href="https://www.youtube.com/watch?v=${c.videoId}&t=${c.startSeconds}s" target="_blank" rel="noopener noreferrer">${label('공식 유튜브에서 보기','公式YouTubeで見る')}</a></details>`;
 const quote=`<p class="song-target" lang="${lang}">${text(c.target,c.parts)}</p>`;
 const example=`<section class="video-example"><h2>${label('일상에서는 이렇게','日常ではこう言う')}</h2><p lang="${lang}">${text(c.example,c.exampleParts)}</p><p class="song-example-translation">${quotedText(c.exampleTranslation)}</p></section>`;
 const replay=button(label('다시 들어봐요','もう一度聞く'),'song-replay','text-button');
 const question=p.phase==='gap'?c.gap:p.phase==='apply'?c.apply:null;
 const nextPhase=nextSongStage(l.id,p);
 const nextLabel=p.resume?label('이어서 배우기','続きに戻る'):({gap:label('빈칸 채우기','穴埋めへ'),learn:label('표현 배우기','表現を学ぶ'),apply:label('일상에서는 이렇게','日常で使う'),encore:label('다시 들어봐요','もう一度'),done:label('학습 완료','学習完了')})[nextPhase];
 const nav=`<div class="button-pair">${button(label('이전','戻る'),'song-previous','secondary',p.phase==='listen'?'disabled':'')}${question&&!p.checked?button(label('확인','確認'),'song-check','primary',p.selected===null?'disabled':''):button(nextLabel,'song-next')}</div>`;
 let body='';
 if(p.phase==='listen'||p.phase==='encore')body=`<h1>${p.phase==='encore'?label('다시 들어봐요','もう一度聞く'):label('짧게 들어봐요','短く聞いてみよう')}</h1><div class="song-track"><span aria-hidden="true">${icon('music')}</span><div><strong>${esc(p.phase==='encore'?c.work:c.artist)}</strong>${p.phase==='encore'?`<p>${esc(c.artist)}</p>`:''}</div></div>${renderVideoFrame(c)}${p.phase==='encore'?quote:''}${support}${nav}`;
 else if(question){
  const verdict=p.checked||p.retry?`<div class="lesson-verdict song-feedback${p.checked?' success':''}" role="status">${p.checked?`<span class="review-correct-mark" aria-hidden="true">${icon('check')}<i></i><i></i><i></i><i></i></span>`:''}<div><p class="song-verdict">${p.checked?label('정답이에요','正解です'):label('다시 생각해 봐요','もう一度考えましょう')}</p>${p.checked&&p.phase==='apply'?`<p>${quotedText(c.apply.explanation)}</p>`:''}</div></div>`:'';
  const blank=`<div class="song-gap" lang="${lang}">${esc(c.gap.before)}<span class="song-blank${p.checked?' filled':''}">${p.selected===null?'＿＿':text(c.gap.options[p.selected])}</span>${esc(c.gap.after)}</div>`;
  body=`<h1>${p.phase==='gap'?label('들린 말을 골라요','聞こえた言葉を選ぼう'):quotedText(c.apply.question)}</h1>${p.phase==='gap'?blank:''}<div class="song-choices${p.phase==='gap'?' song-word-choices':''}" lang="${lang}">${question.options.map((option,i)=>button(text(option,question.optionParts?.[i]),'song-select',`secondary${p.selected===i?' selected':''}${p.checked&&p.selected===i?' correct':''}`,`data-id="${i}" aria-pressed="${p.selected===i}" ${p.checked?'disabled':''}`)).join('')}</div>${verdict}${p.phase==='apply'&&p.checked?example:replay}${nav}`;
 }else if(p.phase==='learn')body=`<h1>${label('가사에서 찾은 표현','歌で見つけた表現')}</h1><section class="song-expression">${quote}<p class="song-meaning">${quotedText(c.meaning)}</p></section><p>${quotedText(c.usage)}</p>${replay}${nav}`;
 return `${header}<main class="page video-lesson song-lesson song-phase-${p.phase}" lang="${ui}">${body}</main>`;
}
export function mountSongPlayer(root,s){return mountYouTubePlayer(root,songContent[s.songActive]);}
export function playSongFeedback(root,before,after){
 const a=songProgress(before),b=songProgress(after);
 if(a.phase===b.phase&&!a.checked&&b.checked){const cue=createReviewCorrectFeedback(root,after.settings,'.song-feedback');cue.play();return ()=>cue.dispose();}
}
