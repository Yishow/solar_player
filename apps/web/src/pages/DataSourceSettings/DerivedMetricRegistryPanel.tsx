import type {
  DerivedMetricDefinition,
  DerivedMetricInput,
  DerivedMetricScopeSelector,
  MetricScope
} from "@solar-display/shared";
import { useEffect, useState } from "react";
import {
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
  getDefinitions: typeof getDerivedMetricDefinitions;
  preview: typeof previewDerivedMetricDefinition;
  save: typeof saveDerivedMetricDefinition;
  setEnabled: typeof setDerivedMetricEnabled;
};

const defaultApi: DerivedMetricRegistryApi = {
  getDefinitions: getDerivedMetricDefinitions,
  preview: previewDerivedMetricDefinition,
  save: saveDerivedMetricDefinition,
  setEnabled: setDerivedMetricEnabled
};

export function DerivedMetricRegistryPanel({ api = defaultApi }: { api?: DerivedMetricRegistryApi }) {
  const [definitions, setDefinitions] = useState<DerivedMetricDefinition[]>([]);
  const [draft, setDraft] = useState<DerivedMetricDefinition>(createDraft);
  const [message, setMessage] = useState("載入衍生指標定義中…");
  const [busy, setBusy] = useState(false);

  const reload = async (selectedKey?: string) => {
    const next = await api.getDefinitions();
    setDefinitions(next);
    const selected = next.find(({ metricKey }) => metricKey === selectedKey) ?? next[0];
    if (selected) setDraft(cloneDefinition(selected));
    setMessage("");
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
          <button className="mgmt-action w-full" type="button" onClick={() => setDraft(createDraft())}>
            新增 custom 指標
          </button>
          {definitions.map((definition) => (
            <button
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${draft.metricKey === definition.metricKey ? "border-[#5d7745] bg-[#f4f8f1]" : "border-black/10 bg-white"}`}
              key={definition.metricKey}
              type="button"
              onClick={() => setDraft(cloneDefinition(definition))}
            >
              <span className="block font-semibold">{definition.name}</span>
              <span className="block font-mono text-[11px] text-[#6e746f]">{definition.metricKey}</span>
            </button>
          ))}
        </div>
        <div className="mgmt-card space-y-4 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs">Metric key<input className={inputClass} disabled={draft.managed || draft.revision > 0} value={draft.metricKey} onChange={(event) => setDraft({ ...draft, metricKey: event.target.value })} /></label>
            <label className="text-xs">名稱<input className={inputClass} disabled={draft.managed} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label className="text-xs">輸出範圍<select className={inputClass} disabled={draft.managed} value={draft.outputScopePolicy} onChange={(event) => setDraft({ ...draft, outputScopePolicy: event.target.value as "global" | "site" })}><option value="site">Site（CL / KN）</option><option value="global">Global</option></select></label>
            <label className="text-xs">輸出單位<input className={inputClass} disabled={draft.managed} value={draft.outputUnit} onChange={(event) => setDraft({ ...draft, outputUnit: event.target.value })} /></label>
          </div>
          <label className="block text-xs">公式<input className={`${inputClass} font-mono`} disabled={draft.managed} value={draft.expression} onChange={(event) => setDraft({ ...draft, expression: event.target.value })} /></label>
          <div className="space-y-2">
            <p className="text-xs font-semibold">輸入別名與來源</p>
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
          <OpsActionRow>
            <button className="mgmt-action" disabled={busy} type="button" onClick={() => void run(async () => {
              const scope: MetricScope = draft.outputScopePolicy === "global" ? "global" : "cl";
              const evaluation = await api.preview(draft, scope);
              return evaluation.value === null ? `Preview：${evaluation.failureCode ?? evaluation.status}` : `Preview：${evaluation.value} ${evaluation.outputUnit}（${evaluation.freshnessState}）`;
            })}>Preview</button>
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
