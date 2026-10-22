import {introductionWordReview} from './introduction-word-content.js';
// Revisit each learned expression with less support; reuse the lesson's verified audio.
export function introductionReview(units,tasks,japanese,key){
 const bag=key==='ko-ja:sentence:0'||key==='ja-ko:korean:3-4';
 const label=(ko,ja)=>japanese?ja:ko;
 const positions=[2,0,1,2,1,0];
 const tokens=bag?units.map(u=>u.text.split(' ')):japanese?[
  ['저는','학생이에요.'],['저는','일본','사람이에요.'],['한국어를','공부해요.'],
  ['도쿄에','살아요.'],['커피를','좋아해요.'],['내일','시간이','있어요.']
 ]:[['私は','学生です。'],['私は','韓国人','です。'],['日本語を','勉強しています。'],['ソウルに','住んでいます。'],['コーヒーが','好きです。'],['明日は','時間が','あります。']];
 const distractors=bag?(japanese?['네','문','파란']:['あなたの','ドアの','あおい']):japanese?['회사원이에요.','한국','일본어를','서울에','차를','없어요.']:['会社員です。','日本人','韓国語を','東京に','お茶が','ありません。'];
 const decorate=(task,index,stage)=>({...task,review:true,stage,stageIndex:index,unit:units[task.unitIndex],optionAudio:task.options?.map(option=>units.find(u=>u.text===option)?.audio)});
 const listening=(bag?[1,2,0]:[2,0,4,1,5,3]).map((unitIndex,index)=>{
  const unit=units[unitIndex],others=[units[(unitIndex+1)%units.length].meaning,units[(unitIndex+(bag?2:3))%units.length].meaning],answer=positions[index];others.splice(answer,0,unit.meaning);
  return decorate({type:'listen',unitIndex,scene:label('글자를 보지 않고 듣고 뜻을 골라요.','文字を見ずに聞いて、意味を選びます。'),prompt:label('어떤 뜻인지 골라요.','どんな意味か選びましょう。'),options:others,answer,hint:label('문장을 다시 듣고 골라 보세요.','もう一度文を聞いて選びましょう。')},index,0);
 });
 // Each stage uses a different order so the last answer is not a cue for the next one.
 const building=(bag?[2,0,1]:[4,1,3,0,2,5]).map((unitIndex,index)=>decorate({type:'order',unitIndex,scene:units[unitIndex].meaning,prompt:label('뜻에 맞게 문장을 만들어요.','意味に合う文を作りましょう。'),tokens:[...tokens[unitIndex],distractors[unitIndex]],answerLength:tokens[unitIndex].length,tokenOrder:bag?(tokens[unitIndex].length===4?[2,4,0,3,1]:[[2,0,3,1],[1,3,0,2],[3,1,2,0]][index%3]):tokens[unitIndex].length===3?([ [2,0,3,1],[1,3,0,2] ][index%2]):([[2,0,1],[1,2,0],[0,2,1]][index%3]),hint:label('누가, 무엇을 말하는지 떠올려 보세요.','誰について何を伝える文か、思い出しましょう。')},index,1));
 return [...introductionWordReview(japanese,bag),...listening,...building,...tasks.map((t,i)=>decorate({...t,...(bag&&t.type==='order'?{tokenOrder:[1,2,0]}:{}),unitIndex:bag&&!japanese&&i===1?0:i},i,2))];
}
