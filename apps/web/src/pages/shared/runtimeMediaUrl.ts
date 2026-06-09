import { isViteDevRuntime } from "../../services/api";
import { buildRuntimeUploadedMediaUrl } from "../../services/runtimeOrigin";

function buildUploadedMediaUrl(path: string) {
  const env = (
    import.meta as ImportMeta & {
      env?: {
        VITE_API_BASE_URL?: string;
        VITE_PORT?: string;
      };
    }
  ).env;

  return buildRuntimeUploadedMediaUrl(path, {
    apiBaseUrl: env?.VITE_API_BASE_URL,
    configuredVitePort: env?.VITE_PORT,
    isViteDevServer: isViteDevRuntime(import.meta),
    location: typeof window === "undefined" ? undefined : window.location
  });
}

export function resolveRuntimeMediaUrl(source: string | null | undefined) {
  if (!source) {
    return undefined;
  }

  return source.startsWith("/uploads/") ? buildUploadedMediaUrl(source) : source;
}
