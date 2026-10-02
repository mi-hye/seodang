import test from "node:test";
import assert from "node:assert/strict";
import { getMainTab, MAIN_TABS } from "./mainTabs.ts";

test("four main screens map to their selected tab", () => {
  assert.equal(MAIN_TABS.length, 4);
  for (const tab of MAIN_TABS) assert.equal(getMainTab(tab.path)?.key, tab.key);
  assert.equal(getMainTab("/review/")?.key, "review");
  assert.equal(MAIN_TABS.find((tab) => tab.key === "learn")?.path, "/learn");
});

test("detail, practice and secondary screens do not show main navigation", () => {
  for (const path of ["/categories", "/character/kana-3042", "/practice/kana-3042", "/practice/result", "/list", "/settings", "/daily-reading", "/review-stats", "/writing-history/detail"]) {
    assert.equal(getMainTab(path), undefined, path);
  }
});
