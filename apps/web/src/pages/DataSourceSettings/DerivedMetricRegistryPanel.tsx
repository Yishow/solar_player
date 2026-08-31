import type {
  DerivedMetricDefinition,
  DerivedMetricEvaluation,
  DerivedMetricInput,
  DerivedMetricScopeSelector,
  MetricScope
} from "@solar-display/shared";
import { useEffect, useRef, useState } from "react";
import {
  getDerivedMetricDefinition,
  getDerivedMetricDefinitions,
  previewDerivedMetricDefinition,
  saveDerivedMetricDefinition,
  setDerivedMetricEnabled
} from "../../services/api";
import {
  OpsActionRow,
  OpsInfoBanner,
  OpsSurface,
  OpsSurfaceTitle
} from "../../components/management";

const inputClass = "h-10 w-full rounded-lg border border-[rgba(93,119,69,0.22)] bg-white px-3 text-sm outline-none focus:border-[#5d7745]";

function createDraft(): DerivedMetricDefinition {
  return {
    description: "",
    enabled: true,
    expression: "source",
    fallbackPolicy: "unavailable",
    inputs: [{ alias: "source", kind: "metric", metricKey: "realTimePower", scope: "output-site", unit: "kW" }],
    managed: false,
    metricKey: "custom.",
    name: "",
    outputScopePolicy: "site",
    outputUnit: "kW",
    precision: 1,
    revision: 0
  };
}

function cloneDefinition(definition: DerivedMetricDefinition): DerivedMetricDefinition {
  return { ...definition, inputs: definition.inputs.map((input) => ({ ...input })) };
}

type DerivedMetricRegistryApi = {
  getDefinition: typeof getDerivedMetricDefinition;
  getDefinitions: typeof getDerivedMetricDefinitions;
  preview: typeof previewDerivedMetricDefinition;
  save: typeof saveDerivedMetricDefinition;
  setEnabled: typeof setDerivedMetricEnabled;
};

const defaultApi: DerivedMetricRegistryApi = {
  getDefinition: getDerivedMetricDefinition,
  getDefinitions: getDerivedMetricDefinitions,
  preview: previewDerivedMetricDefinition,
  save: saveDerivedMetricDefinition,
  setEnabled: setDerivedMetricEnabled
};

type DerivedMetricEvaluationRow = {
  evaluation: DerivedMetricEvaluation | null;
  metricScope: MetricScope;
};

export function derivedMetricEvaluationScopes(definition: DerivedMetricDefinition): MetricScope[] {
  if (definition.outputScopePolicy === "global") return ["global"];
  return definition.siteScopes && definition.siteScopes.length > 0
    ? [...definition.siteScopes]
    : ["cl", "kn"];
}

/**
 * The scope a draft preview is evaluated under. It must be one the definition
 * actually evaluates: previewing a site definition under a site it does not
 * declare is rejected, which is why this derives from the same declared scopes
 * the panel already shows as applicable rather than assuming CL.
 */
export function resolveDerivedMetricPreviewScope(definition: DerivedMetricDefinition): MetricScope {
  return derivedMetricEvaluationScopes(definition)[0] ?? "global";
}

const evaluationScopes = derivedMetricEvaluationScopes;

function definitionStatus(definition: DerivedMetricDefinition) {
  return `${definition.managed ? "Managed" : "Custom"} · ${definition.enabled ? "Enabled" : "Disabled"}`;
}

function evaluationStatusLabel(status: DerivedMetricEvaluation["status"] | null) {
  if (status === "ready") return "Ready";
  if (status === "degraded") return "Degraded";
  return "Unavailable";
}

function freshnessLabel(state: DerivedMetricEvaluation["freshnessState"] | null) {
  if (state === "fresh") return "Fresh";
  if (state === "stale") return "Stale";
  return "Unavailable";
}

export function DerivedMetricRegistryPanel({ api = defaultApi }: { api?: DerivedMetricRegistryApi }) {
  const [definitions, setDefinitions] = useState<DerivedMetricDefinition[]>([]);
  const [draft, setDraft] = useState<DerivedMetricDefinition>(createDraft);
  const [evaluationRows, setEvaluationRows] = useState<DerivedMetricEvaluationRow[]>([]);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const evaluationRequestGeneration = useRef(0);
  const [message, setMessage] = useState("載入衍生指標定義中…");
  const [busy, setBusy] = useState(false);

  const loadEvaluations = async (definition: DerivedMetricDefinition): Promise<boolean> => {
    const requestGeneration = evaluationRequestGeneration.current + 1;
    evaluationRequestGeneration.current = requestGeneration;
    setEvaluationRows([]);
    setEvaluationLoading(true);
    const scopes = evaluationScopes(definition);
    try {
      const details = await Promise.all(
        scopes.map((metricScope) => api.getDefinition(definition.metricKey, metricScope))
      );
      if (requestGeneration !== evaluationRequestGeneration.current) return false;
      setEvaluationRows(details.map((detail, index) => ({
        evaluation: detail.evaluation,
        metricScope: scopes[index]!
      })));
      return true;
    } catch (error) {
      if (requestGeneration !== evaluationRequestGeneration.current) return false;
      throw error;
    } finally {
      if (requestGeneration === evaluationRequestGeneration.current) {
        setEvaluationLoading(false);
      }
    }
  };

  const reload = async (selectedKey?: string) => {
    const next = await api.getDefinitions();
    setDefinitions(next);
    const selected = next.find(({ metricKey }) => metricKey === selectedKey) ?? next[0];
    if (selected) {
      setDraft(cloneDefinition(selected));
      const loaded = await loadEvaluations(selected);
      if (!loaded) return;
    } else {
      setEvaluationRows([]);
    }
    setMessage("");
  };

  const selectDefinition = async (definition: DerivedMetricDefinition) => {
    setDraft(cloneDefinition(definition));
    try {
      if (await loadEvaluations(definition)) setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "無法載入衍生指標 evaluation。");
    }
  };

  useEffect(() => {
    void reload().catch((error) => setMessage(error instanceof Error ? error.message : "無法載入衍生指標。"));
  }, []);

  const updateInput = (index: number, next: DerivedMetricInput) => {
    setDraft((current) => ({
      ...current,
      inputs: current.inputs.map((input, inputIndex) => inputIndex === index ? next : input)
    }));
  };

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setMessage("");
    try {
      setMessage(await action());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失敗。請檢查公式與輸入設定。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <OpsSurface family="operations">
      <OpsSurfaceTitle
        title="衍生指標 Registry"
        caption="公式只允許數值、輸入別名、四則運算與 sum / avg / min / max；系統定義僅供檢視。"
      />
      {message ? <OpsInfoBanner className="mt-4" title="Registry 狀態" detail={message} tone="warning" /> : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="space-y-2">
          <button className="mgmt-action w-full" type="button" onClick={() => {
            evaluationRequestGeneration.current += 1;
            setDraft(createDraft());
            setEvaluationRows([]);
            setEvaluationLoading(false);
            setMessage("");
          }}>
            新增 custom 指標
          </button>
          {definitions.map((definition) => (
            <button
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${draft.metricKey === definition.metricKey ? "border-[#5d7745] bg-[#f4f8f1]" : "border-black/10 bg-white"}`}
              key={definition.metricKey}
              type="button"
              onClick={() => void selectDefinition(definition)}
            >
              <span className="block font-semibold">{definition.name}</span>
              <span className="block font-mono text-[11px] text-[#6e746f]">{definition.metricKey}</span>
            </button>
          ))}
        </div>
        <div className="mgmt-card space-y-4 p-5">
          <div className="grid gap-3 text-sm sm:grid-cols-3" data-derived-definition-status>
            <div><span className="block text-xs uppercase tracking-wide text-[#7b857d]">Revision:</span><strong>r{draft.revision}</strong></div>
            <div><span className="block text-xs uppercase tracking-wide text-[#7b857d]">狀態 (Status):</span><strong>{definitionStatus(draft)}</strong></div>
            <div><span className="block text-xs uppercase tracking-wide text-[#7b857d]">適用範圍 (Scopes):</span><strong>{evaluationScopes(draft).join(" / ").toUpperCase()}</strong></div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs">指標代碼 (Metric key)<input className={inputClass} disabled={draft.managed || draft.revision > 0} value={draft.metricKey} onChange={(event) => setDraft({ ...draft, metricKey: event.target.value })} /></label>
            <label className="text-xs">指標名稱<input className={inputClass} disabled={draft.managed} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label className="text-xs">輸出範圍 (Scope)<select className={inputClass} disabled={draft.managed} value={draft.outputScopePolicy} onChange={(event) => setDraft({ ...draft, outputScopePolicy: event.target.value as "global" | "site" })}><option value="site">廠區 Site（CL / KN）</option><option value="global">全域 Global</option></select></label>
            <label className="text-xs">輸出單位 (Unit)<input className={inputClass} disabled={draft.managed} value={draft.outputUnit} onChange={(event) => setDraft({ ...draft, outputUnit: event.target.value })} /></label>
          </div>
          <label className="block text-xs">計算公式<input className={`${inputClass} font-mono`} disabled={draft.managed} value={draft.expression} onChange={(event) => setDraft({ ...draft, expression: event.target.value })} /></label>
          <div className="space-y-2">
            <p className="text-xs font-semibold">輸入別名與來源 (Inputs)</p>
            {draft.inputs.map((input, index) => (
              <div className="grid gap-2 rounded-lg border border-black/10 p-3 md:grid-cols-6" key={`${index}-${input.alias}`}>
                <input aria-label="Alias" className={inputClass} disabled={draft.managed} value={input.alias} onChange={(event) => updateInput(index, { ...input, alias: event.target.value })} />
                <select className={inputClass} disabled={draft.managed} value={input.kind} onChange={(event) => updateInput(index, event.target.value === "metric" ? { alias: input.alias, kind: "metric", metricKey: "realTimePower", scope: "output-site", unit: input.unit } : { alias: input.alias, kind: "calculation-setting", settingKey: "carbonEmissionFactor", unit: "kg/kWh" })}><option value="metric">Metric</option><option value="calculation-setting">Setting</option></select>
                {input.kind === "metric" ? (
                  <input aria-label="Source key" className={`${inputClass} md:col-span-2`} disabled={draft.managed} value={input.metricKey} onChange={(event) => updateInput(index, { ...input, metricKey: event.target.value })} />
                ) : (
                  <select aria-label="Calculation setting" className={`${inputClass} md:col-span-2`} disabled={draft.managed} value={input.settingKey} onChange={(event) => {
                    const settingKey = event.target.value;
                    const unit = settingKey === "carbonEmissionFactor" ? "kg/kWh"
                      : settingKey === "estimatedTariffPerKwh" ? "TWD/kWh"
                        : settingKey === "treeEquivalentFactor" ? ""
                          : "kWh";
                    updateInput(index, { ...input, settingKey, unit });
                  }}><option value="carbonEmissionFactor">carbonEmissionFactor</option><option value="estimatedTariffPerKwh">estimatedTariffPerKwh</option><option value="householdDailyUsageKwh">householdDailyUsageKwh</option><option value="householdMonthlyUsageKwh">householdMonthlyUsageKwh</option><option value="treeEquivalentFactor">treeEquivalentFactor</option></select>
                )}
                {input.kind === "metric" ? <select className={inputClass} disabled={draft.managed} value={input.scope} onChange={(event) => updateInput(index, { ...input, scope: event.target.value as DerivedMetricScopeSelector })}><option value="output-site">output-site</option><option value="cl">CL</option><option value="kn">KN</option><option value="global">global</option></select> : <span className="flex items-center px-2 text-xs text-[#6e746f]">Calculation Setting</span>}
                <input aria-label="Input unit" className={inputClass} disabled={draft.managed} value={input.unit} onChange={(event) => updateInput(index, { ...input, unit: event.target.value })} />
                {!draft.managed ? <button className="mgmt-action" type="button" onClick={() => setDraft({ ...draft, inputs: draft.inputs.filter((_, inputIndex) => inputIndex !== index) })}>移除</button> : null}
              </div>
            ))}
            {!draft.managed ? <button className="mgmt-action" type="button" onClick={() => setDraft({ ...draft, inputs: [...draft.inputs, { alias: `input${draft.inputs.length + 1}`, kind: "metric", metricKey: "realTimePower", scope: draft.outputScopePolicy === "site" ? "output-site" : "global", unit: "kW" }] })}>新增輸入</button> : null}
          </div>
          <section className="space-y-2 border-t border-[#e1e8e2] pt-4" data-derived-evaluations>
            <div>
              <h3 className="text-sm font-semibold text-[#27322b]">即時評估狀態 (Current evaluation)</h3>
              <p className="text-xs text-[#687169]">由已儲存 definition 的 scope-specific runtime evaluation 提供；Preview 不會取代目前狀態。</p>
            </div>
            {evaluationLoading ? <p className="text-sm text-[#687169]" role="status">載入目前 evaluation…</p> : (
              <div className="grid gap-2 sm:grid-cols-2">
                {evaluationRows.map(({ evaluation, metricScope }) => {
                  const value = evaluation?.value === null || evaluation === null ? "--" : String(evaluation.value);
                  const unit = evaluation?.outputUnit ?? draft.outputUnit;
                  const status = evaluationStatusLabel(evaluation?.status ?? null);
                  const freshness = freshnessLabel(evaluation?.freshnessState ?? null);
                  return (
                    <div className="rounded-lg border border-black/10 bg-white p-3 text-sm" data-derived-evaluation-scope={metricScope} key={metricScope}>
                      <div className="flex items-center justify-between gap-2"><strong>{metricScope.toUpperCase()}</strong><span>{status}</span></div>
                      <div>數值 (Value): {value} {unit}</div>
                      <div>新鮮度 (Freshness): {freshness}</div>
                      {evaluation?.failureCode ? <div>失敗代碼: {evaluation.failureCode}</div> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          <OpsActionRow>
            <button className="mgmt-action" disabled={busy} type="button" onClick={() => void run(async () => {
              const evaluation = await api.preview(draft, resolveDerivedMetricPreviewScope(draft));
              return evaluation.value === null ? `Preview：${evaluation.failureCode ?? evaluation.status}` : `Preview：${evaluation.value} ${evaluation.outputUnit}（${evaluation.freshnessState}）`;
            })}>預覽計算 (Preview)</button>
            {!draft.managed ? <button className="mgmt-action primary" disabled={busy} type="button" onClick={() => void run(async () => {
              const saved = await api.save(draft);
              await reload(saved.metricKey);
              return "定義已儲存並啟用。";
            })}>儲存定義</button> : null}
            {!draft.managed && draft.revision > 0 ? <button className="mgmt-action" disabled={busy} type="button" onClick={() => void run(async () => {
              const saved = await api.setEnabled(draft.metricKey, !draft.enabled);
              await reload(saved.metricKey);
              return saved.enabled ? "定義已啟用。" : "定義已停用。";
            })}>{draft.enabled ? "停用" : "啟用"}</button> : null}
          </OpsActionRow>
        </div>
      </div>
    </OpsSurface>
  );
}
