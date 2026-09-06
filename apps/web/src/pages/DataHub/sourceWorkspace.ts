import type { MetricScope } from "@solar-display/shared";
import type { DataHubManagementScope } from "../../app/dataHub";
import type { ScopedLiveMetricsSnapshot } from "../../services/socket";
import type { MetricInventoryRow } from "./MetricsModel";
import {
  isSolarAdapterManagedMetricIdentity,
  type GenericMqttMapping,
  type SourceHealth,
  type SourceRow
} from "./SourcesModel";
import type { DataHubListFilter } from "./workspaceContext";
import { resolveCreateMetricScope, validatePhysicalMeterSiteChoice } from "./workspaceContext";

export type LiveObservation = {
  lastReceivedAt: string | null;
  lastValue: number | null;
  quality: string | null;
};

export type LiveObservationOverlay = Record<string, LiveObservation>;

export type SourceListQuery = {
  filter: DataHubListFilter;
  scope: DataHubManagementScope;
  search: string;
};

export type WorkspaceHealthSummary = {
  emptyReason: string | null;
  hasData: boolean;
  issueCount: number;
  issueExplanations: string[];
  lastUpdated: string | null;
  managedCount: number;
  operatorCount: number;
  scopeLabel: string;
  sourceCount: number;
};

const scopeLabels: Record<DataHubManagementScope, string> = {
  all: "全部廠區",
  cl: "CL",
  global: "全域",
  kn: "KN"
};

export function sourceDisplayName(row: SourceRow): string {
  if (row.kind === "generic") {
    return row.mapping.nameZh?.trim() || row.mapping.nameEn?.trim() || row.metricKey;
  }
  return `Solar 轉接器 · ${scopeLabels[row.metricScope]}`;
}

export function isIssueHealth(health: SourceHealth): boolean {
  return health.tone === "warning" || health.tone === "danger";
}

export function matchesSourceSearch(row: SourceRow, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const haystack = [
    sourceDisplayName(row),
    row.sourceTopic,
    row.sourceType,
    row.metricKey ?? "",
    row.kind === "generic" ? row.mapping.nameEn ?? "" : "",
    row.kind === "generic" ? row.mapping.topic : "",
    ...row.ownedMetrics
  ].join("\n").toLowerCase();
  return haystack.includes(needle);
}

export function matchesSourceFilter(row: SourceRow, filter: DataHubListFilter): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "issue") {
    return isIssueHealth(row.health);
  }
  if (filter === "managed") {
    return row.ownership === "managed";
  }
  return row.ownership === "operator";
}

export function matchesSourceScope(row: SourceRow, scope: DataHubManagementScope): boolean {
  return scope === "all" || row.metricScope === scope;
}

export function filterSourceRows(rows: SourceRow[], query: SourceListQuery): SourceRow[] {
  return rows.filter((row) =>
    matchesSourceScope(row, query.scope)
    && matchesSourceFilter(row, query.filter)
    && matchesSourceSearch(row, query.search)
  );
}

export function filterMetricRows(
  rows: MetricInventoryRow[],
  query: SourceListQuery
): MetricInventoryRow[] {
  const needle = query.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (query.scope !== "all" && row.metricScope !== query.scope) {
      return false;
    }
    if (query.filter === "issue") {
      const unhealthy = row.freshnessState === "stale"
        || row.freshnessState === "unavailable"
        || row.evaluationState === "degraded"
        || row.evaluationState === "unavailable";
      if (!unhealthy) {
        return false;
      }
    } else if (query.filter === "managed" && row.ownership !== "managed") {
      return false;
    } else if (query.filter === "custom" && row.ownership !== "operator") {
      return false;
    }
    if (!needle) {
      return true;
    }
    const haystack = [
      row.label,
      row.metricKey,
      row.provenance.sourceTopic ?? "",
      row.provenance.sourceId ?? ""
    ].join("\n").toLowerCase();
    return haystack.includes(needle);
  });
}

export function mergeScopedTopicEdits({
  draft,
  original,
  visibleScope
}: {
  draft: GenericMqttMapping[];
  original: GenericMqttMapping[];
  visibleScope: DataHubManagementScope;
}): GenericMqttMapping[] {
  const draftById = new Map(draft.map((topic) => [topic.id, topic]));
  const originalById = new Map(original.map((topic) => [topic.id, topic]));
  const inVisibleScope = (topic: GenericMqttMapping) =>
    visibleScope === "all" || topic.metricScope === visibleScope;

  const kept = original.flatMap((topic) => {
    const edited = draftById.get(topic.id);
    if (edited) {
      return [edited];
    }
    if (inVisibleScope(topic)) {
      return [];
    }
    return [topic];
  });
  const added = draft.filter((topic) => !originalById.has(topic.id));
  return [...kept, ...added];
}

export function liveObservationKey(metricScope: MetricScope, metricKey: string) {
  return `${metricScope}:${metricKey}`;
}

export function mergeLiveObservationSnapshot(
  current: LiveObservationOverlay,
  snapshot: ScopedLiveMetricsSnapshot
): LiveObservationOverlay {
  const next = { ...current };
  for (const [metricKey, reading] of Object.entries(snapshot.metrics)) {
    next[liveObservationKey(snapshot.metricScope, metricKey)] = {
      lastReceivedAt: reading.timestamp,
      lastValue: reading.value,
      quality: reading.quality
    };
  }
  return next;
}

export function overlayLiveObservations(
  draft: GenericMqttMapping[],
  overlay: LiveObservationOverlay
): GenericMqttMapping[] {
  return draft.map((topic) => {
    const live = overlay[liveObservationKey(topic.metricScope, topic.metricKey)];
    return live
      ? {
          ...topic,
          lastReceivedAt: live.lastReceivedAt,
          lastValue: live.lastValue,
          quality: live.quality
        }
      : topic;
  });
}

export function createGenericMappingDraft({
  existing,
  managementScope
}: {
  existing: GenericMqttMapping[];
  managementScope: DataHubManagementScope;
}): {
  mapping: GenericMqttMapping;
  siteChoicePending: boolean;
} {
  const nextId = existing.length > 0 ? Math.min(0, ...existing.map((topic) => topic.id)) - 1 : -1;
  const resolvedScope = resolveCreateMetricScope(managementScope);
  const siteChoicePending = resolvedScope === null;
  return {
    mapping: {
      enabled: true,
      id: nextId,
      lastReceivedAt: null,
      lastValue: null,
      metricKey: "custom.metric",
      metricScope: resolvedScope ?? "cl",
      multiplier: 1,
      nameEn: "",
      nameZh: "自訂指標",
      quality: null,
      topic: resolvedScope ? `custom/${resolvedScope}/metric` : "custom/site/metric",
      unit: "kW",
      updatedAt: null,
      valuePath: "$.value"
    },
    siteChoicePending
  };
}

export function validateGenericMappingForSave(
  mapping: GenericMqttMapping,
  siteChoicePending: boolean
) {
  if (!siteChoicePending && !isSolarAdapterManagedMetricIdentity(mapping.metricScope, mapping.metricKey)) {
    if (mapping.metricScope === "global") {
      return { message: null, ok: true as const };
    }
  }
  if (siteChoicePending) {
    const choice = validatePhysicalMeterSiteChoice(null);
    return { message: choice.ok ? null : choice.message, ok: false as const };
  }
  if (isSolarAdapterManagedMetricIdentity(mapping.metricScope, mapping.metricKey)) {
    return { message: "此指標由系統託管，對應欄位無法編輯。", ok: false as const };
  }
  return { message: null, ok: true as const };
}

export function buildWorkspaceHealthSummary(
  rows: SourceRow[],
  scope: DataHubManagementScope
): WorkspaceHealthSummary {
  const scoped = rows.filter((row) => matchesSourceScope(row, scope));
  const issues = scoped.filter((row) => isIssueHealth(row.health));
  if (scoped.length === 0) {
    return {
      emptyReason: "目前這個範圍還沒有可顯示的資料來源。",
      hasData: false,
      issueCount: 0,
      issueExplanations: [],
      lastUpdated: null,
      managedCount: 0,
      operatorCount: 0,
      scopeLabel: scopeLabels[scope],
      sourceCount: 0
    };
  }
  return {
    emptyReason: null,
    hasData: true,
    issueCount: issues.length,
    issueExplanations: issues.map((row) => `${sourceDisplayName(row)}：${row.health.label}`),
    lastUpdated: scoped
      .map((row) => (row.kind === "generic" ? row.mapping.lastReceivedAt : null))
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null,
    managedCount: scoped.filter((row) => row.ownership === "managed").length,
    operatorCount: scoped.filter((row) => row.ownership === "operator").length,
    scopeLabel: scopeLabels[scope],
    sourceCount: scoped.length
  };
}

export function countSourceSummary(rows: SourceRow[]) {
  return {
    custom: rows.filter((row) => row.ownership === "operator").length,
    issues: rows.filter((row) => isIssueHealth(row.health)).length,
    managed: rows.filter((row) => row.ownership === "managed").length,
    total: rows.length
  };
}
