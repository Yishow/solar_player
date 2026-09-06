import { useState } from "react";
import { compileSelector, type MappingPreviewDraft } from "@solar-display/shared";
import { requestJson } from "../../services/api";

type Stage = "select" | "meaning" | "apply";

export function GuidedMqttMappingPanel({
  metricScope,
  payload
}: {
  metricScope: "cl" | "kn";
  payload?: unknown;
}) {
  const [stage, setStage] = useState<Stage>("select");
  const [path, setPath] = useState("value");
  const [tagEquals, setTagEquals] = useState("");
  const [message, setMessage] = useState("");
  const [previewToken, setPreviewToken] = useState("");
  const [draft, setDraft] = useState<MappingPreviewDraft | null>(null);

  const canonical = (): MappingPreviewDraft => ({
    channelId: `${metricScope}-main`,
    energyFlowRole: "consumption",
    measurementKind: "cumulative-energy",
    metricScope,
    selector: compileSelector(path, tagEquals || undefined),
    timestampPolicy: "source-required"
  });

  return (
    <section className="mgmt-card space-y-3 p-4" data-guided-mqtt-mapping data-mapping-stage={stage}>
      <h3 className="text-base font-semibold">從已接收資料選欄位</h3>
      {stage === "select" ? (
        <>
          <label className="block text-sm">
            JSON 路徑
            <input className="mgmt-input mt-1 min-h-[40px] w-full" onChange={(event) => setPath(event.target.value)} value={path} />
          </label>
          <label className="block text-sm">
            tag 識別（可空）
            <input className="mgmt-input mt-1 min-h-[40px] w-full" onChange={(event) => setTagEquals(event.target.value)} value={tagEquals} />
          </label>
          {payload ? <pre className="overflow-auto text-xs">{JSON.stringify(payload, null, 2)}</pre> : null}
          <button className="mgmt-action primary min-h-[40px]" onClick={() => setStage("meaning")} type="button">下一步</button>
        </>
      ) : null}
      {stage === "meaning" ? (
        <>
          <p className="text-sm">確認這是累積用電、consumption、source-required。</p>
          <button
            className="mgmt-action primary min-h-[40px]"
            onClick={() => {
              void requestJson<{ canonicalDraft: MappingPreviewDraft; previewToken: string }>(
                "/api/data-hub/mqtt-mappings/preview",
                { body: JSON.stringify(canonical()), method: "POST" }
              ).then((result) => {
                setDraft(result.canonicalDraft);
                setPreviewToken(result.previewToken);
                setStage("apply");
              }).catch((error: unknown) => {
                setMessage(error instanceof Error ? error.message : "預覽失敗");
              });
            }}
            type="button"
          >
            產生預覽
          </button>
        </>
      ) : null}
      {stage === "apply" && draft ? (
        <>
          <p className="text-sm" data-mapping-preview-token={previewToken}>previewToken 已核發，尚未寫入讀值。</p>
          <button
            className="mgmt-action primary min-h-[40px]"
            onClick={() => {
              void requestJson("/api/data-hub/mqtt-mappings/apply", {
                body: JSON.stringify({
                  canonicalDraft: draft,
                  idempotencyKey: `m2-${metricScope}-${Date.now()}`,
                  meterId: draft.channelId,
                  previewToken,
                  source: {
                    channelId: draft.channelId,
                    enabled: true,
                    energyFlowRole: draft.energyFlowRole,
                    epochId: "epoch-1",
                    expectedCadenceSeconds: 60,
                    inputUnit: "kWh",
                    measurementKind: draft.measurementKind,
                    meterId: draft.channelId,
                    metricKey: "consumptionEnergy",
                    metricScope,
                    reviewStatus: "reviewed",
                    scaleDecimal: "1",
                    sourceRevision: 1,
                    sourceTimestampTimeZone: "UTC",
                    timestampPolicy: draft.timestampPolicy
                  }
                }),
                method: "POST"
              }).then(() => setMessage("對應已套用。")).catch((error: unknown) => {
                setMessage(error instanceof Error ? error.message : "套用失敗");
              });
            }}
            type="button"
          >
            套用對應
          </button>
        </>
      ) : null}
      {message ? <p className="text-sm" role="status">{message}</p> : null}
    </section>
  );
}
