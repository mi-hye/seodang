#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env");
const generatedDir = path.join(rootDir, "data/generated");
const defaultOutputPath = path.join(
  generatedDir,
  "kanji-catalog-consistency.generated.json"
);
const locales = ["ko", "ja"];
const pageLimit = 50;

const options = parseArgs(process.argv.slice(2));
const env = await loadEnv(envPath);
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env"
  );
}

const localeReports = [];

for (const locale of locales) {
  localeReports.push(await checkLocale(locale));
}

const issues = localeReports.flatMap((report) => report.issues);
const output = {
  generatedAt: new Date().toISOString(),
  mode: options.deep ? "deep" : "smoke",
  summary: {
    allCategories: options.allCategories,
    deep: options.deep,
    concurrency: options.concurrency,
    requestTimeoutMs: options.requestTimeoutMs,
    locales: localeReports.length,
    groups: localeReports.reduce((sum, report) => sum + report.groups, 0),
    categories: localeReports.reduce((sum, report) => sum + report.categories, 0),
    checkedCategories: localeReports.reduce(
      (sum, report) => sum + report.checkedCategories,
      0
    ),
    charactersScanned: localeReports.reduce(
      (sum, report) => sum + report.charactersScanned,
      0
    ),
    issueRows: issues.length,
  },
  localeReports,
  issues,
};

await mkdir(path.dirname(options.output), { recursive: true });
await writeFile(options.output, `${JSON.stringify(output, null, 2)}\n`, "utf8");

printSummary(output.summary, options.output);

if (options.failOnIssues && issues.length > 0) {
  process.exitCode = 1;
}

async function checkLocale(locale) {
  const groups = await fetchJson(
    `/functions/v1/kanji-catalog?${new URLSearchParams({ locale })}`,
    `Failed to fetch catalog groups for ${locale}`
  );
  const issues = [];

  if (!Array.isArray(groups) || groups.length === 0) {
    issues.push({ locale, issue: "missingGroups" });
  }

  const groupKeys = new Set();
  const categoryKeys = new Set();
  const categoryChecks = [];
  let categoryCount = 0;

  for (const group of groups) {
    if (groupKeys.has(group.groupKey)) {
      issues.push({
        locale,
        issue: "duplicateGroupKey",
        groupKey: group.groupKey,
      });
    }
    groupKeys.add(group.groupKey);

    if (locale === "ja" && group.groupKey === "jlpt") {
      issues.push({
        locale,
        issue: "jlptVisibleInJapaneseLocale",
        groupKey: group.groupKey,
      });
    }

    const categories = Array.isArray(group.categories) ? group.categories : [];

    if (categories.length === 0) {
      issues.push({
        locale,
        issue: "emptyVisibleGroup",
        groupKey: group.groupKey,
      });
    }

    for (const category of categories) {
      categoryCount += 1;

      if (categoryKeys.has(category.categoryKey)) {
        issues.push({
          locale,
          issue: "duplicateCategoryKey",
          categoryKey: category.categoryKey,
        });
      }
      categoryKeys.add(category.categoryKey);

      if (!Number.isInteger(category.totalCharacters) || category.totalCharacters <= 0) {
        issues.push({
          locale,
          issue: "nonPositiveCategoryTotal",
          groupKey: group.groupKey,
          categoryKey: category.categoryKey,
          totalCharacters: category.totalCharacters,
        });
        continue;
      }
    }

    const categoriesToFetch = options.allCategories ? categories : categories.slice(0, 1);

    for (const category of categoriesToFetch) {
      if (!Number.isInteger(category.totalCharacters) || category.totalCharacters <= 0) {
        continue;
      }
      categoryChecks.push({
        locale,
        groupKey: group.groupKey,
        categoryKey: category.categoryKey,
        expectedTotal: category.totalCharacters,
        deep: options.deep,
      });
    }
  }

  const categoryReports = await mapWithConcurrency(
    categoryChecks,
    options.concurrency,
    checkCategory
  );
  const charactersScanned = categoryReports.reduce(
    (sum, report) => sum + report.charactersScanned,
    0
  );
  issues.push(...categoryReports.flatMap((report) => report.issues));

  return {
    locale,
    groups: Array.isArray(groups) ? groups.length : 0,
    categories: categoryCount,
    checkedCategories: categoryChecks.length,
    charactersScanned,
    issues,
  };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let completedCount = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
      completedCount += 1;

      if (options.allCategories && completedCount % 50 === 0) {
        console.log(`Checked ${completedCount}/${items.length} categories...`);
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

async function checkCategory({ locale, groupKey, categoryKey, expectedTotal, deep }) {
  const issues = [];
  const characterIds = new Set();
  let offset = 0;
  let pageCount = 0;
  let lastHasMore = false;

  while (true) {
    const params = new URLSearchParams({
      locale,
      categoryKey,
      limit: String(pageLimit),
      offset: String(offset),
    });
    const payload = await fetchJson(
      `/functions/v1/kanji-catalog?${params.toString()}`,
      `Failed to fetch category ${categoryKey}`
    );

    pageCount += 1;

    if (!payload) {
      issues.push({ locale, groupKey, categoryKey, issue: "missingCategoryPayload" });
      break;
    }

    if (payload.total !== expectedTotal) {
      issues.push({
        locale,
        groupKey,
        categoryKey,
        issue: "categoryTotalMismatch",
        expectedTotal,
        payloadTotal: payload.total,
      });
    }

    const characters = Array.isArray(payload.characters) ? payload.characters : [];

    if (characters.length === 0 && payload.total > 0) {
      issues.push({
        locale,
        groupKey,
        categoryKey,
        issue: "emptyPageForNonEmptyCategory",
        offset,
      });
      break;
    }

    for (const character of characters) {
      if (characterIds.has(character.id)) {
        issues.push({
          locale,
          groupKey,
          categoryKey,
          issue: "duplicateCharacterInCategory",
          characterId: character.id,
          literal: character.literal,
        });
      }
      characterIds.add(character.id);

      if (!isPracticalCharacter(character)) {
        issues.push({
          locale,
          groupKey,
          categoryKey,
          issue: "nonPracticalCharacterVisible",
          characterId: character.id,
          literal: character.literal,
        });
      }
    }

    lastHasMore = Boolean(payload.hasMore);

    if (!deep || !payload.hasMore) {
      break;
    }

    offset += characters.length;

    if (pageCount > 200) {
      issues.push({
        locale,
        groupKey,
        categoryKey,
        issue: "paginationGuardExceeded",
      });
      break;
    }
  }

  if (deep && characterIds.size !== expectedTotal) {
    issues.push({
      locale,
      groupKey,
      categoryKey,
      issue: "scannedTotalMismatch",
      expectedTotal,
      scannedTotal: characterIds.size,
      lastHasMore,
    });
  }

  return {
    charactersScanned: characterIds.size,
    issues,
  };
}

async function fetchJson(pathname, errorMessage) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.requestTimeoutMs);

  const response = await fetch(`${supabaseUrl}${pathname}`, {
    signal: controller.signal,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`${errorMessage}: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

function isPracticalCharacter(character) {
  return Boolean(
    character.isJoyo ||
      character.jlptLevel ||
      character.japaneseGrade != null ||
      character.japaneseSchoolLevel
  );
}

function printSummary(summary, outputPath) {
  console.log(`Wrote ${path.relative(rootDir, outputPath)}`);
  console.log(`Mode: ${summary.deep ? "deep" : "smoke"}`);
  console.log(`All categories: ${summary.allCategories}`);
  console.log(`Concurrency: ${summary.concurrency}`);
  console.log(`Request timeout ms: ${summary.requestTimeoutMs}`);
  console.log(`Locales: ${summary.locales}`);
  console.log(`Groups: ${summary.groups}`);
  console.log(`Categories: ${summary.categories}`);
  console.log(`Checked categories: ${summary.checkedCategories}`);
  console.log(`Characters scanned: ${summary.charactersScanned}`);
  console.log(`Issue rows: ${summary.issueRows}`);
}

function parseArgs(argv) {
  const options = {
    allCategories: false,
    concurrency: 6,
    deep: false,
    failOnIssues: false,
    output: defaultOutputPath,
    requestTimeoutMs: 30000,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--fail-on-issues") {
      options.failOnIssues = true;
      continue;
    }

    if (arg === "--deep") {
      options.deep = true;
      continue;
    }

    if (arg === "--all-categories") {
      options.allCategories = true;
      continue;
    }

    if (arg === "--concurrency") {
      options.concurrency = parsePositiveInteger(requireValue(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === "--request-timeout-ms") {
      options.requestTimeoutMs = parsePositiveInteger(requireValue(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === "--output") {
      options.output = path.resolve(rootDir, requireValue(argv, index, arg));
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function parsePositiveInteger(value, arg) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer after ${arg}.`);
  }

  return parsed;
}

function requireValue(argv, index, arg) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Expected a value after ${arg}.`);
  }
  return value;
}

async function loadEnv(filePath) {
  const raw = await readFile(filePath, "utf8");
  const env = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    env[key] = value;
  }

  return env;
}
