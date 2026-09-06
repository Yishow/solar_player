import type { MetricScope } from "@solar-display/shared";

export const DATA_HUB_ROOT_PATH = "/settings/data-hub";

export const DATA_HUB_SECTIONS = [
  { key: "connections", label: "連線設定", path: `${DATA_HUB_ROOT_PATH}/connections`, title: "連線設定" },
  { key: "sources", label: "接收與轉換", path: `${DATA_HUB_ROOT_PATH}/sources`, title: "接收與轉換" },
  { key: "metrics", label: "可用數據", path: `${DATA_HUB_ROOT_PATH}/metrics`, title: "可用數據" },
  { key: "external", label: "天氣／外部資料", path: `${DATA_HUB_ROOT_PATH}/external`, title: "天氣／外部資料" }
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
