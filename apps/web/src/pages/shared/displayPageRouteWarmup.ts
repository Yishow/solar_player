import type { DisplayPageInstance } from "@solar-display/shared";
import { loadDisplayPageConfigEnvelope } from "../../hooks/useDisplayPageConfig";

export function resolveDisplayPageRoutePeerConfigKeys(
  currentPageKey: string,
  pages: DisplayPageInstance[]
) {
  const seenPageKeys = new Set([currentPageKey]);
  const peerPageKeys: string[] = [];

  for (const page of pages) {
    if (seenPageKeys.has(page.pageKey)) {
      continue;
    }

    seenPageKeys.add(page.pageKey);
    peerPageKeys.push(page.pageKey);
  }

  return peerPageKeys;
}

export function warmDisplayPageRoutePeerConfigs(
  currentPageKey: string,
  pages: DisplayPageInstance[]
) {
  const peerPageKeys = resolveDisplayPageRoutePeerConfigKeys(currentPageKey, pages);

  if (peerPageKeys.length === 0) {
    return;
  }

  void Promise.all(
    peerPageKeys.map((pageKey) =>
      loadDisplayPageConfigEnvelope(pageKey, "live").catch(() => null)
    )
  );
}
