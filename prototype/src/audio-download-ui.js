import {catalog,downloadFiles,downloadStatus,clearDownloads} from './audio-downloads.js';
import {practiceKey} from './practice-content.js';
import {japaneseLessonUI} from './curriculum.js';
import {showSheet,closeSheet} from './sheet.js';
let lessonController;
export function prefetchLesson(state,kind,notify){
 lessonController?.abort();lessonController=new AbortController();const {signal}=lessonController;
 void (async()=>{const c=await catalog(),pack=c.packs[practiceKey(state,kind)];if(!pack)return;await downloadFiles(pack.files,{signal});})().catch(e=>{if(!signal.aborted)notify(japaneseLessonUI(state)?'音声を保存できませんでした。通信環境を確認してください。':'음성을 저장하지 못했어요. 인터넷 연결을 확인해 주세요.');});
}
export function cancelLessonDownload(){lessonController?.abort();}
let styles;
export async function openAudioDownloads(state){
 styles ||= new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='src/audio-download.css';link.onload=resolve;link.onerror=()=>{styles=null;link.remove();reject(Error('Download styles unavailable'));};document.head.append(link);});
 await styles;
 const jp=japaneseLessonUI(state),focus=document.activeElement,dialog=document.createElement('dialog');dialog.className='audio-download-dialog';
 dialog.setAttribute('aria-labelledby','audio-download-title');
 dialog.innerHTML=`<h2 id="audio-download-title">${jp?'音声のダウンロード':'음성 다운로드'}</h2><p>${jp?'学習を始めると、その授業の音声を保存します。保存後はオフラインでも聞けます。':'학습을 시작하면 해당 수업의 음성을 저장해요. 저장한 음성은 오프라인에서도 들을 수 있어요.'}</p><p data-status role="status" aria-live="polite"></p><div class="button-pair"><button class="primary" data-download>${jp?'すべて保存':'전체 저장'}</button><button class="secondary" data-delete>${jp?'保存した音声を削除':'저장한 음성 삭제'}</button></div><button class="secondary" data-close>${jp?'閉じる':'닫기'}</button>`;
 document.body.append(dialog);showSheet(dialog);
 let controller,alive=true,busy=false;
 const status=dialog.querySelector('[data-status]'),download=dialog.querySelector('[data-download]'),remove=dialog.querySelector('[data-delete]');
 const refresh=async()=>{const s=await downloadStatus();if(alive)status.textContent=`${s.count}${jp?'件保存済み':'개 저장됨'} · ${(s.bytes/1048576).toFixed(1)} MB`;};
 const fail=()=>{if(alive)status.textContent=jp?'保存できませんでした。通信環境と空き容量を確認して、もう一度お試しください。':'저장하지 못했어요. 인터넷 연결과 저장 공간을 확인한 뒤 다시 눌러 주세요.';};
 dialog.addEventListener('close',()=>{alive=false;controller?.abort();dialog.remove();focus?.focus({preventScroll:true});},{once:true});
 dialog.querySelector('[data-close]').onclick=()=>closeSheet(dialog);
 download.onclick=async()=>{if(busy)return;busy=true;download.disabled=remove.disabled=true;controller=new AbortController();try{const c=await catalog();await downloadFiles(Object.keys(c.files),{signal:controller.signal,onProgress:(n,total)=>{if(alive)status.textContent=`${jp?'保存中':'저장 중'} ${n} / ${total}`;}});await refresh();}catch{if(!controller.signal.aborted)fail();}finally{busy=false;download.disabled=remove.disabled=false;}};
 remove.onclick=async()=>{if(busy)return;busy=true;download.disabled=remove.disabled=true;cancelLessonDownload();try{await clearDownloads();await refresh();}catch{fail();}finally{busy=false;download.disabled=remove.disabled=false;}};
 try{await refresh();}catch{fail();}dialog.querySelector('[data-close]').focus();
}
