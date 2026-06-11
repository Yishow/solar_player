import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import type { DisplayPageConfigEnvelope, DisplayPageInstance } from "@solar-display/shared";
import {
  loadLiveDisplayPagePreviewCatalog,
  resolvePreviewCatalogRequestKey
} from "./liveDisplayPagePreviewCatalogLoader";
import type { LiveDisplayPagePreviewRegistryEntry } from "./liveDisplayPagePreviewRegistry";
import { createConfigUnavailableLiveDisplayPagePreviewStates } from "./liveDisplayPagePreviewState";

const previewCatalogSource = fs.readFileSync(
  path.join(import.meta.dirname, "useLiveDisplayPagePreviewCatalog.ts"),
  "utf8"
);
const previewCatalogLoaderSource = fs.readFileSync(
  path.join(import.meta.dirname, "liveDisplayPagePreviewCatalogLoader.ts"),
  "utf8"
);

test("live preview catalog loads page-instance state from the active registry instead of static template keys", () => {
  assert.match(previewCatalogSource, /loadLiveDisplayPagePreviewCatalog\(/);
  assert.match(previewCatalogLoaderSource, /loadDisplayPageRegistrySnapshot\(\{\s*force\s*\}\)/);
  assert.match(previewCatalogLoaderSource, /buildLiveDisplayPagePreviewStates\(/);
  assert.match(previewCatalogLoaderSource, /loadDisplayPageConfigEnvelope\(pageKey,\s*"live",\s*\{\s*force\s*\}\)/);
  assert.match(previewCatalogSource, /useCallback\(\s*\(\) => load\(\{\s*force:\s*true\s*\}\)/);
  assert.match(
    previewCatalogSource,
    /useDisplaySyncRefresh\(\s*handleDisplaySyncRefresh,\s*enabled \? displayPagePreviewSyncScopes : noDisplayPagePreviewSyncScopes\s*\)/
  );
  assert.doesNotMatch(previewCatalogSource, /displayPageKeys\.map\(async \(pageKey\)/);
});

test("live preview catalog request key ignores visible-window order churn", () => {
  const baselineKey = resolvePreviewCatalogRequestKey(["solar", "overview", "solar"]);

  assert.equal(baselineKey, resolvePreviewCatalogRequestKey(["overview", "solar"]));
  assert.equal(baselineKey, resolvePreviewCatalogRequestKey(["solar", "overview"]));
  assert.notEqual(baselineKey, resolvePreviewCatalogRequestKey(["overview", "images"]));
  assert.notEqual(baselineKey, resolvePreviewCatalogRequestKey(["overview"]));
});

function createPage(overrides: Partial<DisplayPageInstance> = {}): DisplayPageInstance {
  return {
    archivedAt: null,
    createdAt: "2026-06-10T00:00:00.000Z",
    displayNameEn: "Overview",
    displayNameZh: "總覽",
    displayOrder: 1,
    draftVersion: 1,
    durationSeconds: 15,
    enabled: true,
    hasDraftChanges: false,
    id: 1,
    lastPublishedAt: "2026-06-10T00:00:00.000Z",
    liveVersion: 1,
    pageKey: "overview",
    route: "/overview",
    routeSlug: "overview",
    templateKey: "overview",
    updatedAt: "2026-06-10T00:00:00.000Z",
    ...overrides
  };
}

function createEnvelope(
  pageId = "overview",
  regions: Record<string, unknown> = {
    hero: {
      headline: "正式總覽"
    }
  }
): DisplayPageConfigEnvelope<Record<string, unknown>> {
  return {
    pageId,
    publishedAt: "2026-06-10T00:00:00.000Z",
    regions,
    updatedAt: null,
    version: 1
  };
}

const definitions: LiveDisplayPagePreviewRegistryEntry[] = [
  {
    createSeedConfig: () => ({
      hero: {
        headline: "seed"
      }
    }),
    id: "overview",
    label: "Overview",
    renderPreview: () => React.createElement("div")
  }
];

test("live preview catalog loader emits loading states before final config states", async () => {
  let loadingStatus = "";

  const catalog = await loadLiveDisplayPagePreviewCatalog({
    definitions,
    onLoadingStates: (states) => {
      loadingStatus = states.overview?.status ?? "";
    },
    readLiveConfig: async () => createEnvelope(),
    readRegistry: async () => [createPage()]
  });

  assert.equal(loadingStatus, "loading");
  assert.equal(catalog.loadingStates.overview?.status, "loading");
  assert.equal(catalog.states.overview?.status, "ready");
});

test("live preview catalog loader resolves requested visible keys before deferred keys", async () => {
  let markDeferredStarted!: () => void;
  const deferredStarted = new Promise<void>((resolve) => {
    markDeferredStarted = resolve;
  });
  let finishDeferred!: () => void;
  const deferredRelease = new Promise<void>((resolve) => {
    finishDeferred = resolve;
  });
  let visibleStatus = "";
  let deferredStatus = "";

  const catalogPromise = loadLiveDisplayPagePreviewCatalog({
    definitions,
    requestedPageKeys: ["overview"],
    onResolvedStates: (states) => {
      visibleStatus = states.overview?.status ?? "";
      deferredStatus = states.solar?.status ?? "";
    },
    readLiveConfig: async (pageKey) => {
      if (pageKey === "solar") {
        markDeferredStarted();
        await deferredRelease;
      }

      return createEnvelope(pageKey);
    },
    readRegistry: async () => [
      createPage(),
      createPage({
        displayNameEn: "Solar",
        displayNameZh: "太陽能",
        displayOrder: 2,
        id: 2,
        pageKey: "solar",
        route: "/solar",
        routeSlug: "solar",
        templateKey: "overview"
      })
    ]
  });

  await deferredStarted;

  assert.equal(visibleStatus, "ready");
  assert.equal(deferredStatus, "loading");

  finishDeferred();
  const catalog = await catalogPromise;

  assert.equal(catalog.states.overview?.status, "ready");
  assert.equal(catalog.states.solar?.status, "ready");
});

test("live preview catalog loader keeps deferred preview failures isolated", async () => {
  const catalog = await loadLiveDisplayPagePreviewCatalog({
    definitions,
    requestedPageKeys: ["overview"],
    readLiveConfig: async (pageKey) => {
      if (pageKey === "solar") {
        throw new Error("solar preview unavailable");
      }

      return createEnvelope(pageKey);
    },
    readRegistry: async () => [
      createPage(),
      createPage({
        displayNameEn: "Solar",
        displayNameZh: "太陽能",
        displayOrder: 2,
        id: 2,
        pageKey: "solar",
        route: "/solar",
        routeSlug: "solar",
        templateKey: "overview"
      })
    ]
  });

  assert.equal(catalog.states.overview?.status, "ready");
  assert.equal(catalog.states.solar?.status, "config-unavailable");
});

test("live preview catalog loader reuses warm deferred states while visible keys refresh", async () => {
  let visibleSolarStatus = "";

  const catalog = await loadLiveDisplayPagePreviewCatalog({
    definitions,
    previousStates: {
      solar: {
        config: {
          hero: {
            headline: "warm solar"
          }
        },
        status: "ready"
      }
    },
    requestedPageKeys: ["overview"],
    onResolvedStates: (states) => {
      visibleSolarStatus = states.solar?.status ?? "";
    },
    readLiveConfig: async (pageKey) => createEnvelope(pageKey),
    readRegistry: async () => [
      createPage(),
      createPage({
        displayNameEn: "Solar",
        displayNameZh: "太陽能",
        displayOrder: 2,
        id: 2,
        pageKey: "solar",
        route: "/solar",
        routeSlug: "solar",
        templateKey: "overview"
      })
    ]
  });

  assert.equal(visibleSolarStatus, "ready");
  assert.equal(catalog.loadingStates.solar?.status, "ready");
  assert.equal(catalog.states.solar?.status, "ready");
});

test("live preview catalog loader preserves duplicate instance identity in the visible window", async () => {
  const catalog = await loadLiveDisplayPagePreviewCatalog({
    definitions,
    requestedPageKeys: ["overview", "overview-2"],
    readLiveConfig: async (pageKey) =>
      createEnvelope(pageKey, {
        hero: {
          headline: `${pageKey} live headline`
        }
      }),
    readRegistry: async () => [
      createPage(),
      createPage({
        displayNameEn: "Campus Overview",
        displayNameZh: "校園總覽",
        displayOrder: 2,
        id: 2,
        pageKey: "overview-2",
        route: "/overview-campus",
        routeSlug: "overview-campus",
        templateKey: "overview"
      })
    ]
  });

  assert.equal(catalog.states.overview?.status, "ready");
  assert.equal(catalog.states["overview-2"]?.status, "ready");
  if (catalog.states.overview?.status === "ready" && catalog.states["overview-2"]?.status === "ready") {
    assert.notEqual(catalog.states.overview.config, catalog.states["overview-2"].config);
    assert.equal((catalog.states.overview.config.hero as { headline: string }).headline, "overview live headline");
    assert.equal((catalog.states["overview-2"].config.hero as { headline: string }).headline, "overview-2 live headline");
  }
});

test("live preview catalog can represent registry failures without clearing slideshow cards", () => {
  const states = createConfigUnavailableLiveDisplayPagePreviewStates(
    ["overview", "solar"],
    "registry unavailable"
  );

  assert.equal(states.overview?.status, "config-unavailable");
  assert.equal(states.overview?.detail, "registry unavailable");
  assert.equal(states.solar?.status, "config-unavailable");
});
