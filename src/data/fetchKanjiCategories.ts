export type KanjiCategoryGroup = {
  id: string;
  groupKey: string;
  labelKo: string;
  labelJa: string;
  descriptionKo?: string;
  descriptionJa?: string;
  sortOrder: number;
  categories: KanjiCategory[];
};

export type KanjiCategory = {
  id: string;
  groupId: string;
  categoryKey: string;
  labelKo: string;
  labelJa: string;
  descriptionKo?: string;
  descriptionJa?: string;
  sortOrder: number;
  visibleLocales: string[];
};

type KanjiCategoryGroupRow = {
  id: string;
  group_key: string;
  label_ko: string;
  label_ja: string;
  description_ko: string | null;
  description_ja: string | null;
  sort_order: number;
};

type KanjiCategoryRow = {
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

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export async function fetchKanjiCategoryGroups() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return [];
  }

  const [groups, categories] = await Promise.all([
    fetchCategoryGroups(),
    fetchCategories(),
  ]);

  return groups
    .map<KanjiCategoryGroup>((group) => ({
      id: group.id,
      groupKey: group.group_key,
      labelKo: group.label_ko,
      labelJa: group.label_ja,
      descriptionKo: group.description_ko ?? undefined,
      descriptionJa: group.description_ja ?? undefined,
      sortOrder: group.sort_order,
      categories: categories
        .filter((category) => category.group_id === group.id)
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((category) => ({
          id: category.id,
          groupId: category.group_id,
          categoryKey: category.category_key,
          labelKo: category.label_ko,
          labelJa: category.label_ja,
          descriptionKo: category.description_ko ?? undefined,
          descriptionJa: category.description_ja ?? undefined,
          sortOrder: category.sort_order,
          visibleLocales: category.metadata?.visibleLocales ?? ["ko", "ja"],
        })),
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

async function fetchCategoryGroups() {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/kanji_category_groups?select=id,group_key,label_ko,label_ja,description_ko,description_ja,sort_order&order=sort_order.asc`,
    {
      headers: buildHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch kanji category groups: ${response.status}`);
  }

  return (await response.json()) as KanjiCategoryGroupRow[];
}

async function fetchCategories() {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/kanji_categories?select=id,group_id,category_key,label_ko,label_ja,description_ko,description_ja,sort_order,metadata&order=sort_order.asc`,
    {
      headers: buildHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch kanji categories: ${response.status}`);
  }

  return (await response.json()) as KanjiCategoryRow[];
}

function buildHeaders() {
  return {
    apikey: supabaseAnonKey ?? "",
    Authorization: `Bearer ${supabaseAnonKey ?? ""}`,
  };
}
