import type { MetricScope } from "@solar-display/shared";
import type { DataHubManagementScope } from "../../app/dataHub";
import type { MetricUsageRow } from "./UsageModel";

const concreteMetricScopes = ["cl", "kn", "global"] as const;

function isConcreteMetricScope(value: unknown): value is MetricScope {
  return concreteMetricScopes.includes(value as MetricScope);
}

function encode(value: string) {
  return encodeURIComponent(value);
}

export function buildDataHubUsageHref(metricKey: string, scope: MetricScope) {
  return `/settings/data-hub/usage?metricKey=${encode(metricKey)}&scope=${encode(scope)}`;
}

export function buildDataHubDiagnosticsHref(metricKey: string, scope?: MetricScope | null) {
  const scopeQuery = scope ? `&scope=${encode(scope)}` : "";
  return `/settings/data-hub/diagnostics?metricKey=${encode(metricKey)}${scopeQuery}`;
}

export function buildDisplayEditorDataHref(pageId: string, itemId: string) {
  return `/display-pages/editor?page=${encode(pageId)}&item=${encode(itemId)}&tab=data`;
}

export function resolveMetricUsageDiagnosticsScope(
  row: Pick<MetricUsageRow, "configuredScope" | "inherited">,
  managementScope: DataHubManagementScope
): MetricScope | null {
  if (isConcreteMetricScope(row.configuredScope)) {
    return row.configuredScope;
  }

  if (
    (row.inherited || row.configuredScope === "inherit-device")
    && isConcreteMetricScope(managementScope)
  ) {
    return managementScope;
  }

  return null;
}

export function buildMetricUsageDiagnosticsHref(
  row: Pick<MetricUsageRow, "configuredScope" | "consumerType" | "inherited" | "metricKey">,
  managementScope: DataHubManagementScope
) {
  return buildDataHubDiagnosticsHref(
    row.metricKey,
    resolveMetricUsageDiagnosticsScope(row, managementScope)
  );
}

export function buildMetricUsageDisplayEditorHref(
  row: Pick<MetricUsageRow, "consumerType" | "itemId" | "pageId">
) {
  if (row.consumerType !== "widget" || !row.pageId || !row.itemId) {
    return null;
  }

  return buildDisplayEditorDataHref(row.pageId, row.itemId);
}
