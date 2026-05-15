#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { probeMaziiStrokes } from "./probe-mazii-strokes.mjs";

const DEFAULT_PORT = 9223;
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_LOCALE = "en-US";
const DEFAULT_DICTIONARY = "jaen";
const DEFAULT_LIMIT = 20;
const DEFAULT_START = 0;
const DEFAULT_DELAY_MS = 300;
const DEFAULT_OUTPUT = path.resolve(
  process.cwd(),
  "data/generated/mazii-strokes.generated.json"
);
const DIFF_PATH = path.resolve(
  process.cwd(),
  "data/generated/kanji-source-set-diff.generated.json"
);

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const sourceRows = options.literal
    ? [{ id: null, literal: options.literal, sortOrder: null }]
    : await loadReviewOnlyRows();

  const targetRows = sourceRows.slice(options.start, options.start + options.limit);
  const results = [];
  const failures = [];

  for (let index = 0; index < targetRows.length; index += 1) {
    const row = targetRows[index];
    const position = options.start + index + 1;

    process.stderr.write(`[${position}] probing ${row.literal}\n`);

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
      start: options.start,
      limit: options.limit,
      literal: options.literal ?? null,
    },
    totals: {
      attempted: targetRows.length,
      succeeded: results.length,
      failed: failures.length,
    },
    results,
    failures,
  };

  await fs.mkdir(path.dirname(options.output), { recursive: true });
  await fs.writeFile(options.output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  process.stdout.write(`${options.output}\n`);
}

function parseArgs(args) {
  const options = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    locale: DEFAULT_LOCALE,
    dictionary: DEFAULT_DICTIONARY,
    limit: DEFAULT_LIMIT,
    start: DEFAULT_START,
    delayMs: DEFAULT_DELAY_MS,
    output: DEFAULT_OUTPUT,
    literal: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (!value.startsWith("--") && !options.literal) {
      options.literal = value;
      continue;
    }

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

    if (value === "--limit") {
      options.limit = Number(args[index + 1] ?? DEFAULT_LIMIT);
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

    if (value === "--start") {
      options.start = Number(args[index + 1] ?? DEFAULT_START);
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
