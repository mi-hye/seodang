export const discussionPhases=['intro','perspective','expression','speak','reflection','done'];
export function discussionProgress(p){
 if(p.discussionVersion===2)return p;
 if(p.discussionVersion===1){const {opinion,...rest}=p;return {...rest,discussionVersion:2,phase:p.phase==='opinion'?'perspective':p.phase,part:p.phase==='opinion'?0:p.part};}
 // Keep completion credit; a previous essay attempt starts the new activity at its introduction.
 return {...p,phase:p.phase==='done'?'done':'intro',resumePhase:undefined,index:0,sentence:0,selected:null,checked:false,retry:false,solved:[],discussionVersion:2,part:0};
}
export function validDiscussion(p){return [1,2].includes(p.discussionVersion)&&p.index===0&&p.sentence===0&&p.selected===null&&p.checked===false&&p.retry===false&&Array.isArray(p.solved)&&p.solved.length===0&&(discussionPhases.includes(p.phase)||p.discussionVersion===1&&p.phase==='opinion')&&(p.discussionVersion===2||[null,0,1,2].includes(p.opinion))&&Number.isInteger(p.part)&&p.part>=0&&p.part<2;}
export function advanceDiscussion(p,a){
 const next={...p};
 if(a.type==='expert-next'){
  if(p.phase==='intro'){next.phase='perspective';next.part=0;}
  else if(p.phase==='perspective'||p.phase==='expression'){if(p.part===0)next.part=1;else{next.phase=p.phase==='perspective'?'expression':'speak';next.part=0;}}
  else if(p.phase==='speak')next.phase='reflection';
  else if(p.phase==='reflection'){next.phase='done';next.completed=true;}
  else return p;
 }else if(a.type==='expert-previous'){
  if(p.phase==='perspective'||p.phase==='expression'){if(p.part===1)next.part=0;else{next.phase=p.phase==='perspective'?'intro':'perspective';next.part=p.phase==='expression'?1:0;}}
  else if(p.phase==='speak'){next.phase='expression';next.part=1;}
  else if(p.phase==='reflection')next.phase='speak';
  else return p;
 }else return p;
 return next;
}
export function discussionPercent(p){return Math.round(({intro:0,perspective:1+p.part,expression:3+p.part,speak:5,reflection:6,done:7}[p.phase]??0)/7*100);}
