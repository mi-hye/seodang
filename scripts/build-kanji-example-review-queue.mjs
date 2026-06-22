import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const defaultReviewPath = path.join(
  rootDir,
  "data/generated/kanji-enrichment-review.generated.json",
);
const defaultMetadataPath = path.join(
  rootDir,
  "data/generated/kanji-metadata.generated.json",
);
const defaultOutputPath = path.join(
  rootDir,
  "data/generated/kanji-example-review-queue.generated.json",
);

const { reviewPath, metadataPath, outputPath } = parseArgs(process.argv.slice(2));
const reviewRows = await readJsonArray(reviewPath);
const metadataRows = await readJsonArray(metadataPath);
const metadataById = new Map(metadataRows.map((row) => [row.id, row]));
const queueRows = reviewRows
  .filter((row) => row.reviewStatus === "approved" && row.exampleJa)
  .map((row) => buildQueueRow(row, metadataById.get(row.id)))
  .filter((row) => row.issues.length > 0)
  .sort(compareQueueRows);

const summary = summarize(queueRows);
await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: path.relative(rootDir, reviewPath),
      summary,
      results: queueRows,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Wrote ${queueRows.length} example review queue rows to ${outputPath}.`);
console.log(JSON.stringify(summary, null, 2));

function buildQueueRow(row, metadata = {}) {
  const practicalSignals = getPracticalSignals(metadata);
  const issues = getIssues(row, practicalSignals);

  return {
    id: row.id,
    literal: row.literal,
    priority: getPriority({ issues, practicalSignals }),
    issues,
    practicalSignals,
    meaningKo: row.meaningKo ?? null,
    meaningJa: row.meaningJa ?? null,
    exampleJa: row.exampleJa ?? null,
    exampleKo: row.exampleKo ?? null,
    hasReviewedFurigana: hasReviewedFurigana(row),
    sortOrder: row.sortOrder ?? null,
  };
}

function getIssues(row, practicalSignals) {
  const issues = [];
  const exampleJa = row.exampleJa ?? "";

  if (!hasReviewedFurigana(row)) {
    issues.push("missingFurigana");
  }

  if (isQuotedLiteralMeta(row)) {
    issues.push("quotedLiteralMeta");
  }

  if (/^「.+」は日常ではほとんど使われない漢字です。$/.test(exampleJa)) {
    issues.push("rareFallbackMeta");
  }

  if (/^「.+」は漢字の部品として使われる形です。$/.test(exampleJa)) {
    issues.push("componentFallbackMeta");
  }

  if (practicalSignals.length > 0 && isQuotedLiteralMeta(row)) {
    issues.push("practicalQuotedMeta");
  }

  if (isBareLiteralGeneric(row)) {
    issues.push("bareLiteralGeneric");
  }

  if (row.literal && !exampleJa.includes(row.literal)) {
    issues.push("exampleMissingLiteral");
  }

  return issues;
}

function getPriority({ issues, practicalSignals }) {
  let priority = 0;

  if (practicalSignals.length > 0) priority += 1000;
  if (issues.includes("practicalQuotedMeta")) priority += 500;
  if (issues.includes("bareLiteralGeneric")) priority += 250;
  if (issues.includes("quotedLiteralMeta")) priority += 120;
  if (issues.includes("rareFallbackMeta")) priority += 80;
  if (issues.includes("componentFallbackMeta")) priority += 60;
  if (issues.includes("exampleMissingLiteral")) priority += 40;
  if (issues.includes("missingFurigana")) priority += 10;

  return priority;
}

function compareQueueRows(a, b) {
  if (b.priority !== a.priority) {
    return b.priority - a.priority;
  }

  return (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER);
}

function getPracticalSignals(metadata = {}) {
  const signals = [];

  if (metadata.jlptLevel) signals.push(`jlpt:${metadata.jlptLevel}`);
  if (metadata.japaneseSchoolLevel) {
    signals.push(`school:${metadata.japaneseSchoolLevel}`);
  }
  if (metadata.japaneseGrade != null) signals.push(`grade:${metadata.japaneseGrade}`);
  if (metadata.isJoyo) signals.push("joyo");

  return signals;
}

function hasReviewedFurigana(row) {
  return (
    Array.isArray(row.exampleJaFurigana) &&
    row.exampleJaFurigana.length > 0 &&
    row.exampleJaFurigana.map((part) => part?.text ?? "").join("") === row.exampleJa
  );
}

function isQuotedLiteralMeta(row) {
  return new RegExp(`^「${escapeRegExp(row.literal)}」は`).test(row.exampleJa ?? "");
}

function isBareLiteralGeneric(row) {
  const literal = escapeRegExp(row.literal);
  return new RegExp(
    `^(この|その)?${literal}(を|は|が|に|で|の).*(表す|使われ|覚え|読み|書き)`,
  ).test(row.exampleJa ?? "");
}

function summarize(rows) {
  const issueCounts = {};
  const priorityCounts = {
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const row of rows) {
    for (const issue of row.issues) {
      issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;
    }

    if (row.priority >= 1000) {
      priorityCounts.high += 1;
    } else if (row.priority >= 120) {
      priorityCounts.medium += 1;
    } else {
      priorityCounts.low += 1;
    }
  }

  return {
    total: rows.length,
    issueCounts,
    priorityCounts,
  };
}

async function readJsonArray(filePath) {
  const parsed = JSON.parse(await readFile(filePath, "utf8"));

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${filePath} to contain a JSON array.`);
  }

  return parsed;
}

function parseArgs(args) {
  const parsed = {
    reviewPath: defaultReviewPath,
    metadataPath: defaultMetadataPath,
    outputPath: defaultOutputPath,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--review") {
      parsed.reviewPath = path.resolve(rootDir, requireValue(args, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--metadata") {
      parsed.metadataPath = path.resolve(rootDir, requireValue(args, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--output") {
      parsed.outputPath = path.resolve(rootDir, requireValue(args, index, arg));
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function requireValue(args, index, arg) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`Expected a value after ${arg}.`);
  }

  return value;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
