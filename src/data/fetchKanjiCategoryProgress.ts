import { supabaseFetchJson } from "./supabaseFetch";
import { getKanaCategoryKeyById, getKanaScriptById } from "./kanaCatalog";

type CharacterCategoryMappingRow = {
  character_id: string;
  category_id: string;
};

const characterIdsChunkSize = 200;

export async function fetchCategoryMappingsByCharacterIds(characterIds: string[]) {
  if (characterIds.length === 0) {
    return [];
  }

  const localMappings = characterIds.flatMap((id) => {
    const key = getKanaCategoryKeyById(id);
    return key ? [{ character_id: id, category_id: key }] : [];
  });
  const chunks = chunk(characterIds.filter((id) => !getKanaScriptById(id)), characterIdsChunkSize);
  const pages = await Promise.all(
    chunks.map(async (ids) => {
      const params = new URLSearchParams({
        select: "character_id,category_id",
        character_id: `in.(${ids.map(encodeSupabaseValue).join(",")})`,
      });

      return supabaseFetchJson<CharacterCategoryMappingRow[]>(
        `/rest/v1/kanji_character_categories?${params.toString()}`,
        "Failed to fetch category mappings",
      );
    }),
  );

  return [...localMappings, ...pages.flat()];
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function encodeSupabaseValue(value: string) {
  return `"${value}"`;
}
