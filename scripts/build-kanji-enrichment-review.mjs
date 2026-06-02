import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const generatedDir = path.join(rootDir, "data/generated");
const primaryMetadataPath = path.join(generatedDir, "kanji-metadata.generated.json");
const fallbackMetadataPath = path.join(rootDir, "data/seeds/kanji-metadata.sample.json");
const reviewOutputPath = path.join(
  generatedDir,
  "kanji-enrichment-review.generated.json"
);

const NUMERIC_EXAMPLE_VARIANTS_UNUSED = {
  一: [
    { ja: "一つある。", ko: "하나 있다." },
    { ja: "一人だ。", ko: "한 사람이다." },
    { ja: "一日だ。", ko: "하루다." },
  ],
  二: [
    { ja: "二つある。", ko: "두 개가 있다." },
    { ja: "二人いる。", ko: "두 명이 있다." },
    { ja: "二時だ。", ko: "두 시다." },
  ],
  三: [
    { ja: "三つある。", ko: "세 개가 있다." },
    { ja: "三人いる。", ko: "세 명이 있다." },
    { ja: "三時だ。", ko: "세 시다." },
  ],
  四: [
    { ja: "四つある。", ko: "네 개가 있다." },
    { ja: "四人いる。", ko: "네 명이 있다." },
    { ja: "四時だ。", ko: "네 시다." },
  ],
  五: [
    { ja: "五つある。", ko: "다섯 개가 있다." },
    { ja: "五人いる。", ko: "다섯 명이 있다." },
    { ja: "五時だ。", ko: "다섯 시다." },
  ],
  六: [
    { ja: "六つある。", ko: "여섯 개가 있다." },
    { ja: "六人いる。", ko: "여섯 명이 있다." },
    { ja: "六時だ。", ko: "여섯 시다." },
  ],
  七: [
    { ja: "七つある。", ko: "일곱 개가 있다." },
    { ja: "七人いる。", ko: "일곱 명이 있다." },
    { ja: "七時だ。", ko: "일곱 시다." },
  ],
  八: [
    { ja: "八つある。", ko: "여덟 개가 있다." },
    { ja: "八人いる。", ko: "여덟 명이 있다." },
    { ja: "八時だ。", ko: "여덟 시다." },
  ],
  九: [
    { ja: "九つある。", ko: "아홉 개가 있다." },
    { ja: "九人いる。", ko: "아홉 명이 있다." },
    { ja: "九時だ。", ko: "아홉 시다." },
  ],
  十: [
    { ja: "十人いる。", ko: "열 명이 있다." },
    { ja: "十日だ。", ko: "열흘이다." },
    { ja: "十時だ。", ko: "열 시다." },
  ],
};

const EXAMPLE_VARIANT_MAP_UNUSED = {
  上: [{ ja: "上にある。", ko: "위에 있다." }],
  下: [{ ja: "下にある。", ko: "아래에 있다." }],
  中: [{ ja: "中に入る。", ko: "안에 들어간다." }],
  人: [{ ja: "人が多い。", ko: "사람이 많다." }],
  休: [{ ja: "今日は休む。", ko: "오늘은 쉰다." }],
  先: [{ ja: "先に行く。", ko: "먼저 간다." }],
  入: [{ ja: "中に入る。", ko: "안에 들어간다." }],
  出: [{ ja: "外に出る。", ko: "밖으로 나온다." }],
  円: [{ ja: "百円だ。", ko: "백 엔이다." }],
  千: [{ ja: "千円だ。", ko: "천 엔이다." }],
  右: [{ ja: "右に曲がる。", ko: "오른쪽으로 돈다." }],
  左: [{ ja: "左に曲がる。", ko: "왼쪽으로 돈다." }],
  名: [{ ja: "名前を書く。", ko: "이름을 적는다." }],
  土: [{ ja: "土がぬれている。", ko: "흙이 젖어 있다." }],
  大: [{ ja: "大きい犬だ。", ko: "큰 개다." }],
  天: [{ ja: "天気がいい。", ko: "날씨가 좋다." }],
  女: [{ ja: "女の人が来る。", ko: "여자가 온다." }],
  子: [{ ja: "子が笑う。", ko: "아이가 웃는다." }],
  学: [{ ja: "学校で学ぶ。", ko: "학교에서 배운다." }],
  小: [{ ja: "小さい箱だ。", ko: "작은 상자다." }],
  山: [{ ja: "山に登る。", ko: "산에 오른다." }],
  川: [{ ja: "川が流れる。", ko: "강이 흐른다." }],
  年: [{ ja: "今年は新しい年だ。", ko: "올해는 새로운 해다." }],
  日: [{ ja: "日が出る。", ko: "해가 뜬다." }],
  月: [{ ja: "月がきれいだ。", ko: "달이 예쁘다." }],
  木: [{ ja: "木が高い。", ko: "나무가 높다." }],
  本: [{ ja: "本を読む。", ko: "책을 읽는다." }],
  校: [{ ja: "学校へ行く。", ko: "학교에 간다." }],
  気: [{ ja: "気が楽だ。", ko: "마음이 편하다." }],
  水: [{ ja: "水を飲む。", ko: "물을 마신다." }],
  火: [{ ja: "火を消す。", ko: "불을 끈다." }],
  金: [{ ja: "金を払う。", ko: "돈을 낸다." }],
  口: [{ ja: "口を開く。", ko: "입을 연다." }],
  車: [{ ja: "車で行く。", ko: "차로 간다." }],
  生: [{ ja: "生きるのは大事だ。", ko: "사는 것은 중요하다." }],
  男: [{ ja: "男が立つ。", ko: "남자가 선다." }],
  百: [{ ja: "百人いる。", ko: "백 명이 있다." }],
  見: [{ ja: "字を見る。", ko: "글자를 본다." }],
  聞: [{ ja: "話を聞く。", ko: "이야기를 듣는다." }],
  話: [{ ja: "友だちと話す。", ko: "친구와 이야기한다." }],
  食: [{ ja: "ご飯を食べる。", ko: "밥을 먹는다." }],
  行: [{ ja: "学校へ行く。", ko: "학교에 간다." }],
  来: [{ ja: "友だちが来る。", ko: "친구가 온다." }],
  読: [{ ja: "本を読む。", ko: "책을 읽는다." }],
  書: [{ ja: "名前を書く。", ko: "이름을 쓴다." }],
  立: [{ ja: "木の前に立つ。", ko: "나무 앞에 선다." }],
  足: [{ ja: "足が速い。", ko: "발이 빠르다." }],
  手: [{ ja: "手を洗う。", ko: "손을 씻는다." }],
  目: [{ ja: "目を見る。", ko: "눈을 본다." }],
  心: [{ ja: "心が静かだ。", ko: "마음이 조용하다." }],
  道: [{ ja: "道を歩く。", ko: "길을 걷는다." }],
  時: [{ ja: "時が来る。", ko: "때가 온다." }],
  家: [{ ja: "家に帰る。", ko: "집에 돌아간다." }],
  前: [{ ja: "前に出る。", ko: "앞으로 나온다." }],
  後: [{ ja: "後ろに行く。", ko: "뒤로 간다." }],
  東: [{ ja: "東の空が明るい。", ko: "동쪽 하늘이 밝다." }],
  西: [{ ja: "西へ行く。", ko: "서쪽으로 간다." }],
  南: [{ ja: "南の風だ。", ko: "남쪽 바람이다." }],
  北: [{ ja: "北は寒い。", ko: "북쪽은 춥다." }],
  空: [{ ja: "空が青い。", ko: "하늘이 파랗다." }],
  雨: [{ ja: "雨が降る。", ko: "비가 온다." }],
  風: [{ ja: "風が強い。", ko: "바람이 세다." }],
  花: [{ ja: "花が咲く。", ko: "꽃이 핀다." }],
  海: [{ ja: "海が広い。", ko: "바다가 넓다." }],
  田: [{ ja: "田に水がある。", ko: "논에 물이 있다." }],
  林: [{ ja: "林の中を歩く。", ko: "숲속을 걷는다." }],
  森: [{ ja: "森が深い。", ko: "숲이 깊다." }],
  力: [{ ja: "力が強い。", ko: "힘이 세다." }],
  明: [{ ja: "明るい部屋だ。", ko: "밝은 방이다." }],
  新: [{ ja: "新しい本だ。", ko: "새 책이다." }],
  古: [{ ja: "古い家だ。", ko: "오래된 집이다." }],
  長: [{ ja: "長い道だ。", ko: "긴 길이다." }],
  高: [{ ja: "高い山だ。", ko: "높은 산이다." }],
  白: [{ ja: "白い紙だ。", ko: "흰 종이다." }],
  黒: [{ ja: "黒い服だ。", ko: "검은 옷이다." }],
  赤: [{ ja: "赤い花だ。", ko: "빨간 꽃이다." }],
  青: [{ ja: "青い空だ。", ko: "푸른 하늘이다." }],
  多: [{ ja: "人が多い。", ko: "사람이 많다." }],
  少: [{ ja: "少し待つ。", ko: "조금 기다린다." }],
  近: [{ ja: "近い店だ。", ko: "가까운 가게다." }],
  遠: [{ ja: "遠い町だ。", ko: "먼 마을이다." }],
  安: [{ ja: "安い店だ。", ko: "싼 가게다." }],
  強: [{ ja: "強い雨だ。", ko: "강한 비다." }],
  弱: [{ ja: "弱い風だ。", ko: "약한 바람이다." }],
  正: [{ ja: "正しい答えだ。", ko: "맞는 대답이다." }],
  友: [{ ja: "友だちと会う。", ko: "친구를 만난다." }],
  好: [{ ja: "好きな本だ。", ko: "좋아하는 책이다." }],
  悪: [{ ja: "悪いことだ。", ko: "나쁜 일이다." }],
};

const MEANING_EXAMPLE_VARIANT_MAP_UNUSED = {
  enter: [{ ja: "中に入る。", ko: "안으로 들어간다." }],
  exit: [{ ja: "外に出る。", ko: "밖으로 나온다." }],
  read: [{ ja: "本を読む。", ko: "책을 읽는다." }],
  study: [{ ja: "学校で学ぶ。", ko: "학교에서 배운다." }],
  learning: [{ ja: "毎日学ぶ。", ko: "매일 배운다." }],
  water: [{ ja: "水を飲む。", ko: "물을 마신다." }],
  fire: [{ ja: "火を消す。", ko: "불을 끈다." }],
  drink: [{ ja: "水を飲む。", ko: "물을 마신다." }],
  eat: [{ ja: "ご飯を食べる。", ko: "밥을 먹는다." }],
  go: [{ ja: "学校へ行く。", ko: "학교에 간다." }],
  come: [{ ja: "友だちが来る。", ko: "친구가 온다." }],
  see: [{ ja: "字を見る。", ko: "글자를 본다." }],
  hear: [{ ja: "話を聞く。", ko: "이야기를 듣는다." }],
  speak: [{ ja: "友だちと話す。", ko: "친구와 이야기한다." }],
  sleep: [{ ja: "早く眠る。", ko: "일찍 잔다." }],
  rest: [{ ja: "今日は休む。", ko: "오늘은 쉰다." }],
  buy: [{ ja: "本を買う。", ko: "책을 산다." }],
  give: [{ ja: "本をあげる。", ko: "책을 준다." }],
  take: [{ ja: "本を取る。", ko: "책을 집는다." }],
  make: [{ ja: "ご飯を作る。", ko: "밥을 만든다." }],
  good: [{ ja: "いい日だ。", ko: "좋은 날이다." }],
  bad: [{ ja: "悪い日だ。", ko: "나쁜 날이다." }],
  big: [{ ja: "大きい犬だ。", ko: "큰 개다." }],
  small: [{ ja: "小さい箱だ。", ko: "작은 상자다." }],
  new: [{ ja: "新しい本だ。", ko: "새 책이다." }],
  old: [{ ja: "古い家だ。", ko: "오래된 집이다." }],
  high: [{ ja: "高い山だ。", ko: "높은 산이다." }],
  low: [{ ja: "低い机だ。", ko: "낮은 책상이다." }],
};

const sourceRows = await loadSourceRows();
const reviewRows = buildReviewRows(sourceRows);
const metrics = buildGenerationMetrics(reviewRows);

await mkdir(generatedDir, { recursive: true });
await writeJson(reviewOutputPath, reviewRows);

logGenerationMetrics(metrics);
console.log(`Generated ${reviewRows.length} kanji enrichment review rows.`);

async function loadSourceRows() {
  for (const filePath of [primaryMetadataPath, fallbackMetadataPath]) {
    try {
      const contents = await readFile(filePath, "utf8");
      const parsed = JSON.parse(contents);
      if (Array.isArray(parsed)) {
        validateSourceRows(parsed, filePath);
        return parsed;
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }

  throw new Error(
    "Unable to load kanji metadata from either the generated file or the sample seed."
  );
}

function validateSourceRows(rows, filePath) {
  rows.forEach((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`Invalid kanji metadata row at ${filePath}#${index + 1}: expected object.`);
    }

    if (typeof row.id !== "string" || row.id.trim() === "") {
      throw new Error(`Invalid kanji metadata row at ${filePath}#${index + 1}: missing string id.`);
    }

    if (typeof row.literal !== "string" || row.literal.trim() === "") {
      throw new Error(
        `Invalid kanji metadata row at ${filePath}#${index + 1}: missing string literal for id ${row.id}.`
      );
    }
  });
}

function buildReviewRows(rows) {
  return buildSortOrder(rows).map((row, index) => {
    const meaningKo = normalizeExistingText(row?.meaningKo) ?? buildMeaningKo(row);
    const meaningJa = normalizeExistingText(row?.meaningJa) ?? buildMeaningJa(row);

    return {
      id: row.id,
      literal: row.literal,
      meaningKo,
      meaningJa,
      exampleJa: null,
      exampleKo: null,
      sortOrder: index + 1,
      reviewStatus: "pending",
    };
  });
}

function buildSortOrder(rows) {
  return [...rows].sort(compareRows);
}

function compareRows(left, right) {
  const gradeDiff = normalizeGrade(left) - normalizeGrade(right);
  if (gradeDiff !== 0) {
    return gradeDiff;
  }

  const jlptDiff = normalizeJlptRank(left?.jlptLevel) - normalizeJlptRank(right?.jlptLevel);
  if (jlptDiff !== 0) {
    return jlptDiff;
  }

  return compareLiteralsAscending(left?.literal, right?.literal);
}

function normalizeGrade(row) {
  const grade =
    row?.metadata?.kanjidicGrade ??
    row?.japaneseGrade ??
    row?.metadata?.grade ??
    row?.grade ??
    null;

  if (grade == null || grade === "") {
    return 99;
  }

  const parsed = Number(grade);
  return Number.isFinite(parsed) ? parsed : 99;
}

function normalizeJlptRank(level) {
  const normalized = String(level ?? "").trim().toUpperCase();
  return (
    {
      N5: 1,
      N4: 2,
      N3: 3,
      N2: 4,
      N1: 5,
    }[normalized] ?? 99
  );
}

function compareLiteralsAscending(leftLiteral, rightLiteral) {
  const left = String(leftLiteral ?? "");
  const right = String(rightLiteral ?? "");
  const leftCodePoint = left.codePointAt(0) ?? 0;
  const rightCodePoint = right.codePointAt(0) ?? 0;

  if (leftCodePoint !== rightCodePoint) {
    return leftCodePoint - rightCodePoint;
  }

  return left.localeCompare(right, "en");
}

function buildGenerationMetrics(rows) {
  const total = rows.length;
  const meaningKoCount = rows.filter((row) => normalizeExistingText(row.meaningKo) !== null).length;
  const meaningJaCount = rows.filter((row) => normalizeExistingText(row.meaningJa) !== null).length;

  return {
    total,
    meaningKoCount,
    meaningJaCount,
    meaningKoPct: percent(meaningKoCount, total),
    meaningJaPct: percent(meaningJaCount, total),
  };
}

function logGenerationMetrics(metrics) {
  console.log(
    [
      `Coverage: meaningKo ${metrics.meaningKoCount}/${metrics.total} (${metrics.meaningKoPct}%)`,
      `meaningJa ${metrics.meaningJaCount}/${metrics.total} (${metrics.meaningJaPct}%)`,
    ].join("; ")
  );
}

function buildMeaningKo(row) {
  const override = getLiteralGlossOverride(row?.literal, "ko");
  if (override !== undefined) {
    return override;
  }

  const meanings = parseMeaningEn(row?.metadata);
  const glosses = translateGlosses(meanings, "ko");
  if (glosses.length > 0) {
    return glosses.join(", ");
  }

  return null;
}

function buildMeaningJa(row) {
  const override = getLiteralGlossOverride(row?.literal, "ja");
  if (override !== undefined) {
    return override;
  }

  const meanings = parseMeaningEn(row?.metadata);
  const glosses = translateGlosses(meanings, "ja");
  if (glosses.length > 0) {
    return glosses.join("、");
  }

  return null;
}

function translateGlosses(meanings, language) {
  const translated = meanings
    .map((meaning) => translateMeaning(meaning, language))
    .filter((value) => typeof value === "string" && value.length > 0 && !containsLatinLetters(value));

  return uniqueList(translated).slice(0, 3);
}

function translateMeaning(meaning, language) {
  const key = normalizeMeaningKey(meaning);
  const phraseMap = getMeaningPhraseMap(language);
  const tokenMap = getMeaningTokenMap(language);

  if (phraseMap[key] !== undefined) {
    return phraseMap[key];
  }

  const pieces = key.split(/(\s+|[-/(),.])/);
  const translated = [];

  for (const piece of pieces) {
    if (!piece || /^\s+$/.test(piece) || /^[-/(),.]$/.test(piece)) {
      continue;
    }

    if (isMeaningStopword(piece)) {
      continue;
    }

    const mapped = tokenMap[piece];
    if (mapped === undefined || mapped === null || mapped === "") {
      if (isHarmlessUnmappedToken(piece)) {
        continue;
      }

      return null;
    }

    translated.push(mapped);
  }

  const joined = uniqueList(translated).join(" ").trim();
  return joined.length > 0 ? joined : null;
}

function buildExampleJa(row) {
  return buildExamplePair(row)?.ja ?? buildReadingFallbackExampleJa(row);
}

function buildExampleKo(exampleJa, row) {
  const paired = buildExamplePair(row);
  if (paired?.ko) {
    return paired.ko;
  }

  if (!exampleJa) {
    return null;
  }

  const numericExample = buildNumericExampleKo(exampleJa);
  if (numericExample) {
    return `${numericExample} 주세요.`;
  }

  const readingSentence = exampleJa.match(/^「(.+)」は(.+)と読む。$/);
  if (readingSentence) {
    return `「${readingSentence[1]}」는 ${readingSentence[2]}라고 읽는다.`;
  }

  const useSentence = exampleJa.match(/^「(.+)」は(.+)で使う。$/);
  if (useSentence) {
    return `「${useSentence[1]}」는 ${useSentence[2]}로 쓴다.`;
  }

  const kunyomi = pickReading(row?.kunyomi);
  if (kunyomi) {
    return `「${row?.literal ?? ""}」는 ${kunyomi}라고 읽는다.`;
  }

  const onyomi = pickReading(row?.onyomi);
  if (onyomi) {
    return `「${row?.literal ?? ""}」는 ${onyomi}로 쓴다.`;
  }

  return null;
}

function buildExamplePair(row) {
  const literal = row?.literal ?? "";
  const variants = getExampleVariants(row);

  if (variants.length > 0) {
    return chooseVariant(variants, literal, row?.id);
  }

  const numeric = NUMERIC_EXAMPLE_VARIANTS_UNUSED[literal];
  if (numeric) {
    return chooseVariant(numeric, literal, row?.id);
  }

  return getMeaningExamplePair(row);
}

function buildReadingFallbackExampleJa(row) {
  const literal = row?.literal ?? "";
  const kunyomi = pickReading(row?.kunyomi);
  if (kunyomi) {
    return `「${literal}」は${kunyomi}と読む。`;
  }

  const onyomi = pickReading(row?.onyomi);
  if (onyomi) {
    return `「${literal}」は${onyomi}で使う。`;
  }

  return null;
}

function getExampleVariants(row) {
  return EXAMPLE_VARIANT_MAP_UNUSED[row?.literal] ?? [];
}

function getMeaningExamplePair(row) {
  const meanings = parseMeaningEn(row?.metadata);

  for (const meaning of meanings) {
    const key = normalizeMeaningKey(meaning);
    const variants = MEANING_EXAMPLE_VARIANT_MAP_UNUSED[key];
    if (variants) {
      return chooseVariant(variants, row?.literal ?? key, row?.id ?? key);
    }
  }

  return null;
}

function chooseVariant(variants, literal, id) {
  if (!Array.isArray(variants) || variants.length === 0) {
    return null;
  }

  const seed = stableIndex(`${literal}:${id}`, variants.length);
  return variants[seed] ?? variants[0] ?? null;
}

function stableIndex(value, length) {
  if (length <= 0) {
    return 0;
  }

  let hash = 0;
  for (const char of String(value)) {
    hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  }

  return hash % length;
}

const NUMERIC_EXAMPLE_VARIANTS = {
  一: [
    { ja: "一つある。", ko: "하나 있다." },
    { ja: "一人だ。", ko: "한 사람이다." },
    { ja: "一日だ。", ko: "하루다." },
  ],
  二: [
    { ja: "二つある。", ko: "두 개가 있다." },
    { ja: "二人いる。", ko: "두 명이 있다." },
    { ja: "二時だ。", ko: "두 시다." },
  ],
  三: [
    { ja: "三つある。", ko: "세 개가 있다." },
    { ja: "三人いる。", ko: "세 명이 있다." },
    { ja: "三時だ。", ko: "세 시다." },
  ],
  四: [
    { ja: "四つある。", ko: "네 개가 있다." },
    { ja: "四人いる。", ko: "네 명이 있다." },
    { ja: "四時だ。", ko: "네 시다." },
  ],
  五: [
    { ja: "五つある。", ko: "다섯 개가 있다." },
    { ja: "五人いる。", ko: "다섯 명이 있다." },
    { ja: "五時だ。", ko: "다섯 시다." },
  ],
  六: [
    { ja: "六つある。", ko: "여섯 개가 있다." },
    { ja: "六人いる。", ko: "여섯 명이 있다." },
    { ja: "六時だ。", ko: "여섯 시다." },
  ],
  七: [
    { ja: "七つある。", ko: "일곱 개가 있다." },
    { ja: "七人いる。", ko: "일곱 명이 있다." },
    { ja: "七時だ。", ko: "일곱 시다." },
  ],
  八: [
    { ja: "八つある。", ko: "여덟 개가 있다." },
    { ja: "八人いる。", ko: "여덟 명이 있다." },
    { ja: "八時だ。", ko: "여덟 시다." },
  ],
  九: [
    { ja: "九つある。", ko: "아홉 개가 있다." },
    { ja: "九人いる。", ko: "아홉 명이 있다." },
    { ja: "九時だ。", ko: "아홉 시다." },
  ],
  十: [
    { ja: "十人いる。", ko: "열 명이 있다." },
    { ja: "十日だ。", ko: "열흘이다." },
    { ja: "十時だ。", ko: "열 시다." },
  ],
};

const EXAMPLE_VARIANT_MAP = {
  上: [{ ja: "上にある。", ko: "위에 있다." }],
  下: [{ ja: "下にある。", ko: "아래에 있다." }],
  中: [{ ja: "中に入る。", ko: "안에 들어간다." }],
  人: [{ ja: "人が多い。", ko: "사람이 많다." }],
  休: [{ ja: "今日は休む。", ko: "오늘은 쉰다." }],
  先: [{ ja: "先に行く。", ko: "먼저 간다." }],
  入: [{ ja: "中に入る。", ko: "안에 들어간다." }],
  出: [{ ja: "外に出る。", ko: "밖으로 나온다." }],
  円: [{ ja: "百円だ。", ko: "백 엔이다." }],
  千: [{ ja: "千円だ。", ko: "천 엔이다." }],
  右: [{ ja: "右に曲がる。", ko: "오른쪽으로 돈다." }],
  左: [{ ja: "左に曲がる。", ko: "왼쪽으로 돈다." }],
  名: [{ ja: "名前を書く。", ko: "이름을 적는다." }],
  土: [{ ja: "土がぬれている。", ko: "흙이 젖어 있다." }],
  大: [{ ja: "大きい犬だ。", ko: "큰 개다." }],
  天: [{ ja: "天気がいい。", ko: "날씨가 좋다." }],
  女: [{ ja: "女の人が来る。", ko: "여자가 온다." }],
  子: [{ ja: "子が笑う。", ko: "아이가 웃는다." }],
  学: [{ ja: "学校で学ぶ。", ko: "학교에서 배운다." }],
  小: [{ ja: "小さい箱だ。", ko: "작은 상자다." }],
  山: [{ ja: "山に登る。", ko: "산에 오른다." }],
  川: [{ ja: "川が流れる。", ko: "강이 흐른다." }],
  年: [{ ja: "今年は新しい年だ。", ko: "올해는 새로운 해다." }],
  日: [{ ja: "日が出る。", ko: "해가 뜬다." }],
  月: [{ ja: "月がきれいだ。", ko: "달이 예쁘다." }],
  木: [{ ja: "木が高い。", ko: "나무가 높다." }],
  本: [{ ja: "本を読む。", ko: "책을 읽는다." }],
  校: [{ ja: "学校へ行く。", ko: "학교에 간다." }],
  気: [{ ja: "気が楽だ。", ko: "마음이 편하다." }],
  水: [{ ja: "水を飲む。", ko: "물을 마신다." }],
  火: [{ ja: "火を消す。", ko: "불을 끈다." }],
  金: [{ ja: "金を払う。", ko: "돈을 낸다." }],
  口: [{ ja: "口を開く。", ko: "입을 연다." }],
  車: [{ ja: "車で行く。", ko: "차로 간다." }],
  生: [{ ja: "生きるのは大事だ。", ko: "사는 것은 중요하다." }],
  男: [{ ja: "男が立つ。", ko: "남자가 선다." }],
  百: [{ ja: "百人いる。", ko: "백 명이 있다." }],
  見: [{ ja: "字を見る。", ko: "글자를 본다." }],
  聞: [{ ja: "話を聞く。", ko: "이야기를 듣는다." }],
  話: [{ ja: "友だちと話す。", ko: "친구와 이야기한다." }],
  食: [{ ja: "ご飯を食べる。", ko: "밥을 먹는다." }],
  行: [{ ja: "学校へ行く。", ko: "학교에 간다." }],
  来: [{ ja: "友だちが来る。", ko: "친구가 온다." }],
  読: [{ ja: "本を読む。", ko: "책을 읽는다." }],
  書: [{ ja: "名前を書く。", ko: "이름을 쓴다." }],
  立: [{ ja: "木の前に立つ。", ko: "나무 앞에 선다." }],
  足: [{ ja: "足が速い。", ko: "발이 빠르다." }],
  手: [{ ja: "手を洗う。", ko: "손을 씻는다." }],
  目: [{ ja: "目を見る。", ko: "눈을 본다." }],
  心: [{ ja: "心が静かだ。", ko: "마음이 শান্ত하다." }],
  道: [{ ja: "道を歩く。", ko: "길을 걷는다." }],
  時: [{ ja: "時が来る。", ko: "때가 온다." }],
  家: [{ ja: "家に帰る。", ko: "집에 돌아간다." }],
  前: [{ ja: "前に出る。", ko: "앞으로 나온다." }],
  後: [{ ja: "後ろに行く。", ko: "뒤로 간다." }],
  東: [{ ja: "東の空が明るい。", ko: "동쪽 하늘이 밝다." }],
  西: [{ ja: "西へ行く。", ko: "서쪽으로 간다." }],
  南: [{ ja: "南の風だ。", ko: "남쪽 바람이다." }],
  北: [{ ja: "北は寒い。", ko: "북쪽은 춥다." }],
  空: [{ ja: "空が青い。", ko: "하늘이 파랗다." }],
  雨: [{ ja: "雨が降る。", ko: "비가 온다." }],
  風: [{ ja: "風が強い。", ko: "바람이 세다." }],
  花: [{ ja: "花が咲く。", ko: "꽃이 핀다." }],
  海: [{ ja: "海が広い。", ko: "바다가 넓다." }],
  田: [{ ja: "田に水がある。", ko: "논에 물이 있다." }],
  林: [{ ja: "林の中を歩く。", ko: "숲속을 걷는다." }],
  森: [{ ja: "森が深い。", ko: "숲이 깊다." }],
  力: [{ ja: "力が強い。", ko: "힘이 세다." }],
  明: [{ ja: "明るい部屋だ。", ko: "밝은 방이다." }],
  新: [{ ja: "新しい本だ。", ko: "새 책이다." }],
  古: [{ ja: "古い家だ。", ko: "오래된 집이다." }],
  長: [{ ja: "長い道だ。", ko: "긴 길이다." }],
  高: [{ ja: "高い山だ。", ko: "높은 산이다." }],
  白: [{ ja: "白い紙だ。", ko: "흰 종이다." }],
  黒: [{ ja: "黒い服だ。", ko: "검은 옷이다." }],
  赤: [{ ja: "赤い花だ。", ko: "빨간 꽃이다." }],
  青: [{ ja: "青い空だ。", ko: "푸른 하늘이다." }],
  多: [{ ja: "人が多い。", ko: "사람이 많다." }],
  少: [{ ja: "少し待つ。", ko: "조금 기다린다." }],
  近: [{ ja: "近い店だ。", ko: "가까운 가게다." }],
  遠: [{ ja: "遠い町だ。", ko: "먼 마을이다." }],
  安: [{ ja: "安い店だ。", ko: "싼 가게다." }],
  強: [{ ja: "強い雨だ。", ko: "강한 비다." }],
  弱: [{ ja: "弱い風だ。", ko: "약한 바람이다." }],
  正: [{ ja: "正しい答えだ。", ko: "맞는 대답이다." }],
  友: [{ ja: "友だちと会う。", ko: "친구를 만난다." }],
  好: [{ ja: "好きな本だ。", ko: "좋아하는 책이다." }],
  悪: [{ ja: "悪いことだ。", ko: "나쁜 일이다." }],
};

const MEANING_EXAMPLE_VARIANT_MAP = {
  enter: [{ ja: "中に入る。", ko: "안으로 들어간다." }],
  exit: [{ ja: "外に出る。", ko: "밖으로 나온다." }],
  read: [{ ja: "本を読む。", ko: "책을 읽는다." }],
  study: [{ ja: "学校で学ぶ。", ko: "학교에서 배운다." }],
  learning: [{ ja: "毎日学ぶ。", ko: "매일 배운다." }],
  water: [{ ja: "水を飲む。", ko: "물을 마신다." }],
  fire: [{ ja: "火を消す。", ko: "불을 끈다." }],
  drink: [{ ja: "水を飲む。", ko: "물을 마신다." }],
  eat: [{ ja: "ご飯を食べる。", ko: "밥을 먹는다." }],
  go: [{ ja: "学校へ行く。", ko: "학교에 간다." }],
  come: [{ ja: "友だちが来る。", ko: "친구가 온다." }],
  see: [{ ja: "字を見る。", ko: "글자를 본다." }],
  hear: [{ ja: "話を聞く。", ko: "이야기를 듣는다." }],
  speak: [{ ja: "友だちと話す。", ko: "친구와 이야기한다." }],
  sleep: [{ ja: "早く眠る。", ko: "일찍 잔다." }],
  rest: [{ ja: "今日は休む。", ko: "오늘은 쉰다." }],
  buy: [{ ja: "本を買う。", ko: "책을 산다." }],
  give: [{ ja: "本をあげる。", ko: "책을 준다." }],
  take: [{ ja: "本を取る。", ko: "책을 집는다." }],
  make: [{ ja: "ご飯を作る。", ko: "밥을 만든다." }],
  good: [{ ja: "いい日だ。", ko: "좋은 날이다." }],
  bad: [{ ja: "悪い日だ。", ko: "나쁜 날이다." }],
  big: [{ ja: "大きい犬だ。", ko: "큰 개다." }],
  small: [{ ja: "小さい箱だ。", ko: "작은 상자다." }],
  new: [{ ja: "新しい本だ。", ko: "새 책이다." }],
  old: [{ ja: "古い家だ。", ko: "오래된 집이다." }],
  high: [{ ja: "高い山だ。", ko: "높은 산이다." }],
  low: [{ ja: "低い机だ。", ko: "낮은 책상이다." }],
};

function parseMeaningEn(metadata) {
  const raw = metadata?.meaningEn ?? metadata?.meaningsEn ?? [];
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function getLiteralGlossOverride(literal, language) {
  const overrides = {
    ko: {
      一: "하나, 한 번",
      二: "둘, 두 개",
      右: "오른쪽",
      雨: "비",
      円: "원, 엔, 둥글다",
      下: "아래, 내리다, 낮다",
    },
    ja: {
      一: "ひとつ、いち",
      二: "ふたつ、に",
      右: "みぎ",
      雨: "あめ",
      円: "まるい、えん、円",
      下: "した、くだる、おりる",
    },
  };

  return overrides[language]?.[literal];
}

function getMeaningPhraseMap(language) {
  return language === "ko"
    ? {
        all: "모든",
        above: "위",
        air: "공기",
        ahead: "앞",
        atmosphere: "분위기",
        before: "전에",
        birth: "탄생",
        bank: "둑",
        big: "큰",
        boil: "끓이다",
        border: "경계",
        break: "부수다",
        bright: "밝은",
        center: "중심",
        child: "아이",
        dayOff: "휴일",
        east: "동",
        earth: "땅",
        calm: "차분한",
        change: "변하다",
        clear: "맑은",
        collect: "모으다",
        companion: "동반자",
        copy: "복사하다",
        cover: "덮다",
        cry: "울다",
        day: "날",
        dark: "어두운",
        deep: "깊은",
        deceive: "속이다",
        future: "미래",
        enter: "들어가다",
        insert: "삽입하다",
        except: "제외",
        distant: "먼",
        edge: "가장자리",
        empty: "비어 있는",
        end: "끝",
        equal: "같은",
        evil: "악한",
        evening: "저녁",
        far: "먼",
        fat: "뚱뚱한",
        flag: "깃발",
        follow: "따르다",
        foolish: "어리석은",
        good: "좋은",
        great: "큰",
        hard: "딱딱한",
        help: "돕다",
        hide: "숨기다",
        hill: "언덕",
        high: "높은",
        hit: "치다",
        hole: "구멍",
        horse: "말",
        inside: "안",
        middle: "가운데",
        large: "큰",
        law: "법",
        light: "빛",
        loose: "느슨한",
        low: "낮은",
        main: "주된",
        mean: "중간",
        mind: "마음",
        move: "움직이다",
        mountain: "산",
        mound: "둔덕",
        name: "이름",
        male: "남자",
        month: "달",
        moon: "달",
        noisy: "시끄러운",
        origin: "기원",
        open: "열다",
        present: "현재",
        precedence: "우선",
        party: "모임",
        peaceful: "평화로운",
        plan: "계획",
        previous: "이전의",
        polish: "닦다",
        praise: "칭찬하다",
        pure: "순수한",
        genuine: "진짜",
        life: "삶",
        spirit: "정신",
        mood: "기분",
        real: "진짜",
        reason: "이유",
        retire: "은퇴하다",
        rest: "쉬다",
        study: "공부하다",
        learning: "학습",
        quiet: "조용한",
        reach: "닿다",
        red: "붉은",
        science: "과학",
        rule: "규칙",
        sad: "슬픈",
        school: "학교",
        see: "보다",
        shine: "빛나다",
        shore: "해안",
        sleep: "잠자다",
        small: "작은",
        sound: "소리",
        steep: "가파른",
        store: "저장하다",
        strange: "이상한",
        strong: "강한",
        support: "지지하다",
        table: "탁자",
        bad: "나쁜",
        bear: "견디다",
        bind: "묶다",
        bite: "물다",
        blame: "비난하다",
        boast: "자랑하다",
        broad: "넓은",
        build: "짓다",
        call: "부르다",
        capture: "잡다",
        carve: "새기다",
        cheat: "속이다",
        close: "닫다",
        cold: "추운",
        command: "명령하다",
        crowd: "군중",
        cup: "컵",
        curtain: "커튼",
        damage: "손상",
        destroy: "파괴하다",
        difficult: "어려운",
        dirt: "더러운",
        dirty: "더러운",
        drink: "마시다",
        drum: "북",
        dull: "둔한",
        encourage: "격려하다",
        fast: "빠른",
        fasten: "고정하다",
        fault: "잘못",
        fence: "울타리",
        flower: "꽃",
        fold: "접다",
        foolish: "어리석은",
        fortune: "행운",
        friend: "친구",
        gift: "선물",
        hesitate: "주저하다",
        hurry: "서두르다",
        imitate: "모방하다",
        join: "합류하다",
        journey: "여행",
        jar: "항아리",
        jewel: "보석",
        justice: "정의",
        love: "사랑",
        mark: "표시",
        measure: "측정하다",
        meet: "만나다",
        mix: "섞다",
        obey: "복종하다",
        occasion: "경우",
        offer: "제공하다",
        pot: "냄비",
        power: "힘",
        protect: "지키다",
        reject: "거절하다",
        rejoice: "기뻐하다",
        rare: "드문",
        request: "요청하다",
        respect: "존중하다",
        ridicule: "조롱하다",
        roast: "구우다",
        rough: "거친",
        rope: "밧줄",
        season: "계절",
        seek: "찾다",
        servant: "하인",
        secret: "비밀",
        seize: "붙잡다",
        set: "놓다",
        sink: "가라앉다",
        strange: "이상한",
        stumble: "비틀거리다",
        stupid: "어리석은",
        sudden: "갑작스러운",
        tie: "묶다",
        ugly: "못생긴",
        village: "마을",
        weak: "약한",
        weep: "울다",
        wise: "현명한",
        woman: "여자",
        worry: "걱정하다",
        you: "너",
        take: "취하다",
        hundred: "백",
        book: "책",
        car: "차",
        gold: "금",
        mouth: "입",
        person: "사람",
        soil: "흙",
        ground: "땅",
        turkey: "터키",
        thousand: "천",
        true: "진짜",
        time: "시간",
        together: "함께",
        turn: "돌다",
        walk: "걷다",
        wash: "씻다",
        wide: "넓은",
        wind: "바람",
        white: "흰",
        wild: "야생의",
        word: "말",
        year: "년",
        "day off": "휴일",
        "first sign of chinese zodiac": "십이지 첫째",
        "11pm-1am": "자시",
        "sign of the rat": "쥐띠",
        heavens: "하늘",
        sky: "하늘",
        imperial: "황실의",
        mean: "뜻하다",
        main: "주된",
        change: "변하다",
        "go around": "돌아가다",
        "investigate": "조사하다",
        "kokuji": "일본 고유 한자",
        "place name": "지명",
        "one radical (no.1)": "부수 1번",
        "two radical (no. 7)": "부수 7번",
        "two radical (no.7)": "부수 7번",
        "ghost kanji": "유령 한자",
        "surname": "성씨",
        "old man": "노인",
        "river bank": "강둑",
        "river shore": "강가",
        "to be": "이다",
        "to do": "하다",
        "to make": "만들다",
        "to use": "사용하다",
        "one": "하나",
        "two": "둘",
        "three": "셋",
        "four": "넷",
        "five": "다섯",
        "six": "여섯",
        "seven": "일곱",
        "eight": "여덟",
        "nine": "아홉",
        "ten": "열",
        "one's": "자신의",
        below: "아래",
        circle: "원",
        descend: "내리다",
        down: "아래",
        give: "주다",
        inferior: "하급의",
        left: "왼쪽",
        rain: "비",
        right: "오른쪽",
        round: "둥글다",
        yen: "엔",
        "come after": "뒤따르다",
        "rank next": "다음 순위",
        "more than": "이상",
        "less than": "미만",
        "in front of": "앞에",
        "behind": "뒤",
        "mountain range": "산맥",
        "new moon": "초승달",
        "one of a kind": "유일한",
        "small amount": "적은 양",
        "beg, appeal": "빌다, 호소하다",
    }
    : {
        all: "全て",
        above: "上",
        air: "空気",
        ahead: "前",
        atmosphere: "雰囲気",
        before: "前に",
        birth: "誕生",
        bank: "土手",
        big: "大きい",
        boil: "沸く",
        border: "境界",
        break: "壊す",
        bright: "明るい",
        center: "中心",
        child: "子ども",
        dayOff: "休日",
        east: "東",
        earth: "土",
        calm: "静かな",
        change: "変わる",
        clear: "澄んだ",
        collect: "集める",
        companion: "仲間",
        copy: "写す",
        cover: "覆う",
        cry: "泣く",
        day: "日",
        dark: "暗い",
        deep: "深い",
        deceive: "だます",
        future: "未来",
        enter: "入る",
        insert: "挿入する",
        except: "除く",
        distant: "遠い",
        edge: "端",
        empty: "空",
        end: "終わり",
        equal: "等しい",
        evil: "悪い",
        evening: "夕方",
        far: "遠い",
        fat: "太い",
        flag: "旗",
        follow: "従う",
        foolish: "愚かな",
        good: "良い",
        great: "大きい",
        hard: "硬い",
        help: "助ける",
        hide: "隠す",
        hill: "丘",
        high: "高い",
        hit: "打つ",
        hole: "穴",
        horse: "馬",
        inside: "中",
        middle: "中間",
        large: "大きい",
        law: "法",
        light: "光",
        loose: "ゆるい",
        low: "低い",
        main: "主",
        mean: "中間",
        mind: "心",
        move: "動く",
        mountain: "山",
        mound: "塚",
        name: "名",
        male: "男",
        month: "月",
        moon: "月",
        noisy: "うるさい",
        origin: "起源",
        open: "開く",
        present: "現在",
        precedence: "優先",
        party: "集まり",
        peaceful: "平和な",
        plan: "計画",
        previous: "以前の",
        polish: "磨く",
        praise: "ほめる",
        pure: "純",
        genuine: "真の",
        life: "生命",
        spirit: "精神",
        mood: "気分",
        real: "本当の",
        reason: "理由",
        retire: "引退する",
        rest: "休む",
        study: "勉強する",
        learning: "学習",
        quiet: "静かな",
        reach: "届く",
        red: "赤い",
        science: "科学",
        rule: "規則",
        sad: "悲しい",
        school: "学校",
        see: "見る",
        shine: "輝く",
        shore: "岸",
        sleep: "眠る",
        small: "小さい",
        sound: "音",
        steep: "険しい",
        store: "しまう",
        strange: "変な",
        strong: "強い",
        support: "支える",
        table: "机",
        bad: "悪い",
        bear: "耐える",
        bind: "縛る",
        bite: "かむ",
        blame: "非難する",
        broad: "広い",
        build: "建てる",
        call: "呼ぶ",
        capture: "捕らえる",
        carve: "彫る",
        cheat: "だます",
        close: "閉じる",
        cold: "寒い",
        command: "命じる",
        crowd: "群れ",
        cup: "杯",
        curtain: "カーテン",
        damage: "損害",
        destroy: "壊す",
        difficult: "難しい",
        dirt: "汚れ",
        dirty: "汚い",
        drink: "飲む",
        drum: "太鼓",
        dull: "鈍い",
        encourage: "励ます",
        fast: "速い",
        fasten: "固定する",
        fault: "過ち",
        fence: "垣",
        flower: "花",
        fold: "折る",
        foolish: "愚かな",
        fortune: "幸運",
        friend: "友",
        gift: "贈り物",
        hesitate: "ためらう",
        hurry: "急ぐ",
        imitate: "まねる",
        join: "加わる",
        journey: "旅",
        jar: "壺",
        jewel: "宝石",
        justice: "正義",
        love: "愛",
        mark: "印",
        measure: "測る",
        meet: "会う",
        mix: "混ぜる",
        obey: "従う",
        occasion: "機会",
        offer: "差し出す",
        pot: "鍋",
        power: "力",
        protect: "守る",
        reject: "拒む",
        rejoice: "喜ぶ",
        rare: "珍しい",
        request: "お願いする",
        respect: "尊敬する",
        ridicule: "あざける",
        roast: "焼く",
        rough: "荒い",
        rope: "縄",
        season: "季節",
        seek: "探す",
        servant: "召使い",
        secret: "秘密",
        seize: "つかむ",
        set: "置く",
        sink: "沈む",
        strange: "変な",
        stumble: "つまずく",
        stupid: "ばかな",
        sudden: "急な",
        tie: "結ぶ",
        ugly: "醜い",
        village: "村",
        weak: "弱い",
        weep: "泣く",
        wise: "賢い",
        woman: "女",
        worry: "心配する",
        you: "あなた",
        take: "取る",
        hundred: "百",
        book: "本",
        car: "車",
        gold: "金",
        mouth: "口",
        person: "人",
        soil: "土",
        ground: "地面",
        turkey: "トルコ",
        thousand: "千",
        true: "本当の",
        time: "時間",
        together: "一緒",
        turn: "回る",
        walk: "歩く",
        wash: "洗う",
        wide: "広い",
        wind: "風",
        white: "白い",
        wild: "野生の",
        word: "言葉",
        year: "年",
        "day off": "休日",
        "first sign of chinese zodiac": "十二支の最初",
        "11pm-1am": "子の刻",
        "sign of the rat": "子",
        heavens: "天",
        sky: "空",
        imperial: "皇帝の",
        mean: "意味する",
        main: "主",
        "go around": "回る",
        investigate: "調べる",
        kokuji: "国字",
        "place name": "地名",
        "one radical (no.1)": "部首1番",
        "two radical (no. 7)": "部首7番",
        "two radical (no.7)": "部首7番",
        "ghost kanji": "幽霊漢字",
        surname: "姓",
        "old man": "老人",
        "river bank": "川岸",
        "river shore": "川岸",
        "to be": "である",
        "to do": "する",
        "to make": "作る",
        "to use": "使う",
        one: "一",
        two: "二",
        three: "三",
        four: "四",
        five: "五",
        six: "六",
        seven: "七",
        eight: "八",
        nine: "九",
        ten: "十",
        "one's": "自分の",
        below: "下",
        circle: "円",
        descend: "下る",
        down: "下",
        give: "与える",
        inferior: "下等",
        left: "左",
        low: "低い",
        rain: "雨",
        right: "みぎ",
        round: "まるい",
        yen: "えん",
        "come after": "後に来る",
        "rank next": "次席",
        "more than": "以上",
        "less than": "未満",
        "in front of": "前",
        "behind": "後ろ",
        "mountain range": "山脈",
        "new moon": "新月",
        "one of a kind": "唯一の",
        "small amount": "少量",
        "beg, appeal": "懇願、訴え",
    };
}

function getMeaningTokenMap(language) {
  return language === "ko"
    ? {
        a: "",
        an: "",
        and: "",
        as: "",
        at: "",
        be: "이다",
        beautiful: "아름다운",
        bird: "새",
        black: "검은",
        by: "에 의해",
        carry: "나르다",
        chinese: "중국의",
        cloth: "천",
        counter: "계수사",
        cut: "자르다",
        dark: "어두운",
        deep: "깊은",
        dry: "마른",
        during: "동안",
        element: "요소",
        fall: "떨어지다",
        fish: "물고기",
        fire: "불",
        food: "음식",
        for: "위한",
        from: "에서",
        good: "좋은",
        gather: "모으다",
        go: "가다",
        grass: "풀",
        hand: "손",
        high: "높은",
        hold: "잡다",
        horse: "말",
        in: "안에",
        into: "속으로",
        japanese: "일본의",
        jade: "옥",
        kind: "종류",
        large: "큰",
        light: "빛",
        look: "보다",
        long: "긴",
        make: "만들다",
        mountain: "산",
        name: "이름",
        not: "아니다",
        old: "옛",
        open: "열다",
        over: "넘어",
        play: "놀다",
        place: "장소",
        put: "놓다",
        raise: "들다",
        red: "붉은",
        river: "강",
        run: "달리다",
        school: "학교",
        sea: "바다",
        sign: "기호",
        silk: "비단",
        small: "작은",
        sound: "소리",
        state: "나라",
        stone: "돌",
        strong: "강한",
        sun: "해",
        take: "취하다",
        thin: "얇은",
        time: "시간",
        tree: "나무",
        type: "종류",
        up: "위로",
        used: "쓰이는",
        use: "사용하다",
        water: "물",
        white: "흰",
        with: "함께",
        woman: "여자",
        wood: "나무",
        word: "말",
        write: "쓰다",
        year: "해",
        yellow: "노란",
        clear: "맑은",
        bright: "밝은",
        fine: "고운",
        wide: "넓은",
        wild: "야생의",
        ancient: "옛",
        help: "돕다",
        cover: "덮다",
        stop: "멈추다",
        strike: "치다",
        sword: "칼",
        basket: "바구니",
        wine: "술",
        door: "문",
        head: "머리",
        hair: "머리카락",
        grain: "곡식",
        sacrifice: "제사",
        fear: "두려움",
        one: "하나",
        two: "둘",
        three: "셋",
        four: "넷",
        five: "다섯",
        six: "여섯",
        seven: "일곱",
        eight: "여덟",
        nine: "아홉",
        ten: "열",
        "one's": "자신의",
      }
    : {
        a: "",
        an: "",
        and: "",
        as: "",
        at: "",
        be: "である",
        beautiful: "美しい",
        bird: "鳥",
        black: "黒い",
        by: "によって",
        carry: "運ぶ",
        chinese: "中国の",
        cloth: "布",
        counter: "助数詞",
        cut: "切る",
        dark: "暗い",
        deep: "深い",
        dry: "乾いた",
        during: "の間",
        element: "要素",
        fall: "落ちる",
        fish: "魚",
        fire: "火",
        food: "食べ物",
        for: "ための",
        from: "から",
        good: "良い",
        gather: "集める",
        go: "行く",
        grass: "草",
        hand: "手",
        high: "高い",
        hold: "持つ",
        horse: "馬",
        in: "中に",
        into: "の中へ",
        japanese: "日本の",
        jade: "玉",
        kind: "種類",
        large: "大きい",
        light: "光",
        look: "見る",
        long: "長い",
        make: "作る",
        mountain: "山",
        name: "名",
        not: "ない",
        old: "古い",
        open: "開く",
        over: "越えて",
        play: "遊ぶ",
        place: "場所",
        put: "置く",
        raise: "上げる",
        red: "赤い",
        river: "川",
        run: "走る",
        school: "学校",
        sea: "海",
        sign: "記号",
        silk: "絹",
        small: "小さい",
        sound: "音",
        state: "国",
        stone: "石",
        strong: "強い",
        sun: "日",
        take: "取る",
        thin: "薄い",
        time: "時間",
        tree: "木",
        type: "種類",
        up: "上へ",
        used: "使われる",
        use: "使う",
        water: "水",
        white: "白い",
        with: "と",
        woman: "女",
        wood: "木",
        word: "語",
        write: "書く",
        year: "年",
        yellow: "黄色い",
        clear: "澄んだ",
        bright: "明るい",
        fine: "細かい",
        wide: "広い",
        wild: "野生の",
        ancient: "古代の",
        help: "助ける",
        cover: "覆う",
        stop: "止める",
        strike: "打つ",
        sword: "刀",
        basket: "かご",
        wine: "酒",
        door: "戸",
        head: "頭",
        hair: "髪",
        grain: "穀物",
        sacrifice: "祭り",
        fear: "恐れ",
        one: "一",
        two: "二",
        three: "三",
        four: "四",
        five: "五",
        six: "六",
        seven: "七",
        eight: "八",
        nine: "九",
        ten: "十",
        "one's": "自分の",
      };
}

function buildNumericExampleJa(literal) {
  const counts = {
    一: "一つください。",
    二: "二つください。",
    三: "三つください。",
    四: "四つください。",
    五: "五つください。",
    六: "六つください。",
    七: "七つください。",
    八: "八つください。",
    九: "九つください。",
    十: "十ください。",
  };

  return counts[literal] ?? null;
}

function buildNumericExampleKo(exampleJa) {
  const match = exampleJa.match(/^([一二三四五六七八九十])(つ)?ください。$/);
  if (!match) {
    return null;
  }

  return (
    {
      一: "하나",
      二: "둘",
      三: "셋",
      四: "넷",
      五: "다섯",
      六: "여섯",
      七: "일곱",
      八: "여덟",
      九: "아홉",
      十: "열",
    }[match[1]] ?? null
  );
}

function normalizeMeaningKey(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[“”"]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([().,/-])\s*/g, "$1");
}

function pickReading(readings) {
  if (!Array.isArray(readings)) {
    return "";
  }

  for (const reading of readings) {
    if (typeof reading !== "string" || !reading.trim()) {
      continue;
    }

    const normalized = normalizeReading(reading);
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function normalizeReading(reading) {
  return reading
    .replace(/[.\s・]/g, "")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function isCommonNumberLiteral(literal) {
  return ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"].includes(literal);
}

function uniqueList(values) {
  return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))];
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeExistingText(value) {
  const text = normalizeText(value);
  if (!text || isPlaceholderText(text)) {
    return null;
  }

  return text;
}

function isPlaceholderText(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "-" || normalized === "--" || normalized === "n/a";
}

function isMeaningStopword(value) {
  return new Set(["a", "an", "and", "as", "at", "be", "for", "from", "in", "into", "of", "on", "or", "the", "to", "up", "down", "out", "with", "by", "over", "off", "one's"]).has(value);
}

function isHarmlessUnmappedToken(value) {
  return new Set(["no", "no.", "no.1", "no.7", "kokuji", "ghost", "kanji", "radical", "used", "use", "thing", "form", "kind", "type", "variant", "old", "new", "common", "rare"]).has(value);
}

function percent(count, total) {
  if (!total) {
    return "0.00";
  }

  return ((count / total) * 100).toFixed(2);
}

function containsLatinLetters(value) {
  return /[A-Za-z]/.test(value);
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
