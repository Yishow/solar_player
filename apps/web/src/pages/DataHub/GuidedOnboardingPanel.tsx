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
import { OnboardingPrerequisites } from "./OnboardingPrerequisites";
import { PublishDiagnosticsSection } from "./PublishDiagnosticsSection";

const LABELS: Record<OnboardingStep, string> = {
  connection: "連線",
  site: "廠區",
  "received-data": "已接收資料",
  confirm: "確認"
};

const CONNECTION_REF = "central";

type SelectedSample = {
  payload: unknown;
  sampleId: string;
  topic: string;
};

function approvedDiscoveryFilter(profile: ReceptionProfile) {
  const approved = profile.allowedFilters[0] ?? "";
  return approved.endsWith("/") ? `${approved}#` : approved;
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

  const site = scope === "cl" || scope === "kn" ? scope : null;

  useEffect(() => {
    if (!site) {
      return;
    }
    void requestJson<{ profiles: ReceptionProfile[] }>("/api/settings/mqtt/reception-profiles")
      .then((payload) => setProfiles(payload.profiles.filter((p) => p.siteScope === site)))
      .catch((error: unknown) => setMessage(errorMessage(error, "無法取得可接收範圍")));
    void requestJson<{ sources: MeterSourceDefinition[] }>(`/api/data-hub/sites/${site}/meter-sources`)
      .then((payload) => setSources(payload.sources.filter((entry) => entry.reviewStatus === "reviewed")))
      .catch((error: unknown) => setMessage(errorMessage(error, "無法取得已審查來源")));
  }, [site]);

  const refreshCandidates = useCallback((captureId: string) => {
    return requestJson<{ candidates: ObservationCandidate[] }>(`/api/settings/mqtt/captures/${captureId}/candidates`)
      .then((payload) => {
        setCandidates(payload.candidates);
        setCandidatesLoaded(true);
        setMessage(
          payload.candidates.length > 0
            ? `已收到 ${payload.candidates.length} 個 Topic 的樣本，可選取要對應的 Topic。`
            : ""
        );
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

      {/* 原地前置條件檢視 */}
      <OnboardingPrerequisites
        broker={broker}
        onBrokerChange={setBroker}
        onMessage={setMessage}
        profiles={profiles}
        site={site}
      />

      <ol className="flex flex-wrap gap-2 text-sm">
        {(Object.keys(LABELS) as OnboardingStep[]).map((key) => (
          <li className={key === step ? "font-semibold" : ""} key={key}>
            {LABELS[key]}
          </li>
        ))}
      </ol>

      {step === "connection" ? (
        <div className="space-y-2">
          <p className="text-sm">已配置連線前置條件。可隨時按下一步進入資料選取與對應。</p>
        </div>
      ) : null}

      {step === "site" ? (
        <div className="space-y-2">
          <p className="text-sm">
            目前廠區已確定為 <strong>{site.toUpperCase()}</strong>。按下一步開始接收或選取資料。
          </p>
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
                })
                  .then((session) => {
                    setCapture(session);
                    setCandidates([]);
                    setCandidatesLoaded(false);
                    setMessage(
                      session.discovery?.state === "refused"
                        ? `broker 拒絕接收：${session.discovery.reason ?? "SUBSCRIPTION_REFUSED"}`
                        : "已開始接收，尚未收到資料。"
                    );
                  })
                  .catch((error: unknown) => setMessage(errorMessage(error, "無法開始接收")));
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
                      )
                        .then((evidence) => {
                          let parsed: unknown = evidence.redactedPayload;
                          try {
                            parsed = JSON.parse(evidence.redactedPayload);
                          } catch {
                            // A non-JSON payload is still selectable as a scalar.
                          }
                          setSample({ payload: parsed, sampleId: evidence.sampleId, topic: evidence.exactTopic });
                        })
                        .catch((error: unknown) => setMessage(errorMessage(error, "樣本已過期，請重新接收")));
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
            <p className="text-sm" data-onboarding-no-source>
              此廠區還沒有已審查的來源，請先在來源管理完成來源審查。
            </p>
          )}

          {sample ? (
            <p className="text-sm" data-onboarding-selected-topic={sample.topic}>
              已選 Topic {sample.topic}
            </p>
          ) : null}
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
            sources={sources}
            topic={sample.topic}
            />
          ) : null}
        </div>
      ) : null}

      {step === "confirm" ? (
        <div className="space-y-3">
          <p className="text-sm">確認後可到廠區用電設定指定總錶與部門。解析預覽不會發送 MQTT。</p>
          <PublishDiagnosticsSection
            metricScope={site}
            onMessage={setMessage}
            source={source}
          />
        </div>
      ) : null}

      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          className="mgmt-action min-h-[40px]"
          onClick={() => setStep(previousOnboardingStep(step))}
          type="button"
        >
          上一步
        </button>
        <button
          className="mgmt-action primary min-h-[40px]"
          onClick={() => setStep(nextOnboardingStep(step))}
          type="button"
        >
          下一步
        </button>
      </div>
    </section>
  );
}
