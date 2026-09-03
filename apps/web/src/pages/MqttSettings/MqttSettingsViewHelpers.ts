import type {
  DisplayCardDataAction,
  DisplayCardDataRow,
  DerivedMetricDependencyIdentity
} from "@solar-display/shared";
import type { CardDataSiteFilter } from "./MqttSettingsContent.types";
import type { buildMqttSettingsViewModel } from "./viewModel";

export type MqttSettingsViewModel = ReturnType<typeof buildMqttSettingsViewModel>;

export function resolveConnStatus(statusTone: "connected" | "connecting" | "disconnected") {
  if (statusTone === "connected") return "is-connected";
  if (statusTone === "disconnected") return "is-error";
  return "is-warning";
}

export function resolveCoverageChipClass(stateLabel: string) {
  if (stateLabel === "Ready") return "mgmt-chip is-success";
  if (stateLabel === "Mapping Gap") return "mgmt-chip is-danger";
  if (stateLabel === "Idle Runtime") return "mgmt-chip is-warning";
  return "mgmt-chip";
}

export function resolveCardDataPageLabel(pageId: string) {
  if (pageId === "factory-circuit") return "Factory Circuit";
  if (pageId === "factory-circuit-guanyin") return "Factory Circuit (Guanyin)";
  if (pageId === "overview") return "Overview";
  if (pageId === "solar") return "Solar";
  if (pageId === "sustainability") return "Sustainability";
  return pageId;
}

export function isCardDataRowVisibleForSite(row: DisplayCardDataRow, site: CardDataSiteFilter) {
  if (row.pageId === "factory-circuit") return site === "jungli";
  if (row.pageId === "factory-circuit-guanyin") return site === "guanyin";
  return true;
}

export function resolveCardDataStatusClass(status: string) {
  if (status === "ready") return "mgmt-chip is-success";
  if (status === "missing-topic" || status === "formula-input-missing") return "mgmt-chip is-danger";
  if (status === "overridden") return "mgmt-chip is-success";
  return "mgmt-chip is-warning";
}

export function formatDerivedProvenance(dependencies: DerivedMetricDependencyIdentity[]): string {
  const entries: string[] = [];
  const visit = (dependency: DerivedMetricDependencyIdentity) => {
    entries.push(
      dependency.kind === "metric"
        ? `${dependency.metricScope ?? "?"}/${dependency.metricKey ?? dependency.alias}${dependency.sourceTopic ? `=${dependency.sourceTopic}` : ""}`
        : `setting/${dependency.settingKey ?? dependency.alias}@${dependency.settingRevision ?? "?"}`
    );
    dependency.upstream?.forEach(visit);
  };
  dependencies.forEach(visit);
  return entries.join(" → ");
}

export function isPublishAction(
  action: DisplayCardDataAction
): action is DisplayCardDataAction & { metricKey: string; type: "publish-test-value" } {
  return action.type === "publish-test-value" && "metricKey" in action;
}

export function isConfigureTopicAction(
  action: DisplayCardDataAction
): action is DisplayCardDataAction & { metricKey: string; type: "configure-topic" } {
  return action.type === "configure-topic" && "metricKey" in action;
}

export function isCalculationAction(
  action: DisplayCardDataAction
): action is Extract<DisplayCardDataAction, { type: "edit-calculation-settings" }> {
  return action.type === "edit-calculation-settings";
}
