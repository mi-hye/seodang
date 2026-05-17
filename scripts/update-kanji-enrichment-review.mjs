import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const reviewFilePath = path.join(
  rootDir,
  "data/generated/kanji-enrichment-review.generated.json"
);

const { ids, status } = parseArgs(process.argv.slice(2));
const rows = await loadReviewRows(reviewFilePath);
const updatedRows = updateReviewStatuses(rows, ids, status);

await writeJsonAtomically(reviewFilePath, updatedRows);

console.log(
  `Updated ${ids.length} row${ids.length === 1 ? "" : "s"} to ${status}.`
);

async function loadReviewRows(filePath) {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${filePath} to contain an array of review rows.`);
  }

  return parsed;
}

function parseArgs(argv) {
  let status = null;
  let ids = null;
  const allowedStatuses = new Set(["pending", "approved", "rejected"]);

  for (const arg of argv) {
    if (arg.startsWith("--ids=")) {
      const value = arg.slice("--ids=".length).trim();
      ids = value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
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

  if (!ids || ids.length === 0) {
    throw new Error("Expected --ids to provide at least one kanji review id.");
  }

  if (!status) {
    throw new Error("Expected --status to be provided.");
  }

  return { ids, status };
}

function updateReviewStatuses(rows, ids, status) {
  const targetIds = new Set(ids);
  const availableIds = new Set(rows.map((row) => row?.id).filter(Boolean));
  const missingIds = ids.filter((id) => !availableIds.has(id));

  if (missingIds.length > 0) {
    throw new Error(`Unknown kanji review id(s): ${missingIds.join(", ")}`);
  }

  let updatedCount = 0;
  const updatedRows = rows.map((row) => {
    if (targetIds.has(row.id)) {
      updatedCount += 1;
      return {
        ...row,
        reviewStatus: status,
      };
    }

    return row;
  });

  if (updatedCount === 0) {
    throw new Error("No matching review rows were updated.");
  }

  return updatedRows;
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
      // Ignore cleanup failures for a best-effort atomic write.
    }

    throw error;
  }
}
