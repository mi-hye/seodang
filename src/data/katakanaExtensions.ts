// Practical examples; the loanword lesson is a curated subset, not an exhaustive
// transcription table. Reference: 文化庁「外来語の表記」第1表・第2表.
type ExtensionReading = { romaji: string; ko: string; example?: string; meaning?: string };

function rows(source: string): Record<string, ExtensionReading> {
  return Object.fromEntries(source.trim().split("\n").map((line) => {
    const [literal, romaji, ko, example, meaning] = line.trim().split("|");
    return [literal, { romaji, ko, example, meaning }];
  }));
}

export const katakanaExtensionReadings = rows(`
ガ|ga|가|ガス|가스
ギ|gi|기|ギター|기타
グ|gu|구|グラス|유리잔
ゲ|ge|게|ゲーム|게임
ゴ|go|고|ゴム|고무
ザ|za|자|ピザ|피자
ジ|ji|지|ジム|헬스장
ズ|zu|즈|ズボン|바지
ゼ|ze|제|ゼロ|영, 0
ゾ|zo|조|ゾーン|구역
ダ|da|다|ダンス|춤
ヂ|ji (di)|지
ヅ|zu (du)|즈
デ|de|데|デザート|디저트
ド|do|도|ドア|문
バ|ba|바|バス|버스
ビ|bi|비|ビール|맥주
ブ|bu|부|ブラシ|브러시
ベ|be|베|ベッド|침대
ボ|bo|보|ボタン|버튼
パ|pa|파|パン|빵
ピ|pi|피|ピアノ|피아노
プ|pu|푸|プール|수영장
ペ|pe|페|ペン|펜
ポ|po|포|ポスト|우편함
ァ|small a|작은 아|ファン|팬
ィ|small i|작은 이|ティー|차
ゥ|small u|작은 우|トゥデイ|오늘(today)
ェ|small e|작은 에|シェフ|셰프
ォ|small o|작은 오|フォーク|포크
ャ|small ya|작은 야|キャベツ|양배추
ュ|small yu|작은 유|ジュース|주스
ョ|small yo|작은 요|チョコ|초콜릿
ッ|sokuon|촉음|カップ|컵
ー|long vowel|장음|コーヒー|커피
キャ|kya|캬|キャベツ|양배추
キュ|kyu|큐|キューブ|큐브
キョ|kyo|쿄
シャ|sha|샤|シャツ|셔츠
シュ|shu|슈|シューズ|신발
ショ|sho|쇼|ショップ|가게
チャ|cha|차|チャット|채팅
チュ|chu|추|チューブ|튜브
チョ|cho|초|チョコ|초콜릿
ニャ|nya|냐
ニュ|nyu|뉴|ニュース|뉴스
ニョ|nyo|뇨
ヒャ|hya|햐
ヒュ|hyu|휴|ヒューマン|인간(human)
ヒョ|hyo|효
ミャ|mya|먀
ミュ|myu|뮤|ミュージック|음악
ミョ|myo|묘
リャ|rya|랴
リュ|ryu|류|リュック|배낭
リョ|ryo|료
ギャ|gya|갸|ギャラリー|갤러리
ギュ|gyu|규
ギョ|gyo|교|ギョーザ|교자
ジャ|ja|자|ジャム|잼
ジュ|ju|주|ジュース|주스
ジョ|jo|조|ジョギング|조깅
ビャ|bya|뱌
ビュ|byu|뷰|ビュー|전망
ビョ|byo|뵤
ピャ|pya|퍄
ピュ|pyu|퓨|ピュア|순수한
ピョ|pyo|표
ヴ|vu|부(vu)|ヴァイオリン|바이올린
ウィ|wi|위|ウィンドウ|창
ウェ|we|웨|ウェブ|웹
ウォ|wo|워|ウォーキング|걷기 운동
イェ|ye|예|イェーイ|예이! (환호)
シェ|she|셰|シェフ|셰프
ジェ|je|제|ジェット|제트
チェ|che|체|チェック|확인, 체크
ティ|ti|티|パーティー|파티
ディ|di|디|ディナー|저녁 식사
トゥ|tu|투|トゥデイ|오늘(today)
ドゥ|du|두|ドゥー・イット・ユアセルフ|직접 만들기(DIY)
デュ|dyu|듀|デュエット|듀엣
ファ|fa|파|ファイル|파일
フィ|fi|피|フィルム|필름
フェ|fe|페|カフェ|카페
フォ|fo|포|フォーク|포크
ヴァ|va|바(va)|ヴァイオリン|바이올린
ヴィ|vi|비(vi)|ヴィンテージ|빈티지
ヴェ|ve|베(ve)|ヴェール|베일
ヴォ|vo|보(vo)|ヴォーカル|보컬
ツァ|tsa|차(tsa)|モーツァルト|모차르트
ツェ|tse|체(tse)|ツェッペリン|체펠린 (이름)
`);

export function getKatakanaNote(literal: string, categoryKey: string) {
  if (literal === "ヂ" || literal === "ヅ") return {
    ko: "기본 탁음표에는 포함되지만 현대 외래어에서는 드물어요. 보통 ジ·ズ를 사용하며, 로마자 di·du는 입력 시 구별하는 표기예요.",
    ja: "濁音表には含まれますが、現代の外来語ではまれです。通常はジ・ズを使い、di・duは入力時の区別に使われます。",
  };
  if (categoryKey === "kana_katakana_loanwords") return {
    ko: "기본 50음도·탁음표와 별도로 배우는 외래어 표기예요. 외국어의 소리를 나타내며 단어나 이름에서 쓰여요." + (literal.includes("ヴ") ? " ヴ는 ウ에 탁점을 붙인 글자예요. バ행으로 쓰는 표기도 있어요." : " 작은 글자는 앞 글자와 이어서 읽어요."),
    ja: "基本の五十音・濁音表とは別に学ぶ外来語表記です。外国語の音を表し、単語や名前に使います。" + (literal.includes("ヴ") ? " ヴはウに濁点を付けた文字です。バ行で書く表記もあります。" : " 小さな仮名は前の文字と続けて読みます。"),
  };
  if (literal === "ー") return { ko: "앞의 모음을 한 박자 길게 늘여요. 가로쓰기에서는 왼쪽에서 오른쪽으로 씁니다.", ja: "前の母音を一拍分伸ばします。横書きでは左から右へ書きます。" };
  if (literal === "ッ") return { ko: "작은 ツ로, 다음 자음 앞에서 한 박자 막았다가 이어요. 큰 ツ(츠)와 구별해요. 음성은 예시 단어를 읽어요.", ja: "小さなツです。次の子音の前で一拍分詰まる音を表し、大きなツと区別します。音声では例の単語を読みます。" };
  if (categoryKey === "kana_katakana_small") return { ko: "보통 글자보다 작게 써요. 앞 글자와 조합해서 사용하며, 음성은 예시 단어를 읽어요.", ja: "通常の文字より小さく書きます。前の文字と組み合わせて使い、音声では例の単語を読みます。" };
  if (categoryKey === "kana_katakana_yoon") return { ko: "작은 ャ·ュ·ョ를 앞 글자와 합쳐 한 박자로 읽어요. 왼쪽 글자를 먼저 쓰고 작은 글자를 이어 씁니다.", ja: "小さなャ・ュ・ョを前の文字と合わせて一拍で読みます。左の文字を書いてから、小さな文字を書きます。" };
  return { ko: "゛는 탁음, ゜는 반탁음을 만드는 표시예요. 바탕 글자를 쓴 뒤 오른쪽 위에 표시를 더해요.", ja: "゛は濁音、゜は半濁音の記号です。元の文字を書いてから、右上に記号を加えます。" };
}
