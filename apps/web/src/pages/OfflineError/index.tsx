import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { KioskButton } from "../../components/KioskButton";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import { useMqttStatus } from "../../hooks/useMqttStatus";
import { getSocketClient } from "../../services/socket";
import { PageScaffold } from "../shared/PageScaffold";
import { buildOfflineErrorViewModel } from "./viewModel";

const RETRY_SECONDS = 15;

export function OfflineError() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lastUpdatedAt } = useLiveMetrics();
  const { status } = useMqttStatus();
  const [retryCountdown, setRetryCountdown] = useState(RETRY_SECONDS);

  const returnTo = useMemo(() => {
    const nextPath = (location.state as { returnTo?: string } | null)?.returnTo;
    return nextPath && nextPath !== "/offline" ? nextPath : "/overview";
  }, [location.state]);

  useEffect(() => {
    if (!status.connected) {
      return;
    }

    navigate(returnTo, {
      replace: true
    });
  }, [navigate, returnTo, status.connected]);

  useEffect(() => {
    if (status.connected || status.reason === "mock") {
      return;
    }

    const timer = window.setInterval(() => {
      setRetryCountdown((current) => {
        if (current <= 1) {
          getSocketClient().connect();
          return RETRY_SECONDS;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [status.connected, status.reason]);

  const handleRetry = () => {
    getSocketClient().connect();
    setRetryCountdown(RETRY_SECONDS);
  };

  const viewModel = buildOfflineErrorViewModel({
    lastUpdatedAt: lastUpdatedAt ?? status.updatedAt,
    reason: status.reason,
    retryCountdown,
    returnTo
  });

  return (
    <PageScaffold
      path="/offline"
      description="離線錯誤頁用於 kiosk 網路中斷或資料源失聯時，顯示可理解的恢復資訊。"
    >
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7 overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(245,247,242,0.9))] p-8 shadow-panel">
          <div className="flex items-start gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(198,103,69,0.12)] text-4xl text-[var(--color-status-error-500)]">
              ⇅
            </div>
            <div>
              <p className="text-[46px] font-bold leading-tight text-brand-900">{viewModel.headline}</p>
              <p className="mt-2 font-en text-xl text-neutral-500">{viewModel.subtitle}</p>
            </div>
          </div>

          <p className="mt-8 text-lg leading-8 text-neutral-600">
            系統正在嘗試重新連線中。連線恢復後，會自動返回原本的播放頁面，不需要人工重新導頁。
          </p>

          <div className="mt-8 grid gap-4 rounded-[28px] border border-brand-100 bg-brand-50/75 p-5">
            {viewModel.guidanceRows.map((row) => (
              <div key={row.label} className="grid gap-1">
                <p className="text-sm font-semibold tracking-[0.08em] text-brand-900">{row.label}</p>
                <p className="text-sm leading-6 text-neutral-700">{row.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <KioskButton onClick={handleRetry}>立即重試</KioskButton>
            <KioskButton variant="secondary" onClick={() => navigate("/images")}>
              切換備援輪播
            </KioskButton>
          </div>
        </div>

        <div className="col-span-5 rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(216,232,201,0.88),rgba(255,255,255,0.95))] p-8 shadow-card">
          <p className="text-sm uppercase tracking-[0.24em] text-brand-900/70">Reconnecting...</p>
          <p className="mt-5 text-6xl font-bold text-brand-900">00:{retryCountdown.toString().padStart(2, "0")}</p>
          <div className="mt-6 h-2 rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-brand-900 transition-[width] duration-300"
              style={{ width: `${((RETRY_SECONDS - retryCountdown) / RETRY_SECONDS) * 100}%` }}
            />
          </div>

          <div className="mt-8 space-y-5">
            <div>
              <p className="text-sm font-semibold tracking-[0.08em] text-neutral-500">最後更新時間</p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">{viewModel.lastUpdatedLabel}</p>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.08em] text-neutral-500">錯誤原因</p>
              <p className="mt-2 text-lg leading-7 text-neutral-800">{viewModel.reasonLabel}</p>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.08em] text-neutral-500">恢復後返回</p>
              <p className="mt-2 text-lg font-semibold text-neutral-800">{viewModel.returnToLabel}</p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl bg-white/85 px-4 py-4 text-sm leading-6 text-neutral-600">
            {viewModel.retryLabel}
          </div>
        </div>
      </div>
    </PageScaffold>
  );
}
