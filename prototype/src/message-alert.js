const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const messageRoom=value=>typeof value==='string'&&uuid.test(value)?value:null;
// Lives outside #app so background updates never replace a lesson or typed draft.
export function createMessageAlert({locale=()=> 'ko',openRoom,activeRoom=()=>null,document:doc=document,duration=6000}={}){
 let node,timer,roomId;const seen=new Set();
 function dismiss(){clearTimeout(timer);node?.remove();node=null;roomId=null;}
 function show(room){const id=messageRoom(room?.room_id);if(!id||doc.hidden||activeRoom()===id||room.id&&seen.has(room.id))return;
  if(room.id){seen.add(room.id);if(seen.size>100)seen.delete(seen.values().next().value);}
  dismiss();roomId=id;const ja=locale()==='ja';node=doc.createElement('aside');node.className='message-alert';node.setAttribute('role','status');
  const open=doc.createElement('button');open.type='button';open.textContent=ja?'新しいメッセージが届きました':'새 메시지가 왔어요';open.onclick=()=>{dismiss();void openRoom(id);};
  const close=doc.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label',ja?'閉じる':'닫기');close.onclick=dismiss;node.append(open,close);doc.body.append(node);
  const dock=doc.querySelector('.exchange-composer');if(dock)node.style.bottom=`${Math.max(88,innerHeight-dock.getBoundingClientRect().top+8)}px`;
  timer=setTimeout(dismiss,duration);
 }
 return {show,dismiss,read(id){if(id===roomId)dismiss();}};
}
