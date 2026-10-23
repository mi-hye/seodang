import {icon} from './ui.js';

export function createReviewSound(settings={},notes=[[659.25,0],[880,0.09]]){
 let alive=true,context=null,closeTimer;
 const stopSound=()=>{clearTimeout(closeTimer);const old=context;context=null;if(old)void old.close().catch(()=>{});};
 const sound=async()=>{
  if(settings.sound===false)return;
  const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!AudioContext)return;
  try{
   const current=new AudioContext();context=current;
   if(current.state==='suspended')await current.resume();
   if(!alive||context!==current)return;
   const start=current.currentTime;
   for(const [frequency,offset,duration=0.15] of notes){
    const tone=current.createOscillator(),volume=current.createGain();tone.type='sine';tone.frequency.value=frequency;
    volume.gain.setValueAtTime(0,start+offset);volume.gain.linearRampToValueAtTime(0.055,start+offset+0.012);volume.gain.exponentialRampToValueAtTime(0.001,start+offset+duration-0.01);
    tone.connect(volume);volume.connect(current.destination);tone.start(start+offset);tone.stop(start+offset+duration);
   }
   closeTimer=setTimeout(stopSound,Math.max(...notes.map(([,offset,duration=0.15])=>offset+duration))*1000+60);
  }catch{stopSound();}
 };
 return {play:sound,stop:stopSound,dispose(){alive=false;stopSound();}};
}

// Shared by lazy expression reviews and video scene checks.
export function createReviewCorrectFeedback(root,settings={},selector='.practice-feedback'){
 let alive=true,played=false;
 const sound=createReviewSound(settings),stopSound=sound.stop;
 const show=animate=>{
  const feedback=root.querySelector(selector);
  if(feedback){
   feedback.classList.add('review-correct');
   if(!feedback.querySelector('.review-correct-mark'))feedback.insertAdjacentHTML('afterbegin',`<span class="review-correct-mark" aria-hidden="true">${icon('check')}<i></i><i></i><i></i><i></i></span>`);
   if(animate&&settings.motion!=='off'&&!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)feedback.classList.add('review-correct-motion');
  }
 };
 const play=()=>{
  if(!alive||played)return;played=true;show(true);
  const cap=globalThis.Capacitor;
  try{if(cap?.isNativePlatform?.()&&cap.getPlatform?.()==='ios')void cap.nativePromise('SeodangUI','correctAnswer',{}).catch(()=>{});else globalThis.navigator?.vibrate?.(12);}catch{}
  void sound.play();
 };
 return {play,restore(){if(alive){played=true;show(false);}},stopSound,dispose(){alive=false;sound.dispose();root.querySelector('.review-correct-motion')?.classList.remove('review-correct-motion');}};
}

export function playReviewCompletionSound(settings){
 const cue=createReviewSound(settings,[[523.25,0,0.12],[659.25,0.1,0.12],[783.99,0.2,0.12],[1046.5,0.32,0.3],[659.25,0.32,0.3],[783.99,0.32,0.3]]);
 void cue.play();return ()=>cue.dispose();
}
