import { useEffect, useMemo, useState } from "react";
import { getDisplayPageConfig, getDisplayPageRegistry } from "../../services/api";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import {
  liveDisplayPagePreviewRegistry
} from "./liveDisplayPagePreviewRegistry";
import {
  buildLiveDisplayPagePreviewStates,
  createLoadingLiveDisplayPagePreviewState
} from "./liveDisplayPagePreviewState";
import type { LiveDisplayPagePreviewStates } from "./liveDisplayPagePreviewState";

export type LiveDisplayPagePreviewCatalog = LiveDisplayPagePreviewStates;

export function useLiveDisplayPagePreviewCatalog() {
  const definitions = useMemo(() => liveDisplayPagePreviewRegistry, []);
  const [states, setStates] = useState<LiveDisplayPagePreviewCatalog>({});

  const load = async () => {
    const registryPages = (await getDisplayPageRegistry()).filter(
      (page) => page.enabled && page.archivedAt === null
    );

    setStates(
      Object.fromEntries(
        registryPages.map((page) => [page.pageKey, createLoadingLiveDisplayPagePreviewState()])
      )
    );

    const nextStates = await buildLiveDisplayPagePreviewStates({
      definitions,
      pages: registryPages,
      readLiveConfig: (pageKey) => getDisplayPageConfig(pageKey, "live")
    });

    setStates(nextStates);
  };

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      const registryPages = (await getDisplayPageRegistry()).filter(
        (page) => page.enabled && page.archivedAt === null
      );

      if (!active) {
        return;
      }

      setStates(
        Object.fromEntries(
          registryPages.map((page) => [page.pageKey, createLoadingLiveDisplayPagePreviewState()])
        )
      );

      const nextStates = await buildLiveDisplayPagePreviewStates({
        definitions,
        pages: registryPages,
        readLiveConfig: (pageKey) => getDisplayPageConfig(pageKey, "live")
      });

      if (!active) {
        return;
      }

      setStates(nextStates);
    };

    void loadCatalog();

    return () => {
      active = false;
    };
  }, [definitions]);

  useDisplaySyncRefresh(() => load(), ["display-pages"]);

  return {
    definitions,
    states
  };
}
