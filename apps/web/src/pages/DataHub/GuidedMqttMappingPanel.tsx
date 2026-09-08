import { useEffect, useMemo, useRef, useState } from "react";
import {
  compileSelector,
  type GuidedMappingApplyResult,
  type MappingPreviewDraft,
  type MappingSuggestion,
  type MeterSourceDefinition
} from "@solar-display/shared";
import { requestJson } from "../../services/api";

type Stage = "select" | "meaning" | "apply";

type FieldCandidate = {
  path: string;
  preview: string;
  tagEquals?: string;
};

/** Saved, broker-acknowledged and actually received are reported separately. */
function describeApplyResult(result: Partial<GuidedMappingApplyResult>) {
  const saved = "對應已保存。";
  if (!result.activation) {
    return saved;
  }
  const reception = result.reception?.observed ? "已收到資料。" : "尚未收到資料。";
  if (result.activation.state === "active") {
    return `${saved}訂閱已生效（${result.activation.topic}）。${reception}`;
  }
  if (result.activation.state === "inactive") {
    return `${saved}來源目前為停用，未建立自身訂閱。`;
  }
  const retry = result.activation.retryable ? "可重試套用，不需重新新增來源。" : "";
  return `${saved}訂閱尚未生效：${result.activation.reason ?? result.activation.state}。${retry}${reception}`;
}

function collectFields(value: unknown, prefix = ""): FieldCandidate[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const tag = typeof record.tag === "string" ? record.tag : undefined;
    return Object.entries(record).flatMap(([key, nested]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (nested && typeof nested === "object") {
        return collectFields(nested, path);
      }
      return [{ path, preview: String(nested), tagEquals: tag }];
    });
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectFields(item, prefix));
  }
  return prefix ? [{ path: prefix, preview: String(value) }] : [];
}

export function GuidedMqttMappingPanel({
  metricScope,
  payload,
  source,
  topic
}: {
  metricScope: "cl" | "kn";
  payload?: unknown;
  source?: MeterSourceDefinition;
  topic?: string;
}) {
  const [stage, setStage] = useState<Stage>("select");
  const [path, setPath] = useState("");
  const [tagEquals, setTagEquals] = useState("");
  const [message, setMessage] = useState("");
  const [previewToken, setPreviewToken] = useState("");
  const [draft, setDraft] = useState<MappingPreviewDraft | null>(null);
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const inputRevision = useRef(0);
  const fields = useMemo(() => payload === undefined ? [] : collectFields(payload), [payload]);
  const hasSourceEvidence = Boolean(source && source.metricScope === metricScope && topic?.trim());
  const canAdvance = fields.length > 0 && path.length > 0;

  useEffect(() => {
    inputRevision.current += 1;
    setStage("select");
    setPath("");
    setTagEquals("");
    setMessage("");
    setPreviewToken("");
    setDraft(null);
    setSuggestions([]);
    setSelectedTags([]);
  }, [metricScope, payload, source, topic]);

  const canonical = (): MappingPreviewDraft => {
    if (!source || source.metricScope !== metricScope || !topic?.trim()) {
      throw new Error("SOURCE_REVIEW_REQUIRED");
    }
    return {
      channelId: source.channelId,
      energyFlowRole: source.energyFlowRole,
      measurementKind: source.measurementKind,
      metricScope,
      selector: compileSelector(path, tagEquals || undefined),
      timestampPolicy: source.timestampPolicy,
      source,
      topic: topic.trim()
    };
  };

  return (
    <section className="mgmt-card space-y-3 p-4" data-guided-mqtt-mapping data-mapping-stage={stage}>
      <h3 className="text-base font-semibold">從已接收資料選欄位</h3>
      {stage === "select" ? (
        <>
          {fields.length > 0 ? (
            <ul className="space-y-1">
              {fields.map((field) => (
                <li key={`${field.path}:${field.tagEquals ?? ""}`}>
                  <button
                    className="mgmt-action min-h-[40px]"
                    data-mapping-field={field.path}
                    onClick={() => {
                      setPath(field.path);
                      setTagEquals(field.tagEquals ?? "");
                    }}
                    type="button"
                  >
                    {field.path}{field.tagEquals ? ` tag=${field.tagEquals}` : ""} = {field.preview}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm" data-mapping-no-observation>尚未收到可選的實際資料；收到資料後才能選取欄位。</p>
          )}
          <p className="text-sm">已選 {path || "尚未選取欄位"}{tagEquals ? ` / ${tagEquals}` : ""}</p>
          <button
            className="mgmt-action min-h-[40px]"
            data-mapping-suggest
            disabled={!hasSourceEvidence || fields.length === 0}
            onClick={() => {
              if (!topic?.trim()) {
                return;
              }
              void requestJson<{ suggestions: MappingSuggestion[] }>("/api/data-hub/mqtt-mappings/suggest", {
                body: JSON.stringify({
                  metricScope,
                  observations: fields
                    .filter((field) => field.tagEquals)
                    .map((field) => ({
                      namespace: metricScope,
                      tag: field.tagEquals,
                      topic: topic.trim(),
                      value: field.preview
                    }))
                }),
                method: "POST"
              }).then((payload) => setSuggestions(payload.suggestions)).catch((error: unknown) => {
                setMessage(error instanceof Error ? error.message : "建議失敗");
              });
            }}
            type="button"
          >
            產生建議
          </button>
          {suggestions.length > 0 ? (
            <ul className="space-y-1" data-mapping-suggestions>
              {suggestions.map((suggestion) => (
                <li key={`${suggestion.namespace}:${suggestion.tag}:${suggestion.topic}`}>
                  <label className="flex min-h-[40px] items-center gap-2 text-sm">
                    <input
                      checked={selectedTags.includes(`${suggestion.topic}:${suggestion.tag}`)}
                      onChange={(event) => {
                        const key = `${suggestion.topic}:${suggestion.tag}`;
                        setSelectedTags((current) => event.target.checked ? [...current, key] : current.filter((item) => item !== key));
                      }}
                      type="checkbox"
                    />
                    {suggestion.tag} @ {suggestion.topic} — {suggestion.reason}
                    {suggestion.autoSelectAsSiteMain ? "（不應出現）" : ""}
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
          <button className="mgmt-action primary min-h-[40px]" disabled={!canAdvance} onClick={() => setStage("meaning")} type="button">下一步</button>
        </>
      ) : null}
      {stage === "meaning" ? (
        <>
          <p className="text-sm">請確認所選欄位符合來源的計量定義。</p>
          {!hasSourceEvidence ? (
            <p className="text-sm" data-mapping-preview-blocked>尚未選定實際資料來源，請先完成來源確認。</p>
          ) : null}
          <button
            className="mgmt-action primary min-h-[40px]"
            disabled={!hasSourceEvidence}
            onClick={() => {
              const requestRevision = inputRevision.current;
              void requestJson<{ canonicalDraft: MappingPreviewDraft; previewToken: string }>(
                "/api/data-hub/mqtt-mappings/preview",
                { body: JSON.stringify(canonical()), method: "POST" }
              ).then((result) => {
                if (requestRevision !== inputRevision.current) {
                  return;
                }
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
          <p className="text-sm" data-mapping-preview-token={previewToken}>預覽已完成，尚未套用。</p>
          {!draft.source || !draft.topic ? (
            <p className="text-sm" data-mapping-apply-blocked>目前來源資料不完整，已停用套用。</p>
          ) : null}
          <button
            className="mgmt-action primary min-h-[40px]"
            disabled={!draft.source || !draft.topic}
            onClick={() => {
              const requestRevision = inputRevision.current;
              void requestJson<Partial<GuidedMappingApplyResult>>("/api/data-hub/mqtt-mappings/apply", {
                body: JSON.stringify({
                  canonicalDraft: draft,
                  idempotencyKey: `m2-${previewToken}`,
                  meterId: draft.source?.meterId ?? "",
                  previewToken,
                  source: draft.source,
                  topic: draft.topic
                }),
                method: "POST"
              }).then((result) => {
                if (requestRevision === inputRevision.current) setMessage(describeApplyResult(result));
              }).catch((error: unknown) => {
                if (requestRevision !== inputRevision.current) return;
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
