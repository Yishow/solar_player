import { useEffect, useMemo, useState } from "react";
import { useDeviceDisplayOpsSummary } from "../../hooks/useDeviceDisplayOpsSummary";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import {
  getDeviceLogExportMetadata,
  getDeviceStatus,
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
  const [logExport, setLogExport] = useState<DeviceLogExportMetadata | null>(null);
  const [logExportError, setLogExportError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<DeviceActionFeedback>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const {
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

      if (statusResult.status !== "fulfilled") {
        throw statusResult.reason;
      }

      setStatus(statusResult.value);
      if (logExportResult.status === "fulfilled") {
        setLogExport(logExportResult.value);
        setLogExportError("");
      } else {
        setLogExport(null);
        setLogExportError(
          logExportResult.reason instanceof Error
            ? logExportResult.reason.message
            : "裝置日誌目前不可用。"
        );
      }
    } catch (error) {
      setStatus(null);
      setLogExport(null);
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
    setActiveAction(action);
    setActionFeedback({
      detail: `正在執行 ${label}，僅會觸發安全讀取或刷新。`,
      title: `${label}中`,
      tone: "loading"
    });
    try {
      const result = await runDeviceDisplayDiagnostic(action);
      setActionFeedback({
        detail: `${result.message} ${formatGeneratedAt(result.generatedAt)} · ${result.summary.skipSummary.count} skipped · ${result.summary.readinessSummary.blockingCount} blocking · ${result.summary.assetHealthSummary.unhealthyCount} unhealthy`,
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
        displayOpsSummary,
        isLoading,
        logExport,
        logExportError,
        status
      }),
    [actionFeedback, displayOpsSummary, isLoading, logExport, logExportError, status]
  );

  return (
    <DeviceStatusContent
      activeAction={activeAction}
      displayOpsErrorMessage={displayOpsErrorMessage}
      handleDiagnostic={handleDiagnostic}
      isLoading={isLoading}
      status={status}
      viewModel={viewModel}
    />
  );
}
