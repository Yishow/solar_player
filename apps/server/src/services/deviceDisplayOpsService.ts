import type {
  DeviceDisplayDiagnosticAction,
  DeviceDisplayDiagnosticResult,
  DeviceDisplayAlert,
  DeviceDisplayOpsSummary,
  DeviceSafeOpsGuidance,
  DeviceUnsupportedControlAction,
  DeviceUnsupportedControlResult
} from "@solar-display/shared";
import { resolveDisplayFaultTriageSummaryFromAlerts } from "@solar-display/shared";
import { readDisplayOpsSummary } from "./displayOpsService.js";
import { readDisplayReadinessReport } from "./displayReadinessService.js";

type MqttStatusLike = {
  connected: boolean;
  reason: string | null;
};

const safeOpsGuidance: DeviceSafeOpsGuidance = {
  hostRestartCommand: "systemctl restart solar-display",
  hostRestartLabel: "Host-level restart",
  runbookPath: "docs/runbooks/device-diagnostics-safe-ops.md",
  unsupportedOperations: [
    {
      action: "reboot",
      executed: false,
      guidance: "Reboot is not executed in-app. Follow the host-level restart runbook instead.",
      label: "Reboot device"
    },
    {
      action: "clear-cache",
      executed: false,
      guidance: "Cache purge is not supported in-app. Use the host-level runbook if recovery is required.",
      label: "Clear cache"
    }
  ]
};

const diagnosticActions: DeviceDisplayOpsSummary["diagnosticActions"] = [
  { action: "refresh-readiness", label: "Refresh readiness", safeScope: "safe-refresh" },
  { action: "export-summary", label: "Export summary", safeScope: "safe-read" }
];

function toConfigurationReadinessAlert(
  finding: ReturnType<typeof readDisplayReadinessReport>["findings"][number]
): DeviceDisplayAlert {
  if (finding.sourceType === "mqtt-metric") {
    return {
      code: "mqtt-mapping-missing",
      domain: "configuration-readiness",
      message: finding.reason,
      pageId: finding.pageId,
      severity: "blocking"
    };
  }

  if (finding.sourceType === "circuit-slot") {
    return {
      code: finding.reason.startsWith("slot conflict:")
        ? "slot-binding-conflict"
        : "slot-binding-missing",
      domain: "configuration-readiness",
      message: finding.reason,
      pageId: finding.pageId,
      severity: "blocking"
    };
  }

  return {
    code: "readiness-blocking",
    domain: "configuration-readiness",
    message: finding.reason,
    pageId: finding.pageId,
    severity: "blocking"
  };
}

function toOperationalHealthAlert(
  issue: ReturnType<typeof readDisplayOpsSummary>["blockingIssues"][number]
): DeviceDisplayAlert {
  return {
    ...issue,
    domain: "operational-health"
  };
}

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
      issue.code === "stale-runtime" ||
      issue.code === "draft-pending" ||
      issue.code === "live-reference" ||
      issue.code === "skip-active" ||
      issue.code === "unpublished"
  );
  const readinessAlerts = readiness.findings
    .filter((finding) => finding.blocking)
    .map(toConfigurationReadinessAlert);
  const operationalAlerts = [...assetAlerts, ...runtimeReadinessAlerts].map(
    toOperationalHealthAlert
  );
  const configurationReadinessSummary = {
    blockingCount: readiness.summary.blockingCount,
    warningCount: readiness.summary.warningCount
  };
  const operationalHealthSummary = {
    blockingCount: operationalAlerts.filter((alert) => alert.severity === "blocking").length,
    degraded: operationalAlerts.length > 0,
    warningCount: operationalAlerts.filter((alert) => alert.severity === "warning").length
  };
  const alerts = [...operationalAlerts, ...readinessAlerts];

  return {
    alerts,
    assetHealthSummary: {
      affectedPages: affectedAssetPages,
      unhealthyCount: affectedAssetPages.length
    },
    configurationReadinessSummary,
    degraded: operationalHealthSummary.degraded,
    diagnosticActions,
    draftCount: displayOps.draftCount,
    generatedAt: new Date().toISOString(),
    lastPublishAt: displayOps.lastPublishAt,
    liveVersion: displayOps.liveVersion,
    operationalHealthSummary,
    skipSummary: {
      count: displayOps.skipCount,
      pages: displayOps.pages
        .filter((page) => page.skipState === "skipped")
        .map((page) => page.pageId)
    },
    safeOpsGuidance,
    triageSummary: resolveDisplayFaultTriageSummaryFromAlerts(alerts) ?? null
  };
}

export function runDeviceDisplayDiagnostic(input: {
  action: DeviceDisplayDiagnosticAction;
  mqttStatus: MqttStatusLike;
}): DeviceDisplayDiagnosticResult {
  const summary = readDeviceDisplayOpsSummary({
    mqttStatus: input.mqttStatus
  });
  const actionDefinition = summary.diagnosticActions.find(
    (candidate) => candidate.action === input.action
  );

  return {
    action: input.action,
    generatedAt: summary.generatedAt,
    guidance: summary.safeOpsGuidance,
    message:
      input.action === "refresh-readiness"
        ? "Refreshed the bounded display readiness summary."
        : "Exported the bounded display operations summary snapshot.",
    safeScope: actionDefinition?.safeScope ?? "safe-read",
    summary
  };
}

export function buildUnsupportedDeviceControlResult(
  action: DeviceUnsupportedControlAction
): DeviceUnsupportedControlResult {
  const guidance = safeOpsGuidance;
  const operation = guidance.unsupportedOperations.find(
    (candidate) => candidate.action === action
  );

  return {
    action,
    executed: false,
    guidance,
    message:
      operation?.guidance
      ?? "This device control is not executed in-app. Follow the host-level runbook instead."
  };
}
