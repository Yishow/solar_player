import { unlinkSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  apiJson,
  expect,
  test,
  TINY_PNG_BYTES,
  waitForLiveMetricValue,
  waitForPlaybackShell
} from "./fixtures/runtime";

type DraftEnvelope = {
  freeformObjects?: unknown[];
  regions: Record<string, unknown>;
  version: number;
};

type ImageAsset = {
  filename: string;
  id: number;
  title: string | null;
};

test.describe.configure({ mode: "serial" });

test("unpaired playback pages receive server time and keep all five shells renderable", async ({ page }) => {
  for (const route of ["/overview", "/solar", "/factory-circuit", "/images", "/sustainability"]) {
    await page.goto(`${route}?autoplay=0`, { waitUntil: "domcontentloaded" });
    await waitForPlaybackShell(page);
    await expect(page.locator("[data-time-state]")).toHaveAttribute("data-time-state", "synced", {
      timeout: 10_000
    });
    await expect(page.locator("body.page-hero-shell")).toBeVisible();
  }
});

test("draft conflict and publish refresh journey", async ({ browser, api, runtime }) => {
  const marker = `SMOKE-PUBLISH-${runtime.runId.slice(-10)}`;
  const editorA = await browser.newContext({ baseURL: runtime.baseUrl });
  const editorB = await browser.newContext({ baseURL: runtime.baseUrl });
  const playback = await browser.newContext({ baseURL: runtime.baseUrl });
  const pageA = await editorA.newPage();
  const pageB = await editorB.newPage();
  const playbackPage = await playback.newPage();

  try {
    // Two management contexts open the editor surface (router path).
    await pageA.goto("/display-pages/editor?pageId=overview", { waitUntil: "domcontentloaded" });
    await pageB.goto("/display-pages/editor?pageId=overview", { waitUntil: "domcontentloaded" });
    await expect(pageA).toHaveURL(/display-pages\/editor/);
    await expect(pageB).toHaveURL(/display-pages\/editor/);

    const draftRead = await apiJson<{ config: DraftEnvelope }>(api, "GET", "/api/display-pages/overview/draft");
    const baseVersion = draftRead.body.config.version;
    const baseRegions = draftRead.body.config.regions ?? {};

    const firstSave = await apiJson<{ config: DraftEnvelope }>(api, "PUT", "/api/display-pages/overview/draft", {
      data: {
        baseVersion,
        freeformObjects: draftRead.body.config.freeformObjects ?? [],
        regions: {
          ...baseRegions,
          heroCopy: {
            ...((baseRegions.heroCopy as Record<string, unknown> | undefined) ?? {}),
            eyebrow: `${marker}-A`
          }
        }
      }
    });
    expect(firstSave.body.config.version).toBe(baseVersion + 1);

    // Stale save from the second session must surface the explicit conflict state.
    const staleSave = await apiJson<{
      code?: string;
      conflict?: { baseVersion: number; currentVersion: number };
      success?: boolean;
    }>(api, "PUT", "/api/display-pages/overview/draft", {
      data: {
        baseVersion,
        freeformObjects: draftRead.body.config.freeformObjects ?? [],
        regions: {
          ...baseRegions,
          heroCopy: {
            ...((baseRegions.heroCopy as Record<string, unknown> | undefined) ?? {}),
            eyebrow: `${marker}-STALE`
          }
        }
      },
      expectedStatuses: [409]
    });
    expect(staleSave.status).toBe(409);
    expect(staleSave.body.code).toBe("management_draft_conflict");
    expect(staleSave.body.conflict?.baseVersion).toBe(baseVersion);
    expect(staleSave.body.conflict?.currentVersion).toBe(firstSave.body.config.version);

    // Reload latest draft, save resolved value, publish.
    const latestDraft = await apiJson<{ config: DraftEnvelope }>(
      api,
      "GET",
      "/api/display-pages/overview/draft"
    );
    const resolvedSave = await apiJson<{ config: DraftEnvelope }>(
      api,
      "PUT",
      "/api/display-pages/overview/draft",
      {
        data: {
          baseVersion: latestDraft.body.config.version,
          freeformObjects: latestDraft.body.config.freeformObjects ?? [],
          regions: {
            ...latestDraft.body.config.regions,
            heroCopy: {
              ...((latestDraft.body.config.regions.heroCopy as Record<string, unknown> | undefined) ?? {}),
              eyebrow: marker
            }
          }
        }
      }
    );
    expect(resolvedSave.body.config.version).toBeGreaterThan(latestDraft.body.config.version);

    const publish = await apiJson<{
      config: { stage?: string };
      validation: { canPublish: boolean };
    }>(api, "POST", "/api/display-pages/overview/publish", {
      data: { publishedBy: "browser-smoke" }
    });
    expect(publish.body.validation.canPublish).toBe(true);

    // Playback observes the published value via real Socket/display-sync + live config path.
    await playbackPage.goto("/overview?autoplay=0", { waitUntil: "domcontentloaded" });
    await waitForPlaybackShell(playbackPage);
    await expect(playbackPage.locator(".overview-eyebrow")).toContainText(marker, {
      timeout: 25_000
    });
  } finally {
    await editorA.close();
    await editorB.close();
    await playback.close();
  }
});

test("image governance and fallback journey", async ({ page, api, runtime }) => {
  const title = `smoke-image-${runtime.runId.slice(-8)}`;

  const upload = await apiJson<{
    data: ImageAsset;
    success: boolean;
  }>(api, "POST", "/api/images", {
    multipart: {
      category: "background",
      file: {
        name: `${title}.png`,
        mimeType: "image/png",
        buffer: TINY_PNG_BYTES
      },
      includedInSlideshow: "true",
      usageScope: "both"
    },
    expectedStatuses: [201]
  });
  expect(upload.body.success).toBe(true);
  const asset = upload.body.data;
  expect(asset.id).toBeTruthy();
  expect(asset.filename).toBeTruthy();

  // Ensure playlist governance includes the asset as playable.
  await apiJson(api, "POST", "/api/image-playlist/governance/bootstrap", {
    expectedStatuses: [200]
  });

  const playlistBefore = await apiJson<{
    playlist: {
      entries: Array<{
        assetId: string | null;
        entryId: string;
        fallbackActive: boolean;
        hasAsset: boolean;
        isPlayable: boolean;
        title?: string | null;
      }>;
    };
  }>(api, "GET", "/api/image-playlist");

  const entry = playlistBefore.body.playlist.entries.find(
    (item) => item.assetId === String(asset.id)
  );
  expect(entry, "uploaded asset should appear in playlist runtime").toBeTruthy();
  expect(entry?.isPlayable).toBe(true);
  expect(entry?.hasAsset).toBe(true);

  await page.goto("/images?autoplay=0", { waitUntil: "domcontentloaded" });
  await waitForPlaybackShell(page);

  // Images stage shows the uploaded asset (img present, not blank placeholder-only shell).
  await expect
    .poll(async () => page.locator(".images-main-stage img").count(), { timeout: 20_000 })
    .toBeGreaterThan(0);
  await expect(page.locator(".images-main-stage img").first()).toBeVisible();

  // Remove the isolated upload file so runtime reports missing/pending asset.
  const filePath = path.join(runtime.uploadsDir, asset.filename);
  expect(existsSync(filePath)).toBe(true);
  unlinkSync(filePath);
  expect(existsSync(filePath)).toBe(false);

  // Confirm remaining files under isolated uploads still do not include the deleted asset.
  const remaining = readdirSync(runtime.uploadsDir);
  expect(remaining.includes(asset.filename)).toBe(false);

  // Force playlist re-read via navigation; fallback stage must remain visible (not broken/blank).
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForPlaybackShell(page);

  await expect
    .poll(async () => {
      const placeholder = page.locator(".images-main-placeholder");
      if ((await placeholder.count()) > 0 && (await placeholder.first().isVisible())) {
        return "placeholder";
      }
      const img = page.locator(".images-main-stage img");
      if ((await img.count()) > 0) {
        // If an img remains, it should not be a permanent broken empty stage —
        // naturalWidth 0 with no fallback would be broken; require either loaded img or placeholder.
        const naturalWidth = await img.first().evaluate((node) => (node as HTMLImageElement).naturalWidth);
        return naturalWidth > 0 ? "image" : "broken-image";
      }
      return "empty";
    }, { timeout: 20_000 })
    .toMatch(/placeholder|image/);

  await expect(page.locator(".images-main-stage")).toBeVisible();
  await expect(page.locator("body.page-hero-shell")).toBeVisible();

  // Prefer explicit fallback copy when placeholder is active.
  const placeholder = page.locator(".images-main-placeholder");
  if ((await placeholder.count()) > 0 && (await placeholder.first().isVisible())) {
    await expect(placeholder).toContainText(/等待圖片素材|圖片缺漏|可播放圖片/);
  }
});

test("data-mode readiness and live refresh journey", async ({ page, api }) => {
  // Switch to deterministic mock mode via management API (observable contract).
  const settings = await apiJson<{
    readiness: { summary?: { playableCount?: number } };
    settings: { dataMode: string };
    status: { reason?: string | null };
  }>(api, "PUT", "/api/settings/mqtt", {
    data: {
      dataMode: "mock"
    }
  });
  expect(settings.body.settings.dataMode).toBe("mock");

  const readiness = await apiJson<{
    readiness: {
      findings: unknown[];
      summary: {
        blockingCount: number;
        playableCount?: number;
        warningCount: number;
      };
    };
  }>(api, "GET", "/api/display-readiness");
  expect(readiness.body.readiness.summary).toBeTruthy();
  expect(typeof readiness.body.readiness.summary.blockingCount).toBe("number");

  const rotation = await apiJson<{
    rotationPlan: {
      pages: Array<{
        enabled: boolean;
        pageKey: string;
        skipReason?: string | null;
      }>;
    };
  }>(api, "GET", "/api/playback/rotation-plan");
  expect(rotation.body.rotationPlan.pages.length).toBeGreaterThan(0);
  const enabledPages = rotation.body.rotationPlan.pages.filter((pageItem) => pageItem.enabled);
  expect(enabledPages.length).toBeGreaterThan(0);

  const liveMetrics = await apiJson<{
    metrics: Record<string, { value: number }>;
    timestamp: string | null;
  }>(api, "GET", "/api/metrics/live");
  // Mock feed writes on startup when MQTT_DATA_MODE=mock; values must be present.
  expect(liveMetrics.body.metrics.realTimePower?.value).toEqual(expect.any(Number));

  await page.goto("/overview?autoplay=0", { waitUntil: "domcontentloaded" });
  await waitForPlaybackShell(page);

  const firstValue = await waitForLiveMetricValue(page);
  expect(firstValue).toMatch(/\d/);

  // Force a subsequent refresh path: reload keeps shell and re-bootstraps live metrics from REST.
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForPlaybackShell(page);
  const secondValue = await waitForLiveMetricValue(page);
  expect(secondValue).toMatch(/\d/);
});

test("playback survives reload and socket reconnect", async ({ page }) => {
  await page.goto("/overview?autoplay=0", { waitUntil: "domcontentloaded" });
  await waitForPlaybackShell(page);
  const beforeReload = await waitForLiveMetricValue(page);
  expect(beforeReload).toMatch(/\d/);

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForPlaybackShell(page);
  await waitForLiveMetricValue(page);

  // Observe the Socket.IO transport at the Playwright WebSocket layer so the
  // reconnect assertion can verify the socket itself, not the REST bootstrap at
  // /api/metrics/live. The server emits `mqtt:status` + `liveMetrics:update` to
  // every socket on connection (apps/server/src/realtime/SocketService.ts), so a
  // reconnected socket always receives a fresh server->client frame immediately.
  const socketFramesReceivedAt: number[] = [];
  page.on("websocket", (socket) => {
    socket.on("framereceived", () => {
      socketFramesReceivedAt.push(Date.now());
    });
  });

  // The transport drop is performed by the Playwright context offline flip below;
  // no in-page socket manipulation is needed (the app keeps its socket.io client
  // in module scope and does not expose it on `window`, so reaching/closing it
  // from page.evaluate is neither possible nor reliable).

  // Drop the Socket.IO transport once without restarting the application.
  await page.context().setOffline(true);

  // Confirm the network actually went offline (observable, bounded) before
  // restoring it — instead of an arbitrary fixed sleep below the client's
  // reconnectionDelay of 1500ms (apps/web/src/services/socket.ts).
  await expect
    .poll(async () => page.evaluate(() => navigator.onLine), { timeout: 10_000 })
    .toBe(false);

  await expect(page.locator("body.page-hero-shell")).toBeVisible();
  await expect(page.locator("#root")).not.toBeEmpty();
  // Shell stays mounted during recovery (no application restart / blank root).

  const framesBeforeRestore = socketFramesReceivedAt.length;
  await page.context().setOffline(false);

  await waitForPlaybackShell(page);

  // Reconnect assertion: wait for a server->client frame delivered over the
  // reconnected Socket.IO WebSocket transport. A regression that only keeps REST
  // alive (e.g. reconnection disabled, or the io reconnect handlers removed)
  // cannot produce a WebSocket frame, so this genuinely verifies socket reconnect
  // resuming live updates rather than a cached/REST value.
  await expect
    .poll(async () => socketFramesReceivedAt.length, {
      message: "Socket.IO transport delivered a fresh frame after reconnect",
      timeout: 20_000
    })
    .toBeGreaterThan(framesBeforeRestore);

  const afterReconnect = await waitForLiveMetricValue(page);
  expect(afterReconnect).toMatch(/\d/);
  await expect(page.locator("body.page-hero-shell")).toBeVisible();
  // Same document session after reconnect (no full app navigation away from overview).
  await expect(page).toHaveURL(/\/overview/);
});
