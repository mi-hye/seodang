// Existing lessons keep their IDs. The two video slots remain at 4-3 and 4-6.
const titles = [
  ['예약 조건을 확인해요', '予約条件を確かめる'],
  ['서로 가능한 시간을 찾아요', '都合のよい時間を探す'],
  ['안내문에서 필요한 정보를 찾아요', '案内文を読み取る'],
  ['잘못 전해진 내용을 바로잡아요', '伝わり方を修正する'],
  ['교환할 수 있는지 확인해요', '交換できるか確かめる'],
  ['일을 나누고 순서를 정해요', '役割と順番を決める'],
  ['도울 수 있는 범위를 말해요', '手伝える範囲を伝える'],
  ['후기와 새 공지를 비교해요', '口コミと新しいお知らせを比べる'],
  ['문제가 생기면 대안을 찾아요', '困ったときの代案を探す'],
  ['이유를 덧붙여 선택해요', '理由を添えて選ぶ'],
];

const answerPositions = [[1, 0, 2], [2, 1, 0], [0, 2, 1], [2, 0, 1], [1, 2, 0], [0, 1, 2], [2, 1, 0], [0, 2, 1], [1, 0, 2], [2, 0, 1]];

export const courseFourCatalog = titles.map((lessonTitles, index) => ({
  id: `course4-${index + 8}`,
  level: 5,
  titles: lessonTitles,
  count: 3,
  number: {'ko-ja': index + 6, 'ja-ko': index + 6},
  answers: answerPositions[index],
  extended: true,
}));
