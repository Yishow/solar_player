import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import type { DisplayPageConfigEnvelope, DisplayPageInstance } from "@solar-display/shared";
import { loadLiveDisplayPagePreviewCatalog } from "./liveDisplayPagePreviewCatalogLoader";
import type { LiveDisplayPagePreviewRegistryEntry } from "./liveDisplayPagePreviewRegistry";

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
  assert.match(previewCatalogSource, /useDisplaySyncRefresh\(\(\) => load\(\{\s*force:\s*true\s*\}\),\s*enabled \? \["display-pages"\] : \[\]\)/);
  assert.doesNotMatch(previewCatalogSource, /displayPageKeys\.map\(async \(pageKey\)/);
});

function createPage(): DisplayPageInstance {
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
    updatedAt: "2026-06-10T00:00:00.000Z"
  };
}

function createEnvelope(): DisplayPageConfigEnvelope<Record<string, unknown>> {
  return {
    pageId: "overview",
    publishedAt: "2026-06-10T00:00:00.000Z",
    regions: {
      hero: {
        headline: "正式總覽"
      }
    },
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
