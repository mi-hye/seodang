import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env");
const reviewPath = path.join(
  rootDir,
  "data/generated/kanji-enrichment-review.generated.json"
);
const outputDir = path.join(rootDir, "data/generated");
const outputPath = path.join(outputDir, "kanji-source-set-diff.generated.json");

const env = await loadEnv(envPath);
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"
  );
}

const reviewRows = await readJson(reviewPath);
const dbRows = await fetchAllRows(
  `${supabaseUrl}/rest/v1/kanji_characters?select=id,literal,source,license,view_box_width,view_box_height&order=id.asc`
);

const reviewIds = new Set(reviewRows.map((row) => row.id));
const dbIds = new Set(dbRows.map((row) => row.id));

const reviewOnly = reviewRows
  .filter((row) => !dbIds.has(row.id))
  .map((row) => ({
    id: row.id,
    literal: row.literal,
    meaningKo: row.meaningKo ?? null,
    meaningJa: row.meaningJa ?? null,
    sortOrder: row.sortOrder ?? null,
  }));

const dbOnly = dbRows
  .filter((row) => !reviewIds.has(row.id))
  .map((row) => ({
    id: row.id,
    literal: row.literal,
    source: row.source,
    license: row.license,
    viewBoxWidth: row.view_box_width,
    viewBoxHeight: row.view_box_height,
  }));

const payload = {
  generatedAt: new Date().toISOString(),
  reviewRowCount: reviewRows.length,
  dbRowCount: dbRows.length,
  reviewOnlyCount: reviewOnly.length,
  dbOnlyCount: dbOnly.length,
  reviewOnlySample: reviewOnly.slice(0, 50),
  dbOnlySample: dbOnly.slice(0, 50),
  reviewOnly,
  dbOnly,
};

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(
  `Wrote kanji source-set diff report to ${outputPath} (reviewOnly=${reviewOnly.length}, dbOnly=${dbOnly.length}).`
);

async function fetchAllRows(url) {
  const pageSize = 1000;
  let offset = 0;
  const rows = [];

  while (true) {
    const response = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Range: `${offset}-${offset + pageSize - 1}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch rows: ${response.status} ${await response.text()}`);
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
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function loadEnv(filePath) {
  const raw = await readFile(filePath, "utf8");
  return parseEnv(raw);
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
