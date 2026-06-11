import type { SustainabilityPeriodKey } from "@solar-display/shared";
import { useEffect, useRef } from "react";
import { fetchSustainabilityStory } from "../services/api";
import { resolveDisplayPageRuntimeRefreshSpec } from "../pages/runtimeRefreshRegistry";
import { useRuntimeRefreshLifecycle } from "./useRuntimeRefreshLifecycle";

type SustainabilityStoryRuntimePayload = Awaited<ReturnType<typeof fetchSustainabilityStory>>["story"];

export function useSustainabilityStoryRuntime(
  selectedPeriod: SustainabilityPeriodKey,
  options?: {
    enabled?: boolean;
  }
) {
  const periodPayloadCacheRef = useRef(new Map<SustainabilityPeriodKey, SustainabilityStoryRuntimePayload>());
  const spec = resolveDisplayPageRuntimeRefreshSpec("sustainability", {
    selectedPeriod
  });
  const warmPayload = periodPayloadCacheRef.current.get(selectedPeriod) ?? null;

  const runtime = useRuntimeRefreshLifecycle<SustainabilityStoryRuntimePayload>({
    enabled: options?.enabled ?? true,
    initialPayload: warmPayload,
    load: async () => {
      const response = await fetchSustainabilityStory(selectedPeriod);
      return response.story;
    },
    refreshKey: spec.refreshKey,
    shouldRefresh: (event) => spec.refreshScopes.includes(event.scope)
  });

  useEffect(() => {
    if (runtime.payload?.selectedPeriod === selectedPeriod) {
      periodPayloadCacheRef.current.set(selectedPeriod, runtime.payload);
    }
  }, [runtime.payload, selectedPeriod]);

  const cachedPeriodPayload = periodPayloadCacheRef.current.get(selectedPeriod) ?? null;
  const runtimePeriodPayload = runtime.payload?.selectedPeriod === selectedPeriod ? runtime.payload : null;
  const periodPayload = runtimePeriodPayload ?? cachedPeriodPayload;

  return {
    ...runtime,
    isLoading: periodPayload === null ? runtime.isLoading : false,
    payload: periodPayload
  };
}
