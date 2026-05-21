import assert from "node:assert/strict";
import test from "node:test";
import type { DisplayPageInstance } from "@solar-display/shared";
import { routeMetaMap, type RouteMeta } from "../app/routeMeta";
import { resolvePlaybackRouteMeta } from "../app/playbackRouteMeta";
import { shouldRedirectToOffline } from "./offlineRouting";

const disconnectedStatus = {
  connected: false,
  reason: "offline"
};

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

test("playback routes marked as offline-capable stay accessible when mqtt is offline", () => {
  const offlineCapablePlaybackRoutes = [
    "/overview",
    "/solar",
    "/factory-circuit",
    "/images",
    "/sustainability"
  ];

  for (const path of offlineCapablePlaybackRoutes) {
    const routeMeta = routeMetaMap.get(path);
    assert.ok(routeMeta, `expected route meta for ${path}`);
    assert.equal(
      shouldRedirectToOffline({
        isHydrated: true,
        pathname: path,
        routeMeta,
        status: disconnectedStatus
      }),
      false
    );
  }
});

test("playback routes without offline fallback still redirect when mqtt is offline", () => {
  const routeMeta: RouteMeta = {
    path: "/requires-live-data",
    navLabel: "即時頁",
    title: "即時頁",
    subtitle: "Live Data",
    group: "playback",
    order: 999,
    shellDensity: "playback"
  };

  assert.equal(
    shouldRedirectToOffline({
      isHydrated: true,
      pathname: routeMeta.path,
      routeMeta,
      status: disconnectedStatus
    }),
    true
  );
});

test("playback routes redirect to offline when rotation preview reports no playable pages", () => {
  const routeMeta = routeMetaMap.get("/overview");
  assert.ok(routeMeta);

  assert.equal(
    shouldRedirectToOffline({
      isHydrated: true,
      pathname: "/overview",
      rotation: {
        fallbackRoute: "/offline",
        hasPlayablePages: false
      },
      routeMeta,
      status: {
        connected: true,
        reason: "connected"
      }
    }),
    true
  );
});

test("rotation eligibility takes precedence over raw mqtt disconnect state once preview is available", () => {
  const routeMeta: RouteMeta = {
    path: "/requires-live-data",
    navLabel: "即時頁",
    title: "即時頁",
    subtitle: "Live Data",
    group: "playback",
    order: 999,
    shellDensity: "playback"
  };

  assert.equal(
    shouldRedirectToOffline({
      isHydrated: true,
      pathname: routeMeta.path,
      rotation: {
        fallbackRoute: null,
        hasPlayablePages: true
      },
      routeMeta,
      status: disconnectedStatus
    }),
    false
  );
});

test("registry-backed playback routes keep their playback offline eligibility after resolving custom slugs", () => {
  const routeMeta = resolvePlaybackRouteMeta("/overview-campus", [
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
  ]);

  assert.equal(
    shouldRedirectToOffline({
      isHydrated: true,
      pathname: "/overview-campus",
      routeMeta,
      status: disconnectedStatus
    }),
    false
  );
});
