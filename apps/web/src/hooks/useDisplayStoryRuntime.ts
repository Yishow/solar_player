import type { DisplayStoryPageId, DisplayStoryPayloadByPageId } from "@solar-display/shared";
import { fetchDisplayStoryPage } from "../services/api";
import { resolveDisplayPageRuntimeRefreshSpec } from "../pages/runtimeRefreshRegistry";
import { useRuntimeRefreshLifecycle } from "./useRuntimeRefreshLifecycle";

export async function loadDisplayStoryRuntimePayload<PageKey extends DisplayStoryPageId>(
  pageKey: PageKey
) {
  const response = await fetchDisplayStoryPage(pageKey);
  return response.payload as DisplayStoryPayloadByPageId[PageKey];
}

export function useDisplayStoryRuntime<PageKey extends DisplayStoryPageId>(
  pageKey: PageKey,
  options?: {
    dependencyKey?: string | null;
    enabled?: boolean;
    initialPayload?: DisplayStoryPayloadByPageId[PageKey] | null;
  }
) {
  const spec = resolveDisplayPageRuntimeRefreshSpec(pageKey, {
    dependencyKey: options?.dependencyKey
  });

  return useRuntimeRefreshLifecycle<DisplayStoryPayloadByPageId[PageKey]>({
    enabled: options?.enabled ?? true,
    initialPayload: options?.initialPayload,
    load: () => loadDisplayStoryRuntimePayload(pageKey),
    refreshKey: spec.refreshKey,
    shouldRefresh: (event) => spec.refreshScopes.includes(event.scope)
  });
}
