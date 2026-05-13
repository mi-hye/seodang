import { readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const env = await loadEnv(path.join(rootDir, ".env"));

const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"
  );
}

const categoryGroups = await readJson(
  path.join(rootDir, "data/seeds/kanji-category-groups.json")
);
const categories = await readJson(
  path.join(rootDir, "data/seeds/kanji-categories.json")
);
const characterCategories = await readJsonWithFallback(
  path.join(rootDir, "data/generated/kanji-character-categories.generated.json"),
  path.join(rootDir, "data/seeds/kanji-character-categories.sample.json")
);
const rawKanjiMetadata = await readJsonWithFallback(
  path.join(rootDir, "data/generated/kanji-metadata.generated.json"),
  path.join(rootDir, "data/seeds/kanji-metadata.sample.json")
);
const existingCharacters = await fetchExistingCharacterBaseRows();
const existingCharacterMap = new Map(existingCharacters.map((row) => [row.id, row]));
const kanjiMetadata = rawKanjiMetadata
  .map((character) => mergeCharacterBaseRow(character, existingCharacterMap.get(character.id)))
  .filter(Boolean);
const validCharacterIds = new Set(kanjiMetadata.map((character) => character.id));
const filteredCharacterCategories = characterCategories.filter((row) =>
  validCharacterIds.has(row.characterId)
);

await upsertRows("kanji_category_groups", categoryGroups.map(mapCategoryGroupRow), "id");
await upsertRows("kanji_categories", categories.map(mapCategoryRow), "id");
await upsertRows("kanji_characters", kanjiMetadata.map(mapKanjiMetadataRow), "id");
await upsertRows(
  "kanji_character_categories",
  filteredCharacterCategories.map(mapCharacterCategoryRow),
  "character_id,category_id"
);

console.log(
  `Upserted ${categoryGroups.length} groups, ${categories.length} categories, ${kanjiMetadata.length} kanji metadata rows, ${filteredCharacterCategories.length} category mappings.`
);

async function upsertRows(tableName, rows, conflictColumns) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${tableName}?on_conflict=${encodeURIComponent(conflictColumns)}`,
    {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(rows),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to upsert ${tableName}: ${response.status} ${body}`);
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

function mapCategoryGroupRow(group) {
  return {
    id: group.id,
    group_key: group.groupKey,
    label_ko: group.labelKo,
    label_ja: group.labelJa,
    description_ko: group.descriptionKo ?? null,
    description_ja: group.descriptionJa ?? null,
    sort_order: group.sortOrder ?? 0,
    is_active: group.isActive ?? true,
  };
}

function mapCategoryRow(category) {
  return {
    id: category.id,
    group_id: category.groupId,
    category_key: category.categoryKey,
    label_ko: category.labelKo,
    label_ja: category.labelJa,
    description_ko: category.descriptionKo ?? null,
    description_ja: category.descriptionJa ?? null,
    sort_order: category.sortOrder ?? 0,
    is_active: category.isActive ?? true,
    metadata: category.metadata ?? {},
  };
}

function mapKanjiMetadataRow(character) {
  return {
    id: character.id,
    literal: character.literal,
    source: character.source,
    license: character.license,
    view_box_width: character.viewBoxWidth,
    view_box_height: character.viewBoxHeight,
    stroke_count: character.strokeCount ?? null,
    meaning_ko: character.meaningKo ?? null,
    meaning_ja: character.meaningJa ?? null,
    onyomi: character.onyomi ?? [],
    kunyomi: character.kunyomi ?? [],
    jlpt_level: character.jlptLevel ?? null,
    japanese_school_level: character.japaneseSchoolLevel ?? null,
    japanese_grade: character.japaneseGrade ?? null,
    example_ja: character.exampleJa ?? null,
    example_ko: character.exampleKo ?? null,
    sort_order: character.sortOrder ?? null,
    is_joyo: character.isJoyo ?? false,
    metadata: character.metadata ?? {},
  };
}

async function fetchExistingCharacterBaseRows() {
  const pageSize = 1000;
  let offset = 0;
  const rows = [];

  while (true) {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/kanji_characters?select=id,literal,source,license,view_box_width,view_box_height&order=id.asc`,
      {
        headers: {
          ...buildHeaders(),
          Range: `${offset}-${offset + pageSize - 1}`,
        },
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Failed to fetch existing kanji_characters: ${response.status} ${body}`
      );
    }

    const pageRows = await response.json();
    rows.push(...pageRows);

    if (pageRows.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

function mergeCharacterBaseRow(character, existingRow) {
  if (!existingRow) {
    return null;
  }

  return {
    ...character,
    literal: existingRow.literal ?? character.literal,
    source: existingRow.source,
    license: existingRow.license,
    viewBoxWidth: existingRow.view_box_width,
    viewBoxHeight: existingRow.view_box_height,
  };
}

function mapCharacterCategoryRow(row) {
  return {
    character_id: row.characterId,
    category_id: row.categoryId,
  };
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readJsonWithFallback(primaryPath, fallbackPath) {
  try {
    return await readJson(primaryPath);
  } catch {
    return readJson(fallbackPath);
  }
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
