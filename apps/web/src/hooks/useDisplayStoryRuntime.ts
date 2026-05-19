import type { DisplayStoryPayload } from "../services/api";
import { fetchDisplayStory } from "../services/api";
import { resolveDisplayPageRuntimeRefreshSpec } from "../pages/runtimeRefreshRegistry";
import { useRuntimeRefreshLifecycle } from "./useRuntimeRefreshLifecycle";

type DisplayStoryPageKey = "overview" | "solar" | "factory-circuit";
type DisplayStoryPayloadByPageKey = {
  "factory-circuit": DisplayStoryPayload["factoryCircuit"];
  overview: DisplayStoryPayload["overview"];
  solar: DisplayStoryPayload["solar"];
};

function readDisplayStoryPagePayload<PageKey extends DisplayStoryPageKey>(
  story: DisplayStoryPayload,
  pageKey: PageKey
): DisplayStoryPayloadByPageKey[PageKey] {
  switch (pageKey) {
    case "factory-circuit":
      return story.factoryCircuit as DisplayStoryPayloadByPageKey[PageKey];
    case "solar":
      return story.solar as DisplayStoryPayloadByPageKey[PageKey];
    case "overview":
    default:
      return story.overview as DisplayStoryPayloadByPageKey[PageKey];
  }
}

export function useDisplayStoryRuntime<PageKey extends DisplayStoryPageKey>(
  pageKey: PageKey,
  options?: {
    dependencyKey?: string | null;
    enabled?: boolean;
  }
) {
  const spec = resolveDisplayPageRuntimeRefreshSpec(pageKey, {
    dependencyKey: options?.dependencyKey
  });

  return useRuntimeRefreshLifecycle<DisplayStoryPayloadByPageKey[PageKey]>({
    enabled: options?.enabled ?? true,
    load: async () => {
      const story = await fetchDisplayStory();
      return readDisplayStoryPagePayload(story, pageKey);
    },
    refreshKey: spec.refreshKey,
    shouldRefresh: (event) => spec.refreshScopes.includes(event.scope)
  });
}
