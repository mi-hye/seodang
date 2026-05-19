type CharacterCategoryMappingRow = {
  character_id: string;
  category_id: string;
};

type CategoryIdRow = {
  category_id: string;
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const characterIdsChunkSize = 200;
const pageSize = 1000;

export async function fetchCategoryMappingsByCharacterIds(characterIds: string[]) {
  if (!supabaseUrl || !supabaseAnonKey || characterIds.length === 0) {
    return [];
  }

  const chunks = chunk(characterIds, characterIdsChunkSize);
  const pages = await Promise.all(
    chunks.map(async (ids) => {
      const params = new URLSearchParams({
        select: "character_id,category_id",
        character_id: `in.(${ids.map(encodeSupabaseValue).join(",")})`,
      });

      const response = await fetch(
        `${supabaseUrl}/rest/v1/kanji_character_categories?${params.toString()}`,
        {
          headers: buildHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch category mappings: ${response.status}`,
        );
      }

      return (await response.json()) as CharacterCategoryMappingRow[];
    }),
  );

  return pages.flat();
}

export async function fetchAllCategoryIdsForCounts() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return [];
  }

  let offset = 0;
  const rows: CategoryIdRow[] = [];

  while (true) {
    const params = new URLSearchParams({
      select: "category_id",
      offset: String(offset),
      limit: String(pageSize),
    });
    const response = await fetch(
      `${supabaseUrl}/rest/v1/kanji_character_categories?${params.toString()}`,
      {
        headers: buildHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch category totals: ${response.status}`,
      );
    }

    const pageRows = (await response.json()) as CategoryIdRow[];
    rows.push(...pageRows);

    if (pageRows.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
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
