import assert from "node:assert/strict";
import test from "node:test";
import {
  filterVisibleManagementRoutes,
  getConfiguredHiddenManagementRoutePaths,
  getManagementRouteRedirectPath,
  isManagementRouteHidden,
  resolveHiddenManagementRoutePaths
} from "./managementRouteVisibility";
import { routeMetaList } from "./routeMeta";

test("resolveHiddenManagementRoutePaths keeps only known management routes from env input", () => {
  const hiddenPaths = resolveHiddenManagementRoutePaths(
    " /trends, ,/history,,/trends,/overview,/unknown "
  );

  assert.deepEqual([...hiddenPaths], ["/trends", "/history"]);
  assert.equal(hiddenPaths.has("/overview"), false);
  assert.equal(hiddenPaths.has("/unknown"), false);
});

test("getConfiguredHiddenManagementRoutePaths defaults to hidden trends and history unless env is explicit", () => {
  assert.deepEqual([...getConfiguredHiddenManagementRoutePaths()], ["/trends", "/history"]);
  assert.deepEqual([...getConfiguredHiddenManagementRoutePaths("")], []);
  assert.deepEqual([...getConfiguredHiddenManagementRoutePaths("/history")], ["/history"]);
});

test("isManagementRouteHidden matches normalized management paths exactly", () => {
  const hiddenPaths = resolveHiddenManagementRoutePaths(" /trends/ , /history ");

  assert.equal(isManagementRouteHidden("/trends", hiddenPaths), true);
  assert.equal(isManagementRouteHidden("/trends/daily", hiddenPaths), false);
  assert.equal(isManagementRouteHidden("/history", hiddenPaths), true);
  assert.equal(isManagementRouteHidden("/overview", hiddenPaths), false);
});

test("filterVisibleManagementRoutes hides configured routes without changing playback routes", () => {
  const hiddenPaths = resolveHiddenManagementRoutePaths("/trends,/history,/solar");
  const visibleManagementRoutes = filterVisibleManagementRoutes(routeMetaList, hiddenPaths);

  assert.equal(visibleManagementRoutes.some((route) => route.path === "/trends"), false);
  assert.equal(visibleManagementRoutes.some((route) => route.path === "/history"), false);
  assert.equal(routeMetaList.some((route) => route.path === "/solar" && route.group === "playback"), true);
  assert.equal(hiddenPaths.has("/solar"), false);
  assert.ok(visibleManagementRoutes.some((route) => route.path === "/settings/playback"));
});

test("getManagementRouteRedirectPath selects the first visible management route or overview fallback", () => {
  const defaultHiddenPaths = resolveHiddenManagementRoutePaths("/trends,/history");
  assert.equal(getManagementRouteRedirectPath(routeMetaList, defaultHiddenPaths), "/brand");

  const allManagementHiddenPaths = resolveHiddenManagementRoutePaths(
    routeMetaList
      .filter((route) => route.group === "management")
      .map((route) => route.path)
      .join(",")
  );
  assert.equal(getManagementRouteRedirectPath(routeMetaList, allManagementHiddenPaths), "/overview");
});
