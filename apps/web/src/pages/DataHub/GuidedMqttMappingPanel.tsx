import { useEffect, useMemo, useRef, useState } from "react";
import {
  compileSelector,
  detectAmbiguousTags,
  inspectMessageProvenance,
  validateScaleMultiplier,
  type GuidedMappingBatchPreviewResult,
  type MappingPreviewDraft,
  type MappingSuggestion,
  type MeterSourceDefinition
} from "@solar-display/shared";
import { requestJson } from "../../services/api";
import { MappingPreviewAndApply } from "./MappingPreviewAndApply";

type Stage = "select" | "meaning" | "apply";

type FieldCandidate = {
  path: string;
  preview: string;
  tagEquals?: string;
};

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
  isOffline = false,
  metricScope,
  payload,
  source,
  sources,
  topic
}: {
  isOffline?: boolean;
  metricScope: "cl" | "kn";
  payload?: unknown;
  source?: MeterSourceDefinition;
  sources?: MeterSourceDefinition[];
  topic?: string;
}) {
  const [stage, setStage] = useState<Stage>("select");
  const [path, setPath] = useState("");
  const [tagEquals, setTagEquals] = useState("");
  const [message, setMessage] = useState("");
  const [previewToken, setPreviewToken] = useState("");
  const [draft, setDraft] = useState<MappingPreviewDraft | null>(null);
  const [batchPreview, setBatchPreview] = useState<GuidedMappingBatchPreviewResult | null>(null);
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [targetBySuggestion, setTargetBySuggestion] = useState<Record<string, string>>({});
  const [scaleMultiplierInput, setScaleMultiplierInput] = useState(source?.scaleDecimal ?? "1");
  const [measurementKind, setMeasurementKind] = useState(source?.measurementKind ?? "cumulative-energy");
  const [energyFlowRole, setEnergyFlowRole] = useState(source?.energyFlowRole ?? "consumption");
  const [timestampPolicy, setTimestampPolicy] = useState(source?.timestampPolicy ?? "source-required");
  const inputRevision = useRef(0);

  const fields = useMemo(() => (payload === undefined ? [] : collectFields(payload)), [payload]);
  const hasSourceEvidence = Boolean(source && source.metricScope === metricScope && topic?.trim());
  const canAdvance = fields.length > 0 && path.length > 0;
  const selectedSuggestions = suggestions.filter((suggestion) =>
    selectedTags.includes(`${suggestion.topic}:${suggestion.tag}`)
  );
  const selectedSuggestion = selectedSuggestions.length === 1 ? selectedSuggestions[0] : undefined;
  const availableTargets = useMemo(() => {
    const seen = new Set<string>();
    return [source, ...(sources ?? [])].filter((candidate): candidate is MeterSourceDefinition => {
      if (!candidate || candidate.metricScope !== metricScope || candidate.reviewStatus !== "reviewed") return false;
      if (seen.has(candidate.channelId)) return false;
      seen.add(candidate.channelId);
      return true;
    });
  }, [metricScope, source, sources]);
  const selectedTargetIds = selectedSuggestions.map((suggestion) =>
    targetBySuggestion[`${suggestion.topic}:${suggestion.tag}`] ?? ""
  );
  const unresolvedTargets = selectedTargetIds.some((targetId) => !targetId);
  const hasTargetConflict = selectedTargetIds.some((targetId, index) =>
    Boolean(targetId) && selectedTargetIds.indexOf(targetId) !== index
  );

  const ambiguousTags = useMemo(() => detectAmbiguousTags(payload), [payload]);
  const provenance = useMemo(() => inspectMessageProvenance(payload), [payload]);
  const multiplierValidation = useMemo(() => validateScaleMultiplier(scaleMultiplierInput), [scaleMultiplierInput]);

  useEffect(() => {
    inputRevision.current += 1;
    setStage("select");
    setPath("");
    setTagEquals("");
    setMessage("");
    setPreviewToken("");
    setDraft(null);
    setBatchPreview(null);
    setSuggestions([]);
    setSelectedTags([]);
    setTargetBySuggestion({});
    setScaleMultiplierInput(source?.scaleDecimal ?? "1");
    setMeasurementKind(source?.measurementKind ?? "cumulative-energy");
    setEnergyFlowRole(source?.energyFlowRole ?? "consumption");
    setTimestampPolicy(source?.timestampPolicy ?? "source-required");
  }, [metricScope, payload, source, topic]);

  // When upstream field or semantic changes, invalidate downstream preview/token
  const invalidateDownstreamPreview = () => {
    inputRevision.current += 1;
    setPreviewToken("");
    setDraft(null);
    setBatchPreview(null);
  };

  const canonical = (selectedTarget?: MeterSourceDefinition, selected?: MappingSuggestion): MappingPreviewDraft => {
    const target = selectedTarget ?? source;
    if (!target || target.metricScope !== metricScope || !topic?.trim()) {
      throw new Error("SOURCE_REVIEW_REQUIRED");
    }
    const updatedSource: MeterSourceDefinition = {
      ...target,
      energyFlowRole: energyFlowRole as MeterSourceDefinition["energyFlowRole"],
      measurementKind: measurementKind as MeterSourceDefinition["measurementKind"],
      scaleDecimal: multiplierValidation.normalized ?? target.scaleDecimal,
      timestampPolicy: timestampPolicy as MeterSourceDefinition["timestampPolicy"]
    };
    const selectedTopic = selected?.topic.trim() || topic.trim();
    return {
      channelId: target.channelId,
      energyFlowRole: energyFlowRole as MappingPreviewDraft["energyFlowRole"],
      measurementKind: measurementKind as MappingPreviewDraft["measurementKind"],
      metricScope,
      selector: compileSelector(path, (selected?.tag ?? tagEquals) || undefined),
      source: updatedSource,
      timestampPolicy: timestampPolicy as MappingPreviewDraft["timestampPolicy"],
      topic: selectedTopic
    };
  };

  const handleFetchPreview = () => {
    if (selectedSuggestions.length > 1 && (unresolvedTargets || hasTargetConflict)) {
      setMessage(hasTargetConflict ? "每一列必須指定不同的已審查來源。" : "請為每一列指定同一廠區的已審查來源後再產生預覽。");
      return;
    }
    if (!multiplierValidation.valid) {
      setMessage(multiplierValidation.error ?? "乘數設定無效，請修正後再產生預覽。");
      return;
    }
    const requestRevision = inputRevision.current;
    const batchItems = selectedSuggestions.length > 1
      ? selectedSuggestions.map((suggestion) => {
        const key = `${suggestion.topic}:${suggestion.tag}`;
        const target = availableTargets.find((candidate) => candidate.channelId === targetBySuggestion[key]);
        if (!target) throw new Error("MAPPING_BATCH_TARGET_REQUIRED");
        return { draft: canonical(target, suggestion), rowId: key };
      })
      : null;
    const singleTarget = selectedSuggestion
      ? availableTargets.find((candidate) => candidate.channelId === targetBySuggestion[`${selectedSuggestion.topic}:${selectedSuggestion.tag}`])
      : source;
    const previewRequest = batchItems
      ? requestJson<GuidedMappingBatchPreviewResult>("/api/data-hub/mqtt-mappings/batch-preview", {
        body: JSON.stringify({ items: batchItems }),
        method: "POST"
      })
      : requestJson<{ canonicalDraft: MappingPreviewDraft; previewToken: string }>(
        "/api/data-hub/mqtt-mappings/preview",
        { body: JSON.stringify(canonical(singleTarget, selectedSuggestion)), method: "POST" }
      );
    void previewRequest
      .then((result) => {
        if (requestRevision !== inputRevision.current) return;
        if (batchItems) {
          setBatchPreview(result as GuidedMappingBatchPreviewResult);
          setDraft(null);
          setPreviewToken("");
        } else {
          const single = result as { canonicalDraft: MappingPreviewDraft; previewToken: string };
          setDraft(single.canonicalDraft);
          setPreviewToken(single.previewToken);
          setBatchPreview(null);
        }
        setStage("apply");
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "預覽失敗");
      });
  };

  return (
    <section className="mgmt-card space-y-3 p-4" data-guided-mqtt-mapping data-mapping-stage={stage}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e8e3] pb-2">
        <h3 className="text-base font-semibold text-[#1e2821]">從已接收資料選欄位</h3>
        {isOffline ? (
          <span className="rounded bg-[#fff8e8] px-2 py-0.5 text-xs font-medium text-[#8a4f18]">
            離線樣本 (Offline Evidence)
          </span>
        ) : null}
      </div>

      {provenance.warnings.length > 0 ? (
        <div className="space-y-1 rounded border border-[#ead7aa] bg-[#fff8e8] p-2.5 text-xs text-[#8a4f18]">
          {provenance.warnings.map((w) => (
            <p key={w}>⚠️ {w}</p>
          ))}
        </div>
      ) : null}

      {ambiguousTags.length > 0 ? (
        <div className="rounded border border-[#f5c6cb] bg-[#f8d7da] p-2.5 text-xs text-[#721c24]">
          偵測到重複 Tag: <strong>{ambiguousTags.join(", ")}</strong>。存在歧義時不可自動猜測欄位。
        </div>
      ) : null}

      {stage === "select" ? (
        <div className="space-y-3">
          {fields.length > 0 ? (
            <ul className="space-y-1">
              {fields.map((field, idx) => (
                <li key={`${field.path}:${field.tagEquals ?? ""}:${idx}`}>
                  <button
                    className="mgmt-action min-h-[40px] text-left"
                    data-mapping-field={field.path}
                    onClick={() => {
                      invalidateDownstreamPreview();
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
            <p className="text-sm" data-mapping-no-observation>
              尚未收到可選的實際資料；收到資料後才能選取欄位。
            </p>
          )}
          <p className="text-sm">
            已選 {path || "尚未選取欄位"}{tagEquals ? ` / ${tagEquals}` : ""}
          </p>

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
              })
                .then((payload) => {
                  setSuggestions(payload.suggestions);
                  if (payload.suggestions.length === 1 && source) {
                    const only = payload.suggestions[0]!;
                    setTargetBySuggestion({ [`${only.topic}:${only.tag}`]: source.channelId });
                  }
                })
                .catch((error: unknown) => {
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
                        invalidateDownstreamPreview();
                        const key = `${suggestion.topic}:${suggestion.tag}`;
                        setSelectedTags((current) => {
                          if (event.target.checked && source && current.length === 0) {
                            setTargetBySuggestion((targets) => targets[key] ? targets : { ...targets, [key]: source.channelId });
                          }
                          return event.target.checked ? [...current, key] : current.filter((item) => item !== key);
                        });
                      }}
                      type="checkbox"
                    />
                    {suggestion.tag} @ {suggestion.topic} — {suggestion.reason}
                    {suggestion.autoSelectAsSiteMain ? "（不應出現）" : ""}
                  </label>
                  {selectedTags.includes(`${suggestion.topic}:${suggestion.tag}`) ? (
                    <label className="ml-6 flex items-center gap-2 text-xs text-[#526055]">
                      <span>目標已審查來源</span>
                      <select
                        aria-label={`${suggestion.tag} 目標已審查來源`}
                        className="mgmt-input min-h-[34px]"
                        onChange={(event) => {
                          invalidateDownstreamPreview();
                          setTargetBySuggestion((current) => ({ ...current, [`${suggestion.topic}:${suggestion.tag}`]: event.target.value }));
                        }}
                        value={targetBySuggestion[`${suggestion.topic}:${suggestion.tag}`] ?? ""}
                      >
                        <option value="">請選擇來源</option>
                        {availableTargets.map((candidate) => (
                          <option key={candidate.channelId} value={candidate.channelId}>
                            {candidate.channelId} ({candidate.inputUnit})
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="pt-2">
            <button
              className="mgmt-action primary min-h-[40px]"
              disabled={!canAdvance}
              onClick={() => setStage("meaning")}
              type="button"
            >
              下一步
            </button>
          </div>
        </div>
      ) : null}

      {stage === "meaning" ? (
        <div className="space-y-3">
          <p className="text-sm text-[#4d554f]">請確認所選欄位符合來源的計量定義與時間戳政策。</p>
          {!hasSourceEvidence ? (
            <p className="text-sm text-[#8a4f18]" data-mapping-preview-blocked>
              尚未選定實際資料來源，請先完成來源確認。
            </p>
          ) : null}
          {selectedSuggestions.length > 1 && (unresolvedTargets || hasTargetConflict) ? (
            <p className="text-sm text-[#8a4f18]" data-mapping-batch-blocked>
              已選 {selectedSuggestions.length} 筆建議；每一列都必須指定不同的同廠區已審查來源
              {hasTargetConflict ? "，目前有重複目標。" : "，目前仍有未指定目標。"}
            </p>
          ) : null}

          <div className="grid gap-3 rounded border border-[#e2e8e3] bg-[#f8faf8] p-3 text-sm sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-[#1e2821]">計量類型 (measurementKind)</span>
              <select
                className="mgmt-input min-h-[38px]"
                onChange={(e) => {
                  invalidateDownstreamPreview();
                  setMeasurementKind(e.target.value as MeterSourceDefinition["measurementKind"]);
                }}
                value={measurementKind}
              >
                <option value="cumulative-energy">累積電量 (cumulative-energy)</option>
                <option value="interval-energy">區間電量 (interval-energy)</option>
                <option value="power-gauge">即時功率 (power-gauge)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-medium text-[#1e2821]">流向角色 (energyFlowRole)</span>
              <select
                className="mgmt-input min-h-[38px]"
                onChange={(e) => {
                  invalidateDownstreamPreview();
                  setEnergyFlowRole(e.target.value as MeterSourceDefinition["energyFlowRole"]);
                }}
                value={energyFlowRole}
              >
                <option value="consumption">用電 (consumption)</option>
                <option value="generation">發電 (generation)</option>
                <option value="grid-import">市電輸入 (grid-import)</option>
                <option value="grid-export">市電輸出 (grid-export)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-medium text-[#1e2821]">乘數換算 (scaleMultiplier)</span>
              <input
                className="mgmt-input min-h-[38px]"
                inputMode="decimal"
                onChange={(e) => {
                  invalidateDownstreamPreview();
                  setScaleMultiplierInput(e.target.value);
                }}
                type="text"
                value={scaleMultiplierInput}
              />
              {!multiplierValidation.valid && multiplierValidation.error ? (
                <span className="text-xs text-[#b53a25]">{multiplierValidation.error}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-medium text-[#1e2821]">時間戳政策 (timestampPolicy)</span>
              <select
                className="mgmt-input min-h-[38px]"
                onChange={(e) => {
                  invalidateDownstreamPreview();
                  setTimestampPolicy(e.target.value as MeterSourceDefinition["timestampPolicy"]);
                }}
                value={timestampPolicy}
              >
                <option value="source-required">強制使用來源時間戳 (source-required)</option>
                <option value="allow-receive-time-estimate">允許接收估算時間 (allow-receive-time-estimate)</option>
              </select>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button className="mgmt-action min-h-[40px]" onClick={() => setStage("select")} type="button">
              上一步
            </button>
            <button
              className="mgmt-action primary min-h-[40px]"
              disabled={
                !hasSourceEvidence
                || !multiplierValidation.valid
                || (selectedSuggestions.length > 1 && (unresolvedTargets || hasTargetConflict))
              }
              onClick={handleFetchPreview}
              type="button"
            >
              產生預覽
            </button>
          </div>
        </div>
      ) : null}

      {stage === "apply" && ((draft && previewToken) || batchPreview) ? (
        <div className="space-y-3">
          <MappingPreviewAndApply
            batch={batchPreview ?? undefined}
            draft={draft ?? undefined}
            onApplied={() => setMessage("")}
            onMessage={setMessage}
            previewToken={previewToken}
          />
          <div className="flex gap-2 pt-1">
            <button className="mgmt-action min-h-[40px]" onClick={() => setStage("meaning")} type="button">
              返回修改意義
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
