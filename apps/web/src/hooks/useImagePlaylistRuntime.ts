import { fetchImagePlaylist } from "../services/api";
import { resolveDisplayPageRuntimeRefreshSpec } from "../pages/runtimeRefreshRegistry";
import { useRuntimeRefreshLifecycle } from "./useRuntimeRefreshLifecycle";

type ImagePlaylistRuntimePayload = Awaited<ReturnType<typeof fetchImagePlaylist>>["playlist"];

export function useImagePlaylistRuntime(
  options?: {
    enabled?: boolean;
    initialPayload?: ImagePlaylistRuntimePayload | null;
  }
) {
  const spec = resolveDisplayPageRuntimeRefreshSpec("images");

  return useRuntimeRefreshLifecycle<ImagePlaylistRuntimePayload>({
    enabled: options?.enabled ?? true,
    initialPayload: options?.initialPayload,
    load: async () => {
      const response = await fetchImagePlaylist();
      return response.playlist;
    },
    refreshKey: spec.refreshKey,
    shouldRefresh: (event) => spec.refreshScopes.includes(event.scope)
  });
}
