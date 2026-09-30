import { DailyReading, ReadingLevel, ReadingWord } from "../domain/reading/dailyReading";
import { supabaseFetchJson } from "./supabaseFetch";

type DailyReadingRow = {
  level: ReadingLevel;
  title_ja: string;
  body_ja: string;
  translation_ko: string;
  max_characters: number;
  minutes: number;
  vocabulary: ReadingWord[] | null;
};

export async function fetchDailyReadings(readingDate: string) {
  const query = new URLSearchParams({
    select: "level,title_ja,body_ja,translation_ko,max_characters,minutes,vocabulary",
    reading_date: `eq.${readingDate}`,
    review_status: "eq.approved",
  });
  const rows = await supabaseFetchJson<DailyReadingRow[]>(
    `/rest/v1/daily_readings?${query.toString()}`,
    "Failed to fetch daily readings",
  );

  return rows.reduce<Partial<Record<ReadingLevel, DailyReading>>>((readings, row) => {
    readings[row.level] = {
      level: row.level,
      maxCharacters: row.max_characters,
      minutes: row.minutes,
      title: row.title_ja,
      body: row.body_ja,
      translationKo: row.translation_ko,
      vocabulary: row.vocabulary ?? [],
    };
    return readings;
  }, {});
}
