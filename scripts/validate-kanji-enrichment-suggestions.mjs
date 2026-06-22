import { readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const defaultReviewPath = path.join(
  rootDir,
  "data/generated/kanji-enrichment-review.generated.json"
);

const { inputPath, reviewPath } = parseArgs(process.argv.slice(2));
const reviewRows = await readJsonArray(reviewPath, "review rows");
const suggestionRows = await readJsonArray(inputPath, "suggestion rows");
const reviewById = new Map(reviewRows.map((row) => [row.id, row]));
const errors = validateSuggestions(suggestionRows, reviewById);

if (errors.length > 0) {
  console.error(
    `Found ${errors.length} invalid kanji enrichment suggestion issue${errors.length === 1 ? "" : "s"}:`
  );
  for (const error of errors.slice(0, 50)) {
    console.error(`- ${error}`);
  }
  if (errors.length > 50) {
    console.error(`- ...and ${errors.length - 50} more.`);
  }
  process.exit(1);
}

console.log(
  `Validated ${suggestionRows.length} kanji enrichment suggestion${suggestionRows.length === 1 ? "" : "s"}.`
);

function parseArgs(argv) {
  let inputPath = null;
  let reviewPath = defaultReviewPath;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--input") {
      inputPath = path.resolve(rootDir, requireValue(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--review") {
      reviewPath = path.resolve(rootDir, requireValue(argv, index, arg));
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!inputPath) {
    throw new Error("Expected --input to point to a suggestion JSON file.");
  }

  return { inputPath, reviewPath };
}

function requireValue(argv, index, arg) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Expected a value after ${arg}.`);
  }
  return value;
}

async function readJsonArray(filePath, label) {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${filePath} to contain an array of ${label}.`);
  }

  return parsed;
}

function validateSuggestions(rows, reviewById) {
  const errors = [];
  const seenIds = new Set();

  rows.forEach((row, index) => {
    const label = row?.id ? `${row.id}` : `row ${index + 1}`;

    if (!row || typeof row !== "object" || Array.isArray(row)) {
      errors.push(`${label}: row must be an object.`);
      return;
    }

    if (!isNonEmptyString(row.id)) {
      errors.push(`${label}: id is required.`);
      return;
    }

    if (seenIds.has(row.id)) {
      errors.push(`${label}: duplicate id.`);
    }
    seenIds.add(row.id);

    const reviewRow = reviewById.get(row.id);
    if (!reviewRow) {
      errors.push(`${label}: unknown review id.`);
    }

    for (const field of [
      "literal",
      "meaningKo",
      "meaningJa",
      "exampleJa",
      "exampleKo",
    ]) {
      if (!isNonEmptyString(row[field])) {
        errors.push(`${label}: ${field} must be a non-empty string.`);
      }
    }

    if (
      isNonEmptyString(row.literal) &&
      reviewRow?.literal &&
      row.literal !== reviewRow.literal
    ) {
      errors.push(`${label}: literal does not match review literal ${reviewRow.literal}.`);
    }

    if (
      isNonEmptyString(row.literal) &&
      isNonEmptyString(row.exampleJa) &&
      !row.exampleJa.includes(row.literal)
    ) {
      errors.push(`${label}: exampleJa must include literal ${row.literal}.`);
    }

    validateFurigana(row, label, errors);
  });

  return errors;
}

function validateFurigana(row, label, errors) {
  if (!Array.isArray(row.exampleJaFurigana) || row.exampleJaFurigana.length === 0) {
    errors.push(`${label}: exampleJaFurigana must be a non-empty array.`);
    return;
  }

  const combinedText = row.exampleJaFurigana.map((part, partIndex) => {
    if (!part || typeof part !== "object" || Array.isArray(part)) {
      errors.push(`${label}: exampleJaFurigana[${partIndex}] must be an object.`);
      return "";
    }

    if (!isNonEmptyString(part.text)) {
      errors.push(`${label}: exampleJaFurigana[${partIndex}].text must be non-empty.`);
      return "";
    }

    if (part.reading != null) {
      if (!isNonEmptyString(part.reading)) {
        errors.push(`${label}: exampleJaFurigana[${partIndex}].reading must be null or non-empty.`);
      }

      if (containsKatakana(part.reading)) {
        errors.push(`${label}: exampleJaFurigana[${partIndex}].reading must be hiragana, not katakana.`);
      }

      if (!isHiraganaReading(part.reading)) {
        errors.push(`${label}: exampleJaFurigana[${partIndex}].reading must contain only hiragana.`);
      }
    }

    return part.text;
  }).join("");

  if (isNonEmptyString(row.exampleJa) && combinedText !== row.exampleJa) {
    errors.push(`${label}: furigana text must concatenate exactly to exampleJa.`);
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function containsKatakana(value) {
  return /[\u30a1-\u30fa\u30fc]/u.test(value);
}

function isHiraganaReading(value) {
  return /^[\u3041-\u3096]+$/u.test(value);
}
