import { fetchImagePlaylist } from "../services/api";
import { resolveDisplayPageRuntimeRefreshSpec } from "../pages/runtimeRefreshRegistry";
import { useRuntimeRefreshLifecycle } from "./useRuntimeRefreshLifecycle";

export function useImagePlaylistRuntime(
  activeIndex: number,
  options?: {
    enabled?: boolean;
  }
) {
  const spec = resolveDisplayPageRuntimeRefreshSpec("images", {
    activeIndex
  });

  return useRuntimeRefreshLifecycle<Awaited<ReturnType<typeof fetchImagePlaylist>>["playlist"]>({
    enabled: options?.enabled ?? true,
    load: async () => {
      const response = await fetchImagePlaylist(activeIndex);
      return response.playlist;
    },
    refreshKey: spec.refreshKey,
    shouldRefresh: (event) => spec.refreshScopes.includes(event.scope)
  });
}
