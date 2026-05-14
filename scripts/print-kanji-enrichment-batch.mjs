import { readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const reviewFilePath = path.join(
  rootDir,
  "data/generated/kanji-enrichment-review.generated.json"
);

const { status, limit } = parseArgs(process.argv.slice(2));
const rows = await loadReviewRows(reviewFilePath);
const filteredRows = rows
  .filter((row) => row.reviewStatus === status)
  .sort(compareBySortOrder)
  .slice(0, limit);

console.log(`Showing ${filteredRows.length} ${status} rows`);
filteredRows.forEach((row, index) => {
  console.log(`${index + 1}. ${formatRow(row)}`);
});

async function loadReviewRows(filePath) {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${filePath} to contain an array of review rows.`);
  }

  return parsed;
}

function parseArgs(argv) {
  let status = "pending";
  let limit = 20;
  const allowedStatuses = new Set(["pending", "approved", "rejected"]);

  for (const arg of argv) {
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

    if (arg.startsWith("--limit=")) {
      const value = Number(arg.slice("--limit=".length));
      if (!Number.isInteger(value) || value < 0) {
        throw new Error("Expected --limit to be a non-negative integer.");
      }
      limit = value;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { status, limit };
}

function compareBySortOrder(left, right) {
  return normalizeSortOrder(left?.sortOrder) - normalizeSortOrder(right?.sortOrder);
}

function normalizeSortOrder(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function formatRow(row) {
  return [
    row.literal ?? "",
    row.meaningKo ?? "",
    row.meaningJa ?? "",
  ].join(" | ");
}
