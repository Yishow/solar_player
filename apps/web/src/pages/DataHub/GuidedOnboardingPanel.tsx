import { useCallback, useEffect, useState } from "react";
import {
  nextOnboardingStep,
  onboardingPreservesScope,
  previousOnboardingStep,
  type CaptureSampleEvidence,
  type CaptureSession,
  type MeterSourceDefinition,
  type ObservationCandidate,
  type OnboardingStep,
  type ReceptionProfile
} from "@solar-display/shared";
import { requestJson } from "../../services/api";
import { GuidedMqttMappingPanel } from "./GuidedMqttMappingPanel";

const LABELS: Record<OnboardingStep, string> = {
  connection: "連線",
  site: "廠區",
  "received-data": "已接收資料",
  confirm: "確認"
};

const CONNECTION_REF = "central";

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

type SelectedSample = {
  payload: unknown;
  sampleId: string;
  topic: string;
};

/**
 * An approved prefix such as `factory/kn/` matches nothing as an MQTT filter;
 * discovery must ask for the multi-level wildcard under that approved prefix.
 */
function approvedDiscoveryFilter(profile: ReceptionProfile) {
  const approved = profile.allowedFilters[0] ?? "";
  return approved.endsWith("/") ? `${approved}#` : approved;
}

const PUBLISH_FAILURE_MESSAGES: Record<string, string> = {
  PUBLISH_CONFIRMATION_EXPIRED: "確認已逾時，未發送任何訊息；請重新取得發送目標。",
  PUBLISH_TARGET_CHANGED: "發送目標或內容已變更，未發送任何訊息；請重新確認實際目標。"
};

function describePublishFailure(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  return PUBLISH_FAILURE_MESSAGES[code] ?? errorMessage(error, "發送失敗，未確認送出。");
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function GuidedOnboardingPanel({ scope }: { scope: "cl" | "kn" | "all" | "global" }) {
  const [step, setStep] = useState<OnboardingStep>("connection");
  const [message, setMessage] = useState("");
  const [broker, setBroker] = useState("");
  const [profiles, setProfiles] = useState<ReceptionProfile[]>([]);
  const [sources, setSources] = useState<MeterSourceDefinition[]>([]);
  const [capture, setCapture] = useState<CaptureSession | null>(null);
  const [candidates, setCandidates] = useState<ObservationCandidate[]>([]);
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);
  const [sample, setSample] = useState<SelectedSample | null>(null);
  const [source, setSource] = useState<MeterSourceDefinition | null>(null);
  const [publishValue, setPublishValue] = useState("");
  const [confirmation, setConfirmation] = useState<PublishConfirmation | null>(null);
  const site = scope === "cl" || scope === "kn" ? scope : null;

  useEffect(() => {
    if (step !== "received-data" || !site) {
      return;
    }
    void requestJson<{ profiles: ReceptionProfile[] }>("/api/settings/mqtt/reception-profiles")
      .then((payload) => setProfiles(payload.profiles.filter((profile) => profile.siteScope === site)))
      .catch((error: unknown) => setMessage(errorMessage(error, "無法取得可接收範圍")));
    void requestJson<{ sources: MeterSourceDefinition[] }>(`/api/data-hub/sites/${site}/meter-sources`)
      .then((payload) => setSources(payload.sources.filter((entry) => entry.reviewStatus === "reviewed")))
      .catch((error: unknown) => setMessage(errorMessage(error, "無法取得已審查來源")));
  }, [site, step]);

  const refreshCandidates = useCallback((captureId: string) => {
    return requestJson<{ candidates: ObservationCandidate[] }>(`/api/settings/mqtt/captures/${captureId}/candidates`)
      .then((payload) => {
        setCandidates(payload.candidates);
        setCandidatesLoaded(true);
        // The start-of-capture status must not outlive what the capture now shows.
        setMessage(payload.candidates.length > 0
          ? `已收到 ${payload.candidates.length} 個 Topic 的樣本，可選取要對應的 Topic。`
          : "");
      })
      .catch((error: unknown) => {
        setCandidatesLoaded(true);
        setMessage(errorMessage(error, "接收清單已失效，請重新開始接收"));
      });
  }, []);

  if (!site) {
    return <p className="text-sm text-[#8a4f18]" data-onboarding-choose-site>請先選擇 CL 或 KN 廠區，才能接入新資料。</p>;
  }

  return (
    <section className="mgmt-card space-y-3 p-4" data-guided-onboarding data-onboarding-step={step}>
      <h3 className="text-base font-semibold">接入新資料</h3>
      <p className="text-sm">目前廠區 {onboardingPreservesScope(site).toUpperCase()}。</p>
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
                .catch((error: unknown) => setMessage(errorMessage(error, "連線測試失敗")));
            }}
            type="button"
          >
            測試連線
          </button>
        </div>
      ) : null}
      {step === "received-data" ? (
        <div className="space-y-3">
          <p className="text-sm">先在已批准的接收範圍取得實際樣本，才能選欄位；樣本不會寫入正式讀值。</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="mgmt-action min-h-[40px]"
              data-onboarding-capture-start
              disabled={profiles.length === 0}
              onClick={() => {
                const profile = profiles[0];
                if (!profile) {
                  return;
                }
                void requestJson<CaptureSession>("/api/settings/mqtt/captures", {
                  body: JSON.stringify({
                    connectionRef: CONNECTION_REF,
                    filter: approvedDiscoveryFilter(profile),
                    mode: "active",
                    receptionProfileId: profile.id,
                    siteScope: site
                  }),
                  method: "POST"
                }).then((session) => {
                  setCapture(session);
                  setCandidates([]);
                  setCandidatesLoaded(false);
                  setMessage(session.discovery?.state === "refused"
                    ? `broker 拒絕接收：${session.discovery.reason ?? "SUBSCRIPTION_REFUSED"}`
                    : "已開始接收，尚未收到資料。");
                }).catch((error: unknown) => setMessage(errorMessage(error, "無法開始接收")));
              }}
              type="button"
            >
              開始接收
            </button>
            <button
              className="mgmt-action min-h-[40px]"
              data-onboarding-capture-refresh
              disabled={!capture}
              onClick={() => {
                if (capture) {
                  void refreshCandidates(capture.captureId);
                }
              }}
              type="button"
            >
              重新整理
            </button>
          </div>
          {capture && candidatesLoaded && candidates.length === 0 ? (
            <p className="text-sm" data-onboarding-capture-empty>
              這段期間沒有收到符合範圍的資料，來源仍未接入；可以重新整理或稍後再試。
            </p>
          ) : null}
          {candidates.length > 0 ? (
            <ul className="space-y-1" data-onboarding-candidates>
              {candidates.map((candidate) => (
                <li key={candidate.candidateId}>
                  <button
                    className="mgmt-action min-h-[40px]"
                    data-onboarding-candidate={candidate.exactTopic}
                    onClick={() => {
                      const sampleId = candidate.sampleRefs.at(-1);
                      if (!capture || !sampleId) {
                        setMessage("這個 Topic 目前沒有可用樣本，請重新整理。");
                        return;
                      }
                      void requestJson<CaptureSampleEvidence>(
                        `/api/settings/mqtt/captures/${capture.captureId}/samples/${sampleId}`
                      ).then((evidence) => {
                        let parsed: unknown = evidence.redactedPayload;
                        try {
                          parsed = JSON.parse(evidence.redactedPayload);
                        } catch {
                          // A non-JSON payload is still selectable as a scalar.
                        }
                        setSample({ payload: parsed, sampleId: evidence.sampleId, topic: evidence.exactTopic });
                      }).catch((error: unknown) => setMessage(errorMessage(error, "樣本已過期，請重新接收")));
                    }}
                    type="button"
                  >
                    {candidate.exactTopic}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {sources.length > 0 ? (
            <ul className="space-y-1" data-onboarding-sources>
              {sources.map((entry) => (
                <li key={entry.channelId}>
                  <button
                    className="mgmt-action min-h-[40px]"
                    data-onboarding-source={entry.channelId}
                    onClick={() => setSource(entry)}
                    type="button"
                  >
                    {entry.channelId} — {entry.measurementKind} / {entry.energyFlowRole} / {entry.inputUnit}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm" data-onboarding-no-source>此廠區還沒有已審查的來源，請先在來源管理完成來源審查。</p>
          )}
          {sample ? <p className="text-sm" data-onboarding-selected-topic={sample.topic}>已選 Topic {sample.topic}</p> : null}
          {source ? (
            <p className="text-sm" data-onboarding-selected-source={source.channelId}>
              已選來源 {source.channelId}（{source.measurementKind}，{source.inputUnit}）
            </p>
          ) : null}
          {sample && source ? (
            <GuidedMqttMappingPanel
              metricScope={site}
              payload={sample.payload}
              source={source}
              topic={sample.topic}
            />
          ) : null}
        </div>
      ) : null}
      {step === "confirm" ? (
        <div className="space-y-2">
          <p className="text-sm">確認後可到廠區用電設定指定總錶與部門。解析預覽不會發送 MQTT。</p>
          <p className="text-sm">真的發送測試值是另一個動作，預設不 retained，且要由後端解析出實際目標後確認。</p>
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
            <div className="space-y-2 rounded-lg border border-[#ead7aa] bg-[#fff8e8] p-3" data-onboarding-publish-confirm>
              <p className="text-sm">
                即將發送到 broker {confirmation.broker} / topic {confirmation.exactTopic}，
                廠區 {confirmation.metricScope}，指標 {confirmation.metricKey}
                {confirmation.source ? `，來源 ${confirmation.source.channelId} r${confirmation.source.sourceRevision}` : ""}，
                值 {confirmation.value} {confirmation.source?.inputUnit ?? ""}，retain={String(confirmation.retain)}。
              </p>
              <p className="text-sm">payload：{confirmation.payload}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="mgmt-action primary min-h-[40px]"
                  onClick={() => {
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
                      setMessage((payload as { actualPublish?: boolean }).actualPublish ? "已送出確認後的測試值。" : "未發送。");
                      setConfirmation(null);
                    }).catch((error: unknown) => {
                      setConfirmation(null);
                      setMessage(describePublishFailure(error));
                    });
                  }}
                  type="button"
                >
                  確認發送
                </button>
                <button
                  className="mgmt-action min-h-[40px]"
                  onClick={() => {
                    setConfirmation(null);
                    setMessage("已取消，未發送任何訊息。");
                  }}
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
              onClick={() => {
                void requestJson<PublishConfirmation>("/api/settings/mqtt/topics/consumptionEnergy/publish-confirmation", {
                  body: JSON.stringify({ metricScope: site, value: publishValue.trim() }),
                  method: "POST"
                }).then((target) => {
                  setBroker(target.broker);
                  setConfirmation(target);
                }).catch((error: unknown) => setMessage(errorMessage(error, "無法解析發送目標")));
              }}
              type="button"
            >
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
