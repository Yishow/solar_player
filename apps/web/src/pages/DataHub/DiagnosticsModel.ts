import type { LoaderFunctionArgs } from "react-router-dom";
import type { MetricScope } from "@solar-display/shared";
import { isMetricScope } from "@solar-display/shared";
import {
  getMonitoringDiagnostics,
  requestJson,
  resetTodayTrend,
  type ResetTodayTrendResponse,
  type MonitoringDiagnosticsResponse
} from "../../services/api";
import { isDataHubManagementScope, type DataHubManagementScope } from "../../app/dataHub";
import {
  fetchCardDataDiagnosticsModel,
  type CardDataDiagnosticsModel
} from "./CardDataDiagnosticsModel";

export const metricProvenanceNodeCategories = [
  "source-connection",
  "managed-source",
  "mqtt-topic",
  "semantic-metric",
  "calculation-setting",
  "derived-metric",
  "widget",
  "page",
  "readiness-consumer"
] as const;
export type MetricProvenanceNodeCategory = (typeof metricProvenanceNodeCategories)[number];

export const metricProvenanceEdgeKinds = ["produces", "depends-on", "used-by"] as const;
export type MetricProvenanceEdgeKind = (typeof metricProvenanceEdgeKinds)[number];

export type MetricProvenanceMetadataValue = string | number | boolean | null;
export type MetricProvenanceMetadata = Record<string, MetricProvenanceMetadataValue>;

export type MetricProvenanceNode = {
  category: MetricProvenanceNodeCategory;
  id: string;
  label: string;
  metadata?: MetricProvenanceMetadata;
  scope: MetricScope | null;
  status: string | null;
};

export type MetricProvenanceEdge = {
  from: string;
  kind: MetricProvenanceEdgeKind;
  to: string;
};

export type MetricProvenanceResponse = {
  edges: MetricProvenanceEdge[];
  generatedAt: string;
  maxDepth: number;
  maxNodes: number;
  metricKey: string;
  nodes: MetricProvenanceNode[];
  scope: MetricScope;
  truncated: boolean;
};

export type DataHubDiagnosticsModel = MetricProvenanceResponse;

export type DataHubMonitoringDiagnosticsModel = MonitoringDiagnosticsResponse;

export type DataHubDiagnosticsSelection = {
  metricKey: string;
  scope: MetricScope;
};

export type DataHubDiagnosticsRouteModel = {
  cardData: CardDataDiagnosticsModel | null;
  cardDataErrorMessage: string;
  errorMessage: string;
  monitoring: DataHubMonitoringDiagnosticsModel | null;
  monitoringErrorMessage: string;
  model: DataHubDiagnosticsModel | null;
  selection: DataHubDiagnosticsSelection | null;
  selectionMessage: string;
};

export function resolveMonitoringScope(requestUrl: string): DataHubManagementScope {
  const scope = new URL(requestUrl).searchParams.get("scope");
  return isDataHubManagementScope(scope) ? scope : "all";
}

export function buildMonitoringDiagnosticsPath(requestUrl: string) {
  const scope = resolveMonitoringScope(requestUrl);
  return `/api/data-source/monitoring-diagnostics?metricScope=${encodeURIComponent(scope)}`;
}

export function normalizeMonitoringDiagnostics(response: MonitoringDiagnosticsResponse): DataHubMonitoringDiagnosticsModel {
  return {
    generatedAt: response.generatedAt,
    requestedScope: response.requestedScope,
    summaries: response.summaries.map((summary) => ({
      anomalyMessages: [...summary.anomalyMessages],
      currentDaySnapshotCount: summary.currentDaySnapshotCount,
      hasCurrentDaySnapshots: summary.hasCurrentDaySnapshots,
      latestSnapshotAt: summary.latestSnapshotAt,
      latestSnapshotDate: summary.latestSnapshotDate,
      localDate: summary.localDate,
      metricScope: summary.metricScope,
      snapshotCount: summary.snapshotCount,
      snapshotSampleLimit: summary.snapshotSampleLimit
    }))
  };
}

export function canResetMonitoringSummary(
  model: DataHubMonitoringDiagnosticsModel | null,
  summary: DataHubMonitoringDiagnosticsModel["summaries"][number]
) {
  return model !== null && isMetricScope(model.requestedScope) && model.requestedScope === summary.metricScope;
}

export function buildMonitoringResetConfirmationMessage(metricScope: MetricScope) {
  const scopeLabel = { cl: "CL", global: "Global", kn: "KN" }[metricScope];
  return `確定要重設 ${scopeLabel} 今日曲線？只會刪除 ${scopeLabel} 今日 monitoring snapshots。`;
}

export type MonitoringTodayTrendResetResult =
  | {
      monitoring: DataHubMonitoringDiagnosticsModel;
      reloadErrorMessage: null;
      reset: ResetTodayTrendResponse;
    }
  | {
      monitoring: null;
      reloadErrorMessage: string;
      reset: ResetTodayTrendResponse;
    };

export function buildMonitoringResetFeedback(
  metricScope: MetricScope,
  deletedSnapshots: number,
  reloadErrorMessage: string | null
) {
  const scopeLabel = { cl: "CL", global: "Global", kn: "KN" }[metricScope];
  if (reloadErrorMessage !== null) {
    return `${scopeLabel} 重設已完成，但 monitoring diagnostics 重新載入失敗（刪除 ${deletedSnapshots} 筆 ${scopeLabel} monitoring snapshots；目前仍顯示重設前摘要）。`;
  }

  return `${scopeLabel} 今日曲線已重設，刪除 ${deletedSnapshots} 筆 ${scopeLabel} monitoring snapshots。`;
}

export async function resetMonitoringTodayTrend(metricScope: MetricScope): Promise<MonitoringTodayTrendResetResult> {
  const reset = await resetTodayTrend(metricScope);
  try {
    const monitoring = normalizeMonitoringDiagnostics(await getMonitoringDiagnostics(metricScope));
    return { monitoring, reloadErrorMessage: null, reset };
  } catch (error) {
    return {
      monitoring: null,
      reloadErrorMessage: error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Monitoring diagnostics 重新載入失敗。",
      reset
    };
  }
}

export async function fetchDataHubMonitoringDiagnosticsModel(requestUrl: string) {
  return normalizeMonitoringDiagnostics(await getMonitoringDiagnostics(resolveMonitoringScope(requestUrl)));
}

export function resolveDiagnosticsSelection(requestUrl: string): DataHubDiagnosticsSelection | null {
  const searchParams = new URL(requestUrl).searchParams;
  const metricKey = searchParams.get("metricKey")?.trim() ?? "";
  const scope = searchParams.get("scope");
  if (!metricKey || !isMetricScope(scope)) return null;
  return { metricKey, scope };
}

export function buildMetricProvenancePath(requestUrl: string): string | null {
  const selection = resolveDiagnosticsSelection(requestUrl);
  if (!selection) return null;
  return `/api/data-hub/provenance?metricKey=${encodeURIComponent(selection.metricKey)}&scope=${encodeURIComponent(selection.scope)}`;
}

export function normalizeMetricProvenance(response: MetricProvenanceResponse): DataHubDiagnosticsModel {
  return {
    ...response,
    edges: response.edges.map((edge) => ({ ...edge })),
    nodes: response.nodes.map((node) => ({
      ...node,
      metadata: node.metadata ? { ...node.metadata } : undefined
    }))
  };
}

export async function fetchDataHubDiagnosticsModel(requestUrl: string): Promise<DataHubDiagnosticsModel | null> {
  const path = buildMetricProvenancePath(requestUrl);
  if (!path) return null;
  const response = await requestJson<MetricProvenanceResponse>(path);
  return normalizeMetricProvenance(response);
}

export async function loadDataHubDiagnosticsRoute({ request }: LoaderFunctionArgs): Promise<DataHubDiagnosticsRouteModel> {
  let monitoring: DataHubMonitoringDiagnosticsModel | null = null;
  let monitoringErrorMessage = "";
  try {
    monitoring = await fetchDataHubMonitoringDiagnosticsModel(request.url);
  } catch {
    monitoringErrorMessage = "Monitoring diagnostics 資料同步失敗。";
  }

  const selection = resolveDiagnosticsSelection(request.url);
  if (!selection) {
    return {
      cardData: null,
      cardDataErrorMessage: "",
      errorMessage: "",
      monitoring,
      monitoringErrorMessage,
      model: null,
      selection: null,
      selectionMessage: "請輸入 metricKey 並選擇 CL、KN 或 Global scope。"
    };
  }

  try {
    const model = await fetchDataHubDiagnosticsModel(request.url);
    let cardData: CardDataDiagnosticsModel | null = null;
    let cardDataErrorMessage = "";
    try {
      cardData = await fetchCardDataDiagnosticsModel(selection);
    } catch {
      cardDataErrorMessage = "Card Data 資料同步失敗。";
    }

    return {
      cardData,
      cardDataErrorMessage,
      errorMessage: "",
      monitoring,
      monitoringErrorMessage,
      model,
      selection,
      selectionMessage: ""
    };
  } catch {
    return {
      cardData: null,
      cardDataErrorMessage: "",
      errorMessage: "Diagnostics 資料同步失敗。",
      monitoring,
      monitoringErrorMessage,
      model: null,
      selection,
      selectionMessage: ""
    };
  }
}
