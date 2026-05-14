import { useEffect, useMemo, useState } from "react";
import { requestJson } from "../../services/api";
import { deviceAssetRuntimeMap } from "./assets";
import { deviceLayout } from "./layout";
import "./device.css";
import {
  buildDeviceStatusViewModel,
  type DeviceActionFeedback
} from "./viewModel";

type DeviceRouteStatus = {
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptimeSeconds: number;
  cpu: { cores: number; loadAvg: [number, number, number] };
  memory: { totalMB: number; usedMB: number; freeMB: number; usePercent: number };
  disk: { totalMB: number; usedMB: number; availableMB: number; usePercent: number };
  pid: number;
};

type DeviceStatusResponse = {
  success: boolean;
  data: DeviceRouteStatus;
  error?: string;
};

type DeviceActionResponse = {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    directory?: string;
    files?: string[];
  };
};

async function getDeviceStatus() {
  const response = await requestJson<DeviceStatusResponse>("/api/device/status");
  if (!response.success) {
    throw new Error(response.error ?? "載入裝置狀態失敗。");
  }
  return response.data;
}

async function runDeviceAction(path: string) {
  return requestJson<DeviceActionResponse>(path, { method: "POST" });
}

async function exportLogs() {
  return requestJson<DeviceActionResponse>("/api/device/logs/export");
}

function CheckGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function NetworkGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 9c5-4 11-4 16 0M7 12c3-2 7-2 10 0M10 15c1-1 3-1 4 0" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}

export function DeviceStatus() {
  const [status, setStatus] = useState<DeviceRouteStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<DeviceActionFeedback>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const nextStatus = await getDeviceStatus();
        if (!active) return;
        setStatus(nextStatus);
      } catch (error) {
        if (!active) return;
        setActionFeedback({
          detail: error instanceof Error ? error.message : "載入裝置狀態失敗。",
          title: "同步失敗",
          tone: "error"
        });
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const handleAction = async (
    actionKey: string,
    title: string,
    action: () => Promise<DeviceActionResponse>
  ) => {
    setActiveAction(actionKey);
    setActionFeedback({
      detail: "正在執行維護操作，請稍候。",
      title,
      tone: "loading"
    });
    try {
      const response = await action();
      if (!response.success) {
        throw new Error(response.error ?? "維護操作失敗。");
      }
      const detail =
        response.message ??
        (response.data?.files ? `可匯出 ${response.data.files.length} 份日誌。` : "維護操作已完成。");
      setActionFeedback({ detail, title: `${title}完成`, tone: "ready" });
    } catch (error) {
      setActionFeedback({
        detail: error instanceof Error ? error.message : "維護操作失敗。",
        title: `${title}失敗`,
        tone: "error"
      });
    } finally {
      setActiveAction(null);
    }
  };

  const viewModel = useMemo(
    () => buildDeviceStatusViewModel({ actionFeedback, isLoading, status }),
    [actionFeedback, isLoading, status]
  );

  const runtimeOk = viewModel.runtimeSummary.title === "正常運作";
  const runtimeError = viewModel.runtimeSummary.title === "同步失敗";
  const runtimeIconClass = runtimeError
    ? "is-error"
    : runtimeOk
      ? ""
      : "is-warning";
  const runtimeValueClass = runtimeError
    ? "is-error"
    : runtimeOk
      ? ""
      : "is-warning";

  return (
    <section className="ds-page">
      <section
        className="ds-title"
        style={{ left: deviceLayout.title.left, top: deviceLayout.title.top }}
      >
        <h1>
          裝置<em>狀態</em>
        </h1>
        <p>Device Status Details</p>
      </section>

      {/* === Left aside (3 status cards) === */}
      <aside
        className="ds-aside"
        style={{
          left: deviceLayout.side.left,
          top: deviceLayout.side.top,
          width: deviceLayout.side.width
        }}
      >
        <article className="ds-status-card">
          <span className="ds-status-card__label">
            裝置運作狀態
            <small>Device Operation Status</small>
          </span>
          <span className={`ds-status-card__value ${runtimeValueClass}`}>
            {viewModel.runtimeSummary.title}
          </span>
          <span className="ds-status-card__detail">{viewModel.runtimeSummary.detail}</span>
          <span className={`ds-status-card__icon ${runtimeIconClass}`}>
            <CheckGlyph />
          </span>
        </article>

        <article className="ds-status-card">
          <span className="ds-status-card__label">
            系統運行時間
            <small>Uptime</small>
          </span>
          <span className="ds-status-card__value is-neutral">
            {viewModel.systemRows[3]?.value}
          </span>
          <span className="ds-status-card__detail">服務啟動後累積時間</span>
        </article>

        <article className="ds-status-card">
          <span className="ds-status-card__label">
            最後同步狀態
            <small>Last Sync</small>
          </span>
          <span className="ds-status-card__value is-neutral">{viewModel.feedback.title}</span>
          <span className="ds-status-card__detail">{viewModel.feedback.detail}</span>
        </article>
      </aside>

      {/* === Info panel === */}
      <section
        className="ds-card ds-info"
        style={{
          height: deviceLayout.info.height,
          left: deviceLayout.info.left,
          top: deviceLayout.info.top,
          width: deviceLayout.info.width
        }}
      >
        <h2>
          裝置資訊
          <small>Device Information</small>
        </h2>
        <dl>
          {viewModel.systemRows.map((row) => (
            <div key={row.label} className="contents">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
          {viewModel.networkRows.map((row) => (
            <div key={row.label} className="contents">
              <dt>{row.label}</dt>
              <dd className={row.value.includes("●") ? "is-good" : ""}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* === Photo === */}
      <figure
        className="ds-photo"
        style={{
          height: deviceLayout.photo.height,
          left: deviceLayout.photo.left,
          top: deviceLayout.photo.top,
          width: deviceLayout.photo.width,
          margin: 0
        }}
      >
        <img alt="Device board" src={deviceAssetRuntimeMap.photo} />
      </figure>

      {/* === Resource gauges === */}
      <section
        className="ds-card ds-resource"
        style={{
          height: deviceLayout.resource.height,
          left: deviceLayout.resource.left,
          top: deviceLayout.resource.top,
          width: deviceLayout.resource.width
        }}
      >
        <h2>
          系統資源監控
          <small>System Resource Monitor</small>
        </h2>
        <div className="ds-gauge-grid">
          {viewModel.resourceCards.map((card, index) => (
            <div key={card.label} className="ds-gauge">
              <div
                className="ds-gauge-ring"
                style={{
                  ["--gauge-color" as string]: index === 3 ? "#ff5a24" : "var(--green)",
                  ["--gauge-value" as string]: String(card.gaugePercent)
                }}
              >
                <span>{card.gaugeValue}</span>
              </div>
              <p>
                {card.label}
                <small>{card.helper}</small>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* === Network bar === */}
      <section
        className="ds-network"
        style={{
          height: deviceLayout.network.height,
          left: deviceLayout.network.left,
          top: deviceLayout.network.top,
          width: deviceLayout.network.width
        }}
      >
        <span className="ds-network__icon">
          <NetworkGlyph />
        </span>
        <div className="ds-network__row">
          <b>網路狀態</b>
          <small>Network Status</small>
          <span>{viewModel.networkRows[0]?.value}</span>
        </div>
        <div className="ds-network__row">
          <b>訊號備註</b>
          <small>Network Note</small>
          <span style={{ color: "#5d655d" }}>{viewModel.networkRows[1]?.value}</span>
        </div>
      </section>

      {/* === Actions === */}
      <section
        className="ds-actions"
        style={{
          height: deviceLayout.actions.height,
          left: deviceLayout.actions.left,
          top: deviceLayout.actions.top,
          width: deviceLayout.actions.width
        }}
      >
        <button
          type="button"
          className="ds-action"
          disabled={activeAction !== null}
          onClick={() =>
            void handleAction("reboot", "重新啟動裝置", () => runDeviceAction("/api/device/reboot"))
          }
        >
          {activeAction === "reboot" ? "執行中..." : "重新啟動"}
          <small>Reboot</small>
        </button>
        <button
          type="button"
          className="ds-action"
          disabled={activeAction !== null}
          onClick={() =>
            void handleAction("clear-cache", "清除快取", () => runDeviceAction("/api/device/clear-cache"))
          }
        >
          {activeAction === "clear-cache" ? "執行中..." : "清除快取"}
          <small>Clear Cache</small>
        </button>
        <button
          type="button"
          className="ds-action"
          disabled={activeAction !== null}
          onClick={() =>
            void handleAction("system-update", "更新系統", async () => ({
              success: false,
              error: "目前尚未實作 system update endpoint。"
            }))
          }
        >
          {activeAction === "system-update" ? "執行中..." : "更新系統"}
          <small>System Update</small>
        </button>
        <button
          type="button"
          className="ds-action"
          disabled={activeAction !== null}
          onClick={() => void handleAction("export-logs", "匯出日誌", exportLogs)}
        >
          {activeAction === "export-logs" ? "執行中..." : "匯出日誌"}
          <small>Export Logs</small>
        </button>
      </section>

      {/* === Feedback strip === */}
      <div
        className={`ds-feedback ${
          viewModel.feedback.tone === "error"
            ? "is-error"
            : viewModel.feedback.tone === "loading"
              ? "is-loading"
              : ""
        }`}
        style={{
          height: deviceLayout.feedback.height,
          left: deviceLayout.feedback.left,
          top: deviceLayout.feedback.top,
          width: deviceLayout.feedback.width
        }}
        role="status"
      >
        <b>{viewModel.feedback.title}</b>
        <span style={{ opacity: 0.85 }}>{viewModel.feedback.detail}</span>
      </div>
    </section>
  );
}
