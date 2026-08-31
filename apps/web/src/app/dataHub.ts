import type { MetricScope } from "@solar-display/shared";

export const DATA_HUB_ROOT_PATH = "/settings/data-hub";

export const DATA_HUB_SECTIONS = [
  { key: "connections", label: "Connections", path: `${DATA_HUB_ROOT_PATH}/connections`, title: "資料連線" },
  { key: "sources", label: "Sources", path: `${DATA_HUB_ROOT_PATH}/sources`, title: "資料來源" },
  { key: "metrics", label: "Metrics", path: `${DATA_HUB_ROOT_PATH}/metrics`, title: "語意指標" },
  { key: "derived", label: "Derived Metrics", path: `${DATA_HUB_ROOT_PATH}/derived`, title: "衍生指標" },
  { key: "usage", label: "Usage", path: `${DATA_HUB_ROOT_PATH}/usage`, title: "使用情形" },
  { key: "diagnostics", label: "Diagnostics", path: `${DATA_HUB_ROOT_PATH}/diagnostics`, title: "資料診斷" },
  { key: "external", label: "External Data", path: `${DATA_HUB_ROOT_PATH}/external`, title: "外部資料" }
] as const;

export type DataHubSection = typeof DATA_HUB_SECTIONS[number];
export type DataHubSectionKey = DataHubSection["key"];
export type DataHubManagementScope = MetricScope | "all";

const managementScopes: readonly DataHubManagementScope[] = ["cl", "kn", "global", "all"];

export function filterVisibleDataHubSections(
  sections: readonly DataHubSection[],
  isHidden: (path: string) => boolean
): DataHubSection[] {
  return sections.filter(({ path }) => !isHidden(path));
}

export function isDataHubManagementScope(value: unknown): value is DataHubManagementScope {
  return managementScopes.includes(value as DataHubManagementScope);
}

export function resolveDataHubSection(pathname: string): DataHubSection | null {
  return DATA_HUB_SECTIONS.find((section) => {
    return pathname === section.path || pathname.startsWith(`${section.path}/`);
  }) ?? null;
}
