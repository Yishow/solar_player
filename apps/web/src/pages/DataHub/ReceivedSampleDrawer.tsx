import { useEffect, useState } from "react";
import type { CaptureSampleEvidence, ObservationCandidate } from "@solar-display/shared";
import { requestJson } from "../../services/api";
import { SourceDetailsDrawer } from "./SourceDetailsDrawer";

export type ReceivedSampleDrawerProps = {
  candidate: ObservationCandidate;
  captureId: string;
  onClose: () => void;
  onCreateMapping: (candidate: ObservationCandidate, samplePayload: unknown) => void;
  onNavigateToEngineering?: () => void;
};

export function ReceivedSampleDrawer({
  candidate,
  captureId,
  onClose,
  onCreateMapping,
  onNavigateToEngineering
}: ReceivedSampleDrawerProps) {
  const [evidence, setEvidence] = useState<CaptureSampleEvidence | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const sampleId = candidate.sampleRefs.at(-1);

  useEffect(() => {
    if (!sampleId) {
      setIsLoading(false);
      setErrorMessage("此項目目前沒有可讀取的樣本。");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    requestJson<CaptureSampleEvidence>(`/api/settings/mqtt/captures/${captureId}/samples/${sampleId}`)
      .then((data) => {
        setEvidence(data);
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "讀取樣本失敗，可能已過期。");
      })
      .finally(() => setIsLoading(false));
  }, [captureId, sampleId]);

  const parsedPayload = evidence ? (() => {
    try {
      return JSON.parse(evidence.redactedPayload);
    } catch {
      return evidence.redactedPayload;
    }
  })() : null;

  const isRetained = evidence?.transportEvidence.retain === true;
  const kind = candidate.candidateKind ?? "generic";

  return (
    <SourceDetailsDrawer
      footerActions={
        <div className="flex flex-wrap gap-2">
          {kind === "generic" || kind === "physical-raw" ? (
            <button
              className="mgmt-action primary min-h-[40px]"
              data-received-action-create
              disabled={isLoading || !evidence}
              onClick={() => onCreateMapping(candidate, parsedPayload)}
              type="button"
            >
              從此樣本建立來源設定
            </button>
          ) : kind === "engineering" && onNavigateToEngineering ? (
            <button
              className="mgmt-action primary min-h-[40px]"
              data-received-action-engineering
              onClick={onNavigateToEngineering}
              type="button"
            >
              前往觀音工程來源工作台
            </button>
          ) : null}
          <button className="mgmt-action min-h-[40px]" onClick={onClose} type="button">
            關閉
          </button>
        </div>
      }
      onClose={onClose}
      title={`接收樣本：${candidate.exactTopic}`}
    >
      <div className="space-y-4 text-sm" data-received-sample-drawer>
        {isRetained ? (
          <div className="rounded-lg border border-[#f5c6cb] bg-[#fff0f1] p-3 text-[13px] text-[#721c24]" data-retained-alert>
            <strong>注意：這是 Retained 舊樣本。</strong>
            <p className="mt-0.5 text-[12px]">此訊息是由 MQTT Broker 保存的保留訊息，不代表目前有即時活耀的發布流量或新鮮讀值。</p>
          </div>
        ) : null}

        {kind === "solar-managed" ? (
          <div className="rounded-lg border border-[#ead7aa] bg-[#fff8e8] p-3 text-[13px] text-[#6b5524]" data-solar-managed-note>
            <strong>系統託管來源 (SolarSourceAdapter)</strong>
            <p className="mt-0.5 text-[12px]">此 Topic 為 Solar 系統專屬標準摘要或分區 topic，已由系統適配器自動管理，不可手動建立重複的通用對應。</p>
          </div>
        ) : null}

        {kind === "engineering" ? (
          <div className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-[13px] text-[#166534]" data-engineering-note>
            <strong>觀音工程成果來源 (Engineering Source)</strong>
            <p className="mt-0.5 text-[12px]">此 Topic 符合觀音八工程成果規範，應透過觀音工程設定與日報機制納入計量，無需在此拆解為底層實體電錶。</p>
          </div>
        ) : null}

        {kind === "diagnostic" ? (
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3 text-[13px] text-[#374151]" data-diagnostic-note>
            <strong>診斷／心跳訊息 (Diagnostic)</strong>
            <p className="mt-0.5 text-[12px]">此訊息屬於設備或橋接器運作狀態檢測，不可作為正規計量與用電指標來源。</p>
          </div>
        ) : null}

        <div className="mgmt-card space-y-2 p-3 text-[13px]">
          <h4 className="font-semibold text-[#4d554f]">傳輸與時間特徵 (Transport Evidence)</h4>
          <div className="grid grid-cols-2 gap-2 text-[12px] text-[#687169]">
            <div>來源端點：{evidence?.transportEvidence.origin ?? "未知"}</div>
            <div>QoS 等級：{evidence?.transportEvidence.qos ?? "無"}</div>
            <div>接收時間：{evidence ? new Date(evidence.transportEvidence.receivedAt).toLocaleString() : "未知"}</div>
            <div>來源時間：{candidate.declaredTag ? `Tag: ${candidate.declaredTag}` : "無獨立來源時間"}</div>
          </div>
        </div>

        <div className="mgmt-card space-y-2 p-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-semibold text-[#4d554f]">樣本內容 (Redacted Payload)</h4>
            <span className="text-[11px] text-[#7b857d]">已過濾敏感資訊並防護文字注入</span>
          </div>

          {isLoading ? (
            <div className="py-4 text-center text-sm text-[#687169]">正在讀取樣本...</div>
          ) : errorMessage ? (
            <div className="rounded bg-[#fbeae5] p-3 text-xs text-[#c5221f]" role="alert">{errorMessage}</div>
          ) : evidence ? (
            <pre className="max-h-64 overflow-auto rounded bg-[#1e293b] p-3 font-mono text-[12px] text-[#f8fafc]" data-sample-payload>
              {typeof parsedPayload === "object" ? JSON.stringify(parsedPayload, null, 2) : String(evidence.redactedPayload)}
            </pre>
          ) : null}
        </div>
      </div>
    </SourceDetailsDrawer>
  );
}
