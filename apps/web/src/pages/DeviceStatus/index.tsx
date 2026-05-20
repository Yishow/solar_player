import { useEffect, useMemo, useState } from "react";
import { useDeviceDisplayOpsSummary } from "../../hooks/useDeviceDisplayOpsSummary";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import {
  getDeviceLogExportMetadata,
  getDeviceStatus,
  isManagementAccessDeniedError,
  runDeviceDisplayDiagnostic,
  type DeviceLogExportMetadata,
  type DeviceStatusResponseData
} from "../../services/api";
import "./device.css";
import {
  buildDeviceStatusViewModel,
  type DeviceActionFeedback
} from "./viewModel";
import { DeviceStatusContent } from "./DeviceStatusContent";
import { DEVICE_STATUS_DISPLAY_SYNC_SCOPES } from "../managementDisplaySyncScopes";

export function DeviceStatus() {
  const [status, setStatus] = useState<DeviceStatusResponseData | null>(null);
  const [statusAccessDenied, setStatusAccessDenied] = useState(false);
  const [logExport, setLogExport] = useState<DeviceLogExportMetadata | null>(null);
  const [logExportAccessDenied, setLogExportAccessDenied] = useState(false);
  const [logExportError, setLogExportError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<DeviceActionFeedback>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const {
    accessDenied: displayOpsAccessDenied,
    errorMessage: displayOpsErrorMessage,
    reload: reloadDisplayOpsSummary,
    summary: displayOpsSummary
  } = useDeviceDisplayOpsSummary();

  const formatGeneratedAt = (value: string) =>
    new Date(value).toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const [statusResult, logExportResult] = await Promise.allSettled([
        getDeviceStatus(),
        getDeviceLogExportMetadata()
      ]);

      if (statusResult.status === "fulfilled") {
        setStatus(statusResult.value);
        setStatusAccessDenied(false);
      } else if (isManagementAccessDeniedError(statusResult.reason)) {
        setStatus(null);
        setStatusAccessDenied(true);
      } else {
        throw statusResult.reason;
      }

      if (logExportResult.status === "fulfilled") {
        setLogExport(logExportResult.value);
        setLogExportAccessDenied(false);
        setLogExportError("");
      } else if (isManagementAccessDeniedError(logExportResult.reason)) {
        setLogExport(null);
        setLogExportAccessDenied(true);
        setLogExportError("");
      } else {
        setLogExport(null);
        setLogExportAccessDenied(false);
        setLogExportError(
          logExportResult.reason instanceof Error
            ? logExportResult.reason.message
            : "裝置日誌目前不可用。"
        );
      }

      setActionFeedback(
        statusResult.status === "rejected" && isManagementAccessDeniedError(statusResult.reason)
          ? {
              detail: "此頁面僅對受信任的管理端開放。",
              title: "存取受限",
              tone: "error"
            }
          : null
      );
    } catch (error) {
      setStatus(null);
      setStatusAccessDenied(false);
      setLogExport(null);
      setLogExportAccessDenied(false);
      setLogExportError("");
      setActionFeedback({
        detail: error instanceof Error ? error.message : "載入裝置狀態失敗。",
        title: "同步失敗",
        tone: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  useDisplaySyncRefresh(() => {
    void loadStatus();
    void reloadDisplayOpsSummary();
  }, DEVICE_STATUS_DISPLAY_SYNC_SCOPES);

  const handleDiagnostic = async (action: "export-summary" | "refresh-readiness", label: string) => {
    const hostRestartCommand =
      displayOpsSummary?.safeOpsGuidance.hostRestartCommand ?? "systemctl restart solar-display";
    setActiveAction(action);
    setActionFeedback({
      detail: `正在執行 ${label}，僅會觸發安全讀取或刷新；若需主機層處置請改走 ${hostRestartCommand}。`,
      title: `${label}中`,
      tone: "loading"
    });
    try {
      const result = await runDeviceDisplayDiagnostic(action);
      setActionFeedback({
        detail: `${result.message} ${formatGeneratedAt(result.generatedAt)} · ${result.summary.skipSummary.count} skipped · ${result.summary.readinessSummary.blockingCount} blocking · ${result.summary.assetHealthSummary.unhealthyCount} unhealthy · host: ${result.guidance.hostRestartCommand}`,
        title: label,
        tone: "ready"
      });
      await reloadDisplayOpsSummary();
    } catch (error) {
      setActionFeedback({
        detail: error instanceof Error ? error.message : "Display diagnostics 失敗。",
        title: `${label}失敗`,
        tone: "error"
      });
    } finally {
      setActiveAction(null);
    }
  };

  const viewModel = useMemo(
    () =>
      buildDeviceStatusViewModel({
        actionFeedback,
        displayOpsAccessDenied,
        displayOpsSummary,
        isLoading,
        logExport,
        logExportAccessDenied,
        logExportError,
        status,
        statusAccessDenied
      }),
    [
      actionFeedback,
      displayOpsAccessDenied,
      displayOpsSummary,
      isLoading,
      logExport,
      logExportAccessDenied,
      logExportError,
      status,
      statusAccessDenied
    ]
  );

  return (
    <DeviceStatusContent
      activeAction={activeAction}
      displayOpsAccessDenied={displayOpsAccessDenied}
      displayOpsErrorMessage={displayOpsErrorMessage}
      handleDiagnostic={handleDiagnostic}
      isLoading={isLoading}
      status={status}
      viewModel={viewModel}
    />
  );
}
