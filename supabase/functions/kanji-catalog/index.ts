import {
  catalogCategories,
  catalogCategoryGroups,
  catalogCharacterIdsByCategoryKey,
} from "./catalog-data.ts";

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
    visibleLocales?: readonly string[];
  } | null;
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
  return catalogCategoryGroups
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
      categories: catalogCategories
        .filter(
          (category) =>
            category.group_id === group.id &&
            getVisibleLocales(category).includes(locale) &&
            getCategoryCharacterIds(category.category_key).length > 0
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
          visibleLocales: getVisibleLocales(category),
          totalCharacters: getCategoryCharacterIds(category.category_key).length,
        })),
    }))
    .filter((group) => group.categories.length > 0);
}

async function fetchCategoryCharacters(
  categoryKey: string,
  locale: Locale,
  limit: number,
  offset: number
) {
  const category = catalogCategories.find((row) => row.category_key === categoryKey);

  if (!category) {
    return null;
  }

  const categoryCharacterIds = getCategoryCharacterIds(categoryKey);
  const total = categoryCharacterIds.length;
  const characterIds = categoryCharacterIds.slice(offset, offset + limit);
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
      visibleLocales: getVisibleLocales(category),
      totalCharacters: total,
    },
    characters,
    total,
    limit,
    offset,
    hasMore: offset + characters.length < total,
  };
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

function getCategoryCharacterIds(categoryKey: string) {
  return (
    catalogCharacterIdsByCategoryKey as Record<string, readonly string[] | undefined>
  )[categoryKey] ?? [];
}

function getVisibleLocales(category: CategoryRow) {
  return (category.metadata?.visibleLocales ?? ["ko", "ja"]) as readonly string[];
}

function selectLocalizedText(locale: Locale, ko: string, ja: string) {
  return locale === "ja" ? ja : ko;
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
