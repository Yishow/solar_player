import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import type { DisplayPageInstance } from "@solar-display/shared";
import { buildPlaybackFooterEntries, resolvePlaybackRouteMeta } from "../../app/playbackRouteMeta";
import { resolveDisplayPageRouteInstance } from "./displayPageRouteResolver";

const routeHostSource = readFileSync(path.join(import.meta.dirname, "displayPageRouteHost.tsx"), "utf8");
const registryHookSource = readFileSync(
  path.join(import.meta.dirname, "../../hooks/useDisplayPageRegistry.ts"),
  "utf8"
);
const layoutShellSource = readFileSync(path.join(import.meta.dirname, "../../layouts/LayoutShell.tsx"), "utf8");

function createPage(
  overrides: Partial<DisplayPageInstance> & Pick<DisplayPageInstance, "id" | "pageKey" | "route" | "routeSlug" | "templateKey">
): DisplayPageInstance {
  return {
    archivedAt: null,
    createdAt: "2026-05-20T00:00:00.000Z",
    displayNameEn: "Overview",
    displayNameZh: "總覽",
    displayOrder: 1,
    draftVersion: 1,
    durationSeconds: 15,
    enabled: true,
    hasDraftChanges: false,
    lastPublishedAt: "2026-05-20T00:00:00.000Z",
    liveVersion: 1,
    updatedAt: "2026-05-20T00:00:00.000Z",
    ...overrides
  };
}

test("display page route host resolves duplicate route slugs to the correct registry instance", () => {
  const registryPages: DisplayPageInstance[] = [
    {
      archivedAt: null,
      createdAt: "2026-05-20T00:00:00.000Z",
      displayOrder: 1,
      displayNameEn: "Overview",
      displayNameZh: "總覽",
      draftVersion: 1,
      durationSeconds: 15,
      enabled: true,
      hasDraftChanges: false,
      id: 1,
      lastPublishedAt: "2026-05-20T00:00:00.000Z",
      liveVersion: 1,
      pageKey: "overview",
      route: "/overview",
      routeSlug: "overview",
      templateKey: "overview"
      ,
      updatedAt: "2026-05-20T00:00:00.000Z"
    },
    {
      archivedAt: null,
      createdAt: "2026-05-20T00:00:00.000Z",
      displayOrder: 2,
      displayNameEn: "Images Secondary",
      displayNameZh: "綠能影像副本",
      draftVersion: 2,
      durationSeconds: 22,
      enabled: true,
      hasDraftChanges: false,
      id: 6,
      lastPublishedAt: "2026-05-20T00:00:00.000Z",
      liveVersion: 2,
      pageKey: "images-2",
      route: "/images-secondary",
      routeSlug: "images-secondary",
      templateKey: "images"
      ,
      updatedAt: "2026-05-20T00:00:00.000Z"
    },
    {
      archivedAt: "2026-05-20T01:00:00.000Z",
      createdAt: "2026-05-20T00:00:00.000Z",
      displayOrder: 3,
      displayNameEn: "Images Archived",
      displayNameZh: "綠能影像封存",
      draftVersion: null,
      durationSeconds: 18,
      enabled: false,
      hasDraftChanges: false,
      id: 7,
      lastPublishedAt: null,
      liveVersion: null,
      pageKey: "images-3",
      route: "/images-archived",
      routeSlug: "images-archived",
      templateKey: "images",
      updatedAt: "2026-05-20T01:00:00.000Z"
    }
  ];

  const resolved = resolveDisplayPageRouteInstance(registryPages, "/images-secondary");

  assert.equal(resolved?.pageKey, "images-2");
  assert.equal(resolved?.templateKey, "images");
  assert.equal(resolveDisplayPageRouteInstance(registryPages, "/images-archived"), null);
  assert.equal(resolveDisplayPageRouteInstance(registryPages, "/missing-page"), null);
});

test("display page route host consumes refreshed registry snapshots after display-pages mutations", () => {
  assert.match(registryHookSource, /useDisplaySyncRefresh\(load,\s*\["display-pages"\]\)/);
  assert.match(routeHostSource, /resolveDisplayPageRouteInstance\(registry\.pages, location\.pathname\)/);
});

test("display page route host drops archived routes once the registry snapshot refreshes", () => {
  const activeSnapshot: DisplayPageInstance[] = [
    {
      archivedAt: null,
      createdAt: "2026-05-20T00:00:00.000Z",
      displayOrder: 1,
      displayNameEn: "Images Secondary",
      displayNameZh: "綠能影像副本",
      draftVersion: 2,
      durationSeconds: 22,
      enabled: true,
      hasDraftChanges: false,
      id: 6,
      lastPublishedAt: "2026-05-20T00:00:00.000Z",
      liveVersion: 2,
      pageKey: "images-2",
      route: "/images-secondary",
      routeSlug: "images-secondary",
      templateKey: "images",
      updatedAt: "2026-05-20T00:00:00.000Z"
    }
  ];
  const refreshedSnapshot: DisplayPageInstance[] = [
    {
      ...activeSnapshot[0]!,
      archivedAt: "2026-05-20T01:00:00.000Z",
      enabled: false,
      lastPublishedAt: null,
      liveVersion: null,
      updatedAt: "2026-05-20T01:00:00.000Z"
    }
  ];

  assert.equal(resolveDisplayPageRouteInstance(activeSnapshot, "/images-secondary")?.pageKey, "images-2");
  assert.equal(resolveDisplayPageRouteInstance(refreshedSnapshot, "/images-secondary"), null);
});

test("refreshed registry snapshots update playback route metadata and footer order after slug or order changes", () => {
  const activeSnapshot: DisplayPageInstance[] = [
    createPage({
      id: 1,
      pageKey: "overview",
      route: "/overview",
      routeSlug: "overview",
      templateKey: "overview",
      displayOrder: 1
    }),
    createPage({
      id: 2,
      pageKey: "solar",
      route: "/solar",
      routeSlug: "solar",
      templateKey: "solar",
      displayNameEn: "Solar",
      displayNameZh: "太陽能",
      displayOrder: 2
    }),
    createPage({
      id: 3,
      pageKey: "overview-2",
      route: "/overview-campus",
      routeSlug: "overview-campus",
      templateKey: "overview",
      displayNameEn: "Overview Campus",
      displayNameZh: "校園總覽",
      displayOrder: 3
    })
  ];
  const disabledSnapshot: DisplayPageInstance[] = [
    activeSnapshot[0]!,
    activeSnapshot[1]!,
    {
      ...activeSnapshot[2]!,
      enabled: false,
      updatedAt: "2026-05-20T01:00:00.000Z"
    }
  ];
  const refreshedSnapshot: DisplayPageInstance[] = [
    createPage({
      id: 2,
      pageKey: "solar",
      route: "/solar",
      routeSlug: "solar",
      templateKey: "solar",
      displayNameEn: "Solar",
      displayNameZh: "太陽能",
      displayOrder: 1
    }),
    createPage({
      id: 3,
      pageKey: "overview-2",
      route: "/campus-overview",
      routeSlug: "campus-overview",
      templateKey: "overview",
      displayNameEn: "Campus Overview",
      displayNameZh: "校園總覽新版",
      displayOrder: 2
    }),
    createPage({
      id: 1,
      pageKey: "overview",
      route: "/overview",
      routeSlug: "overview",
      templateKey: "overview",
      displayOrder: 3
    })
  ];

  assert.deepEqual(buildPlaybackFooterEntries(activeSnapshot).map((entry) => entry.path), [
    "/overview",
    "/solar",
    "/overview-campus"
  ]);
  assert.deepEqual(buildPlaybackFooterEntries(refreshedSnapshot).map((entry) => entry.path), [
    "/solar",
    "/campus-overview",
    "/overview"
  ]);
  assert.equal(resolveDisplayPageRouteInstance(refreshedSnapshot, "/overview-campus"), null);
  assert.equal(resolveDisplayPageRouteInstance(refreshedSnapshot, "/campus-overview")?.pageKey, "overview-2");
  assert.equal(resolvePlaybackRouteMeta("/overview-campus", refreshedSnapshot).source, "fallback");
  assert.equal(resolvePlaybackRouteMeta("/campus-overview", refreshedSnapshot).navLabel, "校園總覽新版");
  assert.equal(resolvePlaybackRouteMeta("/campus-overview", refreshedSnapshot).matchedPath, "/campus-overview");
  assert.equal(resolveDisplayPageRouteInstance(disabledSnapshot, "/overview-campus"), null);
  assert.deepEqual(buildPlaybackFooterEntries(disabledSnapshot).map((entry) => entry.path), ["/overview", "/solar"]);
});

test("registry-backed shell consumers converge through snapshot refresh without forcing a full browser reload", () => {
  assert.match(registryHookSource, /useDisplaySyncRefresh\(load,\s*\["display-pages"\]\)/);
  assert.doesNotMatch(routeHostSource, /window\.location\.reload|location\.reload/);
  assert.doesNotMatch(layoutShellSource, /window\.location\.reload|location\.reload/);
});
