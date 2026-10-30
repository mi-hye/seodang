import {renderKoreanSpeaking,mountKoreanSpeaking} from './korean-speaking.js';
import {koreanProgress} from './korean-state.js';
import {pronunciationCourseContent} from './pronunciation-course-content.js';
import {button,icon,esc,quotedText,phraseText} from './ui.js';

export function pronunciationContrastAudio(s,text){return pronunciationCourseContent[s.korean.active]?.find(x=>x.text===text)?.audio;}
const modelAudio=text=>button(icon('sound'),'korean-contrast-audio','icon-button',`data-id="${esc(text)}" aria-label="${esc(text)}の音を聞く"`);
const cueText=row=>row.cueParts.map(part=>`<span class="pronunciation-cue-part">${quotedText(part)}</span>`).join('<wbr>');
const soundForm=row=>row.sound?`<div class="pronunciation-linking"><span>↓ 聞こえる音</span><strong lang="ko">${phraseText(row.sound)}</strong></div>`:'';
const targetText=row=>{
 let offset=0;
 return row.text.split(/(\s+)/).map(part=>{
  const start=offset;offset+=part.length;if(/^\s+$/.test(part))return esc(part);
  const a=Math.max(start,row.focus.start),b=Math.min(offset,row.focus.end);
  const text=a<b?`${esc(part.slice(0,a-start))}<em>${esc(part.slice(a-start,b-start))}</em>${esc(part.slice(b-start))}`:esc(part);
  return `<span class="pronunciation-word">${text}</span>`;
 }).join('');
};
const diagramLink=row=>row.diagram?button('口の形を見る','pronunciation','text-button pronunciation-diagram-link',`data-id="${esc(row.diagram)}" data-position="initial" aria-haspopup="dialog"`):'';
export function renderPronunciationCourse(s,top){
 const id=s.korean.active,p=koreanProgress(s,id),item=pronunciationCourseContent[id][p.index],learn=p.phase==='learn';
 const nav=()=>`<div class="button-pair pronunciation-navigation">${button('戻る','korean-previous','secondary',p.index===0&&learn?'disabled':'')}${button('言ってみる','korean-next','primary')}</div>`;
 const point=row=>`<p class="pronunciation-compare-point">${cueText(row)}</p>${soundForm(row)}`;
 if(p.phase==='speak'){
  const extra=`<details class="pronunciation-note"><summary>発音・録音について</summary><p>${quotedText(item.meaning)}</p>${point(item)}${diagramLink(item)}<div data-optional-recording><button class="secondary" type="button" data-record>録音して聞き比べる</button><div class="audio-text-row pronunciation-playback" hidden><span>自分の声</span><button class="icon-button" type="button" data-record-play disabled aria-label="自分の声を聞く">${icon('sound')}</button></div><p class="pronunciation-status" data-record-status role="status"></p><p>聞き比べは任意です。この録音は端末内だけで使い、画面を離れると消えます。</p></div></details>`;
  return renderKoreanSpeaking(top,item.text,'ko-KR','',undefined,{spoken:item.spoken,extraClass:'pronunciation-speaking',practice:true,targetFirst:true,extra});
 }
 const repeat=p.index>=3;
 const guidance=`${point(item)}${diagramLink(item)}`;
 const focus=`<article class="pronunciation-compare-card pronunciation-focus" aria-labelledby="pronunciation-focus-title"><h1 id="pronunciation-focus-title">${repeat?'思い出して言ってみよう':'文で発音を覚えよう'}</h1><div class="audio-text-row pronunciation-target"><h2 lang="ko">${targetText(item)}</h2>${modelAudio(item.text)}</div><p class="pronunciation-meaning">${quotedText(item.meaning)}</p>${repeat?`<details class="pronunciation-note"><summary>発音のポイント</summary>${guidance}</details>`:guidance}</article>`;
 const comparison=repeat?`<section class="pronunciation-comparison" aria-labelledby="pronunciation-comparison-title"><h2 id="pronunciation-comparison-title">一緒に練習した文</h2><ul>${pronunciationCourseContent[id].slice(0,3).filter(r=>r.text!==item.text).map(r=>`<li><article class="pronunciation-compare-card"><div class="audio-text-row pronunciation-target"><div class="pronunciation-compare-copy"><h2 lang="ko">${targetText(r)}</h2><p class="pronunciation-compare-point">${quotedText(r.meaning)}</p></div>${modelAudio(r.text)}</div></article></li>`).join('')}</ul></section>`:'';
 return `${top('発音を練習する')}<main class="page case-lesson pronunciation-course" lang="ja" data-pronunciation-phase="learn">${focus}${comparison}${nav()}</main>`;
}

// Recognition is supportive feedback; learners can continue without a matching result.
export function mountPronunciationSpeaking(root,options={}){
 const page=root.querySelector('.pronunciation-speaking');if(!page)return()=>{};
 let optional;
 const disposeSpeaking=mountKoreanSpeaking(root,{...options,onBusyChange:busy=>optional?.recognitionBusy(busy),blocked:()=>optional?.blocked()||false});
 optional=mountOptionalRecording(page,options.stop||(()=>{}));
 return()=>{optional.dispose();disposeSpeaking();};
}
function mountOptionalRecording(page,stop){
 const record=page.querySelector('[data-record]'),play=page.querySelector('[data-record-play]'),status=page.querySelector('[data-record-status]'),main=page.querySelector('[data-speaking-record]');
 const supported=!main.disabled,details=page.querySelector('.pronunciation-note'),diagram=page.querySelector('.pronunciation-diagram-link');
 let alive=true,busy=false,pending=0,stream,recorder,timer,finishTimer,url,player,generation=0,started=0;
 const tell=text=>{if(alive)status.textContent=text;};
 const stopPlayback=()=>{player?.pause();player=null;};
 const release=()=>{if(url){URL.revokeObjectURL(url);url=null;}play.disabled=true;play.closest('.pronunciation-playback').hidden=true;};
 const closeMic=()=>{clearTimeout(timer);clearTimeout(finishTimer);stream?.getTracks().forEach(t=>t.stop());stream=null;};
 const controls=()=>{if(diagram)diagram.disabled=busy;record.textContent=recorder?'録音を止める':url?'録り直す':'録音して聞き比べる';record.setAttribute('aria-pressed',String(Boolean(recorder)));record.disabled=busy||pending>0;if(!busy)main.disabled=!supported||pending>0||Boolean(recorder);play.disabled=busy||pending>0||Boolean(recorder)||!url;};
 const cancelRecording=()=>{generation++;try{if(recorder?.state==='recording')recorder.stop();}catch{}recorder=null;closeMic();controls();};
 const cancel=()=>{cancelRecording();stopPlayback();tell('');};
 const finish=()=>{if(recorder?.state==='recording'){record.disabled=true;const request=generation;finishTimer=setTimeout(()=>{if(alive&&request===generation){cancelRecording();tell('録音を終了できなかったよ。もう一度試してみよう。');}},1500);try{recorder.stop();}catch{cancelRecording();tell('録音できなかったよ。もう一度試してみよう。');}}};
 const start=async()=>{
  if(busy||pending)return;if(recorder){finish();return;}
  if(!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder){tell('この端末では聞き比べ用の録音を使えないよ。');return;}
  const request=++generation;pending++;stop();stopPlayback();release();controls();tell('マイクを準備しています。');
  try{
   const acquired=await navigator.mediaDevices.getUserMedia({audio:true});
   if(!alive||request!==generation){acquired.getTracks().forEach(t=>t.stop());return;}
   stream=acquired;const chunks=[],activeRecorder=new MediaRecorder(stream);recorder=activeRecorder;
   activeRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   activeRecorder.onerror=()=>{if(alive&&request===generation){cancelRecording();tell('録音できなかったよ。もう一度試してみよう。');}};
   activeRecorder.onstop=()=>{
    if(!alive||request!==generation)return;
    recorder=null;closeMic();
    const blob=new Blob(chunks,{type:activeRecorder.mimeType||chunks[0]?.type});
    if(!blob.size||performance.now()-started<350){controls();tell('短すぎたみたい。もう一度録音してみよう。');return;}
    url=URL.createObjectURL(blob);play.closest('.pronunciation-playback').hidden=false;controls();tell('自分の声を聞き比べられます。');
   };
   activeRecorder.start();started=performance.now();tell('録音中… 話し終わったら止めよう。');timer=setTimeout(finish,8000);
  }catch(error){if(alive&&request===generation){recorder=null;closeMic();tell(error.name==='NotAllowedError'?'聞き比べ用の録音には、マイクの許可が必要です。':'録音できなかったよ。もう一度試してみよう。');}}
  finally{pending--;if(alive)controls();}
 };
 const replay=()=>{if(!url||pending||recorder||busy)return;stop();stopPlayback();const current=new Audio(url);player=current;current.onerror=()=>{if(alive&&player===current)tell('再生できなかったよ。もう一度録音してみよう。');};void current.play().catch(()=>current.onerror?.());};
 const models=[...page.querySelectorAll('[data-speaking-example],.pronunciation-diagram-link')];
 const hidden=()=>{if(document.hidden)cancel();};
 const toggle=()=>{if(!details.open)cancel();};
 record.addEventListener('click',start);play.addEventListener('click',replay);models.forEach(el=>el.addEventListener('click',cancel));details.addEventListener('toggle',toggle);document.addEventListener('visibilitychange',hidden);
 return {blocked:()=>pending>0||Boolean(recorder),recognitionBusy:value=>{if(!alive)return;busy=value;if(value)cancel();controls();},dispose:()=>{alive=false;cancelRecording();stopPlayback();release();record.removeEventListener('click',start);play.removeEventListener('click',replay);models.forEach(el=>el.removeEventListener('click',cancel));details.removeEventListener('toggle',toggle);document.removeEventListener('visibilitychange',hidden);}};
}
