import { useState } from "react";
import { onboardingPreservesScope, type ReceptionProfile } from "@solar-display/shared";
import { requestJson } from "../../services/api";

export function OnboardingPrerequisites({
  broker,
  onBrokerChange,
  onMessage,
  profiles,
  site
}: {
  broker: string;
  onBrokerChange?: (broker: string) => void;
  onMessage?: (msg: string) => void;
  profiles: ReceptionProfile[];
  site: "cl" | "kn" | null;
}) {
  const [checking, setChecking] = useState(false);
  const [brokerStatus, setBrokerStatus] = useState<string | null>(null);

  if (!site) {
    return (
      <div className="rounded-lg border border-[#ead7aa] bg-[#fff8e8] p-3 text-sm">
        <p className="text-[#8a4f18]" data-onboarding-choose-site>
          請先選擇 CL 或 KN 廠區，才能接入新資料。
        </p>
      </div>
    );
  }

  const checkConnection = () => {
    setChecking(true);
    void requestJson<{ status?: { broker?: string; connected?: boolean } }>("/api/settings/mqtt")
      .then((payload) => {
        const brokerAddr = payload.status?.broker ?? "";
        if (brokerAddr) {
          onBrokerChange?.(brokerAddr);
        }
        const connected = Boolean(payload.status?.connected);
        const statusText = connected ? "Broker 目前連線正常。" : "Broker 目前未連線。";
        setBrokerStatus(statusText);
        onMessage?.(statusText);
      })
      .catch((error: unknown) => {
        const errText = error instanceof Error ? error.message : "檢查連線狀態失敗";
        setBrokerStatus(errText);
        onMessage?.(errText);
      })
      .finally(() => {
        setChecking(false);
      });
  };

  return (
    <div className="space-y-2 rounded-lg border border-[#d3ded4] bg-[#f4f7f4] p-3 text-sm" data-onboarding-prerequisites>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-[#1e2821]">前置條件確認：</span>
          <span className="ml-1 text-[#2d5f35]">廠區 {onboardingPreservesScope(site).toUpperCase()}</span>
          {broker ? <span className="ml-2 text-xs text-[#526055]">({broker})</span> : null}
          {profiles.length > 0 ? (
            <span className="ml-2 inline-flex items-center rounded bg-[#e3efe4] px-1.5 py-0.5 text-xs text-[#2d5f35]">
              接收範圍已核准 ({profiles.length})
            </span>
          ) : (
            <span className="ml-2 inline-flex items-center rounded bg-[#fff0ed] px-1.5 py-0.5 text-xs text-[#b53a25]">
              尚未設定接收範圍
            </span>
          )}
        </div>
        <button
          className="mgmt-action min-h-[36px] py-1 text-xs"
          data-onboarding-connection-test
          disabled={checking}
          onClick={checkConnection}
          type="button"
        >
          {checking ? "檢查中..." : "檢查目前連線"}
        </button>
      </div>
      {brokerStatus ? (
        <p className="text-xs text-[#4d554f]" role="status">
          {brokerStatus}
        </p>
      ) : (
        <p className="text-xs text-[#687169]">
          檢查目前 Broker 運作狀態，不代表欄位對應正確，亦不會發送 MQTT。
        </p>
      )}
    </div>
  );
}
