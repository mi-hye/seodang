import { readFile } from "node:fs/promises";
import path from "node:path";

const topics = [
  ["朝の市場", "市場", "いちば", "시장", "朝の市場で旬の野菜を選ぶ", "아침 시장에서 제철 채소를 고르는 일"],
  ["雨の日の喫茶店", "喫茶店", "きっさてん", "찻집", "雨音を聞きながら喫茶店で本を読む", "빗소리를 들으며 찻집에서 책을 읽는 일"],
  ["川辺の散歩", "川辺", "かわべ", "강가", "夕方の川辺をゆっくり歩く", "저녁 무렵 강가를 천천히 걷는 일"],
  ["町の小さな祭り", "祭り", "まつり", "축제", "地域の人と夏祭りを準備する", "동네 사람들과 여름 축제를 준비하는 일"],
  ["駅で見つけた親切", "親切", "しんせつ", "친절", "駅で道に迷った旅行者を手伝う", "역에서 길을 잃은 여행자를 돕는 일"],
  ["早起きした朝", "早起き", "はやおき", "일찍 일어남", "早起きをして静かな町を見る", "일찍 일어나 조용한 동네를 보는 일"],
  ["図書館の窓", "図書館", "としょかん", "도서관", "図書館の窓辺で昔話を読む", "도서관 창가에서 옛날이야기를 읽는 일"],
  ["夏の風鈴", "風鈴", "ふうりん", "풍경", "窓辺の風鈴から季節を感じる", "창가의 풍경 소리에서 계절을 느끼는 일"],
  ["一杯のお茶", "一杯", "いっぱい", "한 잔", "家族と温かいお茶を飲む", "가족과 따뜻한 차를 마시는 일"],
  ["古い写真", "写真", "しゃしん", "사진", "古い写真を見ながら祖母の話を聞く", "오래된 사진을 보며 할머니 이야기를 듣는 일"],
  ["公園のベンチ", "公園", "こうえん", "공원", "公園のベンチで行き交う人を見る", "공원 벤치에서 오가는 사람을 바라보는 일"],
  ["手紙を書く時間", "手紙", "てがみ", "편지", "遠くに住む友人へ手紙を書く", "멀리 사는 친구에게 편지를 쓰는 일"],
  ["商店街のパン屋", "商店街", "しょうてんがい", "상점가", "商店街のパン屋で焼きたてのパンを買う", "상점가 빵집에서 갓 구운 빵을 사는 일"],
  ["山の天気", "天気", "てんき", "날씨", "山を歩きながら空の変化に気づく", "산을 걸으며 하늘의 변화를 알아차리는 일"],
  ["電車の忘れ物", "忘れ物", "わすれもの", "분실물", "電車で見つけた忘れ物を駅員に渡す", "전철에서 발견한 분실물을 역무원에게 건네는 일"],
  ["静かな朝ご飯", "朝ご飯", "あさごはん", "아침밥", "炊きたてのご飯で一日を始める", "갓 지은 밥으로 하루를 시작하는 일"],
  ["海辺の清掃", "清掃", "せいそう", "청소", "仲間と海辺のごみを拾う", "동료들과 해변의 쓰레기를 줍는 일"],
  ["新しい自転車", "自転車", "じてんしゃ", "자전거", "自転車でいつもと違う道を走る", "자전거로 평소와 다른 길을 달리는 일"],
  ["夕焼けの色", "夕焼け", "ゆうやけ", "저녁노을", "帰り道で夕焼けの色を眺める", "귀갓길에 저녁노을 빛을 바라보는 일"],
  ["地域の食堂", "食堂", "しょくどう", "식당", "地域の食堂で世代の違う人と話す", "동네 식당에서 세대가 다른 사람과 대화하는 일"],
  ["木陰の読書", "木陰", "こかげ", "나무 그늘", "木陰で短い物語を読む", "나무 그늘에서 짧은 이야기를 읽는 일"],
  ["道具を直す", "道具", "どうぐ", "도구", "壊れた道具を捨てずに直す", "고장 난 도구를 버리지 않고 고치는 일"],
  ["夜の虫の声", "虫の声", "むしのこえ", "벌레 소리", "夜の庭で虫の声に耳を澄ます", "밤의 뜰에서 벌레 소리에 귀 기울이는 일"],
  ["都市の余白", "余白", "よはく", "여백", "目的のない空間が人に与えるものを考える", "목적 없는 공간이 사람에게 주는 것을 생각하는 일"],
];

const env = await loadEnv(path.join(process.cwd(), ".env"));
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase credentials in .env");

const rows = topics.flatMap((topic, index) => buildRows(`2026-08-${String(index + 1).padStart(2, "0")}`, topic));
const response = await fetch(`${supabaseUrl}/rest/v1/daily_readings?on_conflict=reading_date,level`, {
  method: "POST",
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify(rows),
});
if (!response.ok) throw new Error(`Backfill failed: ${response.status} ${await response.text()}`);
console.log(`Upserted ${rows.length} daily readings for 2026-08-01 through 2026-08-24.`);

function buildRows(date, [title, keyword, reading, meaningKo, sceneJa, sceneKo]) {
  const beginnerVocabulary = [
    { surface: keyword, reading, meaningKo, forms: [] },
    { surface: "気づく", reading: "きづく", meaningKo: "깨닫다, 알아차리다", forms: ["気づきました"] },
    { surface: "感じる", reading: "かんじる", meaningKo: "느끼다", forms: ["感じました"] },
    { surface: "時間", reading: "じかん", meaningKo: "시간", forms: [] },
    { surface: "身近", reading: "みぢか", meaningKo: "가까움, 친숙함", forms: [] },
  ];
  const intermediateVocabulary = [
    { surface: keyword, reading, meaningKo, forms: [] },
    { surface: "見過ごす", reading: "みすごす", meaningKo: "간과하다", forms: ["見過ごして"] },
    { surface: "周囲", reading: "しゅうい", meaningKo: "주위", forms: [] },
    { surface: "目的地", reading: "もくてきち", meaningKo: "목적지", forms: [] },
    { surface: "暮らし", reading: "くらし", meaningKo: "생활, 삶", forms: [] },
  ];
  const advancedVocabulary = [
    { surface: keyword, reading, meaningKo, forms: [] },
    { surface: "効率", reading: "こうりつ", meaningKo: "효율", forms: [] },
    { surface: "省く", reading: "はぶく", meaningKo: "생략하다", forms: ["省いて"] },
    { surface: "観察", reading: "かんさつ", meaningKo: "관찰", forms: [] },
    { surface: "多様", reading: "たよう", meaningKo: "다양함", forms: [] },
  ];
  const beginnerBody = `今日は、${sceneJa}ことにしました。最初はいつもと同じ一日だと思っていました。しかし、少しゆっくり行動すると、今まで見えなかった小さな変化に気づきました。${keyword}のそばで立ち止まり、周りの音や風を感じました。短い時間でしたが、心が落ち着きました。明日も身近なものをよく見たいと思います。`;
  const intermediateBody = `${sceneJa}ことには、特別な準備は必要ありません。それでも、急いでいるときには見過ごしてしまう発見があります。私は${keyword}をきっかけに、周囲の音や人の動きへ目を向けました。すると、同じ場所でも時間によって表情が変わることに気づきました。便利さを求める生活では、目的地へ早く着くことばかり考えがちです。しかし、途中で立ち止まる時間があるからこそ、自分の気持ちを確かめたり、誰かの親切に気づいたりできます。日常を豊かにするのは大きな出来事だけではありません。小さな変化を受け止める余裕も、暮らしに必要なのだと思います。`;
  const advancedBody = `${sceneJa}という経験は、日常にある小さな選択の意味を考えるきっかけになった。効率を優先すると、私たちは目的に直接関係しないものを無意識に省いてしまう。だが、${keyword}に目を向けてみると、そうした一見余分に思える時間の中に、感覚や記憶を整える働きがあることに気づく。\n\n人は場所を単に利用しているだけではない。音や匂い、偶然交わした言葉を通じて、その場所との関係を少しずつ作っている。あらかじめ結果が決められた行動からは安心が得られる一方、予定外の発見は生まれにくい。立ち止まって周囲を観察することは、忙しさによって狭くなった注意を再び広げる行為でもある。\n\nもちろん、毎日の速度を大きく変える必要はない。数分だけ別の道を選ぶ、目の前の変化を言葉にする、身近な人と感想を共有する。その小さな実践が、慣れた風景を新しく見せてくれる。暮らしの豊かさは、所有する物の数だけでなく、同じ時間からどれだけ多様な意味を見つけられるかによっても形作られるのである。`;
  const beginnerTranslation = `오늘은 ${sceneKo}로 했습니다. 처음에는 평소와 같은 하루라고 생각했습니다. 하지만 조금 천천히 움직이자 지금까지 보이지 않던 작은 변화를 알아차렸습니다. ${meaningKo} 곁에 멈춰 서서 주변의 소리와 바람을 느꼈습니다. 짧은 시간이었지만 마음이 차분해졌습니다. 내일도 가까이에 있는 것들을 자세히 보고 싶습니다.`;
  const intermediateTranslation = `${sceneKo}에는 특별한 준비가 필요하지 않습니다. 그래도 서두를 때에는 놓치고 마는 발견이 있습니다. 저는 ${meaningKo}을 계기로 주위의 소리와 사람들의 움직임에 눈을 돌렸습니다. 그러자 같은 장소도 시간에 따라 표정이 달라진다는 것을 알아차렸습니다. 편리함을 추구하는 생활에서는 목적지에 빨리 도착하는 것만 생각하기 쉽습니다. 그러나 도중에 멈추는 시간이 있기에 자신의 마음을 확인하고 누군가의 친절을 알아차릴 수 있습니다. 일상을 풍요롭게 하는 것은 큰 사건만이 아닙니다. 작은 변화를 받아들이는 여유도 삶에 필요하다고 생각합니다.`;
  const advancedTranslation = `${sceneKo}은 일상의 작은 선택이 가진 의미를 생각하게 하는 계기가 되었습니다. 효율을 우선하면 우리는 목적과 직접 관련 없는 것을 무의식적으로 생략합니다. 하지만 ${meaningKo}에 눈을 돌리면 얼핏 불필요해 보이는 시간 속에도 감각과 기억을 정돈하는 작용이 있음을 깨닫게 됩니다.\n\n사람은 장소를 단지 이용하기만 하는 것이 아닙니다. 소리와 냄새, 우연히 나눈 말을 통해 그 장소와의 관계를 조금씩 만듭니다. 결과가 정해진 행동에서는 안심을 얻지만 예정 밖의 발견은 생기기 어렵습니다. 멈춰 서서 주위를 관찰하는 것은 바쁨 때문에 좁아진 주의를 다시 넓히는 일이기도 합니다.\n\n매일의 속도를 크게 바꿀 필요는 없습니다. 몇 분만 다른 길을 고르거나 눈앞의 변화를 말로 표현하고 가까운 사람과 감상을 나누는 작은 실천이 익숙한 풍경을 새롭게 보여 줍니다. 삶의 풍요로움은 가진 물건의 수뿐 아니라 같은 시간에서 얼마나 다양한 의미를 찾아내는가에 의해서도 만들어집니다.`;
  return [
    row(date, "beginner", title, beginnerBody, beginnerTranslation, 600, 5, beginnerVocabulary),
    row(date, "intermediate", `${title}から見える日常`, intermediateBody, intermediateTranslation, 1500, 10, intermediateVocabulary),
    row(date, "advanced", `${title}と日常の選択`, advancedBody, advancedTranslation, 3000, 15, advancedVocabulary),
  ];
}

function row(reading_date, level, title_ja, body_ja, translation_ko, max_characters, minutes, vocabulary) {
  return { reading_date, level, title_ja, body_ja, translation_ko, max_characters, minutes, vocabulary, generator: "codex-backfill", model: null, review_status: "rejected", reviewer: "codex-review-2026-08-24", review_notes: ["Legacy template content; replace through the independent review pipeline."], reviewed_at: new Date().toISOString() };
}

async function loadEnv(filePath) {
  const text = await readFile(filePath, "utf8");
  return Object.fromEntries(text.split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['\"]|['\"]$/g, "")];
  }));
}
