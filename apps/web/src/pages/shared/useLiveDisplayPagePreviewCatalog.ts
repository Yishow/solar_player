import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import { liveDisplayPagePreviewRegistry } from "./liveDisplayPagePreviewRegistry";
import {
  loadLiveDisplayPagePreviewCatalog,
  resolvePreviewCatalogRequestKey,
  type LiveDisplayPagePreviewCatalog
} from "./liveDisplayPagePreviewCatalogLoader";
import { createConfigUnavailableLiveDisplayPagePreviewStates } from "./liveDisplayPagePreviewState";

type UseLiveDisplayPagePreviewCatalogOptions = {
  enabled?: boolean;
  fallbackPageKeys?: string[];
  requestedPageKeys?: string[];
};

const EMPTY_FALLBACK_PAGE_KEYS: string[] = [];
const EMPTY_REQUESTED_PAGE_KEYS: string[] = [];
const displayPagePreviewSyncScopes = ["display-pages"] as const;
const noDisplayPagePreviewSyncScopes = [] as const;

export function useLiveDisplayPagePreviewCatalog(
  options: UseLiveDisplayPagePreviewCatalogOptions = {}
) {
  const enabled = options.enabled ?? true;
  const fallbackPageKeys = options.fallbackPageKeys ?? EMPTY_FALLBACK_PAGE_KEYS;
  const fallbackPageKeysKey = fallbackPageKeys.join("|");
  const requestedPageKeys = options.requestedPageKeys ?? EMPTY_REQUESTED_PAGE_KEYS;
  const requestedPageKeysKey = resolvePreviewCatalogRequestKey(requestedPageKeys);
  const definitions = useMemo(() => liveDisplayPagePreviewRegistry, []);
  const [states, setStates] = useState<LiveDisplayPagePreviewCatalog>({});
  const fallbackPageKeysRef = useRef(fallbackPageKeys);
  const requestedPageKeysRef = useRef(requestedPageKeys);
  const statesRef = useRef<LiveDisplayPagePreviewCatalog>({});
  const requestIdRef = useRef(0);

  fallbackPageKeysRef.current = fallbackPageKeys;
  requestedPageKeysRef.current = requestedPageKeys;

  const setCatalogStates = (nextStates: LiveDisplayPagePreviewCatalog) => {
    statesRef.current = nextStates;
    setStates(nextStates);
  };

  const createFailureStates = useCallback(
    (error: unknown) =>
      createConfigUnavailableLiveDisplayPagePreviewStates(
        fallbackPageKeysRef.current,
        error instanceof Error ? error.message : "載入正式展示頁預覽失敗。"
      ),
    []
  );

  const load = useCallback(async (loadOptions: { force?: boolean } = {}) => {
    if (!enabled) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    try {
      const { states: nextStates } = await loadLiveDisplayPagePreviewCatalog({
        definitions,
        force: loadOptions.force,
        onLoadingStates: (loadingStates) => {
          if (requestId === requestIdRef.current) {
            setCatalogStates(loadingStates);
          }
        },
        onResolvedStates: (nextStates) => {
          if (requestId === requestIdRef.current) {
            setCatalogStates(nextStates);
          }
        },
        previousStates: statesRef.current,
        requestedPageKeys: requestedPageKeysRef.current
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setCatalogStates(nextStates);
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setCatalogStates(createFailureStates(error));
      }
    }
  }, [createFailureStates, definitions, enabled]);

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      if (!enabled) {
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      try {
        const { states: nextStates } = await loadLiveDisplayPagePreviewCatalog({
          definitions,
          onLoadingStates: (loadingStates) => {
            if (active && requestId === requestIdRef.current) {
              setCatalogStates(loadingStates);
            }
          },
          onResolvedStates: (nextStates) => {
            if (active && requestId === requestIdRef.current) {
              setCatalogStates(nextStates);
            }
          },
          previousStates: statesRef.current,
          requestedPageKeys: requestedPageKeysRef.current
        });

        if (!active || requestId !== requestIdRef.current) {
          return;
        }

        setCatalogStates(nextStates);
      } catch (error) {
        if (active && requestId === requestIdRef.current) {
          setCatalogStates(createFailureStates(error));
        }
      }
    };

    void loadCatalog();

    return () => {
      active = false;
    };
  }, [definitions, enabled, fallbackPageKeysKey, requestedPageKeysKey]);

  const handleDisplaySyncRefresh = useCallback(
    () => load({ force: true }),
    [load]
  );

  useDisplaySyncRefresh(
    handleDisplaySyncRefresh,
    enabled ? displayPagePreviewSyncScopes : noDisplayPagePreviewSyncScopes
  );

  return {
    definitions,
    states
  };
}
