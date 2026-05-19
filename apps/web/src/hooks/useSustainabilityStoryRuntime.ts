import type { SustainabilityPeriodKey } from "@solar-display/shared";
import { fetchSustainabilityStory } from "../services/api";
import { resolveDisplayPageRuntimeRefreshSpec } from "../pages/runtimeRefreshRegistry";
import { useRuntimeRefreshLifecycle } from "./useRuntimeRefreshLifecycle";

export function useSustainabilityStoryRuntime(
  selectedPeriod: SustainabilityPeriodKey,
  options?: {
    enabled?: boolean;
  }
) {
  const spec = resolveDisplayPageRuntimeRefreshSpec("sustainability", {
    selectedPeriod
  });

  return useRuntimeRefreshLifecycle<Awaited<ReturnType<typeof fetchSustainabilityStory>>["story"]>({
    enabled: options?.enabled ?? true,
    load: async () => {
      const response = await fetchSustainabilityStory(selectedPeriod);
      return response.story;
    },
    refreshKey: spec.refreshKey,
    shouldRefresh: (event) => spec.refreshScopes.includes(event.scope)
  });
}
