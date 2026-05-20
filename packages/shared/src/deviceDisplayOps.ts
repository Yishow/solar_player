import type { DisplayOpsIssueCode } from "./displayOps.js";
import type { DisplayPageKey } from "./displayPageConfig.js";

export type DeviceDisplayDiagnosticAction = "export-summary" | "refresh-readiness";

export type DeviceDisplayAlert = {
  code: DisplayOpsIssueCode | "readiness-blocking";
  message: string;
  pageId?: DisplayPageKey;
  severity: "blocking" | "warning";
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
};

export type DeviceDisplayDiagnosticResult = {
  action: DeviceDisplayDiagnosticAction;
  generatedAt: string;
  message: string;
  summary: DeviceDisplayOpsSummary;
};
