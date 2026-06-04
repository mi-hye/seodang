type CharacterCategoryMappingRow = {
  character_id: string;
  category_id: string;
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const characterIdsChunkSize = 200;
const practicalCharacterFilter =
  "or=(is_joyo.eq.true,jlpt_level.not.is.null,japanese_grade.not.is.null,japanese_school_level.not.is.null)";

export async function fetchCategoryMappingsByCharacterIds(characterIds: string[]) {
  if (!supabaseUrl || !supabaseAnonKey || characterIds.length === 0) {
    return [];
  }

  const practicalCharacterIds = new Set(
    await fetchPracticalCharacterIdsByIds(characterIds),
  );
  if (!practicalCharacterIds.size) {
    return [];
  }

  const chunks = chunk(characterIds, characterIdsChunkSize);
  const pages = await Promise.all(
    chunks.map(async (ids) => {
      const practicalIds = ids.filter((id) => practicalCharacterIds.has(id));
      if (!practicalIds.length) {
        return [];
      }

      const params = new URLSearchParams({
        select: "character_id,category_id",
        character_id: `in.(${practicalIds.map(encodeSupabaseValue).join(",")})`,
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

async function fetchPracticalCharacterIdsByIds(characterIds: string[]) {
  const chunks = chunk(characterIds, characterIdsChunkSize);
  const pages = await Promise.all(
    chunks.map(async (ids) => {
      const params = new URLSearchParams({
        select: "id",
        id: `in.(${ids.map(encodeSupabaseValue).join(",")})`,
      });
      const response = await fetch(
        `${supabaseUrl}/rest/v1/kanji_characters?${params.toString()}&${practicalCharacterFilter}`,
        {
          headers: buildHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch practical characters: ${response.status}`,
        );
      }

      return (await response.json()) as Array<{ id: string }>;
    }),
  );

  return pages.flat().map((row) => row.id);
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
