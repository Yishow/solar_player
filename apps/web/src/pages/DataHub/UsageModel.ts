import type { LoaderFunctionArgs } from "react-router-dom";
import type { MetricDataBindingScope } from "@solar-display/shared";
import { isDataHubManagementScope, type DataHubManagementScope } from "../../app/dataHub";
import { requestJson } from "../../services/api";

export type MetricUsageConsumerType = "widget" | "story" | "readiness";

export type MetricUsageRow = {
  configuredBindingScope: MetricDataBindingScope | null;
  configuredScope: MetricDataBindingScope | null;
  consumerId: string;
  consumerType: MetricUsageConsumerType;
  inherited: boolean;
  itemId: string | null;
  labelEn: string | null;
  labelZh: string | null;
  metricKey: string;
  pageId: string;
  pageInstanceId: number | null;
  pageKey: string;
  pageLabelEn: string | null;
  pageLabelZh: string | null;
  scopeLabel: string;
  templateKey: string;
};

export type MetricUsageResponse = {
  generatedAt: string;
  scope: DataHubManagementScope;
  usage: MetricUsageRow[];
};

export type DataHubUsageModel = MetricUsageResponse;

export type DataHubUsageRouteModel = {
  errorMessage: string;
  model: DataHubUsageModel | null;
};

function resolveScope(requestUrl: string): DataHubManagementScope {
  const requestedScope = new URL(requestUrl).searchParams.get("scope");
  return isDataHubManagementScope(requestedScope) ? requestedScope : "all";
}

function resolveMetricKey(requestUrl: string) {
  return new URL(requestUrl).searchParams.get("metricKey")?.trim() ?? "";
}

export function buildMetricUsagePath(requestUrl: string) {
  return `/api/data-hub/usage?metricKey=${encodeURIComponent(resolveMetricKey(requestUrl))}&scope=${encodeURIComponent(resolveScope(requestUrl))}`;
}

export function normalizeMetricUsage(response: MetricUsageResponse): DataHubUsageModel {
  return {
    generatedAt: response.generatedAt,
    scope: response.scope,
    usage: response.usage.map((row) => ({
      ...row,
      configuredBindingScope: row.configuredBindingScope,
      configuredScope: row.configuredScope,
      inherited: row.inherited || row.configuredScope === "inherit-device",
      scopeLabel: row.inherited || row.configuredScope === "inherit-device"
        ? "inherited"
        : row.scopeLabel
    }))
  };
}

export async function fetchDataHubUsageModel(requestUrl: string) {
  const response = await requestJson<MetricUsageResponse>(buildMetricUsagePath(requestUrl));
  return normalizeMetricUsage(response);
}

export async function loadDataHubUsageRoute({ request }: LoaderFunctionArgs): Promise<DataHubUsageRouteModel> {
  try {
    return {
      errorMessage: "",
      model: await fetchDataHubUsageModel(request.url)
    };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : "Usage 資料同步失敗。",
      model: null
    };
  }
}
