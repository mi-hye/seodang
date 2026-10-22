import {t,isJapaneseUI} from './i18n.js';
import {esc} from './ui.js';
import {mountCaptionDefaults} from './youtube-captions.js';
export function usesNativeVideo(){return globalThis.Capacitor?.getPlatform?.()==='ios'&&globalThis.Capacitor?.isPluginAvailable?.('SeodangVideo');}
export function renderVideoFrame(line){
 const timed=Number.isInteger(line.startSeconds)&&Number.isInteger(line.endSeconds)&&line.endSeconds>line.startSeconds;
 const query=timed?`&start=${line.startSeconds}&end=${line.endSeconds}`:'';
 return usesNativeVideo()?`<div class="lesson-youtube video-native-player" data-native-video aria-label="${esc(line.work)}"></div>`:`<iframe class="lesson-youtube" src="https://www.youtube.com/embed/${line.videoId}?playsinline=1&autoplay=0&enablejsapi=1&cc_load_policy=0&hl=${isJapaneseUI()?'ja':'ko'}${query}" title="${esc(line.work)}" width="560" height="315" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
}
let playerSequence=0;
export function mountYouTubePlayer(root,line){
 const slot=root.querySelector('[data-native-video]');
 if(!slot||!usesNativeVideo()){const iframe=root.querySelector('iframe.lesson-youtube');return iframe?mountCaptionDefaults(iframe):undefined;}
 const token=String(++playerSequence);
 const call=(method,args={})=>globalThis.Capacitor.nativePromise('SeodangVideo',method,{token,...args});
 let disposed=false,ready=false,frame=0;
 const bounds=()=>{const r=slot.getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height,viewportWidth:innerWidth,hidden:document.hidden||Boolean(document.querySelector('dialog[open]'))};};
 const update=()=>{if(!ready||disposed)return;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(!disposed&&ready)void call('layout',bounds()).catch(()=>{});});};
 const visibility=()=>{if(!disposed&&ready)void call('layout',bounds()).catch(()=>{});};
 const resize=new ResizeObserver(update);resize.observe(slot);resize.observe(root);
 void document.fonts?.ready.then(update);
 const dialogs=new MutationObserver(update);dialogs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
 window.addEventListener('scroll',update,true);window.addEventListener('resize',update);document.addEventListener('visibilitychange',visibility);
 frame=requestAnimationFrame(()=>{if(disposed)return;void call('mount',{...bounds(),videoId:line.videoId,startSeconds:line.startSeconds??0,endSeconds:line.endSeconds??0}).then(()=>{ready=true;if(disposed)void call('remove').catch(()=>{});else update();}).catch(()=>{if(!disposed){slot.textContent=t('재생이 안 되면 공식 유튜브에서 보기');slot.setAttribute('role','status');}});});
 return ()=>{disposed=true;cancelAnimationFrame(frame);resize.disconnect();dialogs.disconnect();window.removeEventListener('scroll',update,true);window.removeEventListener('resize',update);document.removeEventListener('visibilitychange',visibility);void call('remove').catch(()=>{});};
}
