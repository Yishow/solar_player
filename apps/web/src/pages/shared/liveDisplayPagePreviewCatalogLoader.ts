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
  readLiveConfig?: (pageKey: string) => Promise<DisplayPageConfigEnvelope>;
  readRegistry?: () => Promise<DisplayPageInstance[]>;
};

export async function loadLiveDisplayPagePreviewCatalog({
  definitions,
  force = false,
  onLoadingStates,
  readLiveConfig,
  readRegistry
}: LiveDisplayPagePreviewCatalogLoaderOptions): Promise<{
  loadingStates: LiveDisplayPagePreviewCatalog;
  states: LiveDisplayPagePreviewCatalog;
}> {
  const registryPages = await (readRegistry ?? (() => loadDisplayPageRegistrySnapshot({ force })))();
  const loadingStates = Object.fromEntries(
    registryPages.map((page) => [page.pageKey, createLoadingLiveDisplayPagePreviewState()])
  );

  onLoadingStates?.(loadingStates);

  const states = await buildLiveDisplayPagePreviewStates({
    definitions,
    pages: registryPages,
    readLiveConfig: readLiveConfig ?? ((pageKey) => loadDisplayPageConfigEnvelope(pageKey, "live", { force }))
  });

  return {
    loadingStates,
    states
  };
}
