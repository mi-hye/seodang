import { readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env");
const reviewPath = path.join(
  rootDir,
  "data/generated/kanji-enrichment-review.generated.json"
);

const env = await loadEnv(envPath);
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"
  );
}

const reviewRows = await readJson(reviewPath);
const approvedRows = reviewRows.filter(
  (row) => row.reviewStatus === "approved"
);

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
await upsertRowsInChunks(mergedPayload, 500);

console.log(
  `Upserted ${mergedPayload.length} approved kanji enrichment rows into kanji_characters.`
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
  return {
    id: row.id,
    meaning_ko: row.meaningKo ?? null,
    meaning_ja: row.meaningJa ?? null,
    sort_order: row.sortOrder ?? null,
  };
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
    meaning_ko: row.meaning_ko,
    meaning_ja: row.meaning_ja,
    sort_order: row.sort_order,
  };
}

async function fetchExistingCharacterBaseRows() {
  const pageSize = 1000;
  let offset = 0;
  const rows = [];

  while (true) {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/kanji_characters?select=id,literal,source,license,view_box_width,view_box_height&order=id.asc`,
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

async function readJson(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Missing or unreadable review file at ${filePath}`);
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
