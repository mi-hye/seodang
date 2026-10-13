import {developmentMode} from './build-config.js';
export const listeningOrder=['hana','kutsu','neko','kasa'];
export const freshListening=()=>({version:1,started:false,index:0,completed:false,feedback:''});
export const listeningProgress=s=>s.listening||freshListening();
export const listeningUnlocked=s=>developmentMode||Boolean(s.labels?.completed);
export const validListening=p=>p?.version===1&&typeof p.started==='boolean'&&typeof p.completed==='boolean'&&typeof p.feedback==='string'&&Number.isInteger(p.index)&&p.index>=0&&p.index<=4&&(p.index!==4||p.completed);
export function reduceListening(s,a){
 const p=structuredClone(listeningProgress(s));if(!listeningUnlocked(s))return p;
 if(a.type==='listening-start')return p.index===4?{...freshListening(),started:true,completed:p.completed}:{...p,started:true};
 if(a.type==='listening-answer'&&p.started&&p.index<4){
  if(a.id===listeningOrder[p.index]){p.index++;p.feedback='';if(p.index===4)p.completed=true;}
  else p.feedback='소리를 다시 듣고 골라 봐요.';
 }
 return p;
}
