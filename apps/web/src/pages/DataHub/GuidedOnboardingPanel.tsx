import { useState } from "react";
import { nextOnboardingStep, onboardingPreservesScope, previousOnboardingStep, type OnboardingStep } from "@solar-display/shared";
import { GuidedMqttMappingPanel } from "./GuidedMqttMappingPanel";

const LABELS: Record<OnboardingStep, string> = {
  connection: "連線",
  site: "廠區",
  "received-data": "已接收資料",
  confirm: "確認"
};

export function GuidedOnboardingPanel({ scope }: { scope: "cl" | "kn" | "all" | "global" }) {
  const [step, setStep] = useState<OnboardingStep>("connection");
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
      {step === "received-data" ? <GuidedMqttMappingPanel metricScope={scope} /> : null}
      {step === "confirm" ? <p className="text-sm">確認後可到廠區用電設定指定總錶與部門。</p> : null}
      <div className="flex gap-2">
        <button className="mgmt-action min-h-[40px]" onClick={() => setStep(previousOnboardingStep(step))} type="button">上一步</button>
        <button className="mgmt-action primary min-h-[40px]" onClick={() => setStep(nextOnboardingStep(step))} type="button">下一步</button>
      </div>
    </section>
  );
}
