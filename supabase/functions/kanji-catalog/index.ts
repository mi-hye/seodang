const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

type Locale = "ko" | "ja";

type CategoryGroupRow = {
  id: string;
  group_key: string;
  label_ko: string;
  label_ja: string;
  description_ko: string | null;
  description_ja: string | null;
  sort_order: number;
};

type CategoryRow = {
  id: string;
  group_id: string;
  category_key: string;
  label_ko: string;
  label_ja: string;
  description_ko: string | null;
  description_ja: string | null;
  sort_order: number;
  metadata: {
    visibleLocales?: string[];
  } | null;
};

type CategoryMappingCountRow = {
  category_id: string;
  character_id: string;
};

type CharacterCategoryRow = {
  character_id: string;
};

type CharacterRow = {
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
  metadata: Record<string, unknown> | null;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const url = new URL(request.url);
    const locale = normalizeLocale(url.searchParams.get("locale"));
    const categoryKey = url.searchParams.get("categoryKey");
    const limit = normalizeLimit(url.searchParams.get("limit"));
    const offset = normalizeOffset(url.searchParams.get("offset"));

    if (categoryKey) {
      const payload = await fetchCategoryCharacters(categoryKey, locale, limit, offset);
      return json(payload);
    }

    const payload = await fetchCategoryGroups(locale);
    return json(payload);
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

async function fetchCategoryGroups(locale: Locale) {
  const [groups, categories, categoryMappings, practicalCharacterIds] = await Promise.all([
    fetchRows<CategoryGroupRow>(
      "kanji_category_groups?select=id,group_key,label_ko,label_ja,description_ko,description_ja,sort_order&order=sort_order.asc"
    ),
    fetchRows<CategoryRow>(
      "kanji_categories?select=id,group_id,category_key,label_ko,label_ja,description_ko,description_ja,sort_order,metadata&order=sort_order.asc"
    ),
    fetchAllCategoryMappings(),
    fetchAllPracticalCharacterIds(),
  ]);
  const practicalIdSet = new Set(practicalCharacterIds);
  const totalByCategoryId = countByCategoryId(
    categoryMappings.filter((row) => practicalIdSet.has(row.character_id))
  );

  return groups
    .map((group) => ({
      id: group.id,
      groupKey: group.group_key,
      label: selectLocalizedText(locale, group.label_ko, group.label_ja),
      description: selectLocalizedNullableText(
        locale,
        group.description_ko,
        group.description_ja
      ),
      sortOrder: group.sort_order,
      categories: categories
        .filter(
          (category) =>
            category.group_id === group.id &&
            (category.metadata?.visibleLocales ?? ["ko", "ja"]).includes(locale) &&
            (totalByCategoryId.get(category.id) ?? 0) > 0
        )
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((category) => ({
          id: category.id,
          groupId: category.group_id,
          categoryKey: category.category_key,
          label: selectLocalizedText(locale, category.label_ko, category.label_ja),
          description: selectLocalizedNullableText(
            locale,
            category.description_ko,
            category.description_ja
          ),
          sortOrder: category.sort_order,
          visibleLocales: category.metadata?.visibleLocales ?? ["ko", "ja"],
          totalCharacters: totalByCategoryId.get(category.id) ?? 0,
        })),
    }))
    .filter((group) => group.categories.length > 0);
}

async function fetchAllCategoryMappings() {
  const pageSize = 1000;
  let offset = 0;
  const rows: CategoryMappingCountRow[] = [];

  while (true) {
    const page = await fetchRows<CategoryMappingCountRow>(
      `kanji_character_categories?select=category_id,character_id&offset=${offset}&limit=${pageSize}`
    );
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

async function fetchCategoryCharacters(
  categoryKey: string,
  locale: Locale,
  limit: number,
  offset: number
) {
  const categoryRows = await fetchRows<CategoryRow>(
    `kanji_categories?select=id,group_id,category_key,label_ko,label_ja,description_ko,description_ja,sort_order,metadata&category_key=eq.${encodeURIComponent(categoryKey)}&limit=1`
  );
  const category = categoryRows[0];

  if (!category) {
    return null;
  }

  const [practicalCharacterIds, mappings] = await Promise.all([
    fetchAllPracticalCharacterIds(),
    fetchAllCategoryCharacterMappings(category.id),
  ]);
  const practicalIdSet = new Set(practicalCharacterIds);
  const filteredMappings = mappings.filter((row) => practicalIdSet.has(row.character_id));
  const total = filteredMappings.length;
  const characterIds = filteredMappings
    .slice(offset, offset + limit)
    .map((row) => row.character_id);
  const characters = await fetchCharactersByIds(characterIds);

  return {
    category: {
      id: category.id,
      groupId: category.group_id,
      categoryKey: category.category_key,
      label: selectLocalizedText(locale, category.label_ko, category.label_ja),
      description: selectLocalizedNullableText(
        locale,
        category.description_ko,
        category.description_ja
      ),
      sortOrder: category.sort_order,
      visibleLocales: category.metadata?.visibleLocales ?? ["ko", "ja"],
      totalCharacters: total,
    },
    characters,
    total,
    limit,
    offset,
    hasMore: offset + characters.length < total,
  };
}

async function fetchAllCategoryCharacterMappings(categoryId: string) {
  const pageSize = 1000;
  let offset = 0;
  const rows: CharacterCategoryRow[] = [];

  while (true) {
    const page = await fetchRows<CharacterCategoryRow>(
      `kanji_character_categories?select=character_id&category_id=eq.${encodeURIComponent(categoryId)}&order=character_id.asc&offset=${offset}&limit=${pageSize}`
    );
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

async function fetchAllPracticalCharacterIds() {
  const pageSize = 1000;
  let offset = 0;
  const rows: { id: string }[] = [];

  while (true) {
    const page = await fetchRows<{ id: string }>(
      `kanji_characters?select=id&or=(is_joyo.eq.true,jlpt_level.not.is.null,japanese_grade.not.is.null,japanese_school_level.not.is.null)&order=id.asc&offset=${offset}&limit=${pageSize}`
    );
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows.map((row) => row.id);
}

async function fetchCharactersByIds(characterIds: string[]) {
  if (characterIds.length === 0) {
    return [];
  }

  const query = new URLSearchParams({
    select:
      "id,literal,stroke_count,meaning_ko,meaning_ja,onyomi,kunyomi,jlpt_level,japanese_school_level,japanese_grade,example_ja,example_ko,sort_order,is_joyo,metadata",
    id: `in.(${characterIds.map((id) => `"${id}"`).join(",")})`,
    order: "sort_order.asc.nullslast,literal.asc",
  });

  const rows = await fetchRows<CharacterRow>(`kanji_characters?${query.toString()}`);
  const rowsById = new Map(rows.map((row) => [row.id, row]));

  return characterIds
    .map((id) => rowsById.get(id))
    .filter((row): row is CharacterRow => Boolean(row))
    .map((row) => ({
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
    }));
}

async function fetchRows<T>(path: string): Promise<T[]> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: serviceRoleKey ?? "",
      Authorization: `Bearer ${serviceRoleKey ?? ""}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as T[];
}

async function fetchExactCount(path: string): Promise<number> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: "HEAD",
    headers: {
      apikey: serviceRoleKey ?? "",
      Authorization: `Bearer ${serviceRoleKey ?? ""}`,
      Prefer: "count=exact",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to count ${path}: ${response.status} ${await response.text()}`);
  }

  const contentRange = response.headers.get("content-range");
  const total = contentRange?.split("/")[1];
  return total ? Number(total) || 0 : 0;
}

function selectLocalizedText(locale: Locale, ko: string, ja: string) {
  return locale === "ja" ? ja : ko;
}

function countByCategoryId(rows: Array<{ category_id: string }>) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  return counts;
}

function selectLocalizedNullableText(
  locale: Locale,
  ko: string | null,
  ja: string | null
) {
  return locale === "ja" ? ja ?? ko : ko ?? ja;
}

function normalizeLocale(value: string | null): Locale {
  return value === "ja" ? "ja" : "ko";
}

function normalizeLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 20;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
}

function normalizeOffset(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(Math.trunc(parsed), 0);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
