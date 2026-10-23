// Only map metadata is eager; dialogue and review content load with the lesson.
const titles = [
 ['길을 잘못 들었을 때','道を間違えたとき'],
 ['약속에 늦는다고 알려요','遅れるときに連絡する'],
 ['빌린 물건을 돌려줘요','借りた物を返す'],
 ['잘못 나온 주문을 바로잡아요','注文と違う料理が来たら'],
 ['처음 가는 모임에 문의해요','初めての集まりに問い合わせる'],
 ['산 물건을 교환해요','買った物を交換する'],
 ['전화 내용을 다시 확인해요','電話の内容を聞き直す'],
 ['함께 요리하며 역할을 나눠요','一緒に料理して役割を分ける'],
 ['직원에게 관람 규칙을 물어요','係員に観覧ルールを確かめる'],
 ['주말 계획을 조율해요','週末の予定を相談する']
];
const answerPositions = [[2, 1, 0], [0, 2, 1], [1, 0, 2], [0, 1, 2], [2, 0, 1], [1, 2, 0], [0, 2, 1], [2, 1, 0], [1, 0, 2], [0, 1, 2]];

export const courseThreeCatalog = titles.map((titles, index) => ({
 id: `course3-${index + 8}`, level: 4, titles, count: 3,
 number: { 'ko-ja': index + 6, 'ja-ko': index + 6 },
 answers: answerPositions[index], extended: true
}));
