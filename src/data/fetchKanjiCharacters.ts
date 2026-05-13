import { KanjiCharacter, KanjiCharacterMetadata } from "./characters";

type KanjiCharacterRow = {
  id: string;
  literal: string;
  stroke_count: number | null;
  meaning_ko: string | null;
  meaning_ja: string | null;
  onyomi: string[] | null;
  kunyomi: string[] | null;
  jlpt_level: "N5" | "N4" | "N3" | "N2" | "N1" | null;
  japanese_school_level: string | null;
  japanese_grade: number | null;
  example_ja: string | null;
  example_ko: string | null;
  sort_order: number | null;
  is_joyo: boolean;
  metadata: KanjiCharacterMetadata | null;
};

type KanjiCategoryRow = {
  id: string;
};

type KanjiCharacterCategoryRow = {
  character_id: string;
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const characterSelect =
  "id,literal,stroke_count,meaning_ko,meaning_ja,onyomi,kunyomi,jlpt_level,japanese_school_level,japanese_grade,example_ja,example_ko,sort_order,is_joyo,metadata";

export async function fetchKanjiCharactersByCategoryKey(categoryKey?: string) {
  if (!supabaseUrl || !supabaseAnonKey || !categoryKey) {
    return [];
  }

  const category = await fetchCategoryByKey(categoryKey);
  if (!category) {
    return [];
  }

  const mappings = await fetchCharacterCategoryMappings(category.id);
  const characterIds = mappings.map((row) => row.character_id);

  return fetchKanjiCharactersByIds(characterIds);
}

export async function fetchKanjiCharactersByIds(characterIds: string[]) {
  if (!supabaseUrl || !supabaseAnonKey || characterIds.length === 0) {
    return [];
  }

  const params = new URLSearchParams({
    select: characterSelect,
    id: `in.(${characterIds.map(encodeSupabaseValue).join(",")})`,
    order: "sort_order.asc.nullslast,literal.asc",
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/kanji_characters?${params.toString()}`, {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch kanji characters: ${response.status}`);
  }

  const rows = (await response.json()) as KanjiCharacterRow[];
  const rowsById = new Map(rows.map((row) => [row.id, mapKanjiCharacter(row)]));

  return characterIds
    .map((id) => rowsById.get(id))
    .filter((character): character is KanjiCharacter => Boolean(character));
}

export async function fetchKanjiCharacterById(characterId?: string) {
  if (!supabaseUrl || !supabaseAnonKey || !characterId) {
    return null;
  }

  const params = new URLSearchParams({
    select: characterSelect,
    id: `eq.${characterId}`,
    limit: "1",
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/kanji_characters?${params.toString()}`, {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch kanji character: ${response.status}`);
  }

  const rows = (await response.json()) as KanjiCharacterRow[];
  return rows[0] ? mapKanjiCharacter(rows[0]) : null;
}

export async function fetchFeaturedKanjiCharacters(limit = 3) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return [];
  }

  const params = new URLSearchParams({
    select: characterSelect,
    order: "sort_order.asc.nullslast,literal.asc",
    limit: String(limit),
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/kanji_characters?${params.toString()}`, {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch featured kanji characters: ${response.status}`);
  }

  const rows = (await response.json()) as KanjiCharacterRow[];
  return rows.map(mapKanjiCharacter);
}

async function fetchCategoryByKey(categoryKey: string) {
  const params = new URLSearchParams({
    select: "id",
    category_key: `eq.${categoryKey}`,
    limit: "1",
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/kanji_categories?${params.toString()}`, {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch kanji category: ${response.status}`);
  }

  const rows = (await response.json()) as KanjiCategoryRow[];
  return rows[0] ?? null;
}

async function fetchCharacterCategoryMappings(categoryId: string) {
  const params = new URLSearchParams({
    select: "character_id",
    category_id: `eq.${categoryId}`,
  });

  const response = await fetch(
    `${supabaseUrl}/rest/v1/kanji_character_categories?${params.toString()}`,
    {
      headers: buildHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch kanji category mappings: ${response.status}`);
  }

  return (await response.json()) as KanjiCharacterCategoryRow[];
}

function mapKanjiCharacter(row: KanjiCharacterRow): KanjiCharacter {
  return {
    id: row.id,
    literal: row.literal,
    strokeCount: row.stroke_count,
    meaningKo: row.meaning_ko,
    meaningJa: row.meaning_ja,
    onyomi: row.onyomi ?? [],
    kunyomi: row.kunyomi ?? [],
    jlptLevel: row.jlpt_level,
    japaneseSchoolLevel: row.japanese_school_level,
    japaneseGrade: row.japanese_grade,
    exampleJa: row.example_ja,
    exampleKo: row.example_ko,
    sortOrder: row.sort_order,
    isJoyo: row.is_joyo,
    metadata: row.metadata ?? null,
  };
}

function buildHeaders() {
  return {
    apikey: supabaseAnonKey ?? "",
    Authorization: `Bearer ${supabaseAnonKey ?? ""}`,
  };
}

function encodeSupabaseValue(value: string) {
  return `"${value}"`;
}
