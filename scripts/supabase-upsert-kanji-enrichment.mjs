import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env");
const defaultInputPath = path.join(
  rootDir,
  "data/generated/kanji-enrichment-review.generated.json"
);
const maziiInputPath = path.join(
  rootDir,
  "data/generated/mazii-kanji-enrichment.generated.json"
);

const inputPath = resolveInputPath(process.argv.slice(2));

const env = await loadEnv(envPath);
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"
  );
}

const reviewRows = await readJson(inputPath);
const approvedRows = normalizeInputRows(reviewRows);

if (approvedRows.length === 0) {
  console.log("No approved kanji enrichment rows to upload.");
  process.exit(0);
}

const payload = approvedRows.map(mapKanjiEnrichmentRow);
const existingRows = await fetchExistingCharacterBaseRows();
const existingRowMap = new Map(existingRows.map((row) => [row.id, row]));
const mergedPayload = payload
  .map((row) => mergeWithExistingRow(row, existingRowMap.get(row.id)))
  .filter(Boolean);
const skippedCount = payload.length - mergedPayload.length;
await upsertRowsInChunks(mergedPayload, 500);

console.log(
  `Upserted ${mergedPayload.length} approved kanji enrichment rows into kanji_characters.`
);
console.log(
  `Approved rows: ${payload.length}; matched DB rows: ${mergedPayload.length}; skipped rows not in DB: ${skippedCount}.`
);

async function upsertRowsInChunks(rows, chunkSize) {
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const response = await fetch(
      `${supabaseUrl}/rest/v1/kanji_characters?on_conflict=id`,
      {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(chunk),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Failed to upsert kanji enrichment rows chunk starting at ${index}: ${response.status} ${body}`
      );
    }
  }
}

function buildHeaders() {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  };
}

function mapKanjiEnrichmentRow(row) {
  const mappedRow = {
    id: row.id,
  };

  if (Object.hasOwn(row, "meaningKo")) {
    mappedRow.meaning_ko = row.meaningKo ?? null;
  }

  if (Object.hasOwn(row, "meaningJa")) {
    mappedRow.meaning_ja = row.meaningJa ?? null;
  }

  if (Object.hasOwn(row, "exampleJa")) {
    mappedRow.example_ja = row.exampleJa ?? null;
  }

  if (Object.hasOwn(row, "exampleKo")) {
    mappedRow.example_ko = row.exampleKo ?? null;
  }

  if (Object.hasOwn(row, "sortOrder")) {
    mappedRow.sort_order = row.sortOrder ?? null;
  }

  if (Object.hasOwn(row, "exampleJaFurigana")) {
    mappedRow.metadata = {
      ...(mappedRow.metadata ?? {}),
      exampleJaFurigana: normalizeExampleJaFurigana(row.exampleJaFurigana),
    };
  }

  if (Object.hasOwn(row, "specialReadings")) {
    mappedRow.metadata = {
      ...(mappedRow.metadata ?? {}),
      specialReadings: normalizeSpecialReadings(row.specialReadings),
    };
  }

  return mappedRow;
}

function mergeWithExistingRow(row, existingRow) {
  if (!existingRow) {
    return null;
  }

  return {
    id: row.id,
    literal: existingRow.literal,
    source: existingRow.source,
    license: existingRow.license,
    view_box_width: existingRow.view_box_width,
    view_box_height: existingRow.view_box_height,
    meaning_ko: Object.hasOwn(row, "meaning_ko")
      ? row.meaning_ko
      : existingRow.meaning_ko,
    meaning_ja: Object.hasOwn(row, "meaning_ja")
      ? row.meaning_ja
      : existingRow.meaning_ja,
    example_ja: Object.hasOwn(row, "example_ja")
      ? row.example_ja
      : existingRow.example_ja,
    example_ko: Object.hasOwn(row, "example_ko")
      ? row.example_ko
      : existingRow.example_ko,
    metadata: mergeMetadata(existingRow.metadata, row.metadata),
    sort_order: Object.hasOwn(row, "sort_order")
      ? row.sort_order
      : existingRow.sort_order,
  };
}

function normalizeInputRows(input) {
  if (Array.isArray(input)) {
    return input.filter((row) => row.reviewStatus === "approved");
  }

  if (Array.isArray(input?.results)) {
    return input.results.map((row) => {
      const normalizedRow = {
        id: row.id,
        meaningKo: row.meaningKo ?? null,
        meaningJa: row.meaningJa ?? null,
        exampleJa: row.exampleJa ?? null,
        exampleKo: row.exampleKo ?? null,
        sortOrder: row.sortOrder ?? null,
      };

      if (Object.hasOwn(row, "exampleJaFurigana")) {
        normalizedRow.exampleJaFurigana = row.exampleJaFurigana ?? null;
      }

      if (Object.hasOwn(row, "specialReadings")) {
        normalizedRow.specialReadings = row.specialReadings ?? null;
      }

      return normalizedRow;
    });
  }

  return [];
}

async function fetchExistingCharacterBaseRows() {
  const pageSize = 1000;
  let offset = 0;
  const rows = [];

  while (true) {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/kanji_characters?select=id,literal,source,license,view_box_width,view_box_height,meaning_ko,meaning_ja,example_ja,example_ko,sort_order,metadata&order=id.asc`,
      {
        headers: {
          ...buildHeaders(),
          Range: `${offset}-${offset + pageSize - 1}`,
        },
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Failed to fetch existing kanji_characters: ${response.status} ${body}`
      );
    }

    const pageRows = await response.json();
    rows.push(...pageRows);

    if (pageRows.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

function mergeMetadata(existingMetadata, nextMetadata) {
  const merged = isPlainObject(existingMetadata) ? { ...existingMetadata } : {};

  if (!Object.hasOwn(nextMetadata ?? {}, "exampleJaFurigana")) {
    if (!Object.hasOwn(nextMetadata ?? {}, "specialReadings")) {
      return merged;
    }
  }

  if (Object.hasOwn(nextMetadata ?? {}, "specialReadings")) {
    const normalizedSpecialReadings = normalizeSpecialReadings(
      nextMetadata.specialReadings,
    );

    if (normalizedSpecialReadings) {
      merged.specialReadings = normalizedSpecialReadings;
    } else {
      delete merged.specialReadings;
    }
  }

  if (!Object.hasOwn(nextMetadata ?? {}, "exampleJaFurigana")) {
    return merged;
  }

  const normalizedFurigana = normalizeExampleJaFurigana(
    nextMetadata.exampleJaFurigana,
  );

  if (normalizedFurigana) {
    merged.exampleJaFurigana = normalizedFurigana;
  } else {
    delete merged.exampleJaFurigana;
  }

  return merged;
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

function normalizeSpecialReadings(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const normalized = rows
    .map((row) => ({
      word: normalizeString(row?.word),
      reading: normalizeString(row?.reading),
      meaningKo: normalizeNullableString(row?.meaningKo),
      meaningJa: normalizeNullableString(row?.meaningJa),
      noteKo: normalizeNullableString(row?.noteKo),
      noteJa: normalizeNullableString(row?.noteJa),
    }))
    .filter((row) => row.word && row.reading && (row.meaningKo || row.meaningJa));

  return normalized.length > 0 ? normalized : null;
}

function normalizeString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeNullableString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readJson(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Missing or unreadable review file at ${filePath}`);
  }
}

function resolveInputPath(args) {
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--input") {
      return path.resolve(process.cwd(), args[index + 1] ?? defaultInputPath);
    }
  }

  return inputExists(maziiInputPath) ? maziiInputPath : defaultInputPath;
}

function inputExists(filePath) {
  try {
    return existsSync(filePath);
  } catch (error) {
    return false;
  }
}

async function loadEnv(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return parseEnv(raw);
  } catch (error) {
    throw new Error(`Missing or unreadable env file at ${filePath}`);
  }
}

function parseEnv(raw) {
  return raw
    .split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith("#"))
    .reduce((acc, line) => {
      const index = line.indexOf("=");
      if (index === -1) {
        return acc;
      }

      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
      acc[key] = value;
      return acc;
    }, {});
}
