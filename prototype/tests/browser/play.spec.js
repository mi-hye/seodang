// Storage safety guarantees on the current app flow.
// The original bag case ("play") and the "/" start screen were retired in #27,
// so these checks now run through playable.html and a live sentence lesson.
import { test, expect } from "@playwright/test";
import { freshState } from "../../src/engine.js";

const KEY = "seodang.web-prototype.v1";
const seeded = { ...freshState(), onboarded: true, onboardingLevel: 2, courseDirection: "ko-ja", settings: { sound: false, motion: "off", textScale: 1, audioRate: 1 } };
const raw = (p) => p.evaluate((k) => localStorage.getItem(k), KEY);
async function seed(page, value = seeded, { failWrites = false } = {}) {
  await page.addInitScript(([k, v, fail]) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    localStorage.setItem("seodang.analytics.v1", JSON.stringify({ consent: false, queue: [] }));
    if (fail) Storage.prototype.setItem = function () { throw new Error("quota"); };
  }, [KEY, value, failWrites]);
}
const openLesson = async (page) => {
  await page.locator('[data-action="sentence"]').first().click();
  await expect(page.locator(".view-sentence")).toBeVisible();
};

test("storage failure warns and keeps the lesson usable", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page, seeded, { failWrites: true });
  await page.goto("/playable.html");
  await openLesson(page);
  await expect(page.locator(".storage-warning")).toContainText("저장하지 못");
  expect(errors).toEqual([]);
});

test("unknown schema record is kept and never overwritten", async ({ page }) => {
  const unknown = '{"schemaVersion":99}';
  await seed(page, unknown);
  // Without a readable record the app sends learners through setup again.
  await page.goto("/playable.html");
  await page.waitForURL(/setup\.html/);
  await page.locator("form .primary").first().click();
  await page.locator("form .primary").first().click();
  await expect(page.locator("#feedback")).toContainText("기존 기록은 보관돼요");
  expect(await raw(page)).toBe(unknown);
  await page.reload();
  expect(await raw(page)).toBe(unknown);
});

test("cross-tab change stops saving instead of overwriting", async ({ page, context }) => {
  await seed(page);
  await page.goto("/playable.html");
  await expect(page.locator('[data-action="sentence"]').first()).toBeVisible();
  const other = await context.newPage();
  await other.goto("/playable.html");
  await openLesson(other);
  await expect(page.locator(".storage-warning")).toContainText("다른 탭");
  const fromOther = await raw(other);
  await page.locator('[data-action="sentence"]').first().click();
  expect(await raw(page)).toBe(fromOther);
  await other.close();
});

test("reset clears only Seodang records", async ({ page }) => {
  await seed(page);
  await page.goto("/playable.html");
  await page.evaluate(() => localStorage.setItem("production-user", "keep"));
  await page.locator('[data-action="my"]').first().click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('[data-action="reset"]').click();
  await page.waitForURL(/index\.html|setup\.html|playable\.html/);
  expect(await page.evaluate(() => localStorage.getItem("production-user"))).toBe("keep");
  const after = JSON.parse((await raw(page)) ?? "null");
  expect(after?.onboarded ?? false).toBe(false);
});
