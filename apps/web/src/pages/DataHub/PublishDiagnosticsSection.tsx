import { useState } from "react";
import { isManagedSolarTarget, type MeterSourceDefinition } from "@solar-display/shared";
import { requestJson } from "../../services/api";

type PublishConfirmation = {
  broker: string;
  confirmationToken: string;
  exactTopic: string;
  expiresAt: string;
  metricKey: string;
  metricScope: string;
  payload: string;
  retain: boolean;
  source: {
    channelId: string;
    inputUnit: string;
    measurementKind: string;
    meterId: string;
    sourceRevision: number;
  } | null;
  targetFingerprint: string;
  value: string;
};

const PUBLISH_FAILURE_MESSAGES: Record<string, string> = {
  PUBLISH_CONFIRMATION_EXPIRED: "確認已逾時，未發送任何訊息；請重新取得發送目標。",
  PUBLISH_TARGET_CHANGED: "發送目標或內容已變更，未發送任何訊息；請重新確認實際目標。"
};

function describePublishFailure(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  return PUBLISH_FAILURE_MESSAGES[code] ?? (error instanceof Error ? error.message : "發送失敗，未確認送出。");
}

export function PublishDiagnosticsSection({
  defaultOpen = true,
  metricScope,
  onMessage,
  source
}: {
  defaultOpen?: boolean;
  metricScope: "cl" | "kn" | "global";
  onMessage?: (msg: string) => void;
  source: MeterSourceDefinition | null;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [publishValue, setPublishValue] = useState("");
  const [confirmation, setConfirmation] = useState<PublishConfirmation | null>(null);
  const [localMessage, setLocalMessage] = useState("");

  const updateMessage = (msg: string) => {
    setLocalMessage(msg);
    onMessage?.(msg);
  };

  const targetMetricKey = source?.metricKey?.trim() || "consumptionEnergy";
  const isSolar = isManagedSolarTarget(targetMetricKey);

  const requestConfirmation = () => {
    if (publishValue.trim() === "") {
      return;
    }
    if (isSolar) {
      updateMessage("Solar 託管來源禁止進行測試發佈，請改用一般計量或專屬測試目標。");
      return;
    }
    void requestJson<PublishConfirmation>(
      `/api/settings/mqtt/topics/${targetMetricKey}/publish-confirmation`,
      {
        body: JSON.stringify({ metricScope, value: publishValue.trim() }),
        method: "POST"
      }
    ).then((target) => {
      setConfirmation(target);
      updateMessage("");
    }).catch((error: unknown) => {
      updateMessage(error instanceof Error ? error.message : "無法解析發送目標");
    });
  };

  const confirmPublish = () => {
    if (!confirmation) {
      return;
    }
    void requestJson(`/api/settings/mqtt/topics/${confirmation.metricKey}/publish`, {
      body: JSON.stringify({
        confirmationToken: confirmation.confirmationToken,
        confirmed: true,
        metricScope: confirmation.metricScope,
        retain: confirmation.retain,
        value: confirmation.value
      }),
      method: "POST"
    }).then((payload) => {
      updateMessage((payload as { actualPublish?: boolean }).actualPublish ? "已送出確認後的測試值。" : "未發送。");
      setConfirmation(null);
    }).catch((error: unknown) => {
      setConfirmation(null);
      updateMessage(describePublishFailure(error));
    });
  };

  const cancelPublish = () => {
    setConfirmation(null);
    updateMessage("已取消，未發送任何訊息。");
  };

  return (
    <div className="space-y-3 rounded-lg border border-[#e2e8e3] bg-[#f8faf8] p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-[#2d5f35]">進階診斷：實際發送 MQTT 測試值（可選）</span>
        <button
          className="text-xs text-[#526055] underline hover:text-[#1e2821]"
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          {isOpen ? "收合" : "展開進階診斷"}
        </button>
      </div>
      {isOpen ? (
        <div className="space-y-3 pt-2">
          <p className="text-xs text-[#687169]">
            發送測試值將向 MQTT Broker 實際發布資料，可能影響下游統計。此動作並非接入的必經流程。
            目前發送目標為所選來源指標：<strong>{targetMetricKey}</strong>。
          </p>
          {isSolar ? (
            <p className="text-sm text-[#8a4f18]">此來源為 Solar 託管資料，禁止進行實際發送測試。</p>
          ) : (
            <div className="space-y-2">
              <label className="flex flex-col gap-1 text-sm">
                要發送的值
                <input
                  className="mgmt-input min-h-[40px]"
                  data-onboarding-publish-value
                  inputMode="decimal"
                  onChange={(event) => {
                    setPublishValue(event.target.value);
                    setConfirmation(null);
                  }}
                  type="text"
                  value={publishValue}
                />
              </label>
              {confirmation ? (
                <div
                  className="space-y-2 rounded-lg border border-[#ead7aa] bg-[#fff8e8] p-3"
                  data-onboarding-publish-confirm
                >
                  <p className="text-sm">
                    即將發送到 broker {confirmation.broker} / topic {confirmation.exactTopic}，
                    廠區 {confirmation.metricScope}，指標 {confirmation.metricKey}
                    {confirmation.source
                      ? `，來源 ${confirmation.source.channelId} r${confirmation.source.sourceRevision}`
                      : ""}，
                    值 {confirmation.value} {confirmation.source?.inputUnit ?? ""}，
                    retain={String(confirmation.retain)}。
                  </p>
                  <p className="text-sm">payload：{confirmation.payload}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="mgmt-action primary min-h-[40px]"
                      onClick={confirmPublish}
                      type="button"
                    >
                      確認發送
                    </button>
                    <button
                      className="mgmt-action min-h-[40px]"
                      onClick={cancelPublish}
                      type="button"
                    >
                      取消發送
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="mgmt-action min-h-[40px]"
                  data-onboarding-real-publish
                  disabled={publishValue.trim() === ""}
                  onClick={requestConfirmation}
                  type="button"
                >
                  發送測試值（需確認）
                </button>
              )}
            </div>
          )}
          {localMessage ? <p className="text-sm text-[#8a4f18]" role="status">{localMessage}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
