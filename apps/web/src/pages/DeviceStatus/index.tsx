import { useEffect, useMemo, useState } from "react";
import { useDeviceDisplayOpsSummary } from "../../hooks/useDeviceDisplayOpsSummary";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import {
  getDeviceLogExportMetadata,
  getDeviceStatus,
  isManagementAccessDeniedError,
  runDeviceKioskExit,
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
import {
  loadDeviceStatusModel,
  readCachedDeviceStatusModel
} from "./loadModel";

type DeviceStatusLoadOptions = {
  preserveProtectedState?: boolean;
  silent?: boolean;
};

export async function loadDeviceStatusRoute() {
  try {
    await loadDeviceStatusModel();
  } catch {
    // Component-level loaders preserve existing partial error states.
  }
  return null;
}

export function DeviceStatus() {
  const [initialDeviceStatusModel] = useState(() => readCachedDeviceStatusModel());
  const [status, setStatus] = useState<DeviceStatusResponseData | null>(initialDeviceStatusModel?.status ?? null);
  const [statusAccessDenied, setStatusAccessDenied] = useState(false);
  const [logExport, setLogExport] = useState<DeviceLogExportMetadata | null>(initialDeviceStatusModel?.logExport ?? null);
  const [logExportAccessDenied, setLogExportAccessDenied] = useState(false);
  const [logExportError, setLogExportError] = useState("");
  const [statusLoading, setStatusLoading] = useState(initialDeviceStatusModel === null);
  const [logExportLoading, setLogExportLoading] = useState(initialDeviceStatusModel === null);
  const [actionFeedback, setActionFeedback] = useState<DeviceActionFeedback>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const {
    accessDenied: displayOpsAccessDenied,
    errorMessage: displayOpsErrorMessage,
    isLoading: displayOpsLoading,
    reload: reloadDisplayOpsSummary,
    summary: displayOpsSummary
  } = useDeviceDisplayOpsSummary(initialDeviceStatusModel?.displayOpsSummary);

  const formatGeneratedAt = (value: string) =>
    new Date(value).toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  const kioskReentryHint = "回到桌面後點擊 Solar Display Kiosk 重新進入。";

  const loadDeviceStatus = async ({
    preserveProtectedState = false,
    silent = false
  }: DeviceStatusLoadOptions = {}) => {
    if (!silent) {
      setStatusLoading(true);
    }
    try {
      setStatus(await getDeviceStatus());
      setStatusAccessDenied(false);
      if (!preserveProtectedState) {
        setActionFeedback(null);
      }
    } catch (error) {
      const nextFeedback: DeviceActionFeedback = isManagementAccessDeniedError(error)
        ? {
            detail: "此頁面僅對受信任的管理端開放。",
            title: "存取受限",
            tone: "error"
          }
        : {
            detail: error instanceof Error ? error.message : "載入裝置狀態失敗。",
            title: "同步失敗",
            tone: "error"
          };
      if (!preserveProtectedState) {
        setStatus(null);
      }
      if (isManagementAccessDeniedError(error)) {
        setStatusAccessDenied(true);
      } else {
        setStatusAccessDenied(false);
      }
      setActionFeedback((current) => (preserveProtectedState && current ? current : nextFeedback));
    } finally {
      if (!silent) {
        setStatusLoading(false);
      }
    }
  };

  const loadLogExportMetadata = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLogExportLoading(true);
    }
    try {
      setLogExport(await getDeviceLogExportMetadata());
      setLogExportAccessDenied(false);
      setLogExportError("");
    } catch (error) {
      setLogExport(null);
      if (isManagementAccessDeniedError(error)) {
        setLogExportAccessDenied(true);
        setLogExportError("");
      } else {
        setLogExportAccessDenied(false);
        setLogExportError(error instanceof Error ? error.message : "裝置日誌目前不可用。");
      }
    } finally {
      if (!silent) {
        setLogExportLoading(false);
      }
    }
  };

  useEffect(() => {
    if (initialDeviceStatusModel) {
      void loadDeviceStatus({ preserveProtectedState: true, silent: true });
      void loadLogExportMetadata({ silent: true });
      return;
    }

    void loadDeviceStatus();
    void loadLogExportMetadata();
  }, [initialDeviceStatusModel]);

  useDisplaySyncRefresh(() => {
    void loadDeviceStatus({ preserveProtectedState: true });
    void loadLogExportMetadata();
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
        detail: `${result.message} ${formatGeneratedAt(result.generatedAt)} · operational: ${result.summary.operationalHealthSummary.blockingCount} blocking · config: ${result.summary.configurationReadinessSummary.blockingCount} blocking · ${result.summary.skipSummary.count} skipped · ${result.summary.assetHealthSummary.unhealthyCount} unhealthy · host: ${result.guidance.hostRestartCommand}`,
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

  const handleKioskExit = async () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "確認離開展示系統？關閉後可從桌面點 Solar Display Kiosk 重新進入。"
      );
      if (!confirmed) {
        return;
      }
    }

    setActiveAction("kiosk-exit");
    setActionFeedback({
      detail: `正在關閉展示瀏覽器。${kioskReentryHint}`,
      title: "正在離開系統",
      tone: "loading"
    });

    try {
      const result = await runDeviceKioskExit();
      setActionFeedback({
        detail: `已送出離開指令。${result.reentryHint}`,
        title: "已送出離開指令",
        tone: "ready"
      });
    } catch (error) {
      setActionFeedback({
        detail: error instanceof Error ? error.message : "離開展示系統失敗。",
        title: "離開系統失敗",
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
        displayOpsLoading,
        displayOpsSummary,
        isLoading: statusLoading,
        logExport,
        logExportAccessDenied,
        logExportError,
        logExportLoading,
        status,
        statusAccessDenied
      }),
    [
      actionFeedback,
      displayOpsAccessDenied,
      displayOpsLoading,
      displayOpsSummary,
      statusLoading,
      logExport,
      logExportAccessDenied,
      logExportError,
      logExportLoading,
      status,
      statusAccessDenied
    ]
  );

  return (
    <DeviceStatusContent
      activeAction={activeAction}
      displayOpsAccessDenied={displayOpsAccessDenied}
      displayOpsErrorMessage={displayOpsErrorMessage}
      displayOpsLoading={displayOpsLoading}
      handleDiagnostic={handleDiagnostic}
      handleKioskExit={handleKioskExit}
      isLoading={statusLoading}
      status={status}
      viewModel={viewModel}
    />
  );
}
