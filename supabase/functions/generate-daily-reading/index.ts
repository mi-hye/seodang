const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-cron-secret",
};

const limits = { beginner: 600, intermediate: 1500, advanced: 3000 } as const;
type Level = keyof typeof limits;

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const cronSecret = requireEnv("DAILY_READING_CRON_SECRET");
    if (request.headers.get("x-cron-secret") !== cronSecret) {
      return json({ error: "Unauthorized" }, 401);
    }
    const openAiKey = requireEnv("OPENAI_API_KEY");
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const input = await request.json().catch(() => ({})) as { date?: string };
    const readingDate = normalizeDate(input.date ?? todayInKorea());
    const generated = await generateReadings(openAiKey, readingDate);
    const rows = generated.readings.map((reading) => validateAndMap(readingDate, reading));

    const response = await fetch(
      `${supabaseUrl}/rest/v1/daily_readings?on_conflict=reading_date,level`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(rows),
      },
    );
    if (!response.ok) throw new Error(`Supabase upsert failed: ${response.status} ${await response.text()}`);

    return json({ date: readingDate, count: rows.length });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

async function generateReadings(openAiKey: string, readingDate: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5-mini",
      instructions: [
        "한국인 일본어 학습자를 위한 오늘의 일본어 독해 3편을 작성한다.",
        "본문은 반드시 자연스러운 일본어, 번역은 반드시 자연스러운 한국어로 쓴다.",
        "세 난이도는 서로 다른 소재를 사용하고 정치·성인·혐오·의료 조언을 피한다.",
        "초급 본문은 600자 이내, 중급은 1500자 이내, 고급은 3000자 이내다.",
        "vocabulary 개수는 제한하지 않는다. 본문에서 한자가 포함된 모든 단어와 동사를 빠짐없이 넣는다.",
        "복합어를 단일 한자로 쪼개지 않는다. 한 글자 한자는 문장에서 실제 독립 단어일 때만 항목으로 넣는다.",
        "본문의 모든 한자 문자는 vocabulary의 surface 또는 forms 중 실제 본문에 등장하는 항목으로 덮여야 한다.",
        "동사는 surface에 사전형, forms에 본문에 등장한 활용형을 넣는다.",
      ].join("\n"),
      input: `${readingDate} 학습분을 생성해 주세요.`,
      text: {
        format: {
          type: "json_schema",
          name: "daily_readings",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["readings"],
            properties: {
              readings: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["level", "title", "body", "translationKo", "minutes", "vocabulary"],
                  properties: {
                    level: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                    title: { type: "string" },
                    body: { type: "string" },
                    translationKo: { type: "string" },
                    minutes: { type: "integer", minimum: 1, maximum: 30 },
                    vocabulary: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["surface", "reading", "meaningKo", "forms"],
                        properties: {
                          surface: { type: "string" },
                          reading: { type: "string" },
                          meaningKo: { type: "string" },
                          forms: { type: "array", items: { type: "string" } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI generation failed: ${response.status} ${await response.text()}`);
  const payload = await response.json() as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const outputText = payload.output?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text")?.text;
  if (!outputText) throw new Error("OpenAI response did not include output_text");
  return JSON.parse(outputText) as { readings: GeneratedReading[] };
}

type GeneratedReading = {
  level: Level;
  title: string;
  body: string;
  translationKo: string;
  minutes: number;
  vocabulary: Array<{ surface: string; reading: string; meaningKo: string; forms: string[] }>;
};

function validateAndMap(readingDate: string, reading: GeneratedReading) {
  const maxCharacters = limits[reading.level];
  if (!maxCharacters) throw new Error(`Invalid reading level: ${reading.level}`);
  if (Array.from(reading.body).length > maxCharacters) {
    throw new Error(`${reading.level} body exceeds ${maxCharacters} characters`);
  }
  if (!reading.title.trim() || !reading.body.trim() || !reading.translationKo.trim()) {
    throw new Error(`${reading.level} has an empty required field`);
  }
  return {
    reading_date: readingDate,
    level: reading.level,
    title_ja: reading.title.trim(),
    body_ja: reading.body.trim(),
    translation_ko: reading.translationKo.trim(),
    max_characters: maxCharacters,
    minutes: reading.minutes,
    vocabulary: reading.vocabulary,
    generator: "openai",
    model: "gpt-5-mini",
  };
}

function todayInKorea() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error("date must be YYYY-MM-DD");
  }
  return value;
}

function requireEnv(key: string) {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
