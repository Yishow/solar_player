import type {
  DisplayOpsBlockingIssue,
  DisplayOpsIssueCode,
  DisplayOpsSummary
} from "./displayOps.js";
import type { DisplayPageKey } from "./displayPageConfig.js";

export type DeviceDisplayDiagnosticAction = "export-summary" | "refresh-readiness";

export type DeviceDisplayAlert = {
  code: DisplayOpsIssueCode | "readiness-blocking";
  message: string;
  pageId?: DisplayPageKey;
  severity: "blocking" | "warning";
};

export type DisplayFaultTriageKind =
  | "asset-health"
  | "mqtt-mapping"
  | "other"
  | "publish-state"
  | "runtime-readiness"
  | "slot-binding";

export type DisplayFaultRepairDestinationKey =
  | "circuit-settings"
  | "display-pages-editor"
  | "global-guidance"
  | "mqtt-settings"
  | "playback-settings";

export type DisplayFaultRepairDestinationLabel =
  | "Circuit Settings"
  | "Display Pages Editor"
  | "MQTT Settings"
  | "Playback Settings";

export type DisplayFaultTriageSummary = {
  affectedPages: DisplayPageKey[];
  dominantReason: string;
  faultKind: DisplayFaultTriageKind;
  repairDestinationKey: DisplayFaultRepairDestinationKey;
  repairDestinationLabel: DisplayFaultRepairDestinationLabel | null;
  sourceIssueCode: DeviceDisplayAlert["code"];
};

export type DeviceDisplayOpsSummary = {
  alerts: DeviceDisplayAlert[];
  assetHealthSummary: {
    affectedPages: DisplayPageKey[];
    unhealthyCount: number;
  };
  degraded: boolean;
  diagnosticActions: Array<{
    action: DeviceDisplayDiagnosticAction;
    label: string;
  }>;
  draftCount: number;
  generatedAt: string;
  lastPublishAt: string | null;
  liveVersion: number | null;
  readinessSummary: {
    blockingCount: number;
    warningCount: number;
  };
  skipSummary: {
    count: number;
    pages: DisplayPageKey[];
  };
  triageSummary?: DisplayFaultTriageSummary | null;
};

export type DeviceDisplayDiagnosticResult = {
  action: DeviceDisplayDiagnosticAction;
  generatedAt: string;
  message: string;
  summary: DeviceDisplayOpsSummary;
};

type TriageIssue = Pick<DeviceDisplayAlert, "code" | "message" | "pageId" | "severity">;

const triageIssuePriority: Record<DeviceDisplayAlert["code"], number> = {
  "asset-unhealthy": 6,
  "data-not-ready": 5,
  "derived-metric-missing": 5,
  "draft-pending": 8,
  "live-reference": 9,
  "mqtt-mapping-missing": 1,
  "readiness-blocking": 5,
  "skip-active": 7,
  "slot-binding-conflict": 2,
  "slot-binding-missing": 2,
  "stale-runtime": 3,
  "unpublished": 4
};

function compareTriageIssues(
  left: { index: number; issue: TriageIssue },
  right: { index: number; issue: TriageIssue }
) {
  if (left.issue.severity !== right.issue.severity) {
    return left.issue.severity === "blocking" ? -1 : 1;
  }

  const priorityDelta =
    triageIssuePriority[left.issue.code] - triageIssuePriority[right.issue.code];
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return left.index - right.index;
}

function resolveTriageMetadata(code: DeviceDisplayAlert["code"]) {
  switch (code) {
    case "mqtt-mapping-missing":
      return {
        faultKind: "mqtt-mapping" as const,
        repairDestinationKey: "mqtt-settings" as const,
        repairDestinationLabel: "MQTT Settings" as const
      };
    case "slot-binding-conflict":
    case "slot-binding-missing":
      return {
        faultKind: "slot-binding" as const,
        repairDestinationKey: "circuit-settings" as const,
        repairDestinationLabel: "Circuit Settings" as const
      };
    case "stale-runtime":
    case "data-not-ready":
    case "derived-metric-missing":
    case "readiness-blocking":
    case "skip-active":
      return {
        faultKind: "runtime-readiness" as const,
        repairDestinationKey: "playback-settings" as const,
        repairDestinationLabel: "Playback Settings" as const
      };
    case "unpublished":
    case "draft-pending":
      return {
        faultKind: "publish-state" as const,
        repairDestinationKey: "display-pages-editor" as const,
        repairDestinationLabel: "Display Pages Editor" as const
      };
    case "asset-unhealthy":
      return {
        faultKind: "asset-health" as const,
        repairDestinationKey: "display-pages-editor" as const,
        repairDestinationLabel: "Display Pages Editor" as const
      };
    default:
      return {
        faultKind: "other" as const,
        repairDestinationKey: "global-guidance" as const,
        repairDestinationLabel: null
      };
  }
}

function buildDisplayFaultTriageSummaryFromIssues(
  issues: TriageIssue[]
): DisplayFaultTriageSummary | null {
  const dominant = issues
    .map((issue, index) => ({ index, issue }))
    .sort(compareTriageIssues)[0]?.issue;

  if (!dominant) {
    return null;
  }

  const affectedPages = [
    ...new Set(
      issues.flatMap((issue) => (
        issue.code === dominant.code && issue.pageId ? [issue.pageId] : []
      ))
    )
  ];
  const metadata = resolveTriageMetadata(dominant.code);

  return {
    affectedPages: affectedPages.length > 0 && dominant.pageId
      ? affectedPages
      : dominant.pageId
        ? [dominant.pageId]
        : affectedPages,
    dominantReason: dominant.message,
    faultKind: metadata.faultKind,
    repairDestinationKey: metadata.repairDestinationKey,
    repairDestinationLabel: metadata.repairDestinationLabel,
    sourceIssueCode: dominant.code
  };
}

export function resolveDisplayFaultTriageSummaryFromDisplayOps(
  summary: Pick<DisplayOpsSummary, "blockingIssues"> | null | undefined
) {
  return buildDisplayFaultTriageSummaryFromIssues(
    summary?.blockingIssues ?? []
  );
}

export function resolveDisplayFaultTriageSummaryFromAlerts(
  alerts: Array<Pick<DisplayOpsBlockingIssue, "code" | "message" | "pageId" | "severity">>
    | Array<TriageIssue>
    | null
    | undefined
) {
  return buildDisplayFaultTriageSummaryFromIssues(alerts ?? []);
}
