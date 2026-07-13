import { defineConfig, devices } from "playwright/test";

const baseURL = process.env.BROWSER_SMOKE_BASE_URL ?? "http://127.0.0.1:3310";
const artifactDir =
  process.env.BROWSER_SMOKE_ARTIFACT_DIR
  ?? "artifacts/browser-smoke/local";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: {
    timeout: 20_000
  },
  reporter: [["line"]],
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? "artifacts/browser-smoke/test-results",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000
  },
  // Keep metadata for fixtures without coupling product runtime to Playwright.
  metadata: {
    artifactDir,
    smokeHost: "127.0.0.1",
    smokePort: 3310
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ]
});
