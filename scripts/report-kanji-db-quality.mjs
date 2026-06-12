#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env");
const generatedDir = path.join(rootDir, "data/generated");
const defaultOutputPath = path.join(generatedDir, "kanji-db-quality.generated.json");

const allowedFallbackIds = new Set([]);

const options = parseArgs(process.argv.slice(2));
const env = await loadEnv(envPath);
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"
  );
}

const rows = await fetchKanjiRows();
const scopedRows = options.all ? rows : rows.filter(isPracticalRow);
const issueRows = scopedRows
  .map((row, index) => ({ ...toReportRow(row, index), issues: findIssues(row) }))
  .filter((row) => row.issues.length > 0);
const unapprovedIssueRows = issueRows.filter((row) => !isAllowedIssueRow(row));
const summary = buildSummary(rows, scopedRows, issueRows, unapprovedIssueRows);
const output = {
  generatedAt: new Date().toISOString(),
  scope: options.all ? "all" : "practical",
  policy: {
    allowedFallbackIds: [...allowedFallbackIds],
    note:
      "Fallback explanatory examples should not appear in practical kanji quality checks.",
  },
  summary,
  issueRows,
  unapprovedIssueRows,
};

await mkdir(path.dirname(options.output), { recursive: true });
await writeFile(options.output, `${JSON.stringify(output, null, 2)}\n`, "utf8");

printSummary(summary, options.output);

if (options.failOnIssues && unapprovedIssueRows.length > 0) {
  process.exitCode = 1;
}

async function fetchKanjiRows() {
  const select = [
    "id",
    "literal",
    "stroke_count",
    "meaning_ko",
    "meaning_ja",
    "example_ja",
    "example_ko",
    "is_joyo",
    "jlpt_level",
    "japanese_grade",
    "japanese_school_level",
  ].join(",");
  const rows = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const pageRows = await fetchRows(
      `kanji_characters?select=${select}&order=id.asc`,
      `${offset}-${offset + pageSize - 1}`
    );
    rows.push(...pageRows);

    if (pageRows.length < pageSize) {
      break;
    }
  }

  return rows;
}

async function fetchRows(pathname, range) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathname}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Range: range,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${pathname}: ${response.status} ${await response.text()}`
    );
  }

  return response.json();
}

function findIssues(row) {
  const issues = [];

  if (isBlank(row.meaning_ko) || isBlank(row.meaning_ja)) {
    issues.push("missingMeaning");
  }

  if (isBlank(row.example_ja) || isBlank(row.example_ko)) {
    issues.push("missingExample");
  }

  if (row.meaning_ko === "뜻 미상" || row.meaning_ja === "意味未詳") {
    issues.push("unknownMeaning");
  }

  if (!isBlank(row.example_ja) && !String(row.example_ja).includes(row.literal)) {
    issues.push("exampleJaMissingLiteral");
  }

  if (/日常では|ほとんど使われない|名前など/.test(row.example_ja ?? "")) {
    issues.push("fallbackExample");
  }

  if (/이 한자|일상에서는|이름 등/.test(row.example_ko ?? "")) {
    issues.push("fallbackExampleKo");
  }

  if (/^[ァ-ヴー]+$/.test(row.meaning_ja ?? "")) {
    issues.push("katakanaOnlyMeaningJa");
  }

  if ((row.example_ja ?? "").length > 55 || (row.example_ko ?? "").length > 70) {
    issues.push("longExample");
  }

  return issues;
}

function isAllowedIssueRow(row) {
  return (
    allowedFallbackIds.has(row.id) &&
    row.issues.every((issue) =>
      ["fallbackExample", "fallbackExampleKo", "katakanaOnlyMeaningJa"].includes(issue)
    )
  );
}

function buildSummary(allRows, scopedRows, issueRows, unapprovedIssueRows) {
  return {
    dbRows: allRows.length,
    scopedRows: scopedRows.length,
    practicalRows: allRows.filter(isPracticalRow).length,
    nonPracticalRows: allRows.filter((row) => !isPracticalRow(row)).length,
    issueRows: issueRows.length,
    unapprovedIssueRows: unapprovedIssueRows.length,
    issueCounts: countIssues(issueRows),
    unapprovedIssueCounts: countIssues(unapprovedIssueRows),
  };
}

function countIssues(rows) {
  const counts = {};

  for (const row of rows) {
    for (const issue of row.issues) {
      counts[issue] = (counts[issue] ?? 0) + 1;
    }
  }

  return counts;
}

function toReportRow(row, index) {
  return {
    index: index + 1,
    id: row.id,
    literal: row.literal,
    meaningKo: row.meaning_ko,
    meaningJa: row.meaning_ja,
    exampleJa: row.example_ja,
    exampleKo: row.example_ko,
    jlptLevel: row.jlpt_level,
    japaneseGrade: row.japanese_grade,
    japaneseSchoolLevel: row.japanese_school_level,
    isJoyo: row.is_joyo,
  };
}

function isPracticalRow(row) {
  return Boolean(
    row.is_joyo ||
      row.jlpt_level ||
      row.japanese_grade != null ||
      row.japanese_school_level
  );
}

function isBlank(value) {
  return value == null || String(value).trim() === "";
}

function parseArgs(argv) {
  const options = {
    all: false,
    failOnIssues: false,
    output: defaultOutputPath,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--all") {
      options.all = true;
      continue;
    }

    if (arg === "--fail-on-issues") {
      options.failOnIssues = true;
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

function requireValue(argv, index, arg) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Expected a value after ${arg}.`);
  }
  return value;
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

function printSummary(summary, outputPath) {
  console.log(`Wrote ${path.relative(rootDir, outputPath)}`);
  console.log(`DB rows: ${summary.dbRows}`);
  console.log(`Scoped rows: ${summary.scopedRows}`);
  console.log(`Practical rows: ${summary.practicalRows}`);
  console.log(`Non-practical rows: ${summary.nonPracticalRows}`);
  console.log(`Issue rows: ${summary.issueRows}`);
  console.log(`Unapproved issue rows: ${summary.unapprovedIssueRows}`);
  console.log("Issue counts:");

  for (const [issue, count] of Object.entries(summary.issueCounts).sort()) {
    console.log(`- ${issue}: ${count}`);
  }

  console.log("Unapproved issue counts:");

  for (const [issue, count] of Object.entries(summary.unapprovedIssueCounts).sort()) {
    console.log(`- ${issue}: ${count}`);
  }
}
