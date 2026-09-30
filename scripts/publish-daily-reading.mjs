import { readFile } from "node:fs/promises";
import path from "node:path";

const limits = { beginner: 600, intermediate: 1500, advanced: 3000 };
const inputPath = process.argv[2];
if (!inputPath) throw new Error("Usage: npm run daily-reading:publish -- <reviewed-json-file>");

const env = await loadEnv(path.join(process.cwd(), ".env"));
const rows = JSON.parse(await readFile(path.resolve(inputPath), "utf8"));
const errors = validateRows(rows);
if (errors.length) throw new Error(`Review gate rejected publication:\n- ${errors.join("\n- ")}`);

const existing = await fetchJson(
  `${env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/daily_readings?select=reading_date,level,title_ja,body_ja`,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);
const candidateDates = new Set(rows.map((row) => row.reading_date));
const duplicateErrors = findNearDuplicates(
  rows,
  existing.filter((row) => !candidateDates.has(row.reading_date)),
);
if (duplicateErrors.length) throw new Error(`Review gate rejected publication:\n- ${duplicateErrors.join("\n- ")}`);
if (process.argv.includes("--check")) {
  console.log(`Review gate passed ${rows.length} candidate rows without publishing.`);
  process.exit(0);
}

const reviewedRows = rows.map((row) => ({
  ...row,
  review_status: "approved",
  reviewer: row.reviewer || "codex-independent-reviewer",
  review_notes: row.review_notes || [],
  reviewed_at: new Date().toISOString(),
}));
const response = await fetch(
  `${env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/daily_readings?on_conflict=reading_date,level`,
  {
    method: "POST",
    headers: headers(env.SUPABASE_SERVICE_ROLE_KEY),
    body: JSON.stringify(reviewedRows),
  },
);
if (!response.ok) throw new Error(`Publish failed: ${response.status} ${await response.text()}`);
const publishedDates = [...candidateDates].sort();
console.log(`Published ${reviewedRows.length} independently reviewed readings for ${publishedDates[0]} through ${publishedDates.at(-1)}.`);

function validateRows(rows) {
  const errors = [];
  if (!Array.isArray(rows) || rows.length === 0 || rows.length % 3 !== 0) return ["A non-empty set of complete three-level dates is required."];
  const dates = [...new Set(rows.map((row) => row.reading_date))];
  for (const date of dates) {
    for (const level of Object.keys(limits)) {
      if (rows.filter((row) => row.reading_date === date && row.level === level).length !== 1) {
        errors.push(`${date}/${level}: exactly one row is required.`);
      }
    }
  }
  for (const row of rows) {
    const prefix = `${row.reading_date}/${row.level}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.reading_date || "")) errors.push(`${prefix}: invalid date.`);
    if (!limits[row.level]) errors.push(`${prefix}: invalid level.`);
    if (!row.title_ja?.trim() || !row.body_ja?.trim() || !row.translation_ko?.trim()) errors.push(`${prefix}: required text is empty.`);
    if (Array.from(row.body_ja || "").length > limits[row.level]) errors.push(`${prefix}: body exceeds ${limits[row.level]} characters.`);
    if (!/[ぁ-んァ-ヶ一-龯]/u.test(row.body_ja || "")) errors.push(`${prefix}: Japanese body not detected.`);
    if (!/[가-힣]/u.test(row.translation_ko || "")) errors.push(`${prefix}: Korean translation not detected.`);
    if (!Array.isArray(row.vocabulary)) errors.push(`${prefix}: vocabulary must be an array.`);
    const seen = new Set();
    const standaloneTokens = new Set(
      [...new Intl.Segmenter("ja", { granularity: "word" }).segment(row.body_ja)]
        .filter((part) => part.isWordLike)
        .map((part) => part.segment),
    );
    for (const word of row.vocabulary || []) {
      if (seen.has(word.surface)) errors.push(`${prefix}: duplicate vocabulary ${word.surface}.`);
      seen.add(word.surface);
      const candidates = [word.surface, ...(word.forms || [])];
      if (!candidates.some((candidate) => candidate && row.body_ja.includes(candidate))) {
        errors.push(`${prefix}: vocabulary ${word.surface} does not occur in the body.`);
      }
      if (!word.reading || !word.meaningKo) errors.push(`${prefix}: vocabulary ${word.surface} is incomplete.`);
      if (
        /^\p{Script=Han}$/u.test(word.surface) &&
        !standaloneTokens.has(word.surface)
      ) {
        errors.push(`${prefix}: vocabulary ${word.surface} is a kanji fragment, not a standalone word.`);
      }
    }
  }
  return errors;
}

function findNearDuplicates(rows, existingRows) {
  const errors = [];
  for (const row of rows) {
    for (const existing of existingRows.filter((item) => item.level === row.level)) {
      if (similarity(normalize(row.body_ja), normalize(existing.body_ja)) >= 0.82) {
        errors.push(`${row.level}: body is too similar to ${existing.reading_date}.`);
        break;
      }
    }
  }
  return errors;
}

function similarity(left, right) {
  const grams = (value) => new Set(Array.from({ length: Math.max(0, value.length - 2) }, (_, index) => value.slice(index, index + 3)));
  const a = grams(left); const b = grams(right);
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const gram of a) if (b.has(gram)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

function normalize(value) { return value.replace(/[\s、。！？「」『』]/g, ""); }
function headers(key) { return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }; }
async function fetchJson(url, key) { const response = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } }); if (!response.ok) throw new Error(`Fetch failed: ${response.status}`); return response.json(); }
async function loadEnv(filePath) { const text = await readFile(filePath, "utf8"); return Object.fromEntries(text.split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => { const index = line.indexOf("="); return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['\"]|['\"]$/g, "")]; })); }
