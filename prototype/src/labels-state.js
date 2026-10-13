import {developmentMode} from './build-config.js';
import {normalizeKana} from './kana-state.js';
export const labelWords=[
 {id:'kasa',text:'かさ',meaning:'우산',reading:'카사'},
 {id:'kutsu',text:'くつ',meaning:'신발',reading:'쿠츠'},
 {id:'hana',text:'はな',meaning:'꽃',reading:'하나'},
 {id:'neko',text:'ねこ',meaning:'고양이',reading:'네코'},
];
export const labelsUnlocked=s=>developmentMode||normalizeKana(s.kana).lessons.every(l=>l.completed);
export const freshLabels=()=>({version:1,started:false,phase:'intro',index:0,tiles:[],checked:false,matches:[],learned:[],completed:false,feedback:''});
export const labelsProgress=s=>s.labels||freshLabels();
const ids=labelWords.map(w=>w.id);
export function validLabels(p){
 const unique=(a,allowed)=>Array.isArray(a)&&new Set(a).size===a.length&&a.every(x=>allowed.includes(x));
 return p?.version===1&&['intro','read','build','match','summary'].includes(p.phase)&&Number.isInteger(p.index)&&p.index>=0&&p.index<4&&['started','checked','completed'].every(k=>typeof p[k]==='boolean')&&typeof p.feedback==='string'&&Array.isArray(p.tiles)&&p.tiles.length<=2&&p.tiles.every(x=>x===null||[0,1,2].includes(x))&&unique(p.tiles.filter(x=>x!==null),[0,1,2])&&unique(p.matches,ids)&&unique(p.learned,ids)&&(!p.checked||(p.phase==='build'&&p.tiles.join(',')==='1,0'))&&(p.phase!=='summary'||p.completed&&p.matches.length===4);
}
export const labelTiles=w=>[w.text[1],w.text[0],w.id==='kasa'?'き':w.id==='kutsu'?'し':w.id==='hana'?'ほ':'ぬ'];
function finishWord(p){
 p.learned=[...new Set([...p.learned,ids[p.index]])];p.checked=false;p.tiles=[];p.feedback='';
 if(p.index<3){p.index++;p.phase='read';}else p.phase='match';
}
export function reduceLabels(state,action){
 const p=structuredClone(labelsProgress(state));
 if(!labelsUnlocked(state))return p;
 if(action.type==='labels-start'||action.type==='labels-restart'){
  if(action.type==='labels-restart'||p.phase==='summary')return {...freshLabels(),started:true,completed:p.completed,learned:p.learned};
  p.started=true;
  if(p.phase==='match'&&p.matches.length===4){p.phase='summary';p.completed=true;}
  return p;
 }
 if(!p.started)return p;
 if(['labels-tile','labels-remove'].includes(action.type)&&p.phase==='build'){
  const n=Number(action.id);
  if(Number.isInteger(n)&&n>=0&&n<3){
   const selected=p.tiles.indexOf(n);
   if(selected>=0){p.tiles[selected]=null;p.checked=false;p.feedback='';}
   else if(action.type==='labels-tile'){
    const empty=[0,1].find(i=>p.tiles[i]==null);
    if(empty!==undefined){p.tiles[empty]=n;p.checked=false;p.feedback='';}
   }
  }
 }
 if(action.type==='labels-check'&&p.phase==='build'&&p.tiles.length===2){
  if(p.tiles.join(',')==='1,0')finishWord(p);
  else {p.checked=false;p.feedback='소리를 듣고 글자 순서를 다시 확인해 봐요.';}
 }
 if(action.type==='labels-match'&&p.phase==='match'&&ids.includes(action.left)&&ids.includes(action.right)&&!p.matches.includes(action.left)&&!p.matches.includes(action.right)){
  if(action.left===action.right){p.matches.push(action.left);p.feedback='';if(p.matches.length===4){p.phase='summary';p.completed=true;}}else p.feedback='그림과 이름표를 다시 확인해 봐요.';
 }
 if(action.type==='labels-next'){
  p.feedback='';
  if(p.phase==='intro')p.phase='read';
  else if(p.phase==='read')p.phase='build';
  else if(p.phase==='build'&&p.checked)finishWord(p); // Resume saves from the previous two-step flow.
  else if(p.phase==='match'&&p.matches.length===4){p.phase='summary';p.completed=true;}
 }
 return p;
}
