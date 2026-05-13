import { useEffect, useMemo, useState } from "react";
import { KioskButton } from "../../components/KioskButton";
import { requestJson } from "../../services/api";
import { PageScaffold } from "../shared/PageScaffold";
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
  return requestJson<DeviceActionResponse>(path, {
    method: "POST"
  });
}

async function exportLogs() {
  return requestJson<DeviceActionResponse>("/api/device/logs/export");
}

function feedbackClassName(tone: "error" | "loading" | "ready") {
  if (tone === "error") {
    return "border-[rgba(230,0,18,0.18)] bg-[rgba(255,241,241,0.96)]";
  }

  if (tone === "loading") {
    return "border-[rgba(138,148,132,0.18)] bg-[rgba(249,249,247,0.92)]";
  }

  return "border-[rgba(78,121,55,0.18)] bg-[rgba(244,248,239,0.92)]";
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
        if (!active) {
          return;
        }
        setStatus(nextStatus);
      } catch (error) {
        if (!active) {
          return;
        }
        setActionFeedback({
          detail: error instanceof Error ? error.message : "載入裝置狀態失敗。",
          title: "同步失敗",
          tone: "error"
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
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

      setActionFeedback({
        detail,
        title: `${title}完成`,
        tone: "ready"
      });
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
    () =>
      buildDeviceStatusViewModel({
        actionFeedback,
        isLoading,
        status
      }),
    [actionFeedback, isLoading, status]
  );

  return (
    <PageScaffold path="/device-status" description="裝置即時狀態、系統資源與維護操作。">
      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-3 grid gap-4">
          <div className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-card">
            <p className="text-sm font-medium tracking-[0.08em] text-neutral-500">裝置運作狀態</p>
            <p className="mt-3 text-3xl font-bold text-brand-900">{viewModel.runtimeSummary.title}</p>
            <p className="mt-2 text-sm text-neutral-500">{viewModel.runtimeSummary.detail}</p>
          </div>
          <div className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-card">
            <p className="text-sm font-medium tracking-[0.08em] text-neutral-500">系統運行時間</p>
            <p className="mt-3 text-3xl font-bold text-brand-900">{viewModel.systemRows[3]?.value}</p>
          </div>
          <div className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-card">
            <p className="text-sm font-medium tracking-[0.08em] text-neutral-500">最後同步狀態</p>
            <p className="mt-3 text-base leading-7 text-neutral-700">{viewModel.feedback.detail}</p>
          </div>
        </aside>

        <section className="col-span-5 rounded-[28px] border border-white/70 bg-white/92 p-6 shadow-card">
          <h2 className="text-2xl font-semibold text-brand-900">裝置資訊</h2>
          <p className="mt-1 text-sm uppercase tracking-[0.18em] text-neutral-500">Device Information</p>
          <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5">
            {viewModel.systemRows.map((row) => (
              <div key={row.label}>
                <p className="text-sm font-medium tracking-[0.08em] text-neutral-500">{row.label}</p>
                <p className="mt-2 text-lg font-semibold text-neutral-900">{row.value}</p>
              </div>
            ))}
            {viewModel.networkRows.map((row) => (
              <div key={row.label}>
                <p className="text-sm font-medium tracking-[0.08em] text-neutral-500">{row.label}</p>
                <p className="mt-2 text-lg font-semibold text-neutral-900">{row.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="col-span-4 rounded-[28px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(241,246,235,0.82))] p-6 shadow-card">
          <h2 className="text-2xl font-semibold text-brand-900">系統資源監控</h2>
          <p className="mt-1 text-sm uppercase tracking-[0.18em] text-neutral-500">System Resource Monitor</p>
          <div className="mt-6 grid gap-4">
            {viewModel.resourceCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/70 bg-white/86 px-4 py-4 shadow-soft">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium tracking-[0.08em] text-neutral-500">{card.label}</p>
                  <p className="text-2xl font-bold text-brand-900">{card.valueLabel}</p>
                </div>
                <p className="mt-2 text-sm text-neutral-600">{card.helper}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-12 gap-6">
        <section className="col-span-8 rounded-[28px] border border-white/70 bg-white/92 p-6 shadow-card">
          <h2 className="text-2xl font-semibold text-brand-900">維護操作</h2>
          <p className="mt-1 text-sm uppercase tracking-[0.18em] text-neutral-500">Maintenance Actions</p>
          <div className="mt-6 grid grid-cols-4 gap-4">
            <KioskButton
              variant="secondary"
              disabled={activeAction !== null}
              onClick={() => void handleAction("reboot", "重新啟動裝置", () => runDeviceAction("/api/device/reboot"))}
            >
              {activeAction === "reboot" ? "執行中..." : "重新啟動裝置"}
            </KioskButton>
            <KioskButton
              variant="secondary"
              disabled={activeAction !== null}
              onClick={() => void handleAction("clear-cache", "清除快取", () => runDeviceAction("/api/device/clear-cache"))}
            >
              {activeAction === "clear-cache" ? "執行中..." : "清除快取"}
            </KioskButton>
            <KioskButton
              variant="secondary"
              disabled={activeAction !== null}
              onClick={() =>
                void handleAction("system-update", "更新系統", async () => ({
                  success: false,
                  error: "目前尚未實作 system update endpoint。"
                }))
              }
            >
              {activeAction === "system-update" ? "執行中..." : "更新系統"}
            </KioskButton>
            <KioskButton
              variant="ghost"
              disabled={activeAction !== null}
              onClick={() => void handleAction("export-logs", "匯出日誌", exportLogs)}
            >
              {activeAction === "export-logs" ? "執行中..." : "匯出日誌"}
            </KioskButton>
          </div>
        </section>

        <section
          className={[
            "col-span-4 rounded-[28px] border px-5 py-5 shadow-soft",
            feedbackClassName((viewModel.feedback?.tone ?? "ready") as "error" | "loading" | "ready")
          ].join(" ")}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Maintenance Feedback</p>
          <p className="mt-3 text-2xl font-semibold text-neutral-800">{viewModel.feedback.title}</p>
          <p className="mt-3 text-sm leading-6 text-neutral-600">{viewModel.feedback.detail}</p>
        </section>
      </div>
    </PageScaffold>
  );
}
