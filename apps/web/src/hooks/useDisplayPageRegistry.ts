import type { DisplayPageInstance } from "@solar-display/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDisplayPageRegistry } from "../services/api";
import { useDisplaySyncRefresh } from "./useDisplaySyncRefresh";

let activeDisplayPageRegistrySnapshot: DisplayPageInstance[] | null = null;
let pendingDisplayPageRegistryRequest: Promise<DisplayPageInstance[]> | null = null;
let displayPageRegistryRequestSequence = 0;

type DisplayPageRegistrySnapshotOptions = {
  force?: boolean;
  readRegistry?: () => Promise<DisplayPageInstance[]>;
};

function filterActiveDisplayPageRegistry(pages: DisplayPageInstance[]) {
  return pages.filter((page) => page.enabled && page.archivedAt === null);
}

export function getActiveDisplayPageRegistrySnapshot() {
  return activeDisplayPageRegistrySnapshot;
}

export function clearDisplayPageRegistrySnapshot() {
  activeDisplayPageRegistrySnapshot = null;
  pendingDisplayPageRegistryRequest = null;
  displayPageRegistryRequestSequence += 1;
}

export async function loadDisplayPageRegistrySnapshot(options: DisplayPageRegistrySnapshotOptions = {}) {
  if (!options.force && activeDisplayPageRegistrySnapshot) {
    return activeDisplayPageRegistrySnapshot;
  }

  if (!options.force && pendingDisplayPageRegistryRequest) {
    return pendingDisplayPageRegistryRequest;
  }

  const requestSequence = displayPageRegistryRequestSequence + 1;
  displayPageRegistryRequestSequence = requestSequence;

  const request = (options.readRegistry ?? getDisplayPageRegistry)()
    .then((pages) => {
      const activePages = filterActiveDisplayPageRegistry(pages);

      if (requestSequence === displayPageRegistryRequestSequence) {
        activeDisplayPageRegistrySnapshot = activePages;
      }

      return activePages;
    })
    .finally(() => {
      if (pendingDisplayPageRegistryRequest === request) {
        pendingDisplayPageRegistryRequest = null;
      }
    });

  pendingDisplayPageRegistryRequest = request;
  return request;
}

export function useDisplayPageRegistry() {
  const initialPages = getActiveDisplayPageRegistrySnapshot();
  const [pages, setPages] = useState<DisplayPageInstance[]>(() => initialPages ?? []);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(initialPages === null);
  const requestIdRef = useRef(0);

  const load = useCallback(async (options: { force?: boolean } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const activeSnapshot = options.force ? null : getActiveDisplayPageRegistrySnapshot();

    if (activeSnapshot) {
      setPages(activeSnapshot);
      setErrorMessage("");
      setIsLoading(false);
      return;
    }

    setIsLoading(pages.length === 0);
    try {
      const nextPages = await loadDisplayPageRegistrySnapshot(options);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setPages(nextPages);
      setErrorMessage("");
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "載入 display page registry 失敗。");
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [pages.length]);

  const reload = useCallback(async () => {
    await load({ force: true });
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  useDisplaySyncRefresh(reload, ["display-pages"]);

  return {
    errorMessage,
    isLoading,
    pages,
    reload
  };
}
