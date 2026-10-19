import {videoLesson,videoProgress} from './video-lesson-state.js';
import {videoContent} from './video-lesson-content.js';
import {button,esc,phraseText} from './ui.js';
import {mountCaptionDefaults} from './youtube-captions.js';
export function usesNativeVideo(){return globalThis.Capacitor?.getPlatform?.()==='ios'&&globalThis.Capacitor?.isPluginAvailable?.('SeodangVideo');}
let playerSequence=0;
export function mountVideoPlayer(root,s){
 const slot=root.querySelector('[data-native-video]');
 if(!slot||!usesNativeVideo()){const iframe=root.querySelector('iframe.lesson-youtube');return iframe?mountCaptionDefaults(iframe):undefined;}
 const line=videoContent[videoLesson(s).id][videoProgress(s).index],token=String(++playerSequence);
 const call=(method,args={})=>globalThis.Capacitor.nativePromise('SeodangVideo',method,{token,...args});
 let disposed=false,ready=false,frame=0;
 const bounds=()=>{const r=slot.getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height,viewportWidth:innerWidth,hidden:document.hidden||Boolean(document.querySelector('dialog[open]'))};};
 const update=()=>{if(!ready||disposed)return;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(!disposed&&ready)void call('layout',bounds()).catch(()=>{});});};
 const visibility=()=>{if(!disposed&&ready)void call('layout',bounds()).catch(()=>{});};
 const resize=new ResizeObserver(update);resize.observe(slot);resize.observe(root);
 void document.fonts?.ready.then(update);
 const dialogs=new MutationObserver(update);dialogs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
 window.addEventListener('scroll',update,true);window.addEventListener('resize',update);document.addEventListener('visibilitychange',visibility);
 frame=requestAnimationFrame(()=>{if(disposed)return;void call('mount',{...bounds(),videoId:line.videoId,startSeconds:line.startSeconds??0,endSeconds:line.endSeconds??0}).then(()=>{ready=true;if(disposed)void call('remove').catch(()=>{});else update();}).catch(()=>{if(!disposed){slot.textContent='재생이 안 되면 공식 유튜브에서 보기';slot.setAttribute('role','status');}});});
 return ()=>{disposed=true;cancelAnimationFrame(frame);resize.disconnect();dialogs.disconnect();window.removeEventListener('scroll',update,true);window.removeEventListener('resize',update);document.removeEventListener('visibilitychange',visibility);void call('remove').catch(()=>{});};
}
export function renderVideoLesson(s,top){
 const lesson=videoLesson(s),p=videoProgress(s),ja=lesson.direction==='ko-ja',lang=ja?'ja':'ko',line=videoContent[lesson.id][p.index];
 const explanationLang=line.explanationLang||'ko';
 const timed=Number.isInteger(line.startSeconds)&&Number.isInteger(line.endSeconds)&&line.startSeconds>=0&&line.endSeconds>line.startSeconds;
 const clipQuery=timed?`&start=${line.startSeconds}&end=${line.endSeconds}`:'';
 const watchQuery=timed?`&t=${line.startSeconds}s`:'';
 const text=(str,parts)=>ja?phraseText(str,parts||[str]):esc(str);
 const pct=p.phase==='done'?100:Math.round((p.index*2+['watch','learn'].indexOf(p.phase))/(lesson.count*2)*100);
 const header=top(`${lesson.number}. ${lesson.title}`)+`<div class="lesson-progress" role="progressbar" aria-label="학습 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>`;
 const nav=(label)=>`<div class="button-pair">${button('이전','video-previous','secondary',p.phase==='watch'&&p.index===0?'disabled':'')}${button(label,'video-next')}</div>`;
 const quote=`<section class="video-dialogue"><blockquote lang="${lang}">${text(line.quote,line.parts)}</blockquote><details><summary>번역 보기</summary><p lang="${ja?'ko':'ja'}">${esc(line.translation)}</p></details></section>`;
 let body;
 if(p.phase==='watch')body=`<h1 lang="${explanationLang}">${explanationLang==='ja'?phraseText(line.title,line.titleParts):esc(line.title)}</h1>${usesNativeVideo()?`<div class="lesson-youtube video-native-player" data-native-video aria-label="${esc(line.work)}"></div>`:`<iframe class="lesson-youtube" src="https://www.youtube.com/embed/${line.videoId}?playsinline=1&autoplay=0&enablejsapi=1&cc_load_policy=0&hl=ko${clipQuery}" title="${esc(line.work+' — '+line.quote)}" width="560" height="315" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>` }${quote}<details class="video-support"><summary>출처·재생 안내</summary><p class="video-source">${esc(line.work)} · ${esc(line.channel)}</p><p class="video-help">재생 버튼을 눌러 장면 속 대사를 들어 보세요. 인터넷 연결이 필요해요.</p><a class="video-original" href="https://www.youtube.com/watch?v=${line.videoId}${watchQuery}" target="_blank" rel="noopener noreferrer">재생이 안 되면 공식 유튜브에서 보기</a></details>${nav('표현 배우기')}`;
 else if(p.phase==='learn')body=`<h1 lang="${explanationLang}">${explanationLang==='ja'?phraseText(line.title,line.titleParts):esc(line.title)}</h1><p class="video-label">장면 속 대사</p>${quote}<h2 lang="${lang}">${text(line.pattern,line.patternParts)}</h2><p lang="${explanationLang}">${esc(line.usage)}</p><p lang="${explanationLang}">${esc(line.note)}</p><section class="video-example"><h2>응용 예문 · 서당</h2><p lang="${lang}">${text(line.example,line.exampleParts)}</p><details><summary>번역 보기</summary><p lang="${ja?'ko':'ja'}">${esc(line.exampleTranslation)}</p></details></section>${button('장면 다시 보기','video-replay','text-button')}${nav(p.index+1<lesson.count?'다음 장면':'학습 완료')}`;
 return `${header}<main class="page video-lesson video-phase-${p.phase}" lang="ko">${p.phase==='done'?'':`<p class="video-count">${p.index+1} / ${lesson.count}</p>`}${body}</main>`;
}
