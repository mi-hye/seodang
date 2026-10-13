import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45000,
  use: { baseURL: "http://localhost:4173", headless: true, isMobile: true, hasTouch: true },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: {
    command: "node server.mjs",
    url: "http://localhost:4173",
    reuseExistingServer: true,
  },
  reporter: "list",
});
