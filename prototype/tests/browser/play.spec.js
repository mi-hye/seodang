import { test, expect } from "@playwright/test";
const btn = (p, a, id) =>
  p.locator(`[data-action="${a}"]${id ? `[data-id="${id}"]` : ""}`);
async function next(p) {
  await p.waitForTimeout(480);
  await btn(p, "next").click();
}
async function begin(p) {
  await p.goto("/");
  await btn(p, "start").click();
  await btn(p, "onboard").click();
  await btn(p, "play").click();
}
async function toInvestigation(p) {
  await begin(p);
  for (let i = 0; i < 4; i++) await next(p);
}
async function noOverflow(p) {
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
}
for (const width of [360, 390, 430])
  test(`complete case, mistakes, hints, restore, transfer ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await toInvestigation(page);
    await noOverflow(page);
    await btn(page, "select", "bag-window-blue").click();
    await btn(page, "submit").click();
    await expect(page.locator(".feedback")).toContainText("메모");
    await btn(page, "notebook").first().click();
    await expect(page.locator("dialog")).toContainText(
      "아직 모은 단서가 없어요",
    );
    await page.keyboard.press("Escape");
    for (const id of ["color", "position"]) {
      await btn(page, "clue", id).click();
      await expect(page.locator("dialog")).toContainText("음성 준비 중");
      await page.locator('dialog [data-action="close"]').last().click();
    }
    await btn(page, "hint").click();
    await expect(page.locator(".hints li")).toHaveCount(1);
    await btn(page, "more-hint").click();
    await btn(page, "more-hint").click();
    await expect(page.locator(".hints li")).toHaveCount(3);
    await page.locator('dialog [data-action="close"]').last().click();
    await btn(page, "settings").click();
    await page.locator('[data-setting="textScale"]').selectOption("1.2");
    await page.locator('[data-setting="motion"]').selectOption("off");
    await page.locator('dialog [data-action="close"]').last().click();
    await noOverflow(page);
    await btn(page, "select", "bag-door-blue").click();
    await btn(page, "submit").click();
    await expect(page.locator(".feedback")).toContainText("위치");
    await page.reload();
    await btn(page, "play").click();
    await expect(btn(page, "select", "bag-door-blue")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator(".feedback")).toContainText("위치");
    await btn(page, "select", "bag-window-red").click();
    await btn(page, "submit").click();
    await expect(page.locator(".feedback")).toContainText("색");
    await page.screenshot({
      path: `test-results/${test.info().project.name}-${width}-investigate.png`,
      fullPage: true,
    });
    await btn(page, "select", "bag-window-blue").click();
    await btn(page, "submit").click();
    await expect(page.locator("h1")).toContainText("가방이 주인을");
    await next(page);
    await btn(page, "transfer", "book").click();
    await expect(page.locator(".feedback")).toContainText("다시 골라");
    await btn(page, "transfer", "cup").click();
    await expect(page.locator(".feedback")).toContainText("맞아요");
    await next(page);
    await noOverflow(page);
    await expect(page.locator("h1")).toContainText("작은 메모");
    await page.screenshot({
      path: `test-results/${test.info().project.name}-${width}-summary.png`,
      fullPage: true,
    });
    await btn(page, "home").last().click();
    await expect(page.locator(".case-content")).toContainText("해결한 이야기");
    await btn(page, "review").first().click();
    await expect(page.locator(".expression")).toHaveCount(2);
    await expect(page.locator(".expression details[open]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
test("new session, motion, rapid taps and reset isolation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.screenshot({
    path: `test-results/${test.info().project.name}-start.png`,
  });
  expect(
    await page
      .locator(".start-dog")
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
  await btn(page, "motion").click();
  await btn(page, "start").click();
  await btn(page, "onboard").click();
  await page.screenshot({
    path: `test-results/${test.info().project.name}-home.png`,
    fullPage: true,
  });
  await btn(page, "play").click();
  await btn(page, "next").dblclick();
  await expect(page.locator(".speaker")).toHaveText("서당개");
  await page.waitForTimeout(500);
  await btn(page, "next").click();
  await btn(page, "settings").click();
  await page.keyboard.press("Tab");
  await expect(page.locator("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).not.toBeVisible();
  await btn(page, "home").click();
  await btn(page, "my").click();
  await page.evaluate(() => localStorage.setItem("production-user", "keep"));
  page.once("dialog", dialog => dialog.accept());
  await btn(page, "reset").click();
  await expect(btn(page, "start")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("production-user")),
  ).toBe("keep");
});
test("storage failure and future schema do not destroy records", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new Error("quota");
    };
  });
  await begin(page);
  await expect(page.locator(".storage-warning")).toContainText("저장하지 못");
  for (let i = 0; i < 4; i++) await next(page);
  await expect(page.locator(".memo")).toHaveCount(2);
});
test("unknown schema record kept and no automatic overwrite", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("seodang.web-prototype.v1", '{"schemaVersion":99}'),
  );
  await page.reload();
  await expect(page.locator(".storage-warning")).toContainText("원본을 보존");
  await btn(page, "start").click();
  await btn(page, "onboard").click();
  expect(
    await page.evaluate(() => localStorage.getItem("seodang.web-prototype.v1")),
  ).toBe('{"schemaVersion":99}');
});

test('reopened tab resumes, restart preserves expressions, cross-tab conflict is explicit', async ({page,context}) => {
  await toInvestigation(page);
  await btn(page,'clue','color').click();
  await expect(page.locator('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  const other = await context.newPage();
  await other.goto('/');
  await expect(other.locator('.case-content')).toContainText('이어서 하기');
  await btn(other,'play').click();
  await expect(other.locator('.section-row')).toContainText('1 / 2');
  await btn(other,'select','bag-door-blue').click();
  await expect(page.locator('.storage-warning')).toContainText('다른 탭');
  await btn(other,'home').click();
  await btn(other,'review').first().click();
  await expect(other.locator('.expression')).toHaveCount(2);
  await btn(other,'play').click();
  await btn(other,'select','bag-window-blue').click();
  await btn(other,'clue','position').click();
  await expect(other.locator('dialog')).toBeVisible();
  await other.keyboard.press('Escape');
  await btn(other,'submit').click();
  await next(other);
  await btn(other,'transfer','cup').click();
  await next(other);
  await btn(other,'restart').click();
  await btn(other,'confirm-restart').click();
  await expect(other.locator('.speaker')).toHaveText('카페 직원');
  await btn(other,'home').click();
  await btn(other,'review').first().click();
  await expect(other.locator('.expression')).toHaveCount(2);
  await other.close();
});
