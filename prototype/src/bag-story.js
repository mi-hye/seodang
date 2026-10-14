export const bagGuests = [
 {name:'아오이',text:'あおい',key:'a-o-i',spoken:'あおい',choices:['あき','あおい','あい']},
 {name:'아키',text:'あき',key:'a-ki',spoken:'あき',choices:['あい','あおい','あき']},
 {name:'아이',text:'あい',key:'a-i',spoken:'あい',choices:['あい','あき','あおい']},
];
export const bagPracticeIndices = [[0,1,2],[3],[0,2]];
// Write first, read the name together, then verify by returning the bag.
export function reduceBag(k,action){
 const l=k.lessons[0],round=l.storyRound||0,indices=bagPracticeIndices[round];
 if(action.type==='kana-help' && l.phase==='solve' && !l.answered){
  l.feedback='';
  l.phase='reading';l.answered=false;
 }
 if(action.type==='kana-previous'&&l.phase==='learn'&&indices.indexOf(l.index)>0)l.index=indices[indices.indexOf(l.index)-1];
 if(action.type==='kana-solve'&&l.phase==='solve'&&!l.answered){l.answered=action.id==='match';l.feedback=l.answered?'':round===2?'첫 글자와 끝 글자를 다시 들어볼까요?':'괜찮아요. 이름을 다시 듣거나 글자를 함께 읽어 봐요.';}
 if(action.type==='kana-next'){
  if(l.phase==='intro'){l.phase='learn';l.index=indices[0];l.answered=false;l.feedback='';}
  else if(l.phase==='learn'){
   const ids=['a','o','i','ki'];k.learned=[...new Set([...k.learned,ids[l.index]])];
   const position=indices.indexOf(l.index);
   if(position<indices.length-1)l.index=indices[position+1];else {l.phase='reading';l.index=indices[0];}
  } else if(l.phase==='reading'||l.phase==='quiz'){
   l.phase='solve';l.answered=false;l.feedback='';
  } else if(l.phase==='solve'&&l.answered){
   if(round<2){l.storyRound=round+1;l.phase='intro';l.index=round===0?3:0;l.answered=false;l.help=false;l.feedback='';}
   else {l.phase='summary';l.completed=true;l.caseSolved=true;l.feedback='';}
  }
 }
 return k;
}
