export const freshDialogue=()=>({version:1,started:false,phase:'intro',index:0,selected:null,feedback:'',completed:false,learned:[]});
export const dialogueProgress=s=>s.dialogue||freshDialogue();
export function validDialogue(p){return p?.version===1&&['intro','learn','practice','done'].includes(p.phase)&&Number.isInteger(p.index)&&p.index>=0&&p.index<3&&typeof p.started==='boolean'&&typeof p.completed==='boolean'&&typeof p.feedback==='string'&&[null,0,1,2].includes(p.selected)&&Array.isArray(p.learned)&&new Set(p.learned).size===p.learned.length&&p.learned.every(i=>Number.isInteger(i)&&i>=0&&i<3)&&(p.phase!=='done'||p.completed);}
export function reduceDialogue(previous,a){
 const p=structuredClone(previous||freshDialogue());
 if(a.type==='dialogue-start')return p.phase==='done'?{...freshDialogue(),started:true,completed:p.completed,learned:p.learned}:{...p,started:true};
 if(!p.started)return p;
 if(a.type==='dialogue-next'){
  if(p.phase==='intro')p.phase='learn';
  else if(p.phase==='learn'){p.learned=[...new Set([...p.learned,p.index])];if(p.index<2)p.index++;else{p.phase='practice';p.index=0;}}
 }
 if(a.type==='dialogue-previous'){
  if(p.phase==='learn'){if(p.index>0)p.index--;else p.phase='intro';}
  else if(p.phase==='practice'){if(p.index>0)p.index--;else{p.phase='learn';p.index=2;}}
  p.selected=null;p.feedback='';
 }
 if(a.type==='dialogue-select'&&p.phase==='practice'){
  const id=Number(a.id);if(Number.isInteger(id)&&id>=0&&id<3){p.selected=id;p.feedback='';}
 }
 if(a.type==='dialogue-check'&&p.phase==='practice'&&p.selected!==null){
  if(p.selected===0){p.selected=null;p.feedback='';if(p.index<2)p.index++;else{p.phase='done';p.completed=true;}}
  else p.feedback=['커피 한 잔을 주문하려고 해요. コーヒー가 들어간 답을 골라요.','따뜻한 음료는 ホット라고 해요.','포장은 持ち帰り라고 해요.'][p.index];
 }
 return p;
}
