import { useEffect, useMemo, useRef, useState } from "react";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import {
  liveDisplayPagePreviewRegistry
} from "./liveDisplayPagePreviewRegistry";
import {
  loadLiveDisplayPagePreviewCatalog,
  type LiveDisplayPagePreviewCatalog
} from "./liveDisplayPagePreviewCatalogLoader";

type UseLiveDisplayPagePreviewCatalogOptions = {
  enabled?: boolean;
};

export function useLiveDisplayPagePreviewCatalog(
  options: UseLiveDisplayPagePreviewCatalogOptions = {}
) {
  const enabled = options.enabled ?? true;
  const definitions = useMemo(() => liveDisplayPagePreviewRegistry, []);
  const [states, setStates] = useState<LiveDisplayPagePreviewCatalog>({});
  const requestIdRef = useRef(0);

  const load = async (loadOptions: { force?: boolean } = {}) => {
    if (!enabled) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const { states: nextStates } = await loadLiveDisplayPagePreviewCatalog({
      definitions,
      force: loadOptions.force,
      onLoadingStates: (loadingStates) => {
        if (requestId === requestIdRef.current) {
          setStates(loadingStates);
        }
      }
    });

    if (requestId !== requestIdRef.current) {
      return;
    }

    setStates(nextStates);
  };

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      if (!enabled) {
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const { states: nextStates } = await loadLiveDisplayPagePreviewCatalog({
        definitions,
        onLoadingStates: (loadingStates) => {
          if (active && requestId === requestIdRef.current) {
            setStates(loadingStates);
          }
        }
      });

      if (!active || requestId !== requestIdRef.current) {
        return;
      }

      setStates(nextStates);
    };

    void loadCatalog();

    return () => {
      active = false;
    };
  }, [definitions, enabled]);

  useDisplaySyncRefresh(() => load({ force: true }), enabled ? ["display-pages"] : []);

  return {
    definitions,
    states
  };
}
