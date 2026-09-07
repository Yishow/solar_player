import { DATA_HUB_ROOT_PATH } from "./dataHub";

const compatibilityTargets = new Map([
  ["/settings/mqtt", `${DATA_HUB_ROOT_PATH}/connections`],
  [`${DATA_HUB_ROOT_PATH}/usage`, `${DATA_HUB_ROOT_PATH}/metrics`],
  [`${DATA_HUB_ROOT_PATH}/diagnostics`, `${DATA_HUB_ROOT_PATH}/metrics`],
  [`${DATA_HUB_ROOT_PATH}/diagnostics/operations`, `${DATA_HUB_ROOT_PATH}/sources`],
  [`${DATA_HUB_ROOT_PATH}/derived`, `${DATA_HUB_ROOT_PATH}/metrics`]
]);

export function resolveDataHubCompatibilityRedirect(requestUrl: string): string | null {
  const url = new URL(requestUrl);
  if (url.pathname === "/settings/data-source") {
    const target = url.searchParams.has("metricKey")
      ? `${DATA_HUB_ROOT_PATH}/metrics`
      : `${DATA_HUB_ROOT_PATH}/sources`;
    return `${target}${url.search}`;
  }
  const target = compatibilityTargets.get(url.pathname);
  return target ? `${target}${url.search}` : null;
}
