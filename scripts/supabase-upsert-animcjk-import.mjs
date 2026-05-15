#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const env = await loadEnv(path.join(rootDir, ".env"));
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const importPath = path.join(rootDir, "data/generated/animcjk-import.generated.json");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"
  );
}

const payload = await readJson(importPath);
const characterRows = payload.characters ?? [];
const strokeRows = payload.strokes ?? [];

if (characterRows.length === 0) {
  console.log("No AnimCJK character rows to upload.");
  process.exit(0);
}

await upsertRowsInChunks("kanji_characters", characterRows, "id", 200);
await upsertRowsInChunks("kanji_strokes", strokeRows, "id", 500);

console.log(
  `Upserted ${characterRows.length} AnimCJK characters and ${strokeRows.length} strokes.`
);

async function upsertRowsInChunks(tableName, rows, conflictColumns, chunkSize) {
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const response = await fetch(
      `${supabaseUrl}/rest/v1/${tableName}?on_conflict=${encodeURIComponent(conflictColumns)}`,
      {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(chunk),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Failed to upsert ${tableName} chunk starting at ${index}: ${response.status} ${body}`
      );
    }
  }
}

function buildHeaders() {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  };
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function loadEnv(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return parseEnv(raw);
  } catch {
    return {};
  }
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
