import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { MetricScope } from "@solar-display/shared";
import {
  isDataHubManagementScope,
  type DataHubManagementScope
} from "../../app/dataHub";

export type { DataHubManagementScope };

export const DATA_HUB_LIST_FILTERS = ["all", "issue", "managed", "custom"] as const;
export type DataHubListFilter = (typeof DATA_HUB_LIST_FILTERS)[number];

export const DATA_HUB_TASKS = [
  {
    key: "connect",
    label: "接入新資料",
    description: "把新的電錶或資料接到目前廠區。",
    path: "/settings/data-hub/sources",
    task: "connect"
  },
  {
    key: "edit",
    label: "修改現有資料",
    description: "尋找並調整已經接入的資料。",
    path: "/settings/data-hub/sources",
    task: "edit"
  },
  {
    key: "diagnose",
    label: "排除資料異常",
    description: "查看沒有更新或狀態異常的資料。",
    path: "/settings/data-hub/metrics",
    task: "diagnose"
  }
] as const;

export type DataHubTaskKey = (typeof DATA_HUB_TASKS)[number]["key"];
export type DataHubWorkspaceTask = DataHubTaskKey | "energy";

export const DATA_HUB_VIEWS = ["configured", "received"] as const;
export type DataHubView = (typeof DATA_HUB_VIEWS)[number];

export const DATA_HUB_PANELS = ["drawer", "full"] as const;
export type DataHubPanel = (typeof DATA_HUB_PANELS)[number];

export const DATA_HUB_SECTIONS = ["overview", "mapping", "samples", "usage"] as const;
export type DataHubSection = (typeof DATA_HUB_SECTIONS)[number];

export type DataHubWorkspaceState = {
  filter: DataHubListFilter;
  managementScope: DataHubManagementScope;
  panel: DataHubPanel;
  requestedScope: string | null;
  returnTo: string | null;
  scopeCorrected: boolean;
  scopeCorrectionMessage: string | null;
  search: string;
  section: DataHubSection;
  selection: string | null;
  task: DataHubWorkspaceTask | null;
  view: DataHubView;
};

const listFilters = new Set<string>(DATA_HUB_LIST_FILTERS);
const taskKeys = new Set<string>(DATA_HUB_TASKS.map((task) => task.key));

export function isDataHubListFilter(value: unknown): value is DataHubListFilter {
  return typeof value === "string" && listFilters.has(value);
}

export function isDataHubTaskKey(value: unknown): value is DataHubTaskKey {
  return typeof value === "string" && taskKeys.has(value);
}

export function isDataHubWorkspaceTask(value: unknown): value is DataHubWorkspaceTask {
  return isDataHubTaskKey(value) || value === "energy";
}

export function sanitizeReturnContext(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("/settings/data-hub/") && !value.includes("//")) {
    return value;
  }
  return null;
}

export function parseDataHubWorkspaceSearch(
  search: string | URLSearchParams
): DataHubWorkspaceState {
  const params = typeof search === "string" ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search) : search;
  const requestedScope = params.get("scope");
  const scopeIsValid = isDataHubManagementScope(requestedScope);
  const managementScope: DataHubManagementScope = scopeIsValid ? requestedScope : "all";
  const requestedFilter = params.get("filter");
  const requestedTask = params.get("task");
  const requestedView = params.get("view");
  const requestedPanel = params.get("panel");
  const requestedSection = params.get("section");

  const view: DataHubView = requestedView === "received" || requestedView === "configured"
    ? requestedView
    : (requestedTask === "connect" ? "received" : "configured");

  const panel: DataHubPanel = requestedPanel === "full" ? "full" : "drawer";
  const section: DataHubSection = (
    requestedSection === "mapping"
    || requestedSection === "samples"
    || requestedSection === "usage"
  ) ? requestedSection : "overview";

  return {
    filter: isDataHubListFilter(requestedFilter) ? requestedFilter : "all",
    managementScope,
    panel,
    requestedScope,
    returnTo: sanitizeReturnContext(params.get("returnTo")),
    scopeCorrected: requestedScope !== null && requestedScope !== "" && !scopeIsValid,
    scopeCorrectionMessage: requestedScope !== null && requestedScope !== "" && !scopeIsValid
      ? `無法識別的管理範圍「${requestedScope}」，已改為「全部」。不會自動改成 CL。`
      : null,
    search: params.get("q") ?? "",
    section,
    selection: params.get("selection"),
    task: isDataHubWorkspaceTask(requestedTask) ? requestedTask : null,
    view
  };
}

export function toDataHubWorkspaceSearch(
  patch: Partial<Pick<DataHubWorkspaceState, "filter" | "managementScope" | "panel" | "returnTo" | "search" | "section" | "selection" | "task" | "view">>,
  current?: URLSearchParams
): URLSearchParams {
  const next = new URLSearchParams(current);
  if (patch.managementScope) {
    next.set("scope", patch.managementScope);
  }
  if (patch.search !== undefined) {
    if (patch.search) {
      next.set("q", patch.search);
    } else {
      next.delete("q");
    }
  }
  if (patch.filter !== undefined) {
    if (patch.filter === "all") {
      next.delete("filter");
    } else {
      next.set("filter", patch.filter);
    }
  }
  if (patch.selection !== undefined) {
    if (patch.selection) {
      next.set("selection", patch.selection);
    } else {
      next.delete("selection");
    }
  }
  if (patch.task !== undefined) {
    if (patch.task) {
      next.set("task", patch.task);
    } else {
      next.delete("task");
    }
  }
  if (patch.view !== undefined) {
    if (patch.view === "configured") {
      next.delete("view");
    } else {
      next.set("view", patch.view);
    }
  }
  if (patch.panel !== undefined) {
    if (patch.panel === "drawer") {
      next.delete("panel");
    } else {
      next.set("panel", patch.panel);
    }
  }
  if (patch.section !== undefined) {
    if (patch.section === null) {
      next.delete("section");
    } else {
      next.set("section", patch.section);
    }
  }
  if (patch.returnTo !== undefined) {
    const sanitized = sanitizeReturnContext(patch.returnTo);
    if (sanitized) {
      next.set("returnTo", sanitized);
    } else {
      next.delete("returnTo");
    }
  }
  return next;
}

export function buildDataHubTaskHref(
  task: (typeof DATA_HUB_TASKS)[number],
  managementScope: DataHubManagementScope
) {
  const params = toDataHubWorkspaceSearch({
    filter: task.key === "diagnose" ? "issue" : "all",
    managementScope,
    task: task.key
  });
  return `${task.path}?${params.toString()}`;
}

export function isPhysicalMeterScope(scope: DataHubManagementScope): scope is "cl" | "kn" {
  return scope === "cl" || scope === "kn";
}

export function resolveCreateMetricScope(
  managementScope: DataHubManagementScope
): MetricScope | null {
  return isPhysicalMeterScope(managementScope) ? managementScope : null;
}

export function validatePhysicalMeterSiteChoice(metricScope: string | null | undefined): {
  message: string;
  ok: false;
} | {
  ok: true;
  scope: "cl" | "kn";
} {
  if (metricScope === "cl" || metricScope === "kn") {
    return { ok: true, scope: metricScope };
  }
  if (metricScope === "global") {
    return { message: "實體電錶必須選擇 CL 或 KN 廠區，不能使用全域範圍。", ok: false };
  }
  return { message: "請先選擇 CL 或 KN 廠區，才能儲存實體電錶。", ok: false };
}

export function workspaceContextKeys(state: DataHubWorkspaceState): string[] {
  return Object.keys(state).sort();
}

export function useDataHubWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => parseDataHubWorkspaceSearch(searchParams), [searchParams]);

  const updateWorkspace = (
    patch: Partial<Pick<DataHubWorkspaceState, "filter" | "managementScope" | "panel" | "returnTo" | "search" | "section" | "selection" | "task" | "view">>,
    options?: { replace?: boolean }
  ) => {
    setSearchParams((current) => toDataHubWorkspaceSearch(patch, current), { replace: options?.replace ?? true });
  };

  return { ...state, searchParams, updateWorkspace };
}
