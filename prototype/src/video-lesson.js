import {renderVideoScene} from './video-scene.js';
export {playVideoSceneFeedback} from './video-scene.js';
import {renderVideoDetective} from './video-detective.js';
import {quotedText} from './ui.js';
import {t,isJapaneseUI} from './i18n.js';
import {videoLesson,videoProgress} from './video-lesson-state.js';
import {videoContent} from './video-lesson-content.js';
import {button,esc,phraseText} from './ui.js';
export {usesNativeVideo,renderVideoFrame} from './youtube-player.js';
import {renderVideoFrame,mountYouTubePlayer} from './youtube-player.js';
export function mountVideoPlayer(root,s){return mountYouTubePlayer(root,videoContent[videoLesson(s).id][videoProgress(s).index]);}
export function renderVideoLesson(s,top){
 const lesson=videoLesson(s),p=videoProgress(s),ja=lesson.direction==='ko-ja',lang=ja?'ja':'ko',line=videoContent[lesson.id][p.index];
 if(lesson.mode==='scene')return renderVideoScene(s,top,renderVideoFrame);
 if(lesson.mode==='detective')return renderVideoDetective(s,top,renderVideoFrame);
 const explanationLang=line.explanationLang||'ko';
 const timed=Number.isInteger(line.startSeconds)&&Number.isInteger(line.endSeconds)&&line.startSeconds>=0&&line.endSeconds>line.startSeconds;
 const watchQuery=timed?`&t=${line.startSeconds}s`:'';
 const text=(str,parts)=>ja?phraseText(str,parts||[str]):esc(str);
 const pct=p.phase==='done'?100:Math.round((p.index*2+['watch','learn'].indexOf(p.phase))/(lesson.count*2)*100);
 const header=top(`${lesson.number}. ${t(lesson.title)}`)+`<div class="lesson-progress" role="progressbar" aria-label="${t('학습 진행률')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>`;
 const nav=(label)=>`<div class="button-pair">${button(t('이전'),'video-previous','secondary',p.phase==='watch'&&p.index===0?'disabled':'')}${button(t(label),'video-next')}</div>`;
 const quote=`<section class="video-dialogue"><blockquote lang="${lang}">${text(line.quote,line.parts)}</blockquote><details><summary>${t('번역 보기')}</summary><p lang="${ja?'ko':'ja'}">${quotedText(line.translation)}</p></details></section>`;
 let body;
 if(p.phase==='watch')body=`<h1 lang="${explanationLang}">${explanationLang==='ja'?phraseText(line.title,line.titleParts):esc(line.title)}</h1>${renderVideoFrame(line)}${quote}<details class="video-support"><summary>${t('출처·재생 안내')}</summary><p class="video-source">${esc(line.work)} · ${esc(line.channel)}</p><p class="video-help">${t('재생 버튼을 눌러 장면 속 대사를 들어 보세요. 인터넷 연결이 필요해요.')}</p><a class="video-original" href="https://www.youtube.com/watch?v=${line.videoId}${watchQuery}" target="_blank" rel="noopener noreferrer">${t('재생이 안 되면 공식 유튜브에서 보기')}</a></details>${nav('표현 배우기')}`;
 else if(p.phase==='learn')body=`<h1 lang="${explanationLang}">${explanationLang==='ja'?phraseText(line.title,line.titleParts):esc(line.title)}</h1><p class="video-label">${t('장면 속 대사')}</p>${quote}<h2 lang="${lang}">${text(line.pattern,line.patternParts)}</h2><p lang="${explanationLang}">${quotedText(line.usage)}</p><p lang="${explanationLang}">${quotedText(line.note)}</p><section class="video-example"><h2>${t('응용 예문 · 서당')}</h2><p lang="${lang}">${text(line.example,line.exampleParts)}</p><details><summary>${t('번역 보기')}</summary><p lang="${ja?'ko':'ja'}">${quotedText(line.exampleTranslation)}</p></details></section>${button(t('장면 다시 보기'),'video-replay','text-button')}${nav(p.index+1<lesson.count?'다음 장면':'학습 완료')}`;
 return `${header}<main class="page video-lesson video-phase-${p.phase}" lang="${isJapaneseUI()?'ja':'ko'}">${body}</main>`;
}
