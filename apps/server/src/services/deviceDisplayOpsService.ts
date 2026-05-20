import type {
  DeviceDisplayDiagnosticAction,
  DeviceDisplayDiagnosticResult,
  DeviceDisplayOpsSummary
} from "@solar-display/shared";
import { readDisplayOpsSummary } from "./displayOpsService.js";
import { readDisplayReadinessReport } from "./displayReadinessService.js";

type MqttStatusLike = {
  connected: boolean;
  reason: string | null;
};

const diagnosticActions: DeviceDisplayOpsSummary["diagnosticActions"] = [
  { action: "refresh-readiness", label: "Refresh readiness" },
  { action: "export-summary", label: "Export summary" }
];

export function readDeviceDisplayOpsSummary(options: { mqttStatus: MqttStatusLike }): DeviceDisplayOpsSummary {
  const displayOps = readDisplayOpsSummary(options);
  const readiness = readDisplayReadinessReport();
  const assetAlerts = displayOps.blockingIssues.filter((issue) => issue.code === "asset-unhealthy");
  const affectedAssetPages = [
    ...new Set(assetAlerts.flatMap((issue) => issue.pageId ? [issue.pageId] : []))
  ];
  const runtimeReadinessAlerts = displayOps.blockingIssues.filter(
    (issue) =>
      issue.code === "data-not-ready" ||
      issue.code === "derived-metric-missing" ||
      issue.code === "mqtt-mapping-missing" ||
      issue.code === "slot-binding-conflict" ||
      issue.code === "slot-binding-missing" ||
      issue.code === "stale-runtime" ||
      issue.code === "unpublished"
  );
  const readinessAlerts = readiness.findings
    .filter((finding) => finding.blocking)
    .map((finding) => ({
      code: "readiness-blocking" as const,
      message: finding.reason,
      pageId: finding.pageId,
      severity: "blocking" as const
    }));

  return {
    alerts: [...assetAlerts, ...runtimeReadinessAlerts, ...readinessAlerts],
    assetHealthSummary: {
      affectedPages: affectedAssetPages,
      unhealthyCount: affectedAssetPages.length
    },
    degraded: displayOps.blockingIssues.length > 0 || readiness.summary.blockingCount > 0,
    diagnosticActions,
    draftCount: displayOps.draftCount,
    generatedAt: new Date().toISOString(),
    lastPublishAt: displayOps.lastPublishAt,
    liveVersion: displayOps.liveVersion,
    readinessSummary: {
      blockingCount: readiness.summary.blockingCount + runtimeReadinessAlerts.length,
      warningCount: readiness.summary.warningCount
    },
    skipSummary: {
      count: displayOps.skipCount,
      pages: displayOps.pages
        .filter((page) => page.skipState === "skipped")
        .map((page) => page.pageId)
    },
    triageSummary: displayOps.triageSummary ?? null
  };
}

export function runDeviceDisplayDiagnostic(input: {
  action: DeviceDisplayDiagnosticAction;
  mqttStatus: MqttStatusLike;
}): DeviceDisplayDiagnosticResult {
  const summary = readDeviceDisplayOpsSummary({
    mqttStatus: input.mqttStatus
  });

  return {
    action: input.action,
    generatedAt: summary.generatedAt,
    message:
      input.action === "refresh-readiness"
        ? "Refreshed the bounded display readiness summary."
        : "Exported the bounded display operations summary snapshot.",
    summary
  };
}
