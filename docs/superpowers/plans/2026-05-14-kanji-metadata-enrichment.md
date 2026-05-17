# Kanji Metadata Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate reviewable enrichment data for `kanji_characters`, review it in batches of 20, and upload only approved rows to Supabase.

**Architecture:** Keep the existing base metadata generator intact and add a separate enrichment pipeline. The pipeline will produce a local review JSON file, expose a helper to print the next 20 pending rows, and provide a safe uploader that only updates reviewed rows. All generated content remains local until the user approves each batch.

**Tech Stack:** Node.js scripts, JSON files in `data/generated`, Supabase REST API, existing `.env` credentials

---

### Task 1: Define enrichment review file generation

**Files:**
- Create: `/Users/kangmihye/Desktop/study/seodang/scripts/build-kanji-enrichment-review.mjs`
- Modify: `/Users/kangmihye/Desktop/study/seodang/package.json`
- Output: `/Users/kangmihye/Desktop/study/seodang/data/generated/kanji-enrichment-review.generated.json`

- [ ] **Step 1: Write the failing test surrogate as a deterministic dry run**

Use a direct script assertion pattern because this repo has no test runner yet.

Expected generated row shape:

```json
{
  "id": "u04e00",
  "literal": "一",
  "meaningKo": "하나, 한 번",
  "meaningJa": "ひとつ、いち",
  "exampleJa": "一つください。",
  "exampleKo": "하나 주세요.",
  "sortOrder": 1,
  "reviewStatus": "pending"
}
```

- [ ] **Step 2: Run the generator before implementation to confirm it does not exist**

Run: `node scripts/build-kanji-enrichment-review.mjs`
Expected: FAIL with module-not-found or file-not-found

- [ ] **Step 3: Write minimal generator implementation**

Script responsibilities:

```js
// inputs
// - data/generated/kanji-metadata.generated.json if present
// - fallback to data/seeds/kanji-metadata.sample.json
// output
// - data/generated/kanji-enrichment-review.generated.json

// row rules
// - meaningKo: short Korean gloss
// - meaningJa: short Japanese gloss
// - exampleJa: one short sentence using the literal
// - exampleKo: natural Korean translation
// - sortOrder: deterministic rank based on grade/JLPT/literal
// - reviewStatus: "pending"
```

Core functions to include:

```js
function buildSortOrder(rows) {}
function buildMeaningKo(row) {}
function buildMeaningJa(row) {}
function buildExampleJa(row) {}
function buildExampleKo(exampleJa, literal) {}
function parseMeaningEn(metadata) {}
```

- [ ] **Step 4: Add package script**

Add this command to `/Users/kangmihye/Desktop/study/seodang/package.json`:

```json
"kanji:build:enrichment-review": "node scripts/build-kanji-enrichment-review.mjs"
```

- [ ] **Step 5: Run generator to verify output is created**

Run: `node scripts/build-kanji-enrichment-review.mjs`
Expected: PASS and writes `/Users/kangmihye/Desktop/study/seodang/data/generated/kanji-enrichment-review.generated.json`

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/build-kanji-enrichment-review.mjs data/generated/kanji-enrichment-review.generated.json
git commit -m "feat: generate kanji enrichment review data"
```

### Task 2: Add 20-row pending review helper

**Files:**
- Create: `/Users/kangmihye/Desktop/study/seodang/scripts/print-kanji-enrichment-batch.mjs`
- Input: `/Users/kangmihye/Desktop/study/seodang/data/generated/kanji-enrichment-review.generated.json`

- [ ] **Step 1: Write the failing test surrogate**

Define the expected CLI behavior:

```bash
node scripts/print-kanji-enrichment-batch.mjs
```

Expected output shape:

```text
Showing 20 pending rows
1. 一 | 하나, 한 번 | ひとつ、いち | 一つください。 | 하나 주세요.
...
20. ...
```

- [ ] **Step 2: Run helper before implementation**

Run: `node scripts/print-kanji-enrichment-batch.mjs`
Expected: FAIL with module-not-found or file-not-found

- [ ] **Step 3: Write minimal implementation**

Helper behavior:

```js
// load review file
// filter rows where reviewStatus === "pending"
// take first 20 by sortOrder
// print compact human-review lines
```

Optional flags to support now:

```js
// --status=pending|approved|rejected
// --limit=20
```

- [ ] **Step 4: Run helper to verify it prints 20 rows**

Run: `node scripts/print-kanji-enrichment-batch.mjs`
Expected: PASS and prints exactly 20 pending rows if 20+ exist

- [ ] **Step 5: Commit**

```bash
git add scripts/print-kanji-enrichment-batch.mjs
git commit -m "feat: add kanji enrichment batch review helper"
```

### Task 3: Add review-status update workflow

**Files:**
- Create: `/Users/kangmihye/Desktop/study/seodang/scripts/update-kanji-enrichment-review.mjs`
- Modify: `/Users/kangmihye/Desktop/study/seodang/package.json`
- Input: `/Users/kangmihye/Desktop/study/seodang/data/generated/kanji-enrichment-review.generated.json`

- [ ] **Step 1: Write the failing test surrogate**

Expected command:

```bash
node scripts/update-kanji-enrichment-review.mjs --ids=u04e00,u04e8c --status=approved
```

Expected effect:
- matching rows updated in place
- non-target rows unchanged

- [ ] **Step 2: Run updater before implementation**

Run: `node scripts/update-kanji-enrichment-review.mjs --ids=u04e00 --status=approved`
Expected: FAIL with module-not-found or file-not-found

- [ ] **Step 3: Write minimal implementation**

Required rules:

```js
// accepted statuses: pending, approved, rejected
// ids are required
// update reviewStatus on matching rows
// preserve deterministic ordering and other fields
// overwrite review file atomically
```

- [ ] **Step 4: Add package script**

Add this command to `/Users/kangmihye/Desktop/study/seodang/package.json`:

```json
"kanji:review:update": "node scripts/update-kanji-enrichment-review.mjs"
```

- [ ] **Step 5: Run updater against a known id and inspect JSON**

Run: `node scripts/update-kanji-enrichment-review.mjs --ids=u04e00 --status=approved`
Expected: PASS and the row for `u04e00` now has `"reviewStatus": "approved"`

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/update-kanji-enrichment-review.mjs data/generated/kanji-enrichment-review.generated.json
git commit -m "feat: track kanji enrichment review status"
```

### Task 4: Add approved-row uploader

**Files:**
- Create: `/Users/kangmihye/Desktop/study/seodang/scripts/supabase-upsert-kanji-enrichment.mjs`
- Modify: `/Users/kangmihye/Desktop/study/seodang/package.json`
- Input: `/Users/kangmihye/Desktop/study/seodang/.env`
- Input: `/Users/kangmihye/Desktop/study/seodang/data/generated/kanji-enrichment-review.generated.json`

- [ ] **Step 1: Write the failing test surrogate**

Expected behavior:

```text
Only rows with reviewStatus === "approved" are uploaded.
Only these columns are updated:
- meaning_ko
- meaning_ja
- example_ja
- example_ko
- sort_order
```

- [ ] **Step 2: Run uploader before implementation**

Run: `node scripts/supabase-upsert-kanji-enrichment.mjs`
Expected: FAIL with module-not-found or file-not-found

- [ ] **Step 3: Write minimal uploader**

Uploader behavior:

```js
// load .env
// load review file
// filter approved rows
// map to Supabase column names
// POST to /rest/v1/kanji_characters?on_conflict=id
// Prefer: resolution=merge-duplicates,return=minimal
```

Update payload shape:

```js
{
  id: row.id,
  meaning_ko: row.meaningKo ?? null,
  meaning_ja: row.meaningJa ?? null,
  example_ja: row.exampleJa ?? null,
  example_ko: row.exampleKo ?? null,
  sort_order: row.sortOrder ?? null
}
```

- [ ] **Step 4: Add package script**

Add this command to `/Users/kangmihye/Desktop/study/seodang/package.json`:

```json
"supabase:upsert:enrichment": "node scripts/supabase-upsert-kanji-enrichment.mjs"
```

- [ ] **Step 5: Run uploader with approved subset only**

Run: `node scripts/supabase-upsert-kanji-enrichment.mjs`
Expected: PASS and logs approved upload count

- [ ] **Step 6: Verify uploaded rows through a direct fetch**

Run a node one-liner or dedicated script to fetch one approved id and confirm:

```text
meaning_ko != null
meaning_ja != null
example_ja != null
example_ko != null
sort_order != null
```

- [ ] **Step 7: Commit**

```bash
git add package.json scripts/supabase-upsert-kanji-enrichment.mjs
git commit -m "feat: upload approved kanji enrichment rows"
```

### Task 5: Verify full review loop

**Files:**
- Use: `/Users/kangmihye/Desktop/study/seodang/scripts/build-kanji-enrichment-review.mjs`
- Use: `/Users/kangmihye/Desktop/study/seodang/scripts/print-kanji-enrichment-batch.mjs`
- Use: `/Users/kangmihye/Desktop/study/seodang/scripts/update-kanji-enrichment-review.mjs`
- Use: `/Users/kangmihye/Desktop/study/seodang/scripts/supabase-upsert-kanji-enrichment.mjs`

- [ ] **Step 1: Regenerate review data**

Run: `node scripts/build-kanji-enrichment-review.mjs`
Expected: PASS

- [ ] **Step 2: Print first batch**

Run: `node scripts/print-kanji-enrichment-batch.mjs`
Expected: PASS and prints 20 pending rows

- [ ] **Step 3: Approve a small known subset**

Run: `node scripts/update-kanji-enrichment-review.mjs --ids=u04e00,u04e8c --status=approved`
Expected: PASS

- [ ] **Step 4: Upload approved subset**

Run: `node scripts/supabase-upsert-kanji-enrichment.mjs`
Expected: PASS and uploads 2 rows

- [ ] **Step 5: Verify rows in Supabase**

Run a fetch check for `u04e00` and `u04e8c`
Expected: enriched columns present

- [ ] **Step 6: Commit**

```bash
git add data/generated/kanji-enrichment-review.generated.json
git commit -m "chore: verify kanji enrichment review workflow"
```

## Self-Review

Spec coverage:
- local enrichment dataset: covered by Task 1
- 20-row human review loop: covered by Tasks 2 and 3
- approved-only upload: covered by Task 4
- verification before claims: covered by Task 5

Placeholder scan:
- no `TODO`/`TBD`
- every task includes concrete files and commands

Type consistency:
- review row uses `meaningKo`, `meaningJa`, `exampleJa`, `exampleKo`, `sortOrder`, `reviewStatus`
- upload mapping consistently converts them to snake_case Supabase columns
