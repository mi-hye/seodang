// Writing tasks for self-made lessons, keyed by `kind:id`. Lessons without an entry
// (video clips, letters, basics, Korean course lessons for now) show no mission.
export const missionTasks={
 'scenario:2':['식당에 들어가 몇 명인지 말하고 창가 자리를 부탁하는 말을 써 보세요.','お店に入って人数を伝え、窓際の席をお願いする一言を書きましょう。'],
 'scenario:3':['숙소 프런트에서 이름을 말하고 예약을 확인해 달라고 하는 문장을 써 보세요.','宿のフロントで名前を伝えて、予約の確認をお願いする文を書きましょう。'],
 'scenario:4':['배송 날짜가 바뀌었다는 연락을 받았다고 생각하고, 받을 수 있는 시간을 알려 주세요.','配送日が変わったと連絡が来たつもりで、受け取れる時間を伝えましょう。'],
 'scenario:6':['숙소에서 생긴 작은 문제 하나를 직원에게 알리고 도와 달라고 부탁해 보세요.','宿で起きた小さな困りごとを一つスタッフに伝えて、助けをお願いしましょう。'],
 'scenario:7':['체크아웃한 뒤 짐을 맡기고 몇 시에 찾으러 올지 말해 보세요.','チェックアウトのあと荷物を預けて、何時に取りに来るか伝えましょう。'],
 'scenario:8':['프런트 직원에게 근처에 갈 만한 곳을 묻고 고맙다는 말까지 이어서 써 보세요.','フロントのスタッフに近くのおすすめを聞いて、お礼まで続けて書きましょう。'],
 'scenario:9':['약속에 늦을 것 같은 사정을 설명하고 새 시간을 제안해 보세요.','約束に遅れそうな事情を説明して、新しい時間を提案しましょう。'],
 'scenario:10':['친구의 애매한 대답을 떠올리고, 정말 괜찮은지 부드럽게 다시 묻는 문장을 써 보세요.','友だちのあいまいな返事を思い出して、本当に大丈夫かやわらかく聞き返す文を書きましょう。'],
 'scenario:11':['친구 부탁을 거절해야 할 때, 미안한 마음과 이유를 함께 담아 답장해 보세요.','友だちの頼みを断るときに、申し訳ない気持ちと理由を添えて返事を書きましょう。'],
 'scenario:12':['모임 장소를 정할 때 조건을 하나 붙여 제안하고, 어렵다면 다른 안도 써 보세요.','集まりの場所を決めるときに条件を一つ付けて提案し、難しければ別の案も書きましょう。'],
 'sentence:0':['잃어버린 물건의 색과 놓아둔 곳을 한 문장으로 설명해 보세요.',null],
 'sentence:1':['편의점에서 사고 싶은 물건 하나를 찾는 말을 써 보세요.',null],
 'sentence:2':['역에서 만날 친구에게 지금 있는 곳을 알려 주는 문장을 써 보세요.',null],
 'sentence:3':['교류회에서 처음 만난 사람에게 이름과 하는 일을 소개해 보세요.',null],
 'dialogue:0':['카페에서 마시고 싶은 음료를 고르고 포장할지 말해 보세요.',null],
 'reading:5':['친구에게 받은 안내에서 시간과 장소를 확인했다고 답장해 보세요.',null],
 'reading:6':['두 가지 중 하나를 고르고 그 이유를 친구에게 한두 문장으로 알려 주세요.',null],
};

// Returns the task in the interface language, or null when the lesson has no fitting task.
export function missionTask(lessonKey){
 const [direction,kind,id]=lessonKey.split(':'),task=missionTasks[`${kind}:${id}`];
 return task?.[direction==='ja-ko'?1:0]||null;
}
export const hasMissionTask=lessonKey=>Boolean(missionTask(lessonKey));
