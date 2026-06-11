#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const generatedDir = path.join(rootDir, "data/generated");
const defaultReviewPath = path.join(
  generatedDir,
  "kanji-enrichment-review.generated.json"
);
const defaultMetadataPath = path.join(generatedDir, "kanji-metadata.generated.json");
const defaultOutputPath = path.join(
  generatedDir,
  "kanji-enrichment-audit.generated.json"
);

const suspiciousKoTokens = new Set([
  "에",
  "에서",
  "와",
  "그리고",
  "안",
  "용",
  "위로",
  "리드",
  "공기",
  "되다",
]);

const suspiciousGenericJaValues = new Set([
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

const options = parseArgs(process.argv.slice(2));
const [reviewRows, metadataRows] = await Promise.all([
  readJson(options.input),
  readJson(options.metadata),
]);

const metadataById = new Map(metadataRows.map((row) => [row.id, row]));
const auditRows = buildAuditRows(reviewRows, metadataById);
const summary = buildSummary(auditRows);
const output = {
  generatedAt: new Date().toISOString(),
  source: {
    input: path.relative(rootDir, options.input),
    metadata: path.relative(rootDir, options.metadata),
  },
  summary,
  rows: auditRows,
};

await mkdir(path.dirname(options.output), { recursive: true });
await writeJson(options.output, output);

printSummary(summary, options.output);

function buildAuditRows(rows, metadataById) {
  return rows.map((row) => {
    const metadataRow = metadataById.get(row.id);
    const issues = findIssues(row, metadataRow);

    return {
      id: row.id,
      literal: row.literal,
      sortOrder: row.sortOrder ?? null,
      reviewStatus: row.reviewStatus ?? null,
      meaningKo: normalizeNullable(row.meaningKo),
      meaningJa: normalizeNullable(row.meaningJa),
      exampleJa: normalizeNullable(row.exampleJa),
      exampleKo: normalizeNullable(row.exampleKo),
      jlptLevel: metadataRow?.jlptLevel ?? null,
      japaneseSchoolLevel: metadataRow?.japaneseSchoolLevel ?? null,
      japaneseGrade: metadataRow?.japaneseGrade ?? null,
      strokeCount: metadataRow?.strokeCount ?? null,
      isJoyo: metadataRow?.isJoyo ?? false,
      meaningEn: Array.isArray(metadataRow?.metadata?.meaningEn)
        ? metadataRow.metadata.meaningEn
        : [],
      issues,
    };
  });
}

function findIssues(row, metadataRow) {
  const issues = [];

  if (isMissingMeaning(row.meaningKo, "ko")) {
    issues.push("missingMeaningKo");
  }

  if (isMissingMeaning(row.meaningJa, "ja")) {
    issues.push("missingMeaningJa");
  }

  if (isBlank(row.exampleJa)) {
    issues.push("missingExampleJa");
  }

  if (isBlank(row.exampleKo)) {
    issues.push("missingExampleKo");
  }

  if (!metadataRow) {
    issues.push("missingMetadataRow");
  }

  if (metadataRow && !Array.isArray(metadataRow.metadata?.meaningEn)) {
    issues.push("missingMeaningEnMetadata");
  }

  if (looksSuspiciousMeaningKo(row.meaningKo, metadataRow)) {
    issues.push("suspiciousMeaningKo");
  }

  if (looksSuspiciousMeaningJa(row.meaningJa, row.literal, metadataRow)) {
    issues.push("suspiciousMeaningJa");
  }

  if (
    !isBlank(row.exampleJa) &&
    !isBlank(row.literal) &&
    !String(row.exampleJa).includes(row.literal)
  ) {
    issues.push("exampleJaMissingLiteral");
  }

  return issues;
}

function buildSummary(rows) {
  const issueCounts = {};
  const issueRows = [];

  for (const row of rows) {
    if (row.issues.length > 0) {
      issueRows.push(row);
    }

    for (const issue of row.issues) {
      issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;
    }
  }

  return {
    totalRows: rows.length,
    issueRows: issueRows.length,
    approvedRows: rows.filter((row) => row.reviewStatus === "approved").length,
    pendingRows: rows.filter((row) => row.reviewStatus === "pending").length,
    practicalIssueRows: issueRows.filter(isPracticalRow).length,
    issueCounts,
    topIssueRows: issueRows.slice(0, 30).map((row) => ({
      id: row.id,
      literal: row.literal,
      issues: row.issues,
      meaningKo: row.meaningKo,
      meaningJa: row.meaningJa,
      exampleJa: row.exampleJa,
      exampleKo: row.exampleKo,
    })),
  };
}

function isPracticalRow(row) {
  return Boolean(row.isJoyo || row.jlptLevel || row.japaneseSchoolLevel);
}

function isMissingMeaning(value, locale) {
  if (isBlank(value)) return true;

  const normalized = normalizeText(value);
  const unknownValues = locale === "ko"
    ? new Set(["-", "뜻 미상", "뜻미상", "미상", "알 수 없음"])
    : new Set(["-", "意味未詳", "未詳", "不明"]);

  return unknownValues.has(normalized);
}

function looksSuspiciousMeaningKo(value, metadataRow) {
  if (isMissingMeaning(value, "ko")) return false;

  const normalized = normalizeText(value);
  const hasHangul = /[가-힣]/.test(normalized);
  const meaningEn = Array.isArray(metadataRow?.metadata?.meaningEn)
    ? metadataRow.metadata.meaningEn
    : [];

  if (!hasHangul && meaningEn.length > 0) {
    return true;
  }

  if (isPracticalMetadataRow(metadataRow)) {
    return false;
  }

  return hasSuspiciousKoToken(normalized);
}

function isPracticalMetadataRow(metadataRow) {
  return Boolean(
    metadataRow?.isJoyo ||
    metadataRow?.jlptLevel ||
    metadataRow?.japaneseSchoolLevel
  );
}

function hasSuspiciousKoToken(value) {
  const tokens = value
    .split(/[、,]/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) return false;

  return tokens.some((token) => suspiciousKoTokens.has(token));
}

function looksSuspiciousMeaningJa(value, literal, metadataRow) {
  if (isMissingMeaning(value, "ja")) return false;

  const normalized = normalizeText(value);

  if (/[가-힣]/.test(normalized)) {
    return true;
  }

  if (normalized === literal) {
    return true;
  }

  if (isPracticalMetadataRow(metadataRow)) {
    return false;
  }

  return suspiciousGenericJaValues.has(normalized);
}

function normalizeNullable(value) {
  return isBlank(value) ? null : String(value);
}

function isBlank(value) {
  return value == null || String(value).trim() === "";
}

function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function printSummary(summary, outputPath) {
  console.log(`Wrote ${path.relative(rootDir, outputPath)}`);
  console.log(`Total rows: ${summary.totalRows}`);
  console.log(`Rows with issues: ${summary.issueRows}`);
  console.log(`Practical rows with issues: ${summary.practicalIssueRows}`);
  console.log("Issue counts:");

  for (const [issue, count] of Object.entries(summary.issueCounts).sort()) {
    console.log(`- ${issue}: ${count}`);
  }
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${filePath} to contain a JSON array.`);
  }

  return parsed;
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseArgs(argv) {
  const options = {
    input: defaultReviewPath,
    metadata: defaultMetadataPath,
    output: defaultOutputPath,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--input") {
      options.input = path.resolve(rootDir, argv[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (arg === "--metadata") {
      options.metadata = path.resolve(rootDir, argv[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (arg === "--output") {
      options.output = path.resolve(rootDir, argv[index + 1] ?? "");
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}
