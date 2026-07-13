import assert from "node:assert/strict";
import test from "node:test";
import { buildDeviceStatusViewModel } from "./viewModel";

test("buildDeviceStatusViewModel formats system info, resource gauges, and maintenance feedback", () => {
  const model = buildDeviceStatusViewModel({
    actionFeedback: {
      detail: "Cache cleared (stub).",
      tone: "ready",
      title: "清除快取完成"
    },
    displayOpsSummary: {
      alerts: [
        {
          code: "asset-unhealthy",
          domain: "operational-health",
          message: "overview live asset missing",
          pageId: "overview",
          severity: "blocking"
        }
      ],
      assetHealthSummary: {
        affectedPages: ["overview"],
        unhealthyCount: 1
      },
      degraded: true,
      diagnosticActions: [
        { action: "refresh-readiness", label: "Refresh readiness", safeScope: "safe-refresh" },
        { action: "export-summary", label: "Export summary", safeScope: "safe-read" }
      ],
      draftCount: 2,
      generatedAt: "2026-05-18T09:30:00.000Z",
      lastPublishAt: "2026-05-18T08:45:00.000Z",
      liveVersion: 14,
      configurationReadinessSummary: {
        blockingCount: 3,
        warningCount: 0
      },
      operationalHealthSummary: {
        blockingCount: 1,
        degraded: true,
        warningCount: 0
      },
      safeOpsGuidance: {
        hostRestartCommand: "systemctl restart solar-display",
        hostRestartLabel: "Host-level restart",
        runbookPath: "docs/runbooks/device-diagnostics-safe-ops.md",
        unsupportedOperations: [
          {
            action: "reboot",
            executed: false,
            guidance: "Use the host-level restart runbook instead.",
            label: "Reboot device"
          },
          {
            action: "clear-cache",
            executed: false,
            guidance: "Cache purge is not supported in-app.",
            label: "Clear cache"
          }
        ]
      },
      skipSummary: {
        count: 1,
        pages: ["overview"]
      }
    },
    isLoading: false,
    logSummary: {
      available: true,
      entries: [
        { message: "server boot ready", priority: "info", timestamp: "2026-05-18T08:00:00.000Z" },
        { message: "worker started", priority: "info", timestamp: "2026-05-18T08:01:00.000Z" }
      ],
      retention: { maxEntries: 20, scope: "current-boot", unit: "solar-display" },
      source: "journald",
      unavailableReason: null
    },
    logSummaryError: "",
    status: {
      arch: "arm64",
      cpu: { cores: 4, loadAvg: [0.18, 0.32, 0.4] },
      disk: { availableMB: 40000, totalMB: 64000, usePercent: 35, usedMB: 24000 },
      hostname: "KZ-Display-01",
      memory: { freeMB: 4600, totalMB: 8000, usePercent: 42, usedMB: 3400 },
      nodeVersion: "v24.15.0",
      pid: 1234,
      platform: "linux",
      uptimeSeconds: 1315800
    }
  });

  assert.equal(model.systemRows[0]?.label, "裝置名稱");
  assert.equal(model.systemRows[0]?.value, "KZ-Display-01");
  assert.equal(model.systemRows[3]?.value, "15 天 5 時");
  assert.equal(model.runtimeSummary.title, "正常運作");
  assert.equal(model.resourceCards[0]?.label, "CPU 負載");
  assert.equal(model.resourceCards[0]?.valueLabel, "0.18");
  assert.equal(model.resourceCards[0]?.gaugePercent, 18);
  assert.match(model.resourceCards[0]?.helper ?? "", /1m \/ 5m \/ 15m/);
  assert.equal(model.resourceCards[3]?.valueLabel, "Unavailable");
  assert.equal(model.resourceCards[3]?.helper, "目前無可信溫度量測來源");
  assert.match(model.feedback.title, /清除快取完成/);
  assert.equal(model.networkRows[0]?.value, "● 管理通道可達");
  assert.equal(model.networkRows[1]?.value, "目前無可信訊號強度量測");
  assert.equal(model.displayOpsSummary.statusTitle, "展示退化");
  assert.equal(model.displayOpsSummary.liveVersion, "v14");
  assert.equal(model.displayOpsSummary.lastPublishLabel, "2026-05-18 08:45");
  assert.equal(model.displayOpsSummary.assetHealthLabel, "1 unhealthy");
  assert.equal(model.displayOpsSummary.alerts[0]?.message, "overview live asset missing");
  assert.equal(model.displayOpsSummary.alerts[0]?.domainLabel, "operational-health");
  assert.equal(model.displayOpsSummary.configurationReadinessLabel, "3 blocking");
  assert.equal(model.displayOpsSummary.operationalHealthLabel, "1 blocking");
  assert.equal(model.displayOpsSummary.diagnostics[0]?.action, "refresh-readiness");
  assert.equal(model.displayOpsSummary.runbookPath, "docs/runbooks/device-diagnostics-safe-ops.md");
  assert.equal(model.displayOpsSummary.hostRestartCommand, "systemctl restart solar-display");
  assert.match(model.displayOpsSummary.safeOpsHelper, /systemctl restart solar-display/);
  assert.match(model.displayOpsSummary.safeOpsHelper, /docs\/runbooks\/device-diagnostics-safe-ops\.md/);
  assert.equal(model.logsSummary.statusTitle, "Journald 可用");
  assert.equal(model.logsSummary.entryCountLabel, "2 entries");
  assert.match(model.logsSummary.detail, /server boot ready/);
});

test("buildDeviceStatusViewModel keeps loading and empty fallbacks readable", () => {
  const model = buildDeviceStatusViewModel({
    actionFeedback: null,
    isLoading: true,
    logSummary: null,
    logSummaryError: "",
    status: null
  });

  assert.equal(model.feedback.title, "正在同步裝置狀態");
  assert.equal(model.runtimeSummary.title, "同步中");
  assert.equal(model.systemRows[0]?.value, "-");
  assert.equal(model.resourceCards[3]?.valueLabel, "--");
  assert.equal(model.resourceCards[3]?.gaugePercent, 0);
});

test("buildDeviceStatusViewModel shows failed runtime summary when status cannot be loaded", () => {
  const model = buildDeviceStatusViewModel({
    actionFeedback: {
      detail: "載入裝置狀態失敗。",
      title: "同步失敗",
      tone: "error"
    },
    isLoading: false,
    logSummary: null,
    logSummaryError: "journal access denied",
    status: null
  });

  assert.equal(model.runtimeSummary.title, "同步失敗");
  assert.equal(model.networkRows[0]?.value, "● 未連線");
  assert.equal(model.networkRows[1]?.value, "需待裝置狀態恢復後確認");
  assert.equal(model.logsSummary.statusTitle, "日誌不可用");
  assert.equal(model.logsSummary.entryCountLabel, "Unavailable");
});

test("buildDeviceStatusViewModel preserves unpublished triage semantics across the device surface", () => {
  const model = buildDeviceStatusViewModel({
    actionFeedback: null,
    displayOpsSummary: {
      alerts: [
        {
          code: "unpublished",
          domain: "operational-health",
          message: "factory-circuit 最新 draft 尚未發布，因此未進入正式輪播",
          pageId: "factory-circuit",
          severity: "blocking"
        }
      ],
      assetHealthSummary: {
        affectedPages: [],
        unhealthyCount: 0
      },
      degraded: true,
      diagnosticActions: [],
      draftCount: 1,
      generatedAt: "2026-05-20T02:45:00.000Z",
      lastPublishAt: "2026-05-20T01:30:00.000Z",
      liveVersion: 6,
      configurationReadinessSummary: {
        blockingCount: 1,
        warningCount: 0
      },
      operationalHealthSummary: {
        blockingCount: 1,
        degraded: true,
        warningCount: 0
      },
      safeOpsGuidance: {
        hostRestartCommand: "systemctl restart solar-display",
        hostRestartLabel: "Host-level restart",
        runbookPath: "docs/runbooks/device-diagnostics-safe-ops.md",
        unsupportedOperations: []
      },
      skipSummary: {
        count: 1,
        pages: ["factory-circuit"]
      },
      triageSummary: {
        affectedPages: ["factory-circuit"],
        dominantReason: "factory-circuit 最新 draft 尚未發布，因此未進入正式輪播",
        faultKind: "publish-state",
        repairDestinationKey: "display-pages-editor",
        repairDestinationLabel: "Display Pages Editor",
        sourceIssueCode: "unpublished"
      }
    } as never,
    isLoading: false,
    logSummary: null,
    logSummaryError: "",
    status: null
  });

  assert.equal(model.triageSummary?.dominantReason, "factory-circuit 最新 draft 尚未發布，因此未進入正式輪播");
  assert.deepEqual(model.triageSummary?.affectedPages, ["factory-circuit"]);
  assert.equal(model.triageSummary?.repairDestinationLabel, "Display Pages Editor");
  assert.match(model.displayOpsSummary.helper, /Display Pages Editor/);
});

test("buildDeviceStatusViewModel exposes summary-first hero cards diagnostics results and triage panels", () => {
  const model = buildDeviceStatusViewModel({
    actionFeedback: {
      detail: "Refresh readiness completed at 09:45.",
      title: "Refresh readiness",
      tone: "ready"
    },
    displayOpsSummary: {
      alerts: [
        {
          code: "asset-unhealthy",
          domain: "operational-health",
          message: "overview live asset missing",
          pageId: "overview",
          severity: "blocking"
        }
      ],
      assetHealthSummary: {
        affectedPages: ["overview"],
        unhealthyCount: 1
      },
      configurationReadinessSummary: {
        blockingCount: 1,
        warningCount: 0
      },
      degraded: true,
      diagnosticActions: [
        { action: "refresh-readiness", label: "Refresh readiness", safeScope: "safe-refresh" }
      ],
      draftCount: 1,
      generatedAt: "2026-05-22T09:45:00.000Z",
      lastPublishAt: "2026-05-22T09:30:00.000Z",
      liveVersion: 8,
      operationalHealthSummary: {
        blockingCount: 1,
        degraded: true,
        warningCount: 0
      },
      safeOpsGuidance: {
        hostRestartCommand: "systemctl restart solar-display",
        hostRestartLabel: "Host-level restart",
        runbookPath: "docs/runbooks/device-diagnostics-safe-ops.md",
        unsupportedOperations: [
          {
            action: "reboot",
            executed: false,
            guidance: "Use the host-level restart runbook instead.",
            label: "Reboot device"
          }
        ]
      },
      skipSummary: {
        count: 0,
        pages: []
      }
    } as never,
    isLoading: false,
    logSummary: {
      available: true,
      entries: [
        { message: "server.log event", priority: "info", timestamp: "2026-05-18T08:00:00.000Z" }
      ],
      retention: { maxEntries: 20, scope: "current-boot", unit: "solar-display" },
      source: "journald",
      unavailableReason: null
    },
    logSummaryError: "",
    status: {
      arch: "arm64",
      cpu: { cores: 4, loadAvg: [0.18, 0.32, 0.4] },
      disk: { availableMB: 40000, totalMB: 64000, usePercent: 35, usedMB: 24000 },
      displayClients: {
        clients: [],
        summary: {
          offline: 0,
          online: 0,
          stale: 0,
          total: 0
        }
      },
      hostname: "KZ-Display-01",
      memory: { freeMB: 4600, totalMB: 8000, usePercent: 42, usedMB: 3400 },
      nodeVersion: "v24.15.0",
      pid: 1234,
      platform: "linux",
      uptimeSeconds: 1315800
    }
  });

  assert.equal(model.heroCards[0]?.title, "Host Health");
  assert.equal(model.heroCards[0]?.value, "正常運作");
  assert.equal(model.heroCards[1]?.title, "Display Operations");
  assert.equal(model.heroCards[1]?.value, "展示退化");
  assert.equal(model.heroCards[2]?.title, "Next Action Guidance");
  assert.match(model.heroCards[2]?.detail ?? "", /Display Pages Editor/);
  assert.equal(model.diagnosticsSurface.resultTitle, "Refresh readiness");
  assert.match(model.diagnosticsSurface.safeScopeLabel, /safe-refresh/);
  assert.equal(model.diagnosticsSurface.unsupportedActions[0]?.label, "Reboot device");
  assert.equal(model.alertsTriage.summaryTitle, "1 display alert");
  assert.equal(model.logsTriage.summaryTitle, "Journald 可用");
  assert.equal(model.livenessTriage.summaryTitle, "0 clients");
});

test("buildDeviceStatusViewModel maps display client liveness rows and summary badges", () => {
  const model = buildDeviceStatusViewModel({
    actionFeedback: null,
    isLoading: false,
    logSummary: null,
    logSummaryError: "",
    now: new Date("2026-05-22T12:00:10.000Z"),
    status: {
      arch: "arm64",
      cpu: { cores: 4, loadAvg: [0.18, 0.32, 0.4] },
      disk: { availableMB: 40000, totalMB: 64000, usePercent: 35, usedMB: 24000 },
      displayClients: {
        clients: [
          {
            clientTime: "2026-05-22T12:00:05.000Z",
            connected: true,
            connectedAt: "2026-05-22T12:00:00.000Z",
            isIdle: false,
            isPlaying: true,
            lastSeenAt: "2026-05-22T12:00:05.000Z",
            pageKey: "overview",
            remoteAddress: "10.0.0.42",
            route: "/overview",
            sessionClass: "playback-safe",
            socketId: "socket-1",
            state: "online",
            viewport: {
              height: 1080,
              width: 1920
            }
          },
          {
            clientTime: "2026-05-22T11:59:25.000Z",
            connected: true,
            connectedAt: "2026-05-22T11:59:00.000Z",
            isIdle: true,
            isPlaying: false,
            lastSeenAt: "2026-05-22T11:59:25.000Z",
            pageKey: null,
            remoteAddress: "10.0.0.43",
            route: "/offline",
            sessionClass: "playback-safe",
            socketId: "socket-2",
            state: "stale",
            viewport: {
              height: 1080,
              width: 1920
            }
          },
          {
            clientTime: null,
            connected: false,
            connectedAt: "2026-05-22T11:58:00.000Z",
            isIdle: false,
            isPlaying: false,
            lastSeenAt: "2026-05-22T11:59:20.000Z",
            pageKey: "solar",
            remoteAddress: "10.0.0.44",
            route: "/solar",
            sessionClass: "playback-safe",
            socketId: "socket-3",
            state: "offline",
            viewport: {
              height: 1080,
              width: 1920
            }
          }
        ],
        summary: {
          offline: 1,
          online: 1,
          stale: 1,
          total: 3
        }
      },
      hostname: "KZ-Display-01",
      memory: { freeMB: 4600, totalMB: 8000, usePercent: 42, usedMB: 3400 },
      nodeVersion: "v24.15.0",
      pid: 1234,
      platform: "linux",
      uptimeSeconds: 1315800
    }
  });

  assert.deepEqual(
    model.displayClientSummary.badges.map((badge) => ({
      count: badge.count,
      tone: badge.tone
    })),
    [
      { count: 1, tone: "is-good" },
      { count: 1, tone: "is-warning" },
      { count: 1, tone: "is-error" }
    ]
  );
  assert.equal(model.displayClientSummary.totalLabel, "3 clients");
  assert.equal(model.displayClientSummary.rows[0]?.pageLabel, "Overview");
  assert.equal(model.displayClientSummary.rows[0]?.playbackLabel, "播放中");
  assert.equal(model.displayClientSummary.rows[0]?.lastSeenLabel, "5 秒前");
  assert.equal(model.displayClientSummary.rows[0]?.badgeTone, "is-good");
  assert.equal(model.displayClientSummary.rows[1]?.pageLabel, "Route /offline");
  assert.equal(model.displayClientSummary.rows[1]?.playbackLabel, "閒置中");
  assert.equal(model.displayClientSummary.rows[1]?.lastSeenLabel, "45 秒前");
  assert.equal(model.displayClientSummary.rows[1]?.badgeTone, "is-warning");
  assert.equal(model.displayClientSummary.rows[2]?.pageLabel, "Solar");
  assert.equal(model.displayClientSummary.rows[2]?.playbackLabel, "已離線");
  assert.equal(model.displayClientSummary.rows[2]?.lastSeenLabel, "50 秒前");
  assert.equal(model.displayClientSummary.rows[2]?.badgeTone, "is-error");
});

test("buildDeviceStatusViewModel keeps configuration-readiness distinct from operational health", () => {
  const model = buildDeviceStatusViewModel({
    actionFeedback: null,
    displayOpsSummary: {
      alerts: [
        {
          code: "mqtt-mapping-missing",
          domain: "configuration-readiness",
          message: "missing MQTT mapping for realTimePower",
          pageId: "overview",
          severity: "blocking"
        }
      ],
      assetHealthSummary: {
        affectedPages: [],
        unhealthyCount: 0
      },
      configurationReadinessSummary: {
        blockingCount: 1,
        warningCount: 0
      },
      degraded: false,
      diagnosticActions: [],
      draftCount: 0,
      generatedAt: "2026-05-22T10:00:00.000Z",
      lastPublishAt: null,
      liveVersion: 3,
      operationalHealthSummary: {
        blockingCount: 0,
        degraded: false,
        warningCount: 0
      },
      safeOpsGuidance: {
        hostRestartCommand: "systemctl restart solar-display",
        hostRestartLabel: "Host-level restart",
        runbookPath: "docs/runbooks/device-diagnostics-safe-ops.md",
        unsupportedOperations: []
      },
      skipSummary: {
        count: 0,
        pages: []
      }
    } as never,
    isLoading: false,
    logSummary: null,
    logSummaryError: "",
    status: null
  });

  assert.equal(model.displayOpsSummary.statusTitle, "設定待完成");
  assert.equal(model.displayOpsSummary.configurationReadinessLabel, "1 blocking");
  assert.equal(model.displayOpsSummary.operationalHealthLabel, "0 blocking");
  assert.equal(model.displayOpsSummary.alerts[0]?.domainLabel, "configuration-readiness");
});

test("buildDeviceStatusViewModel keeps denied reads distinct from empty and generic failure states", () => {
  const model = buildDeviceStatusViewModel({
    actionFeedback: {
      detail: "此頁面僅對受信任的管理端開放。",
      title: "存取受限",
      tone: "error"
    },
    displayOpsAccessDenied: true,
    isLoading: false,
    logSummary: null,
    logSummaryAccessDenied: true,
    logSummaryError: "",
    status: null,
    statusAccessDenied: true
  });

  assert.equal(model.runtimeSummary.title, "存取受限");
  assert.equal(model.runtimeSummary.detail, "此頁面僅對受信任的管理端開放。");
  assert.equal(model.displayOpsSummary.statusTitle, "存取受限");
  assert.match(model.displayOpsSummary.helper, /受信任的管理端/);
  assert.match(model.displayOpsSummary.safeOpsHelper, /systemctl restart solar-display/);
  assert.equal(model.logsSummary.statusTitle, "存取受限");
  assert.match(model.logsSummary.detail, /受信任的管理端/);
});

test("buildDeviceStatusViewModel presents journal unavailable and dirty release identity", () => {
  const model = buildDeviceStatusViewModel({
    actionFeedback: null,
    isLoading: false,
    logSummary: {
      available: false,
      entries: [],
      retention: { maxEntries: 20, scope: "current-boot", unit: "solar-display" },
      source: "journald",
      unavailableReason: "journal access denied"
    },
    logSummaryError: "",
    status: {
      arch: "arm64",
      cpu: { cores: 4, loadAvg: [0.1, 0.1, 0.1] },
      disk: { availableMB: 1, totalMB: 2, usePercent: 50, usedMB: 1 },
      hostname: "KZ-Display-01",
      memory: { freeMB: 1, totalMB: 2, usePercent: 50, usedMB: 1 },
      nodeVersion: "v24.15.0",
      pid: 9,
      platform: "linux",
      release: {
        available: true,
        builtAt: "2026-07-14T00:00:00.000Z",
        commit: "deadbeefcafe0123456789abcdef0123456789ab",
        packageVersion: "0.1.0",
        releaseId: "0.1.0+deadbeefcafe-dirty",
        schemaVersion: 22,
        sourceDirty: true,
        unavailableReason: null
      },
      uptimeSeconds: 60
    }
  });

  assert.equal(model.logsSummary.statusTitle, "日誌不可用");
  assert.match(model.logsSummary.detail, /journal access denied/);
  assert.equal(model.logsSummary.sourceLabel, "journald");
  assert.equal(model.logsTriage.exportAvailable, false);
  const releaseId = model.systemRows.find((row) => row.label === "Release ID");
  assert.match(releaseId?.value ?? "", /dirty/);
  const schema = model.systemRows.find((row) => row.label === "Schema");
  assert.equal(schema?.value, "22");
});
