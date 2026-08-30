import {
  resolveDisplayFaultTriageSummaryFromAlerts,
  type AppTimeSnapshot,
  type DeviceDisplayOpsSummary,
  type DeviceSafeOpsGuidance
} from "@solar-display/shared";
import type {
  DeviceLogSummary
} from "../../services/api";
import {
  displayClientPageLabels,
  formatTriageHelper,
  formatTriagePages,
  localizeActionLabel,
  localizeAlertMessage,
  localizeRepairDestination,
  localizeSafeScope,
  localizeTriageKind
} from "./localization";
import {
  buildDisplayClientSummary,
  buildLogsSummary,
  buildReleaseRows,
  buildResourceCards,
  buildRuntimeSummary,
  buildUnpairedDisplayAccessSummary,
  formatFanTelemetry,
  formatServerTime,
  formatTimestamp,
  formatTimeSyncStatus,
  formatUptime,
  type DeviceRouteStatus,
  type SystemRowItem
} from "./formatters";

export type DeviceActionFeedback = {
  detail: string;
  title: string;
  tone: "error" | "loading" | "ready";
} | null;

export type BuildDeviceStatusViewModelArgs = {
  actionFeedback: DeviceActionFeedback;
  appTime?: AppTimeSnapshot;
  displayOpsAccessDenied?: boolean;
  displayOpsLoading?: boolean;
  displayOpsSummary?: DeviceDisplayOpsSummary | null;
  isLoading: boolean;
  logSummary: DeviceLogSummary | null;
  logSummaryAccessDenied?: boolean;
  logSummaryError: string;
  logSummaryLoading?: boolean;
  now?: Date;
  status: DeviceRouteStatus | null;
  statusAccessDenied?: boolean;
};

const defaultSafeOpsGuidance: DeviceSafeOpsGuidance = {
  hostRestartCommand: "systemctl restart solar-display",
  hostRestartLabel: "主機層重啟",
  runbookPath: "docs/runbooks/device-diagnostics-safe-ops.md",
  unsupportedOperations: []
};

export function buildDeviceStatusViewModel({
  actionFeedback,
  appTime,
  displayOpsAccessDenied = false,
  displayOpsLoading = false,
  displayOpsSummary = null,
  isLoading,
  logSummary,
  logSummaryAccessDenied = false,
  logSummaryError,
  logSummaryLoading = false,
  now = new Date(),
  status,
  statusAccessDenied = false
}: BuildDeviceStatusViewModelArgs) {
  const runtimeSummary = buildRuntimeSummary(isLoading, status, statusAccessDenied);
  const triageSummary = displayOpsSummary?.triageSummary ?? resolveDisplayFaultTriageSummaryFromAlerts(displayOpsSummary?.alerts);
  const safeOpsGuidance = displayOpsSummary?.safeOpsGuidance ?? defaultSafeOpsGuidance;
  const diagnostics = (displayOpsSummary?.diagnosticActions ?? []).map((action) => ({
    ...action,
    label: localizeActionLabel(action.action, action.label),
    safeScope: localizeSafeScope(action.safeScope)
  }));
  const unsupportedActions = safeOpsGuidance.unsupportedOperations.map((op) => ({
    ...op,
    label: op.label === "Reboot device" ? "重啟裝置" : op.label
  }));
  const displayStatusTitle =
    displayOpsAccessDenied
      ? "存取受限"
      : displayOpsLoading && !displayOpsSummary
        ? "同步中"
      : (displayOpsSummary?.operationalHealthSummary.degraded ?? displayOpsSummary?.degraded)
        ? "展示退化"
        : (displayOpsSummary?.configurationReadinessSummary.blockingCount ?? 0) > 0
          ? "設定待完成"
          : "展示正常";
  const nextActionDetail =
    displayOpsAccessDenied
      ? "此頁面僅對受信任的管理端開放。"
      : displayOpsLoading && !displayOpsSummary
        ? "正在同步展示診斷摘要。"
      : triageSummary
        ? formatTriageHelper(triageSummary)
        : diagnostics.length > 0
          ? `先執行安全診斷，再決定是否升級到 ${safeOpsGuidance.hostRestartCommand}。`
          : `若問題持續，請依維運操作手冊改走 ${safeOpsGuidance.hostRestartCommand}。`;
  const logsSummary = buildLogsSummary(
    logSummary,
    logSummaryAccessDenied,
    logSummaryError,
    logSummaryLoading
  );
  const releaseRows = buildReleaseRows(status, statusAccessDenied);
  const displayClientSummary = buildDisplayClientSummary(status?.displayClients, now);
  const unpairedDisplayAccessSummary = buildUnpairedDisplayAccessSummary(status?.unpairedDisplayAccess, now);
  const alerts = displayOpsSummary?.alerts.map((alert) => ({
    ...alert,
    domainLabel: alert.domain === "operational-health" ? "營運健康" : alert.domain === "configuration-readiness" ? "設定整備" : alert.domain,
    message: localizeAlertMessage(alert.message),
    pageLabel: alert.pageId ? (displayClientPageLabels[alert.pageId] ?? alert.pageId) : "全域"
  })) ?? [];
  const affectedPagesLabel = triageSummary
    ? formatTriagePages(triageSummary)
    : displayOpsSummary?.alerts.some((a) => a.pageId)
      ? [
          ...new Set(
            displayOpsSummary.alerts
              .map((a) => (a.pageId ? (displayClientPageLabels[a.pageId] ?? a.pageId) : "全域"))
          )
        ].join("、")
      : "全頁面正常";

  const dominantReasonLabel = triageSummary
    ? localizeAlertMessage(triageSummary.dominantReason)
    : displayOpsSummary?.alerts[0]?.message
      ? localizeAlertMessage(displayOpsSummary.alerts[0].message)
      : "無異常事件";

  const heroCards = [
    {
      detail: triageSummary
        ? `共 ${triageSummary.affectedPages.length} 個展示頁面需要關注`
        : runtimeSummary.title === "正常運作"
          ? "5 個正式展示頁面均正常播映"
          : runtimeSummary.detail,
      title: "受影響範圍",
      tone:
        triageSummary || runtimeSummary.title === "同步失敗"
          ? ("error" as const)
          : (displayOpsSummary?.operationalHealthSummary.degraded ?? displayOpsSummary?.degraded)
            ? ("warning" as const)
            : ("ready" as const),
      value: affectedPagesLabel
    },
    {
      detail:
        displayOpsAccessDenied
          ? "此頁面僅對受信任的管理端開放。"
          : triageSummary
            ? `事件類別：${localizeTriageKind(triageSummary.faultKind)}`
            : `營運健康：${displayOpsSummary?.operationalHealthSummary.blockingCount ?? 0} 阻擋 · 設定整備：${displayOpsSummary?.configurationReadinessSummary.blockingCount ?? 0} 阻擋`,
      title: "主要原因",
      tone:
        triageSummary || (displayOpsSummary?.alerts.length ?? 0) > 0
          ? ("warning" as const)
          : ("ready" as const),
      value: dominantReasonLabel
    },
    {
      detail: nextActionDetail,
      title: "建議處置",
      tone:
        displayOpsAccessDenied || statusAccessDenied
          ? ("error" as const)
          : triageSummary || (displayOpsSummary?.degraded ?? false)
            ? ("warning" as const)
            : ("ready" as const),
      value:
        localizeRepairDestination(triageSummary?.repairDestinationLabel)
        ?? (diagnostics.length > 0 ? "執行安全診斷" : "維持監控中")
    }
  ];

  return {
    feedback:
      actionFeedback ??
      (isLoading
        ? {
            detail: "正在同步系統資訊、資源監控與維護操作狀態。",
            title: "正在同步裝置狀態",
            tone: "loading" as const
          }
        : {
            detail: "可在此檢查裝置資訊、資源監控與維護操作回饋。",
            title: "裝置狀態已同步",
            tone: "ready" as const
          }),
    runtimeSummary,
    networkRows: [
      {
        label: "網路狀態",
        value:
          statusAccessDenied
            ? "● 存取受限"
            : isLoading
              ? "同步中"
              : status
                ? "● 管理通道可達"
                : "● 未連線"
      },
      {
        label: "訊號強度",
        value:
          statusAccessDenied
            ? "僅受信任管理端可讀取裝置診斷。"
            : status
              ? "目前無可信訊號強度量測"
              : "需待裝置狀態恢復後確認"
      }
    ],
    displayOpsSummary: {
      alertCount: displayOpsSummary?.alerts.length ?? 0,
      alerts,
      assetHealthLabel: `${displayOpsSummary?.assetHealthSummary.unhealthyCount ?? 0} 項異常`,
      configurationReadinessLabel:
        `${displayOpsSummary?.configurationReadinessSummary.blockingCount ?? 0} 項阻擋`,
      degraded: displayOpsSummary?.operationalHealthSummary.degraded ?? displayOpsSummary?.degraded ?? false,
      diagnosticsLabel:
        displayOpsSummary?.diagnosticActions.map((action) => action.label).join(" / ") ?? "--",
      diagnostics,
      draftCount: displayOpsSummary?.draftCount ?? 0,
      hostRestartCommand: safeOpsGuidance.hostRestartCommand,
      helper:
        displayOpsAccessDenied
          ? "此頁面僅對受信任的管理端開放。"
          : displayOpsLoading && !displayOpsSummary
            ? "正在同步展示診斷摘要。"
          : triageSummary
            ? formatTriageHelper(triageSummary)
            : (displayOpsSummary?.alerts[0]?.message ? localizeAlertMessage(displayOpsSummary.alerts[0].message) : null)
              ?? "可在此查看正式發布、略過與整備度摘要。",
      lastPublishLabel: formatTimestamp(displayOpsSummary?.lastPublishAt),
      liveVersion:
        displayOpsSummary?.liveVersion === null || displayOpsSummary?.liveVersion === undefined
          ? "--"
          : `v${displayOpsSummary.liveVersion}`,
      operationalHealthLabel:
        `${displayOpsSummary?.operationalHealthSummary.blockingCount ?? 0} 項阻擋`,
      runbookPath: safeOpsGuidance.runbookPath,
      safeOpsHelper: `安全操作：${displayOpsSummary?.diagnosticActions.map((action) => action.label).join(" / ") || "--"} · 主機層處置：${safeOpsGuidance.hostRestartCommand} · 操作手冊：${safeOpsGuidance.runbookPath}`,
      skipLabel: `${displayOpsSummary?.skipSummary.count ?? 0} 項略過`,
      statusTitle: displayStatusTitle,
      unsupportedControlsLabel:
        unsupportedActions.length > 0
          ? unsupportedActions.map((operation) => operation.label).join(" / ")
          : "目前沒有其他不支援控制"
    },
    heroCards,
    diagnosticsSurface: {
      hostEscalationLabel: safeOpsGuidance.hostRestartCommand,
      resultDetail:
        actionFeedback?.detail
        ?? "執行安全診斷操作時，只會觸發安全讀取或摘要刷新，不會進行危險裝置控制。",
      resultTitle: actionFeedback?.title ? localizeActionLabel("", actionFeedback.title) : "尚未執行安全診斷",
      runbookPath: safeOpsGuidance.runbookPath,
      safeScopeLabel: diagnostics.map((action) => `${action.label} (${action.safeScope})`).join(" / ") || "--",
      unsupportedActions
    },
    triageSummary,
    alertsTriage: {
      helper:
        alerts.length > 0
          ? displayOpsAccessDenied
            ? "此頁面僅對受信任的管理端開放。"
            : triageSummary
              ? formatTriageHelper(triageSummary)
              : (displayOpsSummary?.alerts[0]?.message ? localizeAlertMessage(displayOpsSummary.alerts[0].message) : null) ?? "請先處理阻擋性警示。"
          : "目前沒有展示整備度、略過或資產警示。",
      items: alerts,
      summaryTitle: `${alerts.length} 項展示警示`
    },
    logsSummary,
    logsTriage: {
      detail: logsSummary.detail,
      exportAvailable: logsSummary.exportAvailable,
      helper: `${logsSummary.sourceLabel} · ${logsSummary.entryCountLabel} · ${logsSummary.retentionLabel}`,
      needsHostInvestigation:
        logsSummary.statusTitle === "日誌不可用"
        || runtimeSummary.title === "同步失敗"
        || displayStatusTitle === "展示退化",
      summaryTitle: logsSummary.statusTitle
    },
    displayClientSummary,
    unpairedDisplayAccessSummary,
    livenessTriage: {
      helper: displayClientSummary.badges.map((badge) => `${badge.label} ${badge.count}`).join(" · "),
      items: displayClientSummary.rows,
      summaryTitle: displayClientSummary.totalLabel
    },
    releaseRows,
    resourceCards: buildResourceCards(status),
    systemRows: ([
      {
        label: "伺服器時間",
        value: formatServerTime(appTime?.nowEpochMs ?? null)
      },
      {
        label: "時間同步狀態",
        tone: formatTimeSyncStatus(appTime?.state).tone,
        value: formatTimeSyncStatus(appTime?.state).value
      },
      {
        label: "裝置名稱",
        value: status?.hostname ?? "-"
      },
      {
        label: "平台",
        value: status ? `${status.platform} / ${status.arch}` : "-"
      },
      {
        label: "Node.js",
        value: status?.nodeVersion ?? "-"
      },
      {
        label: "運行時間",
        value: formatUptime(status?.uptimeSeconds ?? null)
      },
      {
        label: "CPU 核心",
        value: status ? String(status.cpu.cores) : "-"
      },
      {
        label: "風扇狀態",
        value: status ? formatFanTelemetry(status.fan) : "-"
      },
      {
        label: "PID",
        value: status ? String(status.pid) : "-"
      },
      ...releaseRows
    ] as SystemRowItem[]),
    timeSyncSummary: {
      formattedTime: formatServerTime(appTime?.nowEpochMs ?? null),
      state: appTime?.state ?? "waiting",
      stateLabel: formatTimeSyncStatus(appTime?.state).value,
      tone: formatTimeSyncStatus(appTime?.state).tone
    },
    uptimeLabel: formatUptime(status?.uptimeSeconds ?? null)
  };
}
