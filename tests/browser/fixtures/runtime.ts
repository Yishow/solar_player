import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test as base, expect, type APIRequestContext, type Page, type TestInfo } from "playwright/test";

export type BrowserSmokeRuntimeManifest = {
  artifactDir: string;
  baseUrl: string;
  brandUploadsDir: string;
  consoleLogPath: string;
  dataDir: string;
  databasePath: string;
  host: string;
  mqttDataMode: "mock" | "mqtt";
  networkLogPath: string;
  port: number;
  runId: string;
  uploadsDir: string;
  workRoot: string;
};

export type NetworkSummaryEntry = {
  failureText?: string;
  method: string;
  resourceType: string;
  status?: number;
  url: string;
  when: string;
};

type SmokeFixtures = {
  runtime: BrowserSmokeRuntimeManifest;
  api: APIRequestContext;
};

function loadRuntimeManifest(): BrowserSmokeRuntimeManifest {
  const manifestPath = process.env.BROWSER_SMOKE_RUNTIME_MANIFEST;
  if (!manifestPath) {
    throw new Error(
      "BROWSER_SMOKE_RUNTIME_MANIFEST is required. Run journeys via `pnpm browser:smoke`."
    );
  }
  if (!existsSync(manifestPath)) {
    throw new Error(`Runtime manifest not found: ${manifestPath}`);
  }

  return JSON.parse(readFileSync(manifestPath, "utf8")) as BrowserSmokeRuntimeManifest;
}

function appendConsoleLine(logPath: string, line: string) {
  mkdirSync(path.dirname(logPath), { recursive: true });
  appendFileSync(logPath, `${line}\n`, "utf8");
}

function writeNetworkSummary(logPath: string, entries: NetworkSummaryEntry[]) {
  mkdirSync(path.dirname(logPath), { recursive: true });
  writeFileSync(
    logPath,
    JSON.stringify(
      {
        entries,
        failedCount: entries.filter((entry) => entry.failureText || (entry.status ?? 0) >= 400).length,
        generatedAt: new Date().toISOString(),
        total: entries.length
      },
      null,
      2
    ),
    "utf8"
  );
}

export async function attachPageDiagnostics(
  page: Page,
  runtime: BrowserSmokeRuntimeManifest,
  networkEntries: NetworkSummaryEntry[]
) {
  page.on("console", (message) => {
    appendConsoleLine(
      runtime.consoleLogPath,
      `[${new Date().toISOString()}] [${message.type()}] ${message.text()}`
    );
  });

  page.on("pageerror", (error) => {
    appendConsoleLine(
      runtime.consoleLogPath,
      `[${new Date().toISOString()}] [pageerror] ${error.stack ?? error.message}`
    );
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure();
    const entry: NetworkSummaryEntry = {
      failureText: failure?.errorText,
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
      when: new Date().toISOString()
    };
    networkEntries.push(entry);
    writeNetworkSummary(runtime.networkLogPath, networkEntries);
  });

  page.on("response", (response) => {
    if (response.status() < 400) {
      return;
    }

    const entry: NetworkSummaryEntry = {
      method: response.request().method(),
      resourceType: response.request().resourceType(),
      status: response.status(),
      url: response.url(),
      when: new Date().toISOString()
    };
    networkEntries.push(entry);
    writeNetworkSummary(runtime.networkLogPath, networkEntries);
  });
}

export async function apiJson<T>(
  request: APIRequestContext,
  method: "GET" | "POST" | "PUT" | "DELETE",
  urlPath: string,
  options: {
    data?: unknown;
    form?: Record<string, string | number | boolean>;
    multipart?: Parameters<APIRequestContext["fetch"]>[1] extends infer TOptions
      ? TOptions extends { multipart?: infer TMultipart }
        ? TMultipart
        : never
      : never;
    expectedStatuses?: number[];
  } = {}
): Promise<{ body: T; status: number }> {
  const response = await request.fetch(urlPath, {
    method,
    data: options.data,
    form: options.form,
    multipart: options.multipart,
    failOnStatusCode: false
  });
  const status = response.status();
  const expected = options.expectedStatuses ?? [200, 201];
  const text = await response.text();
  let body: T;
  try {
    body = text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    throw new Error(`${method} ${urlPath} returned non-JSON body (status ${status}): ${text.slice(0, 400)}`);
  }

  if (!expected.includes(status)) {
    throw new Error(
      `${method} ${urlPath} expected status ${expected.join("|")}, got ${status}: ${text.slice(0, 600)}`
    );
  }

  return { body, status };
}

/** Minimal valid 1x1 PNG (content-validated). */
export const TINY_PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

export async function waitForLiveMetricValue(page: Page, options: { timeout?: number } = {}) {
  const valueLocator = page.locator(".overview-kpi-card .display-card-value").first();
  await expect(valueLocator).toBeVisible({ timeout: options.timeout ?? 20_000 });
  await expect
    .poll(async () => {
      const text = (await valueLocator.textContent())?.trim() ?? "";
      return /\d/.test(text) ? text : "";
    }, { timeout: options.timeout ?? 20_000 })
    .not.toEqual("");
  return (await valueLocator.textContent())?.trim() ?? "";
}

export async function waitForPlaybackShell(page: Page) {
  await expect(page.locator("body.page-hero-shell")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#root")).not.toBeEmpty();
}

export const test = base.extend<SmokeFixtures>({
  runtime: async ({}, use) => {
    const runtime = loadRuntimeManifest();
    expect(runtime.host).toBe("127.0.0.1");
    expect(runtime.port).toBe(3310);
    expect(runtime.mqttDataMode).toBe("mock");
    expect(runtime.databasePath).toContain("solar-browser-smoke-");
    expect(runtime.uploadsDir).toContain("solar-browser-smoke-");
    await use(runtime);
  },

  api: async ({ playwright, runtime }, use) => {
    const context = await playwright.request.newContext({
      baseURL: runtime.baseUrl
    });
    await use(context);
    await context.dispose();
  },

  page: async ({ page, runtime }, use, testInfo: TestInfo) => {
    const networkEntries: NetworkSummaryEntry[] = [];
    writeNetworkSummary(runtime.networkLogPath, networkEntries);
    appendConsoleLine(
      runtime.consoleLogPath,
      `[${new Date().toISOString()}] [harness] start ${testInfo.title}`
    );
    await attachPageDiagnostics(page, runtime, networkEntries);
    await use(page);
    writeNetworkSummary(runtime.networkLogPath, networkEntries);
    appendConsoleLine(
      runtime.consoleLogPath,
      `[${new Date().toISOString()}] [harness] end ${testInfo.title} status=${testInfo.status}`
    );
  }
});

export { expect };
