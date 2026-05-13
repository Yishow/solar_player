import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { KioskButton } from "../../components/KioskButton";
import { LeafOrnament } from "../../components/LeafOrnament";
import { PanelCard } from "../../components/PanelCard";
import { StatusBadge } from "../../components/StatusBadge";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import { useMqttStatus } from "../../hooks/useMqttStatus";
import { getSocketClient } from "../../services/socket";
import { PageScaffold } from "../shared/PageScaffold";

const RETRY_SECONDS = 15;

function formatTimestamp(value: string | null) {
  if (!value) {
    return "尚未收到";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("zh-TW", {
    hour12: false
  });
}

function resolveReasonLabel(reason: string | null) {
  if (reason === "reconnecting") {
    return "MQTT broker 正在重連，系統暫停即時推送。";
  }

  if (reason === "mock") {
    return "目前為 mock mode，不會連到實體 broker。";
  }

  if (reason === "offline") {
    return "MQTT broker 離線或網路中斷。";
  }

  if (!reason || reason === "connected") {
    return "正在等待最新的連線狀態。";
  }

  return reason;
}

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

  return (
    <PageScaffold
      path="/offline"
      description="離線錯誤頁用於 kiosk 網路中斷或資料源失聯時，顯示可理解的恢復資訊。"
    >
      <PanelCard title="系統暫時離線" subtitle="OFFLINE RECOVERY">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl bg-white/95 p-6">
            <StatusBadge status={status.connected ? "connected" : "disconnected"} label="MQTT 即時資料中斷" />
            <p className="mt-6 text-5xl font-bold leading-tight text-brand-900">正在等待重新連線</p>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
              目前展示播放器無法取得即時發電資料，系統將持續自動重連；連線恢復後會自動返回原本的播放頁。
            </p>
            <dl className="mt-6 grid gap-4 rounded-2xl border border-brand-100 bg-brand-50/80 p-5 text-sm text-neutral-700">
              <div>
                <dt className="font-semibold text-brand-900">最後更新時間</dt>
                <dd className="mt-1">{formatTimestamp(lastUpdatedAt ?? status.updatedAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-brand-900">錯誤原因</dt>
                <dd className="mt-1">{resolveReasonLabel(status.reason)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-brand-900">建議處理方式</dt>
                <dd className="mt-1">
                  1. 確認 broker 與網路交換器供電正常。
                  <br />
                  2. 檢查 `settings/mqtt` 的 host、port 與帳密是否為最新設定。
                  <br />
                  3. 若現場仍需展示，可先切回靜態輪播頁面。
                </dd>
              </div>
            </dl>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <KioskButton onClick={handleRetry}>立即重試</KioskButton>
              <KioskButton variant="secondary" onClick={() => navigate("/images")}>
                切換備援輪播
              </KioskButton>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-xl bg-brand-100 p-6">
            <LeafOrnament className="h-16 w-24" />
            <div>
              <p className="text-lg font-semibold text-brand-900">Retry in</p>
              <p className="mt-3 font-en text-6xl font-bold text-brand-900">
                00:{retryCountdown.toString().padStart(2, "0")}
              </p>
              <p className="mt-4 text-sm text-brand-900/80">恢復後將返回 {returnTo}</p>
            </div>
          </div>
        </div>
      </PanelCard>
    </PageScaffold>
  );
}
