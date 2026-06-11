#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const generatedDir = path.join(rootDir, "data/generated");
const defaultAuditPath = path.join(
  generatedDir,
  "kanji-enrichment-audit.generated.json"
);
const defaultOutputPath = path.join(
  generatedDir,
  "kanji-enrichment-suggestions.remaining.generated.json"
);

function buildSuggestion(row) {
  const meaningKo = chooseMeaningKo(row);
  const meaningJa = chooseMeaningJa(row);
  const kind = classifyRow(row, meaningKo, meaningJa);

  return {
    id: row.id,
    literal: row.literal,
    meaningKo,
    meaningJa,
    exampleJa: buildExampleJa(row.literal, kind),
    exampleKo: buildExampleKo(row.literal, kind),
    notes: buildNotes(row, kind),
  };
}

function chooseMeaningKo(row) {
  const current = normalizeNullable(row.meaningKo);
  if (current && !isLowQualityKo(current)) return current;

  const translated = translateEnglishToKo(row.meaningEn);
  if (translated && !isLowQualityKo(translated)) return translated;

  const fromJapanese = translateJapaneseToKo(row.meaningJa);
  if (fromJapanese) return fromJapanese;

  if (isRadicalLike(row)) return "한자 부품";
  return "희귀 한자";
}

function chooseMeaningJa(row) {
  const current = normalizeNullable(row.meaningJa);
  if (current && !isLowQualityJa(current)) return current;

  const translated = translateEnglishToJa(row.meaningEn);
  if (translated && !isLowQualityJa(translated)) return translated;

  if (isRadicalLike(row)) return "漢字の部品";
  return "希少な漢字";
}

function classifyRow(row, meaningKo, meaningJa) {
  const text = `${row.literal} ${meaningKo} ${meaningJa}`.toLowerCase();

  if (isRadicalLike(row) || text.includes("부품") || text.includes("部品")) {
    return "component";
  }

  if (
    text.includes("旧字体") ||
    text.includes("異体字") ||
    text.includes("구자체") ||
    text.includes("이체자")
  ) {
    return "variant";
  }

  if (text.includes("성씨") || text.includes("姓")) {
    return "surname";
  }

  if (text.includes("지명") || text.includes("地名")) {
    return "place";
  }

  return "rare";
}

function buildExampleJa(literal, kind) {
  if (kind === "component") {
    return `「${literal}」は漢字の部品として使われる形です。`;
  }

  if (kind === "variant") {
    return `「${literal}」は古い字体や異体字として使われる漢字です。`;
  }

  if (kind === "surname") {
    return `「${literal}」は姓などで使われることがある漢字です。`;
  }

  if (kind === "place") {
    return `「${literal}」は地名などで使われることがある漢字です。`;
  }

  return `「${literal}」は日常ではほとんど使われない漢字です。`;
}

function buildExampleKo(literal, kind) {
  if (kind === "component") {
    return `‘${literal}’은 한자의 부품으로 쓰이는 형태입니다.`;
  }

  if (kind === "variant") {
    return `‘${literal}’은 오래된 자형이나 이체자로 쓰이는 한자입니다.`;
  }

  if (kind === "surname") {
    return `‘${literal}’은 성씨 등에서 쓰이는 경우가 있는 한자입니다.`;
  }

  if (kind === "place") {
    return `‘${literal}’은 지명 등에서 쓰이는 경우가 있는 한자입니다.`;
  }

  return `‘${literal}’은 일상에서는 거의 쓰이지 않는 한자입니다.`;
}

function buildNotes(row, kind) {
  const source = Array.isArray(row.meaningEn) && row.meaningEn.length > 0
    ? `meaningEn=${row.meaningEn.slice(0, 3).join("; ")}`
    : "no meaningEn";

  return `auto-generated ${kind} fallback; ${source}`;
}

function translateEnglishToKo(values) {
  const entries = normalizeMeaningEn(values);
  if (entries.length === 0) return null;

  const translated = entries
    .slice(0, 3)
    .map((value) => translatePhrase(value, englishKoMap))
    .filter(Boolean);

  return unique(translated).join(", ") || null;
}

function translateEnglishToJa(values) {
  const entries = normalizeMeaningEn(values);
  if (entries.length === 0) return null;

  const translated = entries
    .slice(0, 3)
    .map((value) => translatePhrase(value, englishJaMap))
    .filter(Boolean);

  return unique(translated).join("、") || null;
}

function normalizeMeaningEn(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function translatePhrase(value, map) {
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();

  if (map.has(normalized)) return map.get(normalized);

  for (const [key, translated] of map.entries()) {
    if (key.includes(" ") && normalized.includes(key)) return translated;
  }

  return null;
}

function translateJapaneseToKo(value) {
  const text = normalizeNullable(value);
  if (!text) return null;

  for (const [key, translated] of japaneseKoMap.entries()) {
    if (text.includes(key)) return translated;
  }

  return null;
}

function isLowQualityKo(value) {
  const normalized = normalizeText(value);
  if (lowQualityKoValues.has(normalized) || !/[가-힣]/.test(normalized)) {
    return true;
  }

  return normalized
    .split(/[、,]/)
    .map((token) => token.trim())
    .filter(Boolean)
    .some((token) => lowQualityKoValues.has(token));
}

function isLowQualityJa(value) {
  const normalized = normalizeText(value);
  if (lowQualityJaValues.has(normalized)) return true;
  if (/[가-힣]/.test(normalized)) return true;
  return /^[ァ-ヴー、・\s]+$/.test(normalized);
}

function isRadicalLike(row) {
  return row.meaningKo === "부수" || row.issues.includes("missingMeaningJa") &&
    String(row.literal ?? "").length === 1 &&
    !row.meaningEn?.length;
}

function normalizeNullable(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function unique(values) {
  return [...new Set(values)];
}

function isPracticalRow(row) {
  return Boolean(row.isJoyo || row.jlptLevel || row.japaneseSchoolLevel);
}

async function readAudit(filePath) {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed?.rows)) {
    throw new Error(`Expected ${filePath} to contain an audit object with rows.`);
  }

  return parsed;
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseArgs(argv) {
  const options = {
    input: defaultAuditPath,
    output: defaultOutputPath,
    practicalOnly: true,
    nonPracticalOnly: false,
    limit: Number.POSITIVE_INFINITY,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--input") {
      options.input = path.resolve(rootDir, requireValue(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--output") {
      options.output = path.resolve(rootDir, requireValue(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--all") {
      options.practicalOnly = false;
      options.nonPracticalOnly = false;
      continue;
    }

    if (arg === "--non-practical") {
      options.practicalOnly = false;
      options.nonPracticalOnly = true;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const value = Number(arg.slice("--limit=".length));
      if (!Number.isInteger(value) || value < 0) {
        throw new Error("Expected --limit to be a non-negative integer.");
      }
      options.limit = value;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function requireValue(argv, index, arg) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Expected a value after ${arg}.`);
  }
  return value;
}

const lowQualityKoValues = new Set([
  "-",
  "뜻 미상",
  "뜻미상",
  "미상",
  "알 수 없음",
  "에",
  "에서",
  "안",
  "와",
  "그리고",
  "용",
  "위로",
  "리드",
  "공기",
  "부수",
  "되다",
  "커지다",
  "작은",
  "큰",
  "이름",
  "성씨",
]);

const lowQualityJaValues = new Set([
  "-",
  "意味未詳",
  "未詳",
  "不明",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
  "十",
  "人",
  "男",
  "女",
  "子ども",
  "友",
  "群れ",
  "姓",
  "名",
  "地名",
  "水",
  "火",
  "木",
  "草",
  "花",
  "鳥",
  "魚",
  "動物",
  "馬",
  "竜",
  "玉",
  "金",
  "金属",
  "石",
  "刀",
  "手",
  "足",
  "目",
  "耳",
  "口",
  "心",
  "体",
  "頭",
  "髪",
  "大きい",
  "小さい",
  "長い",
  "短い",
  "高い",
  "低い",
  "深い",
  "広い",
  "狭い",
  "よい",
  "悪い",
  "美しい",
  "強い",
  "弱い",
  "明るい",
  "暗い",
  "澄んだ",
  "静か",
  "熱い",
  "冷たい",
  "暖かい",
  "乾く",
  "濡れる",
  "正しい",
  "誤り",
  "来る",
  "行く",
  "会う",
  "見る",
  "聞く",
  "話す",
  "言う",
  "問う",
  "思う",
  "知る",
  "書く",
  "読む",
  "食べる",
  "飲む",
  "眠る",
  "立つ",
  "座る",
  "歩く",
  "走る",
  "飛ぶ",
  "落ちる",
  "開く",
  "閉じる",
  "切る",
  "壊す",
  "合わせる",
  "集める",
  "散らす",
  "焼く",
  "作る",
  "使う",
  "与える",
  "受ける",
  "取る",
  "持つ",
  "支える",
  "助ける",
  "従う",
  "導く",
  "治める",
  "守る",
  "戦う",
  "殺す",
  "隠す",
  "逃げる",
  "避ける",
  "恐れる",
  "敬う",
  "愛する",
  "笑う",
  "泣く",
  "苦しむ",
  "だます",
  "盗む",
  "買う",
  "売る",
  "測る",
  "単位",
  "部首",
]);

const englishKoMap = new Map([
  ["one", "하나"],
  ["two", "둘"],
  ["three", "셋"],
  ["four", "넷"],
  ["five", "다섯"],
  ["six", "여섯"],
  ["seven", "일곱"],
  ["eight", "여덟"],
  ["nine", "아홉"],
  ["ten", "열"],
  ["person", "사람"],
  ["man", "남자"],
  ["woman", "여자"],
  ["child", "아이"],
  ["son", "아들"],
  ["daughter", "딸"],
  ["father", "아버지"],
  ["mother", "어머니"],
  ["elder brother", "형"],
  ["younger brother", "남동생"],
  ["friend", "친구"],
  ["crowd", "무리"],
  ["surname", "성씨"],
  ["name", "이름"],
  ["place name", "지명"],
  ["village", "마을"],
  ["city", "도시"],
  ["country", "나라"],
  ["mountain", "산"],
  ["river", "강"],
  ["water", "물"],
  ["fire", "불"],
  ["tree", "나무"],
  ["grass", "풀"],
  ["flower", "꽃"],
  ["bird", "새"],
  ["fish", "물고기"],
  ["animal", "동물"],
  ["horse", "말"],
  ["dog", "개"],
  ["cow", "소"],
  ["sheep", "양"],
  ["deer", "사슴"],
  ["tiger", "호랑이"],
  ["dragon", "용"],
  ["shell", "조개"],
  ["stone", "돌"],
  ["jade", "옥"],
  ["gold", "금"],
  ["metal", "금속"],
  ["iron", "철"],
  ["sword", "칼"],
  ["knife", "칼"],
  ["bow", "활"],
  ["arrow", "화살"],
  ["hand", "손"],
  ["foot", "발"],
  ["eye", "눈"],
  ["ear", "귀"],
  ["mouth", "입"],
  ["heart", "마음"],
  ["body", "몸"],
  ["head", "머리"],
  ["hair", "머리카락"],
  ["blood", "피"],
  ["bone", "뼈"],
  ["meat", "고기"],
  ["skin", "피부"],
  ["white", "희다"],
  ["black", "검다"],
  ["red", "붉다"],
  ["blue", "푸르다"],
  ["yellow", "노랗다"],
  ["green", "초록"],
  ["big", "크다"],
  ["large", "크다"],
  ["small", "작다"],
  ["little", "작다"],
  ["long", "길다"],
  ["short", "짧다"],
  ["high", "높다"],
  ["low", "낮다"],
  ["deep", "깊다"],
  ["wide", "넓다"],
  ["narrow", "좁다"],
  ["good", "좋다"],
  ["bad", "나쁘다"],
  ["beautiful", "아름답다"],
  ["ugly", "추하다"],
  ["strong", "강하다"],
  ["weak", "약하다"],
  ["old", "오래되다"],
  ["new", "새롭다"],
  ["young", "어리다"],
  ["bright", "밝다"],
  ["dark", "어둡다"],
  ["clear", "맑다"],
  ["quiet", "조용하다"],
  ["peaceful", "평화롭다"],
  ["hot", "뜨겁다"],
  ["cold", "차갑다"],
  ["warm", "따뜻하다"],
  ["dry", "마르다"],
  ["wet", "젖다"],
  ["right", "바르다"],
  ["correct", "바르다"],
  ["wrong", "그르다"],
  ["straight", "곧다"],
  ["crooked", "굽다"],
  ["to go", "가다"],
  ["go", "가다"],
  ["come", "오다"],
  ["meet", "만나다"],
  ["see", "보다"],
  ["look", "보다"],
  ["hear", "듣다"],
  ["listen", "듣다"],
  ["speak", "말하다"],
  ["say", "말하다"],
  ["tell", "말하다"],
  ["ask", "묻다"],
  ["think", "생각하다"],
  ["know", "알다"],
  ["learn", "배우다"],
  ["write", "쓰다"],
  ["read", "읽다"],
  ["eat", "먹다"],
  ["drink", "마시다"],
  ["sleep", "자다"],
  ["stand", "서다"],
  ["sit", "앉다"],
  ["walk", "걷다"],
  ["run", "달리다"],
  ["fly", "날다"],
  ["fall", "떨어지다"],
  ["rise", "오르다"],
  ["enter", "들어가다"],
  ["exit", "나가다"],
  ["open", "열다"],
  ["close", "닫다"],
  ["cut", "자르다"],
  ["break", "부수다"],
  ["split", "나누다"],
  ["join", "합치다"],
  ["gather", "모으다"],
  ["collect", "모으다"],
  ["scatter", "흩다"],
  ["wash", "씻다"],
  ["clean", "깨끗하다"],
  ["burn", "태우다"],
  ["boil", "끓이다"],
  ["cook", "요리하다"],
  ["make", "만들다"],
  ["use", "사용하다"],
  ["give", "주다"],
  ["receive", "받다"],
  ["take", "잡다"],
  ["hold", "잡다"],
  ["support", "지탱하다"],
  ["help", "돕다"],
  ["aid", "돕다"],
  ["follow", "따르다"],
  ["lead", "이끌다"],
  ["rule", "다스리다"],
  ["govern", "다스리다"],
  ["protect", "지키다"],
  ["defend", "지키다"],
  ["fight", "싸우다"],
  ["kill", "죽이다"],
  ["die", "죽다"],
  ["hide", "숨기다"],
  ["escape", "달아나다"],
  ["avoid", "피하다"],
  ["fear", "두려워하다"],
  ["respect", "공경하다"],
  ["love", "사랑하다"],
  ["hate", "미워하다"],
  ["laugh", "웃다"],
  ["cry", "울다"],
  ["suffer", "괴로워하다"],
  ["deceive", "속이다"],
  ["steal", "훔치다"],
  ["buy", "사다"],
  ["sell", "팔다"],
  ["trade", "장사하다"],
  ["measure", "재다"],
  ["count", "세다"],
  ["number", "숫자"],
  ["unit", "단위"],
  ["radical", "부수"],
]);

const englishJaMap = new Map([
  ["one", "一"],
  ["two", "二"],
  ["three", "三"],
  ["four", "四"],
  ["five", "五"],
  ["six", "六"],
  ["seven", "七"],
  ["eight", "八"],
  ["nine", "九"],
  ["ten", "十"],
  ["person", "人"],
  ["man", "男"],
  ["woman", "女"],
  ["child", "子ども"],
  ["friend", "友"],
  ["crowd", "群れ"],
  ["surname", "姓"],
  ["name", "名"],
  ["place name", "地名"],
  ["water", "水"],
  ["fire", "火"],
  ["tree", "木"],
  ["grass", "草"],
  ["flower", "花"],
  ["bird", "鳥"],
  ["fish", "魚"],
  ["animal", "動物"],
  ["horse", "馬"],
  ["dragon", "竜"],
  ["jade", "玉"],
  ["gold", "金"],
  ["metal", "金属"],
  ["stone", "石"],
  ["sword", "刀"],
  ["hand", "手"],
  ["foot", "足"],
  ["eye", "目"],
  ["ear", "耳"],
  ["mouth", "口"],
  ["heart", "心"],
  ["body", "体"],
  ["head", "頭"],
  ["hair", "髪"],
  ["big", "大きい"],
  ["large", "大きい"],
  ["small", "小さい"],
  ["long", "長い"],
  ["short", "短い"],
  ["high", "高い"],
  ["low", "低い"],
  ["deep", "深い"],
  ["wide", "広い"],
  ["narrow", "狭い"],
  ["good", "よい"],
  ["bad", "悪い"],
  ["beautiful", "美しい"],
  ["strong", "強い"],
  ["weak", "弱い"],
  ["bright", "明るい"],
  ["dark", "暗い"],
  ["clear", "澄んだ"],
  ["quiet", "静か"],
  ["hot", "熱い"],
  ["cold", "冷たい"],
  ["warm", "暖かい"],
  ["dry", "乾く"],
  ["wet", "濡れる"],
  ["right", "正しい"],
  ["correct", "正しい"],
  ["wrong", "誤り"],
  ["come", "来る"],
  ["go", "行く"],
  ["meet", "会う"],
  ["see", "見る"],
  ["hear", "聞く"],
  ["speak", "話す"],
  ["say", "言う"],
  ["ask", "問う"],
  ["think", "思う"],
  ["know", "知る"],
  ["write", "書く"],
  ["read", "読む"],
  ["eat", "食べる"],
  ["drink", "飲む"],
  ["sleep", "眠る"],
  ["stand", "立つ"],
  ["sit", "座る"],
  ["walk", "歩く"],
  ["run", "走る"],
  ["fly", "飛ぶ"],
  ["fall", "落ちる"],
  ["open", "開く"],
  ["close", "閉じる"],
  ["cut", "切る"],
  ["break", "壊す"],
  ["join", "合わせる"],
  ["gather", "集める"],
  ["collect", "集める"],
  ["scatter", "散らす"],
  ["burn", "焼く"],
  ["make", "作る"],
  ["use", "使う"],
  ["give", "与える"],
  ["receive", "受ける"],
  ["take", "取る"],
  ["hold", "持つ"],
  ["support", "支える"],
  ["help", "助ける"],
  ["aid", "助ける"],
  ["follow", "従う"],
  ["lead", "導く"],
  ["rule", "治める"],
  ["protect", "守る"],
  ["fight", "戦う"],
  ["kill", "殺す"],
  ["hide", "隠す"],
  ["escape", "逃げる"],
  ["avoid", "避ける"],
  ["fear", "恐れる"],
  ["respect", "敬う"],
  ["love", "愛する"],
  ["laugh", "笑う"],
  ["cry", "泣く"],
  ["suffer", "苦しむ"],
  ["deceive", "だます"],
  ["steal", "盗む"],
  ["buy", "買う"],
  ["sell", "売る"],
  ["measure", "測る"],
  ["unit", "単位"],
  ["radical", "部首"],
]);

const japaneseKoMap = new Map([
  ["あつまる", "모이다"],
  ["あわせる", "합치다"],
  ["あらい", "거칠다"],
  ["あわれむ", "가엾게 여기다"],
  ["いう", "말하다"],
  ["いく", "가다"],
  ["うつくしい", "아름답다"],
  ["おおきい", "크다"],
  ["おごる", "교만하다"],
  ["おそれる", "두려워하다"],
  ["おさめる", "다스리다"],
  ["かげ", "그늘"],
  ["かたい", "단단하다"],
  ["かるい", "가볍다"],
  ["きびしい", "엄하다"],
  ["くるしむ", "괴로워하다"],
  ["こころ", "마음"],
  ["さびしい", "쓸쓸하다"],
  ["しずか", "조용하다"],
  ["したがう", "따르다"],
  ["すすめる", "나아가다"],
  ["たすける", "돕다"],
  ["たのむ", "부탁하다"],
  ["つとめる", "힘쓰다"],
  ["とぶ", "날다"],
  ["ながれる", "흐르다"],
  ["ならぶ", "나란하다"],
  ["にる", "닮다"],
  ["はかる", "재다"],
  ["ひくい", "낮다"],
  ["ひねる", "비틀다"],
  ["ひろい", "넓다"],
  ["まねる", "모방하다"],
  ["まるい", "둥글다"],
  ["もつ", "잡다"],
  ["よる", "의지하다"],
]);

await main();

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const audit = await readAudit(options.input);
  const rows = audit.rows
    .filter((row) => row.issues.length > 0)
    .filter((row) => (options.practicalOnly ? isPracticalRow(row) : true))
    .filter((row) => (options.nonPracticalOnly ? !isPracticalRow(row) : true))
    .slice(0, options.limit);

  const suggestions = rows.map(buildSuggestion);

  await mkdir(path.dirname(options.output), { recursive: true });
  await writeJson(options.output, suggestions);

  console.log(`Wrote ${path.relative(rootDir, options.output)}`);
  console.log(`Suggestion rows: ${suggestions.length}`);
}
