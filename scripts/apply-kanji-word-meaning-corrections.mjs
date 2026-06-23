import { readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const options = parseArgs(process.argv.slice(2));
const rows = await readJson(options.inputPath);
const corrections = await readCorrections(options.correctionsPath);
const correctionByKey = new Map(
  corrections.map((row) => [buildKey(row.id, row.word, row.reading), row.meaningKo]),
);

let changedCount = 0;

for (const row of rows) {
  for (const word of row.words ?? []) {
    const key = buildKey(row.id, word.word, word.reading);
    const corrected = correctionByKey.get(key);
    const cleaned = corrected ?? cleanMeaningKo(word.meaningKo);

    if (cleaned && cleaned !== word.meaningKo) {
      word.meaningKo = cleaned;
      changedCount += 1;
    }
  }
}

await writeJson(options.outputPath, rows);
console.log(
  `Applied ${corrections.length} explicit corrections and wrote ${changedCount} changed meanings to ${path.relative(rootDir, options.outputPath)}.`,
);

async function readCorrections(filePath) {
  let raw;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${filePath} to contain a JSON array.`);
  }

  return parsed.filter(
    (row) =>
      row &&
      typeof row.id === "string" &&
      typeof row.word === "string" &&
      typeof row.reading === "string" &&
      typeof row.meaningKo === "string" &&
      row.meaningKo.trim(),
  );
}

function cleanMeaningKo(value) {
  if (typeof value !== "string" || !value.trim()) {
    return value;
  }

  const withoutParentheses = value
    .replace(/\([^)]*\)/g, "")
    .replace(/（[^）]*）/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const parts = withoutParentheses
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return withoutParentheses;
  }

  const dedupedParts = [...new Set(parts)];
  const concisePart =
    dedupedParts.find((part) => isConciseMeaning(part)) ?? dedupedParts[0];

  return concisePart
    .replace(/^(무언가를 |무언가의 )/, "")
    .replace(/[()]/g, "")
    .replace(/^~에 /, "")
    .replace(/하다$/, "")
    .replace(/[.。]$/u, "")
    .trim();
}

function isConciseMeaning(value) {
  return value.length <= 8 && !/\d/.test(value) && !/[~;]/.test(value);
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJson(filePath, value) {
  await writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  await rename(`${filePath}.tmp`, filePath);
}

function buildKey(id, word, reading) {
  return `${id}\u0000${word}\u0000${reading}`;
}

function parseArgs(argv) {
  const options = {
    correctionsPath: path.join(
      rootDir,
      "data/generated/kanji-word-meaning-ko-corrections.generated.json",
    ),
    inputPath: path.join(rootDir, "data/generated/kanji-words-ko.generated.json"),
    outputPath: path.join(
      rootDir,
      "data/generated/kanji-words-ko.reviewed.generated.json",
    ),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--corrections") {
      options.correctionsPath = path.resolve(rootDir, requireValue(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--input") {
      options.inputPath = path.resolve(rootDir, requireValue(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--output") {
      options.outputPath = path.resolve(rootDir, requireValue(argv, index, arg));
      index += 1;
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
