#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { checkMaziiStrokeAvailability } from "./probe-mazii-strokes.mjs";

const DEFAULT_PORT = 9223;
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_LOCALE = "ko-KR";
const DEFAULT_DICTIONARY = "jako";
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_DELAY_MS = 200;
const DEFAULT_OUTPUT = path.resolve(
  process.cwd(),
  "data/generated/mazii-supported-kanji.generated.json"
);
const DIFF_PATH = path.resolve(
  process.cwd(),
  "data/generated/kanji-source-set-diff.generated.json"
);

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rows = await loadReviewOnlyRows();
  const targetRows = rows.slice(options.start, options.start + options.limit);
  const supported = [];
  const unsupported = [];
  let nextIndex = 0;

  const workers = Array.from({ length: Math.max(1, options.concurrency) }, (_, workerIndex) =>
    runWorker(workerIndex + 1)
  );

  await Promise.all(workers);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "Mazii",
    host: options.host,
    port: options.port,
    locale: options.locale,
    dictionary: options.dictionary,
    input: {
      start: options.start,
      limit: options.limit,
      concurrency: options.concurrency,
    },
    totals: {
      attempted: targetRows.length,
      supported: supported.length,
      unsupported: unsupported.length,
    },
    supported: supported.sort((left, right) => left.sortOrder - right.sortOrder),
    unsupported: unsupported.sort((left, right) => left.sortOrder - right.sortOrder),
  };

  await fs.mkdir(path.dirname(options.output), { recursive: true });
  await fs.writeFile(options.output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  process.stdout.write(`${options.output}\n`);

  async function runWorker(workerId) {
    while (nextIndex < targetRows.length) {
      const row = targetRows[nextIndex];
      nextIndex += 1;
      const position = options.start + nextIndex;
      process.stderr.write(`[w${workerId}] [${position}/${rows.length}] checking ${row.literal}\n`);

      try {
        const availability = await checkMaziiStrokeAvailability({
          literal: row.literal,
          host: options.host,
          port: options.port,
          locale: options.locale,
          dictionary: options.dictionary,
        });

        const entry = {
          id: row.id,
          literal: row.literal,
          sortOrder: row.sortOrder,
          ...availability,
        };

        if (availability.hasDrawButton && availability.hasSvgPaths) {
          supported.push(entry);
        } else {
          unsupported.push(entry);
        }
      } catch (error) {
        unsupported.push({
          id: row.id,
          literal: row.literal,
          sortOrder: row.sortOrder,
          hasDrawButton: false,
          hasSvgPaths: false,
          failureReason: error instanceof Error ? error.message : String(error),
        });
      }

      if (options.delayMs > 0) {
        await sleep(options.delayMs);
      }
    }
  }
}

function parseArgs(args) {
  const options = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    locale: DEFAULT_LOCALE,
    dictionary: DEFAULT_DICTIONARY,
    concurrency: DEFAULT_CONCURRENCY,
    delayMs: DEFAULT_DELAY_MS,
    output: DEFAULT_OUTPUT,
    start: 0,
    limit: 200,
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

    if (value === "--concurrency") {
      options.concurrency = Number(args[index + 1] ?? DEFAULT_CONCURRENCY);
      index += 1;
      continue;
    }

    if (value === "--delay-ms") {
      options.delayMs = Number(args[index + 1] ?? DEFAULT_DELAY_MS);
      index += 1;
      continue;
    }

    if (value === "--output") {
      options.output = path.resolve(process.cwd(), args[index + 1] ?? DEFAULT_OUTPUT);
      index += 1;
      continue;
    }

    if (value === "--start") {
      options.start = Number(args[index + 1] ?? 0);
      index += 1;
      continue;
    }

    if (value === "--limit") {
      options.limit = Number(args[index + 1] ?? 200);
      index += 1;
      continue;
    }
  }

  return options;
}

async function loadReviewOnlyRows() {
  const raw = await fs.readFile(DIFF_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return parsed.reviewOnly ?? [];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
