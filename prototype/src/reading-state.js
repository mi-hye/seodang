// Small progress model stays eager; passages and the screen load on entry.
export const readingAnswers={5:[1,2,0,1,2,0],6:[2,0,1,2,0,1],7:[2,0,3,1,0,2]};
export const freshReading=()=>({version:1,started:false,index:0,selected:null,retry:false,completed:false,phase:'intro',solved:[]});
export const readingProgress=(s,level)=>s.readings?.[level]||freshReading();
export function validReading(p,level=5){return p?.version===1&&typeof p.started==='boolean'&&typeof p.completed==='boolean'&&typeof p.retry==='boolean'&&['intro','learn','read','done'].includes(p.phase)&&Number.isInteger(p.index)&&p.index>=0&&p.index<6&&(p.selected===null||(Number.isInteger(p.selected)&&p.selected>=0&&p.selected<(level===7?4:3)))&&Array.isArray(p.solved)&&new Set(p.solved).size===p.solved.length&&p.solved.every(i=>Number.isInteger(i)&&i>=0&&i<6)&&(p.phase!=='done'||(p.completed&&p.solved.length===6));}
export const validReadings=r=>r===undefined||(r!==null&&typeof r==='object'&&!Array.isArray(r)&&Object.entries(r).every(([level,p])=>['5','6','7'].includes(level)&&validReading(p,Number(level))));
export function reduceReading(previous,action,level){
 const p=structuredClone(previous||freshReading());
 if(!readingAnswers[level])return p;
 if(action.type==='reading-start'){
  const next=p.phase==='done'?{...freshReading(),started:true,completed:p.completed}:{...p,started:true};

  return next;
 }
 if(!p.started)return p;
 if(action.type==='reading-next'&&p.phase==='intro'){p.phase='learn';return p;}
 if(action.type==='reading-next'&&p.phase==='learn'){p.phase='read';return p;}
 if(action.type==='reading-previous'&&p.phase==='learn'&&level!==7){p.phase='intro';return p;}
 if(action.type==='reading-previous'&&p.phase==='read'){
  if(p.index%2===0)p.phase='learn';else p.index--;
  p.selected=null;p.retry=false;
 }
 if(action.type==='reading-select'&&p.phase==='read'&&(level===7?['0','1','2','3',0,1,2,3]:['0','1','2',0,1,2]).includes(action.id)){p.selected=Number(action.id);p.retry=false;}
 if(action.type==='reading-check'&&p.phase==='read'&&p.selected!==null){
  if(p.selected===readingAnswers[level][p.index]){
   p.solved=[...new Set([...p.solved,p.index])];p.selected=null;p.retry=false;
   if(p.index<5){p.index++;if(p.index%2===0)p.phase='intro';}else{p.phase='done';p.completed=true;}
  }else p.retry=true;
 }
 return p;
}
