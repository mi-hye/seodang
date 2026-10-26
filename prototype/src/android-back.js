import {closeSheet} from './sheet.js';

// Reuse the screen's existing Back action and each sheet's cancellation cleanup.
export function installAndroidBack(onBack){
 if(globalThis.Capacitor?.getPlatform?.()!=='android')return;
 window.addEventListener('seodang:back',event=>{
  const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);
  if(dialog){
   event.preventDefault();
   if(dialog.dispatchEvent(new Event('cancel',{cancelable:true}))&&dialog.open)closeSheet(dialog);
   return;
  }
  if(onBack())event.preventDefault();
 });
}
