import type { DisplayPageInstance } from "@solar-display/shared";

function normalizePathname(pathname: string) {
  if (!pathname.startsWith("/")) {
    return `/${pathname}`;
  }

  return pathname;
}

export function resolveDisplayPageRouteInstance(pages: DisplayPageInstance[], pathname: string) {
  const normalizedPathname = normalizePathname(pathname);

  return pages.find((page) => page.enabled && page.archivedAt === null && page.route === normalizedPathname) ?? null;
}
