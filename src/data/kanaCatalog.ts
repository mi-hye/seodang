import type { KanjiCategoryGroup } from "./fetchKanjiCategories";

export type KanaScript = "hiragana" | "katakana";

// Modern basic gojūon: 46 characters per script, including を / ヲ and ん / ン.
export const BASIC_HIRAGANA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
export const BASIC_KATAKANA = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
export const KANA_ROMAJI = "a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya yu yo ra ri ru re ro wa wo n".split(" ");
export const KANA_KOREAN_READINGS = "아 이 우 에 오 카 키 쿠 케 코 사 시 스 세 소 타 치 츠 테 토 나 니 누 네 노 하 히 후 헤 호 마 미 무 메 모 야 유 요 라 리 루 레 로 와 오 응".split(" ");

// Keep this registry lightweight: readings/examples and stroke paths load on demand.
export const KANA_LESSONS = [
  { key: "kana_hiragana", script: "hiragana", literals: [...BASIC_HIRAGANA], ko: "히라가나", ja: "ひらがな", descriptionKo: "기본 46자 · 발음과 쓰기 연습", descriptionJa: "基本46文字・読みと書き取り" },
  { key: "kana_katakana", script: "katakana", literals: [...BASIC_KATAKANA], ko: "가타카나", ja: "カタカナ", descriptionKo: "기본 46자 · 발음과 쓰기 연습", descriptionJa: "基本46文字・読みと書き取り" },
  { key: "kana_katakana_voiced", script: "katakana", literals: [..."ガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ"], ko: "가타카나 · 탁음·반탁음", ja: "カタカナ・濁音／半濁音", descriptionKo: "ガ·ボ·パ 등 · ゛와 ゜를 붙인 글자", descriptionJa: "ガ・ボ・パなど・゛と゜の付く文字" },
  { key: "kana_katakana_small", script: "katakana", literals: [..."ァィゥェォャュョッー"], ko: "가타카나 · 작은 글자·장음", ja: "カタカナ・小書き／長音", descriptionKo: "작은 가나와 ッ·ー의 쓰임", descriptionJa: "小さな仮名とッ・ーの使い方" },
  { key: "kana_katakana_yoon", script: "katakana", literals: "キャ キュ キョ シャ シュ ショ チャ チュ チョ ニャ ニュ ニョ ヒャ ヒュ ヒョ ミャ ミュ ミョ リャ リュ リョ ギャ ギュ ギョ ジャ ジュ ジョ ビャ ビュ ビョ ピャ ピュ ピョ".split(" "), ko: "가타카나 · 요음", ja: "カタカナ・拗音", descriptionKo: "キャ·シュ·チョ 등 · 작은 ャ·ュ·ョ와 조합", descriptionJa: "キャ・シュ・チョなど・小さなャュョとの組み合わせ" },
  { key: "kana_katakana_loanwords", script: "katakana", literals: "ヴ ウィ ウェ ウォ イェ シェ ジェ チェ ティ ディ トゥ ドゥ デュ ファ フィ フェ フォ ヴァ ヴィ ヴェ ヴォ ツァ ツェ".split(" "), ko: "가타카나 · 외래어 조합", ja: "カタカナ・外来語の組み合わせ", descriptionKo: "기본 50음도·탁음표 밖의 일상 외래어 표기 · ヴ·ティ·フォ 등", descriptionJa: "基本の五十音・濁音表にない外来語表記・ヴ・ティ・フォなど" },
] as const;

export function getKanaLessonByCategoryKey(key?: string) {
  return KANA_LESSONS.find((lesson) => lesson.key === key);
}

export function getKanaCategoryKeyById(id: string) {
  const literal = getKanaLiteralById(id);
  return KANA_LESSONS.find((lesson) => literal && lesson.literals.includes(literal))?.key;
}

export function getKanaCharacterId(literal: string) {
  return `kana-${[...literal.normalize("NFC")].map((part) => part.codePointAt(0)!.toString(16)).join("-")}`;
}

export function getKanaScriptById(id: string): KanaScript | undefined {
  return getKanaLessonByCategoryKey(getKanaCategoryKeyById(id))?.script;
}

export function getKanaLiteralById(id: string) {
  const match = /^kana-([0-9a-f]{4}(?:-[0-9a-f]{4})?)$/.exec(id);
  return match ? match[1].split("-").map((hex) => String.fromCodePoint(Number.parseInt(hex, 16))).join("") : undefined;
}

export function isKanaLiteral(literal: string) {
  return KANA_LESSONS.some((lesson) => lesson.literals.includes(literal));
}

export function getKanaScriptByCategoryKey(key?: string): KanaScript | undefined {
  return getKanaLessonByCategoryKey(key)?.script;
}

export function getKanaCategoryGroup(locale: "ko" | "ja"): KanjiCategoryGroup {
  return {
    id: "kana",
    groupKey: "kana",
    label: locale === "ko" ? "일본어 기초 문자" : "かな",
    sortOrder: -1,
    categories: KANA_LESSONS.map((lesson, index) => ({
      id: lesson.key,
      categoryKey: lesson.key,
      groupId: "kana",
      label: locale === "ko" ? lesson.ko : lesson.ja,
      description: locale === "ko" ? lesson.descriptionKo : lesson.descriptionJa,
      sortOrder: index,
      visibleLocales: ["ko", "ja"],
      totalCharacters: lesson.literals.length,
    })),
  };
}
