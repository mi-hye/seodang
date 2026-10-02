import type { KanaMemory } from "./characters";

// Word associations are learning cues, not claims about a glyph's etymology.
const basicWords = Object.fromEntries(`
あ|あめ|비
い|いぬ|개
う|うみ|바다
え|えき|역
お|おに|도깨비
か|かさ|우산
き|きつね|여우
く|くま|곰
け|けむり|연기
こ|こえ|목소리
さ|さかな|물고기
し|しお|소금
す|すし|초밥
せ|せかい|세계
そ|そら|하늘
た|たこ|문어
ち|ちず|지도
つ|つき|달
て|て|손
と|とり|새
な|なつ|여름
に|にく|고기
ぬ|ぬの|천
ね|ねこ|고양이
の|のり|김
は|はな|꽃
ひ|ひと|사람
ふ|ふね|배
へ|へや|방
ほ|ほし|별
ま|まめ|콩
み|みみ|귀
む|むし|벌레
め|め|눈
も|もも|복숭아
や|やま|산
ゆ|ゆき|눈 (snow)
よ|よる|밤
ら|らくだ|낙타
り|りんご|사과
る|くるま|자동차
れ|れもん|레몬
ろ|ろうそく|양초
わ|わに|악어
を|ほんをよむ|책을 읽다
ん|りんご|사과
ア|アイス|아이스크림
イ|インク|잉크
ウ|ウール|울, 양모
エ|エアコン|에어컨
オ|オレンジ|오렌지
カ|カメラ|카메라
キ|キウイ|키위
ク|クラス|반, 클래스
ケ|ケーキ|케이크
コ|コーヒー|커피
サ|サラダ|샐러드
シ|シール|스티커
ス|スープ|수프
セ|セーター|스웨터
ソ|ソファ|소파
タ|タオル|수건
チ|チーズ|치즈
ツ|ツリー|트리
テ|テスト|시험
ト|トマト|토마토
ナ|ナイフ|칼
ニ|ニュース|뉴스
ヌ|ヌードル|면, 누들
ネ|ネクタイ|넥타이
ノ|ノート|공책
ハ|ハム|햄
ヒ|ヒント|힌트
フ|フルーツ|과일
ヘ|ヘルメット|헬멧
ホ|ホテル|호텔
マ|マスク|마스크
ミ|ミルク|우유
ム|ゲーム|게임
メ|メモ|메모
モ|モデル|모델
ヤ|タイヤ|타이어
ユ|ユニフォーム|유니폼
ヨ|ヨーグルト|요구르트
ラ|ラジオ|라디오
リ|リボン|리본
ル|ルール|규칙
レ|レモン|레몬
ロ|ロボット|로봇
ワ|ワイン|와인
ヲ|ヲタク|オタク의 변형 표기 (비격식)
ン|パン|빵
`.trim().split("\n").map((line) => {
  const [literal, word, meaning] = line.split("|");
  return [literal, { word, meaning }];
}));

const confusingGroups = ["あお", "いり", "きさ", "ぬめ", "れねわ", "るろ", "はほ", "シツ", "ソン", "クケ", "スヌ", "ウワ", "マム", "コユ"];
const smallToLarge: Record<string, string> = { ァ: "ア", ィ: "イ", ゥ: "ウ", ェ: "エ", ォ: "オ", ャ: "ヤ", ュ: "ユ", ョ: "ヨ", ッ: "ツ" };

export function getKanaMemory(literal: string, example?: string | null, meaning?: string | null): KanaMemory {
  const basic = basicWords[literal];
  const memory: KanaMemory = {
    word: basic?.word ?? example ?? undefined,
    wordMeaningKo: basic?.meaning ?? meaning ?? undefined,
    cueKo: "",
    cueJa: "",
  };
  if (basic) {
    memory.cueKo = `‘${basic.word}’(${basic.meaning}) 속 ${literal}를 찾아 소리 내어 읽고, 단어와 글자 모양을 함께 떠올려 보세요.`;
    memory.cueJa = `「${basic.word}」の中の「${literal}」を見つけて声に出し、言葉と文字の形を一緒に思い出しましょう。`;
    const group = confusingGroups.find((value) => value.includes(literal));
    if (group) {
      memory.contrast = [...group].join(" / ");
      memory.contrastKo = "비슷해 보여도 다른 글자예요. 획 가이드에서 시작점과 끝나는 모양을 비교해 보세요.";
      memory.contrastJa = "似ていても別の文字です。筆順ガイドで書き始めと終わりの形を比べましょう。";
    }
    return memory;
  }
  if (literal === "ー") return {
    ...memory, formation: "コヒ → コーヒー", contrast: "コヒ / コーヒー",
    cueKo: "가로 막대를 ‘소리를 늘이는 표시’로 기억하세요. コーヒー를 들으며 길어지는 모음을 찾아보세요.",
    cueJa: "横線は音を伸ばす印。コーヒーを聞いて、伸びる母音を確かめましょう。",
    contrastKo: "비교용 표기예요. ー는 앞의 모음을 한 박자 늘이며, 별도의 ‘이치(一)’가 아니에요.",
    contrastJa: "比較用の表記です。ーは前の母音を一拍伸ばす記号で、漢字の一ではありません。",
  };
  if (literal === "ッ") return {
    ...memory, formation: "ツ → ッ", contrast: "ツ / ッ",
    cueKo: "작은 ッ는 ‘잠깐 멈추는 자리’로 기억하세요. カップ를 들으며 다음 자음 앞에서 한 박자 막는 느낌을 익혀요.",
    cueJa: "小さなッは一拍詰まる場所。カップを聞いて、次の子音の前で詰まる感覚を覚えましょう。",
    contrastKo: "큰 ツ는 츠(tsu), 작은 ッ는 촉음이에요. 크기가 달라지면 역할도 달라져요.",
    contrastJa: "大きなツはtsu、小さなッは促音です。大きさで役割が変わります。",
  };
  if (smallToLarge[literal]) return {
    ...memory, formation: `${smallToLarge[literal]} → ${literal}`, contrast: `${smallToLarge[literal]} / ${literal}`,
    cueKo: `‘${smallToLarge[literal]}의 작은 짝’으로 기억하세요. 앞 글자와 조합할 때는 크기를 줄여 오른쪽 아래에 써요.`,
    cueJa: `「${smallToLarge[literal]}の小さな仲間」と覚えましょう。前の文字と組み合わせるときは、小さく右下に書きます。`,
    contrastKo: "모양뿐 아니라 크기도 기억해요. 예시 단어에서 작은 글자의 위치를 찾아보세요.",
    contrastJa: "形だけでなく大きさも覚えましょう。例の単語で小さな文字の位置を探してみましょう。",
  };
  if ([...literal].length === 2) {
    const [first, second] = [...literal];
    const expanded = first + (smallToLarge[second] ?? second);
    return {
      ...memory, formation: `${first} + ${second} → ${literal}`, contrast: `${expanded} / ${literal}`,
      cueKo: `${first}를 쓴 뒤 작은 ${second}를 오른쪽 아래에 붙여요. 따로따로 읽지 않고 하나의 소리 덩어리로 기억하세요.`,
      cueJa: `${first}を書いてから、小さな${second}を右下に添えます。別々ではなく、一まとまりの音として覚えましょう。`,
      contrastKo: "왼쪽은 큰 글자를 나란히 쓴 비교용 표기예요. 오른쪽은 작은 글자를 붙인 조합이므로 발음도 함께 들어보세요.",
      contrastJa: "左は大きな文字を並べた比較用の表記です。右は小さな文字との組み合わせなので、発音も聞いてみましょう。",
    };
  }
  const [base, mark] = [...literal.normalize("NFD")];
  const semiVoiced = mark === "\u309a";
  const symbol = semiVoiced ? "゜" : "゛";
  const other = `${base}${semiVoiced ? "\u3099" : "\u309a"}`.normalize("NFC");
  return {
    ...memory, formation: `${base} + ${symbol} → ${literal}`,
    cueKo: `${base}를 먼저 쓰고 오른쪽 위에 ${semiVoiced ? "동그라미" : "점 두 개"}를 더하세요. 바탕 글자와 표시를 나누어 기억하면 쉬워요.`,
    cueJa: `${base}を先に書き、右上に${semiVoiced ? "丸" : "二つの点"}を加えます。元の文字と記号を分けて覚えましょう。`,
    contrast: [...other].length === 1 ? `${base} / ${literal} / ${other}` : `${base} / ${literal}`,
    contrastKo: "゛와 ゜는 다른 소리를 만드는 표시예요. 한국어 표기는 힌트로만 보고 일본어 발음을 들어보세요.",
    contrastJa: "゛と゜では音が変わります。記号を見分けながら、日本語の発音を聞きましょう。",
  };
}
