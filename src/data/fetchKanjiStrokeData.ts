import { KanjiVgCharacter, KanjiVgStroke } from "../types/practice";
import { throwIfForcedFetchFailure } from "./debugFetchFailure";
import { requireSupabaseConfig } from "./supabaseEnv";

type KanjiCharacterRow = {
  id: string;
  literal: string;
  source: "KanjiVG" | "AnimCJK";
  license: string;
  view_box_width: number;
  view_box_height: number;
};

type KanjiStrokeRow = {
  id: string;
  stroke_order: number;
  stroke_type: KanjiVgStroke["type"];
  raw_type: string | null;
  direction: KanjiVgStroke["direction"];
  path: string;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  note: string | null;
};

export async function fetchKanjiStrokeDataByLiteral(
  literal: string,
  debugScope = "practice",
) {
  throwIfForcedFetchFailure(debugScope);

  if (!literal) {
    return undefined;
  }
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseConfig();

  const character = await fetchCharacterByLiteral(
    literal,
    supabaseUrl,
    supabaseAnonKey,
  );
  if (!character) {
    return undefined;
  }

  const strokes = await fetchStrokesByCharacterId(
    character.id,
    supabaseUrl,
    supabaseAnonKey,
  );

  return mapKanjiVgCharacter(character, strokes);
}

async function fetchCharacterByLiteral(
  literal: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/kanji_characters?literal=eq.${encodeURIComponent(literal)}&select=id,literal,source,license,view_box_width,view_box_height&limit=1`,
    {
      headers: buildHeaders(supabaseAnonKey),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch kanji character: ${response.status}`);
  }

  const rows = (await response.json()) as KanjiCharacterRow[];
  return rows[0];
}

async function fetchStrokesByCharacterId(
  characterId: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/kanji_strokes?character_id=eq.${encodeURIComponent(characterId)}&select=id,stroke_order,stroke_type,raw_type,direction,path,start_x,start_y,end_x,end_y,note&order=stroke_order.asc`,
    {
      headers: buildHeaders(supabaseAnonKey),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch kanji strokes: ${response.status}`);
  }

  return (await response.json()) as KanjiStrokeRow[];
}

function buildHeaders(supabaseAnonKey: string) {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  };
}

function mapKanjiVgCharacter(
  character: KanjiCharacterRow,
  strokes: KanjiStrokeRow[]
): KanjiVgCharacter {
  return {
    characterId: character.id,
    literal: character.literal,
    source: character.source,
    license: character.license,
    viewBox: {
      width: character.view_box_width,
      height: character.view_box_height,
    },
    strokes: strokes.map((stroke) => ({
      id: stroke.id,
      order: stroke.stroke_order,
      type: stroke.stroke_type,
      rawType: stroke.raw_type ?? undefined,
      direction: stroke.direction,
      path: stroke.path,
      start: {
        x: stroke.start_x,
        y: stroke.start_y,
      },
      end: {
        x: stroke.end_x,
        y: stroke.end_y,
      },
      note: stroke.note ?? undefined,
    })),
  };
}
