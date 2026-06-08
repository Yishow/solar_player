import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import type { DisplayPageConfigEnvelope, DisplayPageInstance } from "@solar-display/shared";
import {
  buildLiveDisplayPagePreviewState,
  buildLiveDisplayPagePreviewStates,
  resolveLiveDisplayPagePreviewState
} from "./liveDisplayPagePreviewState";
import type { LiveDisplayPagePreviewRegistryEntry } from "./liveDisplayPagePreviewRegistry";

function createPage(
  overrides: Partial<DisplayPageInstance> & Pick<DisplayPageInstance, "id" | "pageKey" | "route" | "routeSlug" | "templateKey">
): DisplayPageInstance {
  return {
    archivedAt: null,
    createdAt: "2026-05-22T00:00:00.000Z",
    displayNameEn: "Overview",
    displayNameZh: "總覽",
    displayOrder: 1,
    draftVersion: 1,
    durationSeconds: 15,
    enabled: true,
    hasDraftChanges: false,
    lastPublishedAt: "2026-05-22T00:00:00.000Z",
    liveVersion: 1,
    updatedAt: "2026-05-22T00:00:00.000Z",
    ...overrides
  };
}

function createEnvelope(headline: string): DisplayPageConfigEnvelope<Record<string, unknown>> {
  return {
    pageId: "overview",
    publishedAt: "2026-05-22T00:00:00.000Z",
    regions: {
      hero: {
        headline
      }
    },
    updatedAt: null,
    version: 3
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

test("buildLiveDisplayPagePreviewStates keeps duplicate template instances in separate preview states", async () => {
  const pages = [
    createPage({
      id: 1,
      pageKey: "overview",
      route: "/overview",
      routeSlug: "overview",
      templateKey: "overview"
    }),
    createPage({
      id: 2,
      pageKey: "overview-2",
      route: "/overview-campus",
      routeSlug: "overview-campus",
      templateKey: "overview",
      displayNameEn: "Overview Campus",
      displayNameZh: "校園總覽",
      displayOrder: 2
    })
  ];

  const states = await buildLiveDisplayPagePreviewStates({
    definitions,
    pages,
    readLiveConfig: async (pageKey) =>
      pageKey === "overview" ? createEnvelope("總覽主頁 Hero") : createEnvelope("校園總覽 Hero")
  });

  const primary = resolveLiveDisplayPagePreviewState("overview", states);
  const duplicate = resolveLiveDisplayPagePreviewState("overview-2", states);

  assert.equal(primary.status, "ready");
  assert.equal(duplicate.status, "ready");
  assert.notEqual(primary, duplicate);
  if (primary.status === "ready" && duplicate.status === "ready") {
    assert.notEqual(primary.config, duplicate.config);
    assert.equal((primary.config.hero as { headline: string }).headline, "總覽主頁 Hero");
    assert.equal((duplicate.config.hero as { headline: string }).headline, "校園總覽 Hero");
  }
});

test("buildLiveDisplayPagePreviewStates keeps ready, unpublished, and asset-unavailable instances separate", async () => {
  const pages = [
    createPage({
      id: 1,
      pageKey: "overview",
      route: "/overview",
      routeSlug: "overview",
      templateKey: "overview"
    }),
    createPage({
      id: 2,
      pageKey: "overview-2",
      route: "/overview-campus",
      routeSlug: "overview-campus",
      templateKey: "overview",
      displayNameEn: "Overview Campus",
      displayNameZh: "校園總覽",
      displayOrder: 2
    }),
    createPage({
      id: 3,
      pageKey: "overview-3",
      route: "/overview-plaza",
      routeSlug: "overview-plaza",
      templateKey: "overview",
      displayNameEn: "Overview Plaza",
      displayNameZh: "廣場總覽",
      displayOrder: 3
    })
  ];

  const states = await buildLiveDisplayPagePreviewStates({
    definitions,
    pages,
    readLiveConfig: async (pageKey) => {
      if (pageKey === "overview") {
        return createEnvelope("總覽主頁 Hero");
      }

      if (pageKey === "overview-2") {
        return {
          ...createEnvelope("校園總覽 Hero"),
          publishedAt: null
        };
      }

      return {
        ...createEnvelope("廣場總覽 Hero"),
        assetFindings: [
          {
            assetId: null,
            bindingId: "hero.media",
            message: "缺少 live hero asset",
            pageId: "overview-3",
            reason: "missing-asset",
            status: "unhealthy"
          }
        ]
      };
    }
  });

  assert.equal(resolveLiveDisplayPagePreviewState("overview", states).status, "ready");
  assert.equal(resolveLiveDisplayPagePreviewState("overview-2", states).status, "unpublished");
  assert.equal(resolveLiveDisplayPagePreviewState("overview-3", states).status, "asset-unavailable");
  assert.equal(resolveLiveDisplayPagePreviewState("overview-404", states).status, "loading");
});

test("buildLiveDisplayPagePreviewState uses localized fallback copy", () => {
  const missingRenderer = buildLiveDisplayPagePreviewState({});
  assert.equal(missingRenderer.status, "renderer-unavailable");
  assert.equal(missingRenderer.detail, "目前沒有可用的展示頁預覽元件。");

  const unpublished = buildLiveDisplayPagePreviewState({
    definition: definitions[0],
    envelope: {
      ...createEnvelope("總覽主頁 Hero"),
      publishedAt: null
    }
  });
  assert.equal(unpublished.status, "unpublished");
  assert.equal(unpublished.detail, "此展示頁尚未發布到正式版。");
});
