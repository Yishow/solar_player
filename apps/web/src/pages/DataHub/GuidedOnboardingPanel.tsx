import { useState } from "react";
import { nextOnboardingStep, onboardingPreservesScope, previousOnboardingStep, realPublishConfirmation, type OnboardingStep } from "@solar-display/shared";
import { requestJson } from "../../services/api";
import { GuidedMqttMappingPanel } from "./GuidedMqttMappingPanel";

const LABELS: Record<OnboardingStep, string> = {
  connection: "連線",
  site: "廠區",
  "received-data": "已接收資料",
  confirm: "確認"
};

export function GuidedOnboardingPanel({ scope }: { scope: "cl" | "kn" | "all" | "global" }) {
  const [step, setStep] = useState<OnboardingStep>("connection");
  const [message, setMessage] = useState("");
  const [broker, setBroker] = useState("");
  const [confirmPublish, setConfirmPublish] = useState(false);
  if (scope !== "cl" && scope !== "kn") {
    return <p className="text-sm text-[#8a4f18]" data-onboarding-choose-site>請先選擇 CL 或 KN 廠區，才能接入新資料。</p>;
  }
  return (
    <section className="mgmt-card space-y-3 p-4" data-guided-onboarding data-onboarding-step={step}>
      <h3 className="text-base font-semibold">接入新資料</h3>
      <p className="text-sm">目前廠區 {onboardingPreservesScope(scope).toUpperCase()}。</p>
      <ol className="flex flex-wrap gap-2 text-sm">
        {(Object.keys(LABELS) as OnboardingStep[]).map((key) => (
          <li className={key === step ? "font-semibold" : ""} key={key}>{LABELS[key]}</li>
        ))}
      </ol>
      {step === "connection" ? (
        <div className="space-y-2">
          <p className="text-sm">連線測試只確認 broker，不代表欄位對應正確，也不會發送 MQTT。</p>
          <button
            className="mgmt-action min-h-[40px]"
            data-onboarding-connection-test
            onClick={() => {
              void requestJson<{ status?: { broker?: string; connected?: boolean } }>("/api/settings/mqtt")
                .then((payload) => {
                  setBroker(payload.status?.broker ?? "");
                  setMessage(payload.status?.connected ? "broker 已連線。" : "broker 目前未連線。");
                })
                .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "連線測試失敗"));
            }}
            type="button"
          >
            測試連線
          </button>
        </div>
      ) : null}
      {step === "received-data" ? <GuidedMqttMappingPanel metricScope={scope} /> : null}
      {step === "confirm" ? (
        <div className="space-y-2">
          <p className="text-sm">確認後可到廠區用電設定指定總錶與部門。解析預覽不會發送 MQTT。</p>
          <p className="text-sm">真的發送測試值是另一個動作，預設不 retained，且要列出 broker / topic / 廠區 / 值後確認。</p>
          {confirmPublish ? (
            <div className="space-y-2 rounded-lg border border-[#ead7aa] bg-[#fff8e8] p-3" data-onboarding-publish-confirm>
              <p className="text-sm">即將發送到 {broker || "目前 broker"} / {scope}/{scope}-main，值 10000.125，retain=false。</p>
              <button
                className="mgmt-action primary min-h-[40px]"
                onClick={() => {
                  const confirmation = realPublishConfirmation({
                    broker: broker || "broker",
                    confirmed: true,
                    metricScope: scope,
                    topic: `${scope}/${scope}-main`,
                    value: "10000.125"
                  });
                  void requestJson(`/api/settings/mqtt/topics/consumptionEnergy/publish`, {
                    body: JSON.stringify({
                      confirmed: true,
                      metricScope: scope,
                      retain: confirmation.retain,
                      value: 10000.125
                    }),
                    method: "POST"
                  }).then((payload) => {
                    setMessage((payload as { actualPublish?: boolean }).actualPublish ? "已送出確認後的測試值。" : "未發送。");
                    setConfirmPublish(false);
                  }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "發送失敗"));
                }}
                type="button"
              >
                確認發送
              </button>
            </div>
          ) : (
            <button className="mgmt-action min-h-[40px]" data-onboarding-real-publish onClick={() => setConfirmPublish(true)} type="button">
              發送測試值（需確認）
            </button>
          )}
        </div>
      ) : null}
      {message ? <p className="text-sm" role="status">{message}</p> : null}
      <div className="flex gap-2">
        <button className="mgmt-action min-h-[40px]" onClick={() => setStep(previousOnboardingStep(step))} type="button">上一步</button>
        <button className="mgmt-action primary min-h-[40px]" onClick={() => setStep(nextOnboardingStep(step))} type="button">下一步</button>
      </div>
    </section>
  );
}
