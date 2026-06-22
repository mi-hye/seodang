import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const defaultReviewPath = path.join(
  rootDir,
  "data/generated/kanji-enrichment-review.generated.json"
);

const { inputPath, reviewPath, status } = parseArgs(process.argv.slice(2));
const reviewRows = await readJsonArray(reviewPath, "review rows");
const suggestionRows = await readJsonArray(inputPath, "suggestion rows");
const mergedRows = mergeSuggestions(reviewRows, suggestionRows, status);

await writeJsonAtomically(reviewPath, mergedRows);

console.log(
  `Applied ${suggestionRows.length} kanji enrichment suggestion${suggestionRows.length === 1 ? "" : "s"} as ${status}.`
);

function parseArgs(argv) {
  let inputPath = null;
  let reviewPath = defaultReviewPath;
  let status = "pending";
  const allowedStatuses = new Set(["pending", "approved", "rejected"]);

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

    if (arg.startsWith("--status=")) {
      const value = arg.slice("--status=".length).trim();
      if (!allowedStatuses.has(value)) {
        throw new Error(
          "Expected --status to be one of: pending, approved, rejected."
        );
      }
      status = value;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!inputPath) {
    throw new Error("Expected --input to point to a suggestion JSON file.");
  }

  return { inputPath, reviewPath, status };
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

function mergeSuggestions(reviewRows, suggestionRows, status) {
  const suggestionMap = new Map();

  for (const row of suggestionRows) {
    if (!row?.id) {
      throw new Error("Every suggestion row must include an id.");
    }

    if (suggestionMap.has(row.id)) {
      throw new Error(`Duplicate suggestion id: ${row.id}`);
    }

    suggestionMap.set(row.id, row);
  }

  const reviewIds = new Set(reviewRows.map((row) => row?.id).filter(Boolean));
  const missingIds = [...suggestionMap.keys()].filter((id) => !reviewIds.has(id));

  if (missingIds.length > 0) {
    throw new Error(`Unknown kanji review id(s): ${missingIds.join(", ")}`);
  }

  return reviewRows.map((row) => {
    const suggestion = suggestionMap.get(row.id);

    if (!suggestion) {
      return row;
    }

    const nextRow = {
      ...row,
      meaningKo: normalizeNullableString(suggestion.meaningKo),
      meaningJa: normalizeNullableString(suggestion.meaningJa),
      exampleJa: normalizeNullableString(suggestion.exampleJa),
      exampleKo: normalizeNullableString(suggestion.exampleKo),
      reviewStatus: status,
      notes: normalizeNullableString(suggestion.notes ?? row.notes),
    };

    if (Object.hasOwn(suggestion, "exampleJaFurigana")) {
      nextRow.exampleJaFurigana = normalizeExampleJaFurigana(
        suggestion.exampleJaFurigana,
      );
    }

    return nextRow;
  });
}

function normalizeNullableString(value) {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeExampleJaFurigana(parts) {
  if (!Array.isArray(parts) || parts.length === 0) {
    return null;
  }

  const normalized = parts
    .map((part) => ({
      text: typeof part?.text === "string" ? part.text : "",
      reading:
        typeof part?.reading === "string" && part.reading.trim()
          ? toHiragana(part.reading.trim())
          : null,
    }))
    .filter((part) => part.text);

  return normalized.length > 0 ? normalized : null;
}

function toHiragana(value) {
  return Array.from(value)
    .map((character) => {
      const codePoint = character.codePointAt(0);

      if (codePoint != null && codePoint >= 0x30a1 && codePoint <= 0x30f6) {
        return String.fromCodePoint(codePoint - 0x60);
      }

      return character;
    })
    .join("");
}

async function writeJsonAtomically(filePath, value) {
  const dir = path.dirname(filePath);
  const tempPath = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );

  try {
    await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(tempPath, filePath);
  } catch (error) {
    try {
      await unlink(tempPath);
    } catch {
      // Ignore cleanup failures for best-effort atomic writes.
    }

    throw error;
  }
}
