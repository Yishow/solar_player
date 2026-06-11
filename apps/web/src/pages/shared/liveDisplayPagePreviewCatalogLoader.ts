import type { DisplayPageConfigEnvelope, DisplayPageInstance } from "@solar-display/shared";
import { loadDisplayPageConfigEnvelope } from "../../hooks/useDisplayPageConfig";
import { loadDisplayPageRegistrySnapshot } from "../../hooks/useDisplayPageRegistry";
import {
  buildLiveDisplayPagePreviewStates,
  createLoadingLiveDisplayPagePreviewState,
  type LiveDisplayPagePreviewStates
} from "./liveDisplayPagePreviewState";
import type { LiveDisplayPagePreviewRegistryEntry } from "./liveDisplayPagePreviewRegistry";

export type LiveDisplayPagePreviewCatalog = LiveDisplayPagePreviewStates;

type LiveDisplayPagePreviewCatalogLoaderOptions = {
  definitions: LiveDisplayPagePreviewRegistryEntry[];
  force?: boolean;
  onLoadingStates?: (states: LiveDisplayPagePreviewCatalog) => void;
  onResolvedStates?: (states: LiveDisplayPagePreviewCatalog) => void;
  previousStates?: LiveDisplayPagePreviewCatalog;
  readLiveConfig?: (pageKey: string) => Promise<DisplayPageConfigEnvelope>;
  readRegistry?: () => Promise<DisplayPageInstance[]>;
  requestedPageKeys?: string[];
};

export async function loadLiveDisplayPagePreviewCatalog({
  definitions,
  force = false,
  onLoadingStates,
  onResolvedStates,
  previousStates,
  readLiveConfig,
  readRegistry,
  requestedPageKeys = []
}: LiveDisplayPagePreviewCatalogLoaderOptions): Promise<{
  loadingStates: LiveDisplayPagePreviewCatalog;
  states: LiveDisplayPagePreviewCatalog;
}> {
  const registryPages = await (readRegistry ?? (() => loadDisplayPageRegistrySnapshot({ force })))();
  const requestedKeySet = new Set(requestedPageKeys);
  const hasRequestedWindow = requestedKeySet.size > 0;
  const requestedPages = hasRequestedWindow
    ? registryPages.filter((page) => requestedKeySet.has(page.pageKey))
    : registryPages;
  const deferredPages = hasRequestedWindow
    ? registryPages.filter((page) => !requestedKeySet.has(page.pageKey))
    : [];
  const loadingStates = Object.fromEntries(
    registryPages.map((page) => [page.pageKey, previousStates?.[page.pageKey] ?? createLoadingLiveDisplayPagePreviewState()])
  );
  const readConfig = readLiveConfig ?? ((pageKey: string) => loadDisplayPageConfigEnvelope(pageKey, "live", { force }));

  onLoadingStates?.(loadingStates);

  const requestedStates = await buildLiveDisplayPagePreviewStates({
    definitions,
    pages: requestedPages,
    readLiveConfig: readConfig
  });

  if (deferredPages.length === 0) {
    return {
      loadingStates,
      states: requestedStates
    };
  }

  onResolvedStates?.({
    ...loadingStates,
    ...requestedStates
  });

  const deferredStates = await buildLiveDisplayPagePreviewStates({
    definitions,
    pages: deferredPages,
    readLiveConfig: readConfig
  });
  const states = {
    ...requestedStates,
    ...deferredStates
  };

  return {
    loadingStates,
    states
  };
}
