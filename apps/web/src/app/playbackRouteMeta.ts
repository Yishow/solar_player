import type { DisplayPageInstance } from "@solar-display/shared";
import { routeMetaList, routeMetaMap, type RouteMeta } from "./routeMeta";

export type ResolvedPlaybackRouteMeta = RouteMeta & {
  matchedPath: string | null;
  source: "fallback" | "registry" | "static-playback";
};

export type PlaybackFooterEntry = {
  key: string;
  label: string;
  path: string;
};

const staticPlaybackRouteMetaList = routeMetaList.filter(
  (route): route is RouteMeta => route.group === "playback"
);
const staticPlaybackRouteMetaByTemplateKey = new Map(
  staticPlaybackRouteMetaList.map((route) => [route.path.slice(1), route] as const)
);
const overviewRouteMeta = routeMetaMap.get("/overview")!;

function normalizePathname(pathname: string) {
  if (!pathname.startsWith("/")) {
    return `/${pathname}`;
  }

  return pathname;
}

function sortRegistryPages(pages: DisplayPageInstance[]) {
  return [...pages].sort((left, right) => left.displayOrder - right.displayOrder || left.id - right.id);
}

function findRegistryPlaybackPage(pages: DisplayPageInstance[], pathname: string) {
  return pages.find((page) => page.enabled && page.archivedAt === null && page.route === pathname) ?? null;
}

function resolveTemplateRouteMeta(templateKey: DisplayPageInstance["templateKey"]) {
  return staticPlaybackRouteMetaByTemplateKey.get(templateKey) ?? overviewRouteMeta;
}

export function resolvePlaybackRouteMeta(
  pathname: string,
  pages: DisplayPageInstance[]
): ResolvedPlaybackRouteMeta {
  const normalizedPathname = normalizePathname(pathname);
  const registryPage = findRegistryPlaybackPage(pages, normalizedPathname);

  if (registryPage) {
    const templateRouteMeta = resolveTemplateRouteMeta(registryPage.templateKey);

    return {
      ...templateRouteMeta,
      matchedPath: normalizedPathname,
      navLabel: registryPage.displayNameZh,
      order: registryPage.displayOrder,
      path: registryPage.route,
      source: "registry",
      subtitle: registryPage.displayNameEn,
      title: registryPage.displayNameZh
    };
  }

  const staticPlaybackRouteMeta = routeMetaMap.get(normalizedPathname);

  if (staticPlaybackRouteMeta?.group === "playback") {
    return {
      ...staticPlaybackRouteMeta,
      matchedPath: normalizedPathname,
      source: "static-playback"
    };
  }

  return {
    ...overviewRouteMeta,
    matchedPath: null,
    source: "fallback"
  };
}

export function buildPlaybackFooterEntries(pages: DisplayPageInstance[]): PlaybackFooterEntry[] {
  if (pages.length === 0) {
    return staticPlaybackRouteMetaList.map((route) => ({
      key: route.path,
      label: route.navLabel,
      path: route.path
    }));
  }

  return sortRegistryPages(pages)
    .filter((page) => page.enabled && page.archivedAt === null)
    .map((page) => ({
      key: page.pageKey,
      label: page.displayNameZh,
      path: page.route
    }));
}
