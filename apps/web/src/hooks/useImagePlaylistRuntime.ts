import { fetchImagePlaylist } from "../services/api";
import { resolveDisplayPageRuntimeRefreshSpec } from "../pages/runtimeRefreshRegistry";
import { useRuntimeRefreshLifecycle } from "./useRuntimeRefreshLifecycle";

type ImagePlaylistRuntimePayload = Awaited<ReturnType<typeof fetchImagePlaylist>>["playlist"];

export function useImagePlaylistRuntime(
  activeIndex: number,
  options?: {
    enabled?: boolean;
    initialPayload?: ImagePlaylistRuntimePayload | null;
  }
) {
  const spec = resolveDisplayPageRuntimeRefreshSpec("images", {
    activeIndex
  });

  return useRuntimeRefreshLifecycle<ImagePlaylistRuntimePayload>({
    enabled: options?.enabled ?? true,
    initialPayload: options?.initialPayload,
    load: async () => {
      const response = await fetchImagePlaylist(activeIndex);
      return response.playlist;
    },
    refreshKey: spec.refreshKey,
    shouldRefresh: (event) => spec.refreshScopes.includes(event.scope)
  });
}
