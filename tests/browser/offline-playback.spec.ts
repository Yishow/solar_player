import path from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Page } from "playwright";
import {
  apiJson,
  attachPageDiagnostics,
  expect,
  test,
  waitForPlaybackShell
} from "./fixtures/runtime";

test.describe.configure({ mode: "serial" });

async function controlServer(
  runtime: {
    serverControlPath: string;
    serverControlStatusPath: string;
  },
  action: "start" | "stop"
) {
  const id = `${action}-${Date.now()}-${Math.random()}`;
  writeFileSync(runtime.serverControlPath, JSON.stringify({ action, id }));
  await expect.poll(() => {
    if (!existsSync(runtime.serverControlStatusPath)) return "pending";
    const status = JSON.parse(
      readFileSync(runtime.serverControlStatusPath, "utf8")
    ) as { id?: string; status?: string };
    return status.id === id ? status.status : "pending";
  }, { timeout: 30_000 }).toBe("completed");
}

async function readActiveSavedEpoch(page: Page) {
  return page.evaluate(async () => {
    const request = indexedDB.open("solar-playback-runtime");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const transaction = database.transaction(
        ["meta", "profileSnapshots"],
        "readonly"
      );
      const metaRequest = transaction.objectStore("meta").get("active");
      const pointer = await new Promise<{ snapshotId: string }>((resolve, reject) => {
        metaRequest.onsuccess = () => resolve(metaRequest.result);
        metaRequest.onerror = () => reject(metaRequest.error);
      });
      const snapshotRequest =
        transaction.objectStore("profileSnapshots").get(pointer.snapshotId);
      return await new Promise<number>((resolve, reject) => {
        snapshotRequest.onsuccess = () =>
          resolve(snapshotRequest.result.savedAtServerEpoch);
        snapshotRequest.onerror = () => reject(snapshotRequest.error);
      });
    } finally {
      database.close();
    }
  });
}

test("warm cache survives network loss and Browser restart", async ({ api, playwright, runtime }) => {
  test.setTimeout(180_000);
  const profiles = await apiJson<{
    data: Array<{ id: number }>;
  }>(api, "GET", "/api/playback-profiles");
  const profileId = profiles.body.data[0]?.id;
  expect(profileId).toBeTruthy();
  const draft = await apiJson<{
    data: { revision: number };
  }>(api, "GET", `/api/playback-profiles/${profileId}/draft`);
  const playbackPages = await apiJson<{
    pages: Array<{ id: number }>;
  }>(api, "GET", "/api/playback/pages");
  const playbackSettings = await apiJson<{
    settings: Record<string, unknown>;
  }>(api, "GET", "/api/playback/settings");
  await apiJson(api, "PUT", `/api/playback-profiles/${profileId}/draft`, {
    data: {
      expectedRevision: draft.body.data.revision,
      pages: playbackPages.body.pages,
      settings: {
        ...playbackSettings.body.settings,
        startPage: playbackPages.body.pages[0]?.id
      }
    }
  });
  const savedDraft = await apiJson<{
    data: { revision: number };
  }>(api, "GET", `/api/playback-profiles/${profileId}/draft`);
  await apiJson(api, "POST", `/api/playback-profiles/${profileId}/publish`, {
    data: { expectedRevision: savedDraft.body.data.revision }
  });
  const group = await apiJson<{
    data: { id: number };
  }>(api, "POST", "/api/device-groups", {
    data: {
      enabled: true,
      name: `offline-${runtime.runId.slice(-8)}`,
      playbackProfileId: profileId,
      siteScope: "cl"
    }
  });
  const device = await apiJson<{
    data: { id: number };
  }>(api, "POST", "/api/devices", {
    data: {
      clientId: `offline-${runtime.runId.slice(-8)}`,
      displayName: "Offline Browser Test",
      enabled: true,
      groupId: group.body.data.id
    }
  });
  const pairing = await apiJson<{
    data: { token: string };
  }>(api, "POST", `/api/devices/${device.body.data.id}/pairing-tokens`);
  const userDataDir = path.join(runtime.workRoot, "offline-browser-profile");
  let context = await playwright.firefox.launchPersistentContext(userDataDir, {
    baseURL: runtime.baseUrl,
    headless: true
  });
  let page = context.pages()[0] ?? await context.newPage();
  await attachPageDiagnostics(page, runtime, []);

  try {
    const exchange = await context.request.post("/api/device-pairing/exchange", {
      data: { token: pairing.body.data.token }
    });
    expect(exchange.status()).toBe(204);
    await page.goto("/overview", { waitUntil: "domcontentloaded" });
    await waitForPlaybackShell(page);
    const registrationResult = await page.evaluate(async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { type: "module" });
        return "registered";
      } catch (error) {
        return `failed:${error instanceof Error ? error.message : String(error)}`;
      }
    });
    expect(registrationResult).toBe("registered");
    await expect.poll(
      () => page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.active) return "ready";
        const debugCache = await caches.open("solar-playback:install-error");
        const failure = await debugCache.match("/__offline-install-error");
        if (failure) return `failed:${await failure.text()}`;
        const state = registration?.waiting?.state
          ?? registration?.installing?.state
          ?? "missing";
        return `${state}:${(await caches.keys()).join(",")}`;
      }),
      { timeout: 30_000 }
    ).toBe("ready");
    await expect.poll(
      () => page.evaluate(async () =>
        Boolean(await (
          await caches.open("solar-playback:metadata")
        ).match("/__active-cache"))
      ),
      { timeout: 30_000 }
    ).toBe(true);
    await expect.poll(
      () => page.evaluate(async () => {
        const metadata = await caches.open("solar-playback:metadata");
        const activeResponse = await metadata.match("/__active-cache");
        if (!activeResponse) return false;
        const active = await activeResponse.json() as { cacheName: string };
        const cache = await caches.open(active.cacheName);
        const manifestResponse = await cache.match("/offline-manifest.json");
        if (!manifestResponse) return false;
        const manifest = await manifestResponse.json() as {
          assets: Array<{ required: boolean; url: string }>;
        };
        return (await Promise.all(
          manifest.assets
            .filter((asset) => asset.required)
            .map((asset) => cache.match(asset.url))
        )).every(Boolean);
      }),
      { timeout: 30_000 }
    ).toBe(true);
    await expect.poll(
      () => page.evaluate(async () => {
        const request = indexedDB.open("solar-playback-runtime");
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        try {
          const transaction = database.transaction(
            ["meta", "profileSnapshots"],
            "readonly"
          );
          const read = transaction.objectStore("meta").get("active");
          const profileCount = transaction.objectStore("profileSnapshots").count();
          return await new Promise<string>((resolve) => {
            read.onsuccess = () => {
              profileCount.onsuccess = () => resolve(
                read.result?.snapshotId
                  ? "active"
                  : `empty:${profileCount.result}`
              );
            };
            read.onerror = () => resolve("read-error");
          });
        } finally {
          database.close();
        }
      }),
      { timeout: 30_000 }
    ).toBe("active");
    await expect.poll(
      () => page.evaluate(async () => {
        const request = indexedDB.open("solar-playback-runtime");
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        try {
          const transaction = database.transaction(
            ["meta", "metricSnapshots"],
            "readonly"
          );
          const metaRequest = transaction.objectStore("meta").get("active");
          const pointer = await new Promise<{ snapshotId: string }>((resolve) => {
            metaRequest.onsuccess = () => resolve(metaRequest.result);
          });
          const metricsRequest =
            transaction.objectStore("metricSnapshots").get(pointer.snapshotId);
          const metrics = await new Promise<Array<{ key: string }>>((resolve) => {
            metricsRequest.onsuccess = () => resolve(metricsRequest.result ?? []);
          });
          return metrics.map((metric) => metric.key).sort();
        } finally {
          database.close();
        }
      }),
      { timeout: 30_000 }
    ).toEqual(expect.arrayContaining([
      "/api/display-page-registry",
      "/api/display-pages/overview/live",
      "/api/display-story/overview",
      "/api/metrics/live"
    ]));

    await page.goto("/overview", { waitUntil: "domcontentloaded" });
    await waitForPlaybackShell(page);
    const metricValues = page.locator(".overview-kpi-card .display-card-value");
    await expect(metricValues.first()).toBeVisible();
    await expect(metricValues).not.toHaveCount(0);
    const savedMetricValues = await metricValues.allTextContents();
    const sourceTimestamp = page.locator(".overview-kpi-footer-note-text").first();
    await expect(sourceTimestamp).toBeVisible();
    await expect(sourceTimestamp).toContainText(/\d{4}-\d{2}-\d{2}/);
    const savedSourceTimestamp = await sourceTimestamp.textContent();
    const initialClock = await page.locator("[data-time-state]").locator("..").textContent();
    const initialPath = new URL(page.url()).pathname;

    await controlServer(runtime, "stop");
    await expect.poll(async () => {
      try {
        return (await fetch(`${runtime.baseUrl}/health`)).ok;
      } catch {
        return false;
      }
    }).toBe(false);
    const savedEpoch = await readActiveSavedEpoch(page);

    await context.close();
    context = await playwright.firefox.launchPersistentContext(userDataDir, {
      baseURL: runtime.baseUrl,
      headless: true
    });
    page = context.pages()[0] ?? await context.newPage();
    await attachPageDiagnostics(page, runtime, []);
    await page.goto("/overview", { waitUntil: "domcontentloaded" });
    await waitForPlaybackShell(page);
    await expect(page.locator(".overview-display-page")).toBeVisible();
    await expect.poll(
      () => page.locator(".overview-kpi-card .display-card-value").allTextContents()
    ).toEqual(savedMetricValues);
    await expect(page.locator(".overview-kpi-footer-note-text").first())
      .toHaveText(savedSourceTimestamp ?? "");
    await expect(page.locator("[data-time-state]")).toHaveAttribute(
      "data-time-state",
      /waiting|time-untrusted/
    );
    const offlineClock = await page.locator("[data-time-state]").locator("..").textContent();
    await page.waitForTimeout(1_500);
    expect(await page.locator("[data-time-state]").locator("..").textContent())
      .toBe(offlineClock ?? initialClock);
    const visualAssetState = await page.evaluate(async () => {
      await document.fonts.ready;
      const target = document.querySelector(".overview-display-page");
      if (!(target instanceof HTMLElement)) return null;
      const metadata = await caches.open("solar-playback:metadata");
      const activeResponse = await metadata.match("/__active-cache");
      const active = await activeResponse?.json() as {
        cacheName?: string;
        verifiedUrls?: string[];
      } | undefined;
      const stylesheetUrl = active?.verifiedUrls?.find((url) =>
        /\.css(?:$|\?)/i.test(url)
      );
      const stylesheetCached = Boolean(
        active?.cacheName
        && stylesheetUrl
        && await (await caches.open(active.cacheName)).match(stylesheetUrl)
      );
      const imageUrl = active?.verifiedUrls?.find((url) =>
        /\.(?:jpe?g|png|webp)(?:$|\?)/i.test(url)
      );
      const image = new Image();
      image.src = imageUrl ?? "";
      try {
        await image.decode();
      } catch {}
      return {
        fontFamily: getComputedStyle(target).fontFamily,
        imageUrl,
        imageLoaded: image.naturalWidth > 0,
        stylesheetCached,
        stylesheetUrl
      };
    });
    expect(visualAssetState?.fontFamily).toBeTruthy();
    expect(visualAssetState?.stylesheetUrl).toBeTruthy();
    expect(visualAssetState?.stylesheetCached).toBe(true);
    expect(visualAssetState?.imageUrl).toBeTruthy();
    expect(visualAssetState?.imageLoaded).toBe(true);
    await expect.poll(
      () => new URL(page.url()).pathname,
      { timeout: 45_000, intervals: [1_000] }
    ).not.toBe(initialPath);

    await page.waitForTimeout(1_500);
    const frozenSavedEpoch = await readActiveSavedEpoch(page);
    expect(frozenSavedEpoch).toBe(savedEpoch);

    await controlServer(runtime, "start");
    await expect.poll(
      async () => {
        try {
          return (await fetch(`${runtime.baseUrl}/health`)).ok;
        } catch {
          return false;
        }
      },
      { timeout: 30_000 }
    ).toBe(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForPlaybackShell(page);
  } finally {
    await context.close();
  }
});
