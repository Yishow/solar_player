import { DATA_HUB_ROOT_PATH } from "./dataHub";

const compatibilityTargets = new Map([
  ["/settings/mqtt", `${DATA_HUB_ROOT_PATH}/connections`],
  ["/settings/data-source", `${DATA_HUB_ROOT_PATH}/diagnostics`]
]);

export function resolveDataHubCompatibilityRedirect(requestUrl: string): string | null {
  const url = new URL(requestUrl);
  const target = compatibilityTargets.get(url.pathname);
  return target ? `${target}${url.search}` : null;
}
