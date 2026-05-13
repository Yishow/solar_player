import assert from "node:assert/strict";
import test from "node:test";
import { routeMetaMap, type RouteMeta } from "../app/routeMeta";
import { shouldRedirectToOffline } from "./offlineRouting";

const disconnectedStatus = {
  connected: false,
  reason: "offline"
};

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
    order: 999
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
