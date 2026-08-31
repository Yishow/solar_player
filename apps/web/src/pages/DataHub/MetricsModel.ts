import type { LoaderFunctionArgs } from "react-router-dom";
import type { MetricScope } from "@solar-display/shared";
import { isDataHubManagementScope, type DataHubManagementScope } from "../../app/dataHub";
import { requestJson } from "../../services/api";

export type MetricInventoryDependency = {
  alias: string;
  kind: "metric" | "calculation-setting";
  metricKey?: string;
  metricScope?: MetricScope;
  settingKey?: string;
  unit: string;
};

export type MetricInventoryRow = {
  evaluation: {
    evaluatedAt: string | null;
    failureCode: string | null;
    freshnessState: "fresh" | "stale" | "unavailable" | null;
    retainedLastGood: boolean;
    status: "ready" | "degraded" | "unavailable" | "not-evaluated";
  } | null;
  evaluationState: "ready" | "degraded" | "unavailable" | "not-evaluated";
  freshness: {
    ageMs: number | null;
    category: string;
    nextTransitionAt: string | null;
    sourceTimestamp: string | null;
    state: "live" | "delayed" | "stale" | "historical" | "unavailable";
  } | null;
  freshnessState: "live" | "delayed" | "stale" | "historical" | "unavailable";
  id: string;
  label: string;
  metricKey: string;
  metricScope: MetricScope;
  ownership: "managed" | "operator" | "catalog";
  provenance: {
    dependencies: MetricInventoryDependency[];
    sourceId: string | null;
    sourceTimestamp: string | null;
    sourceTopic: string | null;
  };
  sourceClass: string;
  unit: string | null;
  value: number | null;
};

export type MetricsInventoryResponse = {
  generatedAt: string;
  metrics: MetricInventoryRow[];
  scope: DataHubManagementScope;
};

export type DataHubMetricsModel = MetricsInventoryResponse;

export type DataHubMetricsRouteModel = {
  errorMessage: string;
  model: DataHubMetricsModel | null;
};

function resolveScope(requestUrl: string): DataHubManagementScope {
  const requestedScope = new URL(requestUrl).searchParams.get("scope");
  return isDataHubManagementScope(requestedScope) ? requestedScope : "all";
}

export function buildMetricsInventoryPath(requestUrl: string) {
  return `/api/data-hub/metrics?scope=${encodeURIComponent(resolveScope(requestUrl))}`;
}

export function normalizeMetricsInventory(response: MetricsInventoryResponse): DataHubMetricsModel {
  return {
    generatedAt: response.generatedAt,
    scope: response.scope,
    metrics: response.metrics.map((row) => ({
      evaluation: row.evaluation ? { ...row.evaluation } : null,
      evaluationState: row.evaluationState,
      freshness: row.freshness ? { ...row.freshness } : null,
      freshnessState: row.freshnessState,
      id: `${row.metricScope}:${row.metricKey}`,
      label: row.label,
      metricKey: row.metricKey,
      metricScope: row.metricScope,
      ownership: row.ownership,
      provenance: {
        dependencies: row.provenance.dependencies.map((dependency) => ({ ...dependency })),
        sourceId: row.provenance.sourceId,
        sourceTimestamp: row.provenance.sourceTimestamp,
        sourceTopic: row.provenance.sourceTopic
      },
      sourceClass: row.sourceClass,
      unit: row.unit,
      value: row.value
    }))
  };
}

export async function fetchDataHubMetricsModel(requestUrl: string) {
  const response = await requestJson<MetricsInventoryResponse>(buildMetricsInventoryPath(requestUrl));
  return normalizeMetricsInventory(response);
}

export async function loadDataHubMetricsRoute({ request }: LoaderFunctionArgs): Promise<DataHubMetricsRouteModel> {
  try {
    return {
      errorMessage: "",
      model: await fetchDataHubMetricsModel(request.url)
    };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : "Metrics 資料同步失敗。",
      model: null
    };
  }
}
