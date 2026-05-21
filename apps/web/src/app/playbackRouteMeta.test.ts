import assert from "node:assert/strict";
import test from "node:test";
import type { DisplayPageInstance } from "@solar-display/shared";
import { resolvePlaybackRouteMeta } from "./playbackRouteMeta";

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

test("resolvePlaybackRouteMeta uses duplicate instance metadata for registry-backed playback routes", () => {
  const pages: DisplayPageInstance[] = [
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

  const resolved = resolvePlaybackRouteMeta("/overview-campus", pages);

  assert.equal(resolved.path, "/overview-campus");
  assert.equal(resolved.navLabel, "校園總覽");
  assert.equal(resolved.title, "校園總覽");
  assert.equal(resolved.subtitle, "Overview Campus");
  assert.equal(resolved.order, 2);
  assert.equal(resolved.group, "playback");
  assert.equal(resolved.allowOfflineWhenDisconnected, true);
});

test("resolvePlaybackRouteMeta resolves custom slug instances without falling back to the canonical path", () => {
  const pages: DisplayPageInstance[] = [
    createPage({
      id: 4,
      pageKey: "images",
      route: "/images-gallery",
      routeSlug: "images-gallery",
      templateKey: "images",
      displayNameEn: "Images Gallery",
      displayNameZh: "圖像展區",
      displayOrder: 4
    })
  ];

  const resolved = resolvePlaybackRouteMeta("/images-gallery", pages);

  assert.equal(resolved.path, "/images-gallery");
  assert.equal(resolved.navLabel, "圖像展區");
  assert.equal(resolved.title, "圖像展區");
  assert.equal(resolved.subtitle, "Images Gallery");
  assert.notEqual(resolved.path, "/images");
});

test("resolvePlaybackRouteMeta falls back to the canonical overview metadata for unknown playback slugs", () => {
  const pages: DisplayPageInstance[] = [
    createPage({
      id: 1,
      pageKey: "overview",
      route: "/overview",
      routeSlug: "overview",
      templateKey: "overview"
    })
  ];

  const resolved = resolvePlaybackRouteMeta("/missing-playback-page", pages);

  assert.equal(resolved.path, "/overview");
  assert.equal(resolved.navLabel, "總覽");
  assert.equal(resolved.title, "總覽頁");
  assert.equal(resolved.subtitle, "Overview");
});
