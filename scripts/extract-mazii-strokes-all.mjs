#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { probeMaziiStrokes } from "./probe-mazii-strokes.mjs";

const DEFAULT_PORT = 9223;
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_LOCALE = "ko-KR";
const DEFAULT_DICTIONARY = "jako";
const DEFAULT_CHUNK_SIZE = 50;
const DEFAULT_DELAY_MS = 300;
const DEFAULT_CONCURRENCY = 1;
const DEFAULT_OUTPUT_DIR = path.resolve(
  process.cwd(),
  "data/generated/mazii-strokes-batches"
);
const DIFF_PATH = path.resolve(
  process.cwd(),
  "data/generated/kanji-source-set-diff.generated.json"
);

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rows = await loadReviewOnlyRows();
  const batches = [];
  let totalSucceeded = 0;
  let totalFailed = 0;

  await fs.mkdir(options.outputDir, { recursive: true });

  const chunkJobs = buildChunkJobs(rows.length, options);

  for (const job of chunkJobs) {
    if (options.resume && (await fileExists(job.outputPath))) {
      const existing = JSON.parse(await fs.readFile(job.outputPath, "utf8"));
      totalSucceeded += existing.totals?.succeeded ?? 0;
      totalFailed += existing.totals?.failed ?? 0;
      batches.push({
        start: job.start,
        end: job.end,
        outputPath: job.outputPath,
        attempted: existing.totals?.attempted ?? (job.end - job.start + 1),
        succeeded: existing.totals?.succeeded ?? 0,
        failed: existing.totals?.failed ?? 0,
        skipped: true,
      });
      process.stderr.write(`[skip] ${path.basename(job.outputPath)}\n`);
    }
  }

  await writeSummary({
    outputDir: options.outputDir,
    locale: options.locale,
    dictionary: options.dictionary,
    host: options.host,
    port: options.port,
    totalRows: rows.length,
    totalSucceeded,
    totalFailed,
    chunkSize: options.chunkSize,
    batches,
  });

  const pendingJobs = chunkJobs.filter(
    (job) => !(options.resume && batches.some((batch) => batch.outputPath === job.outputPath))
  );

  let nextJobIndex = 0;

  const workers = Array.from({ length: Math.max(1, options.concurrency) }, (_, workerIndex) =>
    runWorker(workerIndex + 1)
  );

  await Promise.all(workers);

  process.stdout.write(
    `${path.join(options.outputDir, "index.generated.json")}\n`
  );

  async function runWorker(workerId) {
    while (nextJobIndex < pendingJobs.length) {
      const job = pendingJobs[nextJobIndex];
      nextJobIndex += 1;

      const batch = await processChunk({
        workerId,
        job,
        rows,
        options,
      });

      totalSucceeded += batch.succeeded;
      totalFailed += batch.failed;
      batches.push(batch);
      batches.sort((left, right) => left.start - right.start);

      await writeSummary({
        outputDir: options.outputDir,
        locale: options.locale,
        dictionary: options.dictionary,
        host: options.host,
        port: options.port,
        totalRows: rows.length,
        totalSucceeded,
        totalFailed,
        chunkSize: options.chunkSize,
        batches,
      });
    }
  }
}

function parseArgs(args) {
  const options = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    locale: DEFAULT_LOCALE,
    dictionary: DEFAULT_DICTIONARY,
    chunkSize: DEFAULT_CHUNK_SIZE,
    delayMs: DEFAULT_DELAY_MS,
    concurrency: DEFAULT_CONCURRENCY,
    outputDir: DEFAULT_OUTPUT_DIR,
    start: 0,
    maxChunks: null,
    resume: true,
  };

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (value === "--port") {
      options.port = Number(args[index + 1] ?? DEFAULT_PORT);
      index += 1;
      continue;
    }

    if (value === "--host") {
      options.host = args[index + 1] ?? DEFAULT_HOST;
      index += 1;
      continue;
    }

    if (value === "--locale") {
      options.locale = args[index + 1] ?? DEFAULT_LOCALE;
      index += 1;
      continue;
    }

    if (value === "--dictionary") {
      options.dictionary = args[index + 1] ?? DEFAULT_DICTIONARY;
      index += 1;
      continue;
    }

    if (value === "--chunk-size") {
      options.chunkSize = Number(args[index + 1] ?? DEFAULT_CHUNK_SIZE);
      index += 1;
      continue;
    }

    if (value === "--delay-ms") {
      options.delayMs = Number(args[index + 1] ?? DEFAULT_DELAY_MS);
      index += 1;
      continue;
    }

    if (value === "--concurrency") {
      options.concurrency = Number(args[index + 1] ?? DEFAULT_CONCURRENCY);
      index += 1;
      continue;
    }

    if (value === "--output-dir") {
      options.outputDir = path.resolve(process.cwd(), args[index + 1] ?? DEFAULT_OUTPUT_DIR);
      index += 1;
      continue;
    }

    if (value === "--start") {
      options.start = Number(args[index + 1] ?? 0);
      index += 1;
      continue;
    }

    if (value === "--max-chunks") {
      options.maxChunks = Number(args[index + 1] ?? 0);
      index += 1;
      continue;
    }

    if (value === "--no-resume") {
      options.resume = false;
    }
  }

  return options;
}

function buildChunkJobs(totalRows, options) {
  const jobs = [];

  for (let start = options.start; start < totalRows; start += options.chunkSize) {
    const batchIndex = Math.floor(start / options.chunkSize);
    if (options.maxChunks !== null && batchIndex >= options.maxChunks) {
      break;
    }

    const endExclusive = Math.min(start + options.chunkSize, totalRows);
    jobs.push({
      start,
      end: endExclusive - 1,
      outputPath: buildOutputPath(options.outputDir, start, endExclusive - 1),
    });
  }

  return jobs;
}

async function processChunk({ workerId, job, rows, options }) {
  const targetRows = rows.slice(job.start, job.end + 1);
  const results = [];
  const failures = [];

  for (let index = 0; index < targetRows.length; index += 1) {
    const row = targetRows[index];
    const position = job.start + index + 1;
    process.stderr.write(`[w${workerId}] [${position}/${rows.length}] probing ${row.literal}\n`);

    try {
      const result = await probeMaziiStrokes({
        literal: row.literal,
        host: options.host,
        port: options.port,
        locale: options.locale,
        dictionary: options.dictionary,
      });

      results.push({
        id: row.id,
        literal: row.literal,
        sortOrder: row.sortOrder,
        ...result,
      });
    } catch (error) {
      failures.push({
        id: row.id,
        literal: row.literal,
        sortOrder: row.sortOrder,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (index < targetRows.length - 1 && options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "Mazii",
    host: options.host,
    port: options.port,
    locale: options.locale,
    dictionary: options.dictionary,
    input: {
      start: job.start,
      end: job.end,
      chunkSize: options.chunkSize,
      workerId,
    },
    totals: {
      attempted: targetRows.length,
      succeeded: results.length,
      failed: failures.length,
    },
    results,
    failures,
  };

  await fs.writeFile(job.outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return {
    start: job.start,
    end: job.end,
    outputPath: job.outputPath,
    attempted: targetRows.length,
    succeeded: results.length,
    failed: failures.length,
    skipped: false,
  };
}

async function loadReviewOnlyRows() {
  const raw = await fs.readFile(DIFF_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return parsed.reviewOnly ?? [];
}

function buildOutputPath(outputDir, start, end) {
  const startLabel = String(start).padStart(4, "0");
  const endLabel = String(end).padStart(4, "0");
  return path.join(outputDir, `mazii-strokes.${startLabel}-${endLabel}.generated.json`);
}

async function writeSummary({
  outputDir,
  locale,
  dictionary,
  host,
  port,
  totalRows,
  totalSucceeded,
  totalFailed,
  chunkSize,
  batches,
}) {
  const payload = {
    generatedAt: new Date().toISOString(),
    source: "Mazii",
    host,
    port,
    locale,
    dictionary,
    chunkSize,
    totalRows,
    totalSucceeded,
    totalFailed,
    processedRows: totalSucceeded + totalFailed,
    remainingRows: Math.max(0, totalRows - (totalSucceeded + totalFailed)),
    batches,
  };

  await fs.writeFile(
    path.join(outputDir, "index.generated.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8"
  );
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
