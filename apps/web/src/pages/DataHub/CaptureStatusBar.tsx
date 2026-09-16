import { useEffect, useState } from "react";
import type { CaptureSession } from "@solar-display/shared";

export type CaptureStatusBarProps = {
  capture: CaptureSession | null;
  errorMessage?: string;
  isStarting?: boolean;
  onRefresh?: () => void;
  onStart: () => void;
  onStop: () => void;
  selectedProfileName?: string;
};

export function CaptureStatusBar({
  capture,
  errorMessage = "",
  isStarting = false,
  onRefresh,
  onStart,
  onStop,
  selectedProfileName
}: CaptureStatusBarProps) {
  const calculateSeconds = () => {
    if (!capture || !capture.expiresAt) return null;
    const ms = Date.parse(capture.expiresAt) - Date.now();
    return Math.max(0, Math.floor(ms / 1000));
  };

  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(calculateSeconds);

  useEffect(() => {
    if (!capture || !capture.expiresAt) {
      setRemainingSeconds(null);
      return;
    }
    const updateCountdown = () => {
      setRemainingSeconds(calculateSeconds());
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [capture]);

  const isExpired = capture?.expiresAt ? Date.parse(capture.expiresAt) <= Date.now() : false;
  const isRefused = capture?.discovery?.state === "refused" || capture?.coverage === "subscription-refused";

  return (
    <div className="mgmt-card space-y-3 p-4" data-capture-status-bar>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#4d554f]">接收時窗狀態：</span>
            {isStarting ? (
              <span className="rounded bg-[#e8f0fe] px-2 py-0.5 text-[12px] font-medium text-[#1a73e8]" data-capture-state="starting">
                啟動中...
              </span>
            ) : !capture ? (
              <span className="rounded bg-[#f0f3f1] px-2 py-0.5 text-[12px] font-medium text-[#687169]" data-capture-state="idle">
                尚未開始接收
              </span>
            ) : isExpired ? (
              <span className="rounded bg-[#fbeae5] px-2 py-0.5 text-[12px] font-medium text-[#c5221f]" data-capture-state="expired">
                時窗已結束（樣本已凍結）
              </span>
            ) : isRefused ? (
              <span className="rounded bg-[#fbeae5] px-2 py-0.5 text-[12px] font-medium text-[#c5221f]" data-capture-state="refused">
                Broker 拒絕訂閱 ({capture.discovery?.reason ?? "REFUSED"})
              </span>
            ) : (
              <span className="rounded bg-[#e6f4ea] px-2 py-0.5 text-[12px] font-medium text-[#137333]" data-capture-state="active">
                接收進行中
              </span>
            )}
            {remainingSeconds !== null && remainingSeconds > 0 ? (
              <span className="text-[12px] text-[#5f6368]" data-capture-remaining>
                剩餘 {remainingSeconds} 秒
              </span>
            ) : null}
          </div>

          <p className="text-[12px] text-[#687169]">
            {selectedProfileName ? `目標範圍：${selectedProfileName}。` : ""}
            此功能為獨立短期觀測，不會發佈任何資料，亦不會寫入正式讀值或歷史紀錄。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!capture || isExpired ? (
            <button
              className="mgmt-action primary min-h-[40px]"
              data-capture-btn-start
              disabled={isStarting}
              onClick={onStart}
              type="button"
            >
              {isExpired ? "重新開啟時窗" : "開始接收資料"}
            </button>
          ) : (
            <>
              {onRefresh ? (
                <button
                  className="mgmt-action min-h-[40px]"
                  data-capture-btn-refresh
                  onClick={onRefresh}
                  type="button"
                >
                  重新整理樣本
                </button>
              ) : null}
              <button
                className="mgmt-action min-h-[40px]"
                data-capture-btn-stop
                onClick={onStop}
                type="button"
              >
                停止接收
              </button>
            </>
          )}
        </div>
      </div>

      {errorMessage ? (
        <div className="mgmt-status is-error text-[13px]" data-capture-error role="alert">
          {errorMessage}
        </div>
      ) : null}

      {capture && capture.dropped > 0 ? (
        <div className="rounded border border-[#f5c6cb] bg-[#fdf2f3] p-2.5 text-[12px] text-[#721c24]">
          注意：有 {capture.dropped} 筆訊息超出負載限制或過大已被忽略，目前為部分樣本（Partial）。
        </div>
      ) : null}
    </div>
  );
}
