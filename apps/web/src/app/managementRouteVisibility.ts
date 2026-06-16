import type { RouteMeta } from "./routeMeta";
import { routeMetaList } from "./routeMeta";

const DEFAULT_HIDDEN_MANAGEMENT_ROUTES = "/trends,/history";

function normalizeRoutePath(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed) {
    return null;
  }

  const absolutePath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return absolutePath.length > 1 ? absolutePath.replace(/\/+$/, "") : absolutePath;
}

export function resolveHiddenManagementRoutePaths(
  envValue: string | undefined,
  routes: RouteMeta[] = routeMetaList
): Set<string> {
  const managementPaths = new Set(
    routes
      .filter((route) => route.group === "management")
      .map((route) => route.path)
  );
  const hiddenPaths = new Set<string>();

  for (const segment of (envValue ?? "").split(",")) {
    const normalizedPath = normalizeRoutePath(segment);
    if (normalizedPath && managementPaths.has(normalizedPath)) {
      hiddenPaths.add(normalizedPath);
    }
  }

  return hiddenPaths;
}

export function getConfiguredHiddenManagementRoutePaths(envValue?: string): Set<string> {
  return resolveHiddenManagementRoutePaths(envValue ?? import.meta.env?.VITE_HIDDEN_MANAGEMENT_ROUTES ?? DEFAULT_HIDDEN_MANAGEMENT_ROUTES);
}

export function isManagementRouteHidden(path: string, hiddenPaths: ReadonlySet<string>): boolean {
  const normalizedPath = normalizeRoutePath(path);
  return normalizedPath !== null && hiddenPaths.has(normalizedPath);
}

export function filterVisibleManagementRoutes(routes: RouteMeta[], hiddenPaths: ReadonlySet<string>): RouteMeta[] {
  return routes.filter((route) => route.group === "management" && !hiddenPaths.has(route.path));
}

export function getManagementRouteRedirectPath(
  routes: RouteMeta[],
  hiddenPaths: ReadonlySet<string>
): string {
  return filterVisibleManagementRoutes(routes, hiddenPaths)[0]?.path ?? "/overview";
}
