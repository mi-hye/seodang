import { readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const defaultAuditPath = path.join(
  rootDir,
  "data/generated/kanji-enrichment-audit.generated.json"
);

const { inputPath, limit, practicalOnly } = parseArgs(process.argv.slice(2));
const audit = await readAudit(inputPath);
const rows = audit.rows
  .filter((row) => row.issues.length > 0)
  .filter((row) => (practicalOnly ? isPracticalRow(row) : true))
  .sort(compareAuditRows)
  .slice(0, limit);

console.log(`Showing ${rows.length} kanji enrichment issue rows`);
rows.forEach((row, index) => {
  console.log(`${index + 1}. ${formatRow(row)}`);
});

async function readAudit(filePath) {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed?.rows)) {
    throw new Error(`Expected ${filePath} to contain an audit object with rows.`);
  }

  return parsed;
}

function parseArgs(argv) {
  let inputPath = defaultAuditPath;
  let limit = 50;
  let practicalOnly = true;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--input") {
      inputPath = path.resolve(rootDir, requireValue(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const value = Number(arg.slice("--limit=".length));
      if (!Number.isInteger(value) || value < 0) {
        throw new Error("Expected --limit to be a non-negative integer.");
      }
      limit = value;
      continue;
    }

    if (arg === "--all") {
      practicalOnly = false;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { inputPath, limit, practicalOnly };
}

function requireValue(argv, index, arg) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Expected a value after ${arg}.`);
  }
  return value;
}

function isPracticalRow(row) {
  return Boolean(row.isJoyo || row.jlptLevel || row.japaneseSchoolLevel);
}

function compareAuditRows(left, right) {
  return normalizeSortOrder(left.sortOrder) - normalizeSortOrder(right.sortOrder);
}

function normalizeSortOrder(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function formatRow(row) {
  return [
    row.literal,
    `id=${row.id}`,
    `issues=${row.issues.join(",")}`,
    `ko=${row.meaningKo ?? ""}`,
    `ja=${row.meaningJa ?? ""}`,
    `exampleJa=${row.exampleJa ?? ""}`,
    `exampleKo=${row.exampleKo ?? ""}`,
  ].join(" | ");
}
