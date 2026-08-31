import type { MetricScope } from "@solar-display/shared";

export const DATA_HUB_ROOT_PATH = "/settings/data-hub";

export const DATA_HUB_SECTIONS = [
  { key: "connections", label: "資料連線", path: `${DATA_HUB_ROOT_PATH}/connections`, title: "資料連線" },
  { key: "sources", label: "資料來源", path: `${DATA_HUB_ROOT_PATH}/sources`, title: "資料來源" },
  { key: "metrics", label: "語意指標", path: `${DATA_HUB_ROOT_PATH}/metrics`, title: "語意指標" },
  { key: "external", label: "外部資料", path: `${DATA_HUB_ROOT_PATH}/external`, title: "外部資料" }
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
