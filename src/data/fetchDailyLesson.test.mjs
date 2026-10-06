import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });
const { fetchDailyLesson } = await import("./fetchDailyLesson.ts");
const { WORD_QUESTIONS } = await import("../domain/learning/guidedContent.ts");
const row = () => ({ lesson_date: "2026-10-06", stage: "kana", schema_version: 1,
  questions: WORD_QUESTIONS.slice(0,3).map(({quiz})=>({...quiz,id:`server:kana:${quiz.id}`})) });
process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.invalid";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-public-key";

test("fetches only requested approved date/stage and validates response", async (t) => {
  t.mock.method(globalThis,"fetch",async (url, init)=>{
    const u = new URL(url);
    assert.equal(u.searchParams.get("lesson_date"),"eq.2026-10-06");
    assert.equal(u.searchParams.get("stage"),"eq.kana");
    assert.equal(u.searchParams.get("review_status"),"eq.approved");
    assert.equal(init.headers.apikey,"test-public-key");
    return Response.json([row()]);
  });
  assert.equal((await fetchDailyLesson("2026-10-06","kana")).questions.length,3);
});
test("missing package is distinct from a network or schema failure",async(t)=>{
  const mock=t.mock.method(globalThis,"fetch",async()=>Response.json([]));
  assert.equal(await fetchDailyLesson("2026-10-06","kana"),null);
  mock.mock.mockImplementation(async()=>new Response("error",{status:503}));
  await assert.rejects(fetchDailyLesson("2026-10-06","kana"),/503/);
  mock.mock.mockImplementation(async()=>Response.json([{...row(),lesson_date:"2026-10-07"}]));
  await assert.rejects(fetchDailyLesson("2026-10-06","kana"),/mismatch/);
  mock.mock.mockImplementation(async()=>Response.json([{...row(),questions:[]}]));
  await assert.rejects(fetchDailyLesson("2026-10-06","kana"),/envelope/);
});
test("unmount or stage changes abort outstanding requests",async(t)=>{
  t.mock.method(globalThis,"fetch",async(_url,{signal})=>new Promise((_resolve,reject)=>{
    if(signal.aborted) return reject(new Error("aborted"));
    signal.addEventListener("abort",()=>reject(new Error("aborted")),{once:true});
  }));
  const controller=new AbortController();
  const pending=fetchDailyLesson("2026-10-06","kana",controller.signal);
  controller.abort();
  await assert.rejects(pending,/aborted/);
});
