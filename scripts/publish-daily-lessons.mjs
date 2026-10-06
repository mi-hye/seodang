import { readFile } from "node:fs/promises";
import { validateLessonPublication, planLessonPublication, lessonContentEqual } from "../src/domain/learning/lessonPublication.ts";

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith("--"));
if (!file || args.some((arg) => arg.startsWith("--") && !["--check", "--publish"].includes(arg)) || (args.includes("--check") && args.includes("--publish"))) {
  throw new Error("Usage: npm run daily-lesson:publish -- <reviewed-json> [--check | --publish]. Default: validate only.");
}
const rows = validateLessonPublication(JSON.parse(await readFile(file, "utf8")));
if (!args.includes("--check") && !args.includes("--publish")) {
  console.log(`Validated ${rows.length} stages for ${rows[0].lesson_date}. No network request or publication.`);
} else {
  // Cloud environments supply env variables; a local .env is optional, never
  // copied to prompts, source control, build artifacts or the browser.
  try { process.loadEnvFile(".env"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing server-side Supabase URL/service credential");
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const request = async (query, init = {}) => {
    const response = await fetch(`${url}/rest/v1/daily_lessons?${query}`, { headers, signal: AbortSignal.timeout(20000), ...init });
    if (!response.ok) throw new Error(`Daily lesson request failed (${response.status}); no credentials logged`);
    return response.json();
  };
  // Paginate: never silently miss duplicates beyond the REST row limit.
  const existing = [];
  for (let offset = 0; ; offset += 500) {
    const page = await request(`select=*&order=lesson_date.asc,stage.asc&offset=${offset}&limit=500`);
    existing.push(...page);
    if (page.length < 500) break;
  }
  const pending = planLessonPublication(rows, existing);
  if (args.includes("--check")) console.log(`Review gate passed. ${pending.length} stages would be inserted; nothing published.`);
  else {
    // No upsert: a racing publisher causes a conflict, never replaces content.
    if (pending.length) await request("", { method: "POST", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify(pending) });
    const saved = await request(`select=*&lesson_date=eq.${rows[0].lesson_date}`);
    for (const row of rows) {
      const match = saved.find((r) => r.stage === row.stage && r.review_status === "approved");
      if (!match || !lessonContentEqual(row, match)) throw new Error("Read-back verification failed");
    }
    console.log(`Verified four approved stages for ${rows[0].lesson_date}; inserted ${pending.length}.`);
  }
}
