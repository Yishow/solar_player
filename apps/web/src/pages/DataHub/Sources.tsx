import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useBlocker } from "react-router-dom";
import { requestJson } from "../../services/api";
import { DataHubSectionState } from "./sectionState";
import { applySourcesLiveSnapshot, useDataHubLiveMetrics } from "./liveActivity";
import {
  buildSourceRows,
  buildTopicMappingsSavePayload,
  defaultMqttStatus,
  emptySolarSources,
  fetchDataHubSourcesModel,
  getMetricScopeLabel,
  loadDataHubSourcesRoute,
  normalizeTopicMapping,
  readCachedDataHubSourcesErrorMessage,
  readCachedDataHubSourcesModel,
  rememberDataHubSourcesModel,
  resolveSourcesSaveErrorMessage,
  updateGenericMapping,
  type DataHubSourcesModel,
  type GenericMappingPatch,
  type GenericMqttMapping,
  type GenericSourceRow,
  type ManagedSourceRow,
  type MqttSourceStatus,
  type SourceHealth,
  type SourceResource
} from "./SourcesModel";

export {
  buildSourceRows,
  buildTopicMappingsSavePayload,
  fetchDataHubSourcesModel,
  isSolarAdapterManagedMetricIdentity,
  loadDataHubSourcesRoute,
  resolveSourcesSaveErrorMessage,
  updateGenericMapping
} from "./SourcesModel";
export { applySourcesLiveSnapshot };
export type {
  DataHubSourcesModel,
  GenericMappingPatch,
  GenericMqttMapping,
  MqttSourceStatus,
  SourceRow
} from "./SourcesModel";

export function canRefreshSources(isDirty: boolean, confirmDiscard: () => boolean): boolean {
  return !isDirty || confirmDiscard();
}

type TopicMappingsResponse = {
  status: MqttSourceStatus;
  topics: Array<GenericMqttMapping & { rawPayload?: string | null }>;
};

function SourceHealthChip({ health }: { health: SourceHealth }) {
  return <span className={`mgmt-chip ${health.tone === "default" ? "" : `is-${health.tone}`}`.trim()}>{health.label}</span>;
}

function SourceResourceList({ resources }: { resources: SourceResource[] }) {
  if (resources.length === 0) {
    return <p className="text-sm text-[#687169]">尚未發現額外資源。</p>;
  }

  return (
    <ul className="space-y-2" data-source-resources>
      {resources.map((resource) => (
        <li className="rounded border border-[#d9e2dc] bg-white/60 p-3" key={`${resource.label}:${resource.detail}`}>
          <strong className="block text-sm text-[#27322b]">{resource.label}</strong>
          <small className="block text-[#687169]">{resource.detail}</small>
          {resource.metrics.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2" data-source-resource-metrics>
              {resource.metrics.map((metric) => <code className="rounded bg-[#edf4ee] px-2 py-1 text-xs" key={metric}>{metric}</code>)}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function SourceRowMeta({ row }: { row: ManagedSourceRow | GenericSourceRow }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm text-[#4d554f] sm:grid-cols-2 lg:grid-cols-4" data-source-meta>
      <div>
        <dt className="text-xs uppercase tracking-wide text-[#7b857d]">Scope / site</dt>
        <dd data-source-scope={row.metricScope}>{getMetricScopeLabel(row.metricScope)}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-[#7b857d]">Health</dt>
        <dd><SourceHealthChip health={row.health} /></dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-[#7b857d]">Activity</dt>
        <dd data-source-activity>{row.activity}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-[#7b857d]">Ownership</dt>
        <dd data-source-ownership={row.ownership}>{row.ownership === "managed" ? "Managed / read-only" : "Operator-managed"}</dd>
      </div>
    </dl>
  );
}

function ManagedSourceCard({ row }: { row: ManagedSourceRow }) {
  return (
    <article className="mgmt-card space-y-4 p-5" data-source-id={row.id} data-source-kind="managed" data-source-row>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#687169]">{row.sourceType}</p>
          <h3 className="text-lg font-semibold text-[#27322b]">Solar adapter · {getMetricScopeLabel(row.metricScope)}</h3>
          <p className="text-sm text-[#687169]">{row.sourceTopic}</p>
        </div>
        <span className="mgmt-chip is-accent">Managed adapter</span>
      </header>
      <SourceRowMeta row={row} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-semibold text-[#27322b]">Owned semantic metrics</h4>
          <div className="flex flex-wrap gap-2" data-source-owned-metrics>
            {row.ownedMetrics.map((metric) => <code className="rounded bg-[#edf4ee] px-2 py-1 text-xs" key={metric}>{metric}</code>)}
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-[#27322b]">Discovered resources</h4>
          <SourceResourceList resources={row.resources} />
        </div>
      </div>
      <p className="text-xs text-[#687169]">Solar adapter-owned identities cannot be edited as generic MQTT mappings.</p>
    </article>
  );
}

function GenericSourceCard({
  row,
  onChange
}: {
  row: GenericSourceRow;
  onChange: (id: number, patch: GenericMappingPatch) => void;
}) {
  const disabled = !row.editable;
  const inputClass = "mt-1 w-full rounded border border-[#cbd6ce] bg-white px-3 py-2 text-sm text-[#27322b] disabled:cursor-not-allowed disabled:bg-[#f0f3f1]";

  return (
    <article
      className={`mgmt-card space-y-4 p-5 ${disabled ? "opacity-90" : ""}`}
      data-source-id={row.id}
      data-source-kind="generic"
      data-source-ownership={row.ownership}
      data-source-row
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#687169]">{row.sourceType}</p>
          <h3 className="text-lg font-semibold text-[#27322b]">{row.metricKey}</h3>
          <p className="text-sm text-[#687169]">{row.sourceTopic}</p>
        </div>
        <span className={`mgmt-chip ${disabled ? "is-warning" : "is-accent"}`}>
          {disabled ? "Reserved by Solar adapter" : "Operator-managed"}
        </span>
      </header>
      <SourceRowMeta row={row} />
      {disabled ? (
        <p className="rounded border border-[#ead7aa] bg-[#fff8e8] p-3 text-sm text-[#6b5524]" role="note">
          This metric identity is managed by the Solar adapter. Topic mapping controls are read-only.
        </p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" data-source-generic-fields>
        <label className="text-sm text-[#4d554f]">
          Metric key
          <input className={inputClass} disabled={disabled} name="metricKey" onChange={(event) => onChange(row.mapping.id, { metricKey: event.target.value })} value={row.mapping.metricKey} />
        </label>
        <label className="text-sm text-[#4d554f]">
          Metric scope
          <select
            className={inputClass}
            disabled={disabled}
            name="metricScope"
            value={row.mapping.metricScope}
            onChange={(event) => onChange(row.mapping.id, { metricScope: event.target.value as GenericMqttMapping["metricScope"] })}
          >
            <option value="cl">CL</option>
            <option value="kn">KN</option>
            <option value="global">Global</option>
          </select>
        </label>
        <label className="text-sm text-[#4d554f] md:col-span-2">
          Topic
          <input className={inputClass} disabled={disabled} name="topic" onChange={(event) => onChange(row.mapping.id, { topic: event.target.value })} value={row.mapping.topic} />
        </label>
        <label className="text-sm text-[#4d554f]">
          Unit
          <input className={inputClass} disabled={disabled} name="unit" onChange={(event) => onChange(row.mapping.id, { unit: event.target.value })} value={row.mapping.unit} />
        </label>
        <label className="text-sm text-[#4d554f]">
          Value path
          <input className={inputClass} disabled={disabled} name="valuePath" onChange={(event) => onChange(row.mapping.id, { valuePath: event.target.value })} value={row.mapping.valuePath} />
        </label>
        <label className="text-sm text-[#4d554f]">
          Multiplier
          <input className={inputClass} disabled={disabled} inputMode="decimal" name="multiplier" onChange={(event) => onChange(row.mapping.id, { multiplier: Number(event.target.value) || 1 })} step="0.01" type="number" value={row.mapping.multiplier ?? 1} />
        </label>
        <label className="text-sm text-[#4d554f]">
          名稱
          <input className={inputClass} disabled={disabled} name="nameZh" onChange={(event) => onChange(row.mapping.id, { nameZh: event.target.value })} value={row.mapping.nameZh ?? ""} />
        </label>
        <label className="text-sm text-[#4d554f]">
          Name
          <input className={inputClass} disabled={disabled} name="nameEn" onChange={(event) => onChange(row.mapping.id, { nameEn: event.target.value })} value={row.mapping.nameEn ?? ""} />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e1e8e2] pt-3">
        <label className="flex items-center gap-2 text-sm text-[#4d554f]">
          <input checked={row.mapping.enabled} disabled={disabled} name="enabled" onChange={(event) => onChange(row.mapping.id, { enabled: event.target.checked })} type="checkbox" />
          Enabled
        </label>
        <div className="flex flex-wrap gap-2 text-xs text-[#687169]">
          {row.ownedMetrics.map((metric) => <code className="rounded bg-[#edf4ee] px-2 py-1" key={metric}>{metric}</code>)}
          <span>Last activity: {row.activity}</span>
        </div>
      </div>
    </article>
  );
}

export function DataHubSourcesContent({
  initialErrorMessage = "",
  model,
  onRefresh,
  onSave,
  onDirtyChange
}: {
  initialErrorMessage?: string;
  model: DataHubSourcesModel;
  onDirtyChange?: (isDirty: boolean) => void;
  onRefresh?: () => Promise<void> | void;
  onSave?: (topics: ReturnType<typeof buildTopicMappingsSavePayload>) => Promise<void> | void;
}) {
  const [draftTopics, setDraftTopics] = useState(model.topics);
  const [liveSolar, setLiveSolar] = useState(model.solar);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage);

  useEffect(() => {
    setDraftTopics(model.topics);
    setLiveSolar(model.solar);
  }, [model.solar, model.topics]);

  useEffect(() => {
    setErrorMessage(initialErrorMessage);
  }, [initialErrorMessage]);

  const handleLiveSnapshot = useCallback((snapshot: Parameters<typeof applySourcesLiveSnapshot>[1]) => {
    setDraftTopics((current) => applySourcesLiveSnapshot({ ...model, topics: current }, snapshot).topics);
    setLiveSolar((current) => applySourcesLiveSnapshot({ ...model, solar: current }, snapshot).solar);
  }, [model]);
  useDataHubLiveMetrics(handleLiveSnapshot);

  const rows = useMemo(
    () => buildSourceRows({ ...model, solar: liveSolar, topics: draftTopics }),
    [draftTopics, liveSolar, model]
  );
  const managedRows = rows.filter((row): row is ManagedSourceRow => row.kind === "managed");
  const genericRows = rows.filter((row): row is GenericSourceRow => row.kind === "generic");
  const isDirty = useMemo(
    () => JSON.stringify(buildTopicMappingsSavePayload(draftTopics)) !== JSON.stringify(buildTopicMappingsSavePayload(model.topics)),
    [draftTopics, model.topics]
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleGenericChange = useCallback((id: number, patch: GenericMappingPatch) => {
    setDraftTopics((current) => updateGenericMapping(current, id, patch));
    setMessage("");
    setErrorMessage("");
  }, []);

  const handleSave = useCallback(async () => {
    if (!onSave || !isDirty) {
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    try {
      await onSave(buildTopicMappingsSavePayload(draftTopics));
      setMessage("Generic MQTT mappings 已儲存。");
    } catch (error) {
      setErrorMessage(resolveSourcesSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [draftTopics, isDirty, onSave]);

  const handleRefresh = useCallback(async () => {
    if (!canRefreshSources(isDirty, () => window.confirm("尚有未儲存的 generic MQTT mappings，重新整理會捨棄目前修改，確定要繼續嗎？"))) {
      return;
    }
    try {
      await onRefresh?.();
      setMessage("Sources 已重新整理。");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(resolveSourcesSaveErrorMessage(error));
    }
  }, [isDirty, onRefresh]);

  return (
    <div className="space-y-5 px-5 pb-8" data-data-hub-section="sources">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#687169]">Data Hub / Sources</p>
          <h2 className="text-2xl font-semibold text-[#27322b]">資料來源</h2>
          <p className="mt-1 max-w-3xl text-sm text-[#687169]">集中查看 Solar managed adapter 與 operator-managed generic MQTT mappings；scope/site 會保留在每一筆來源身份上。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="mgmt-action" to="/settings/data-hub/sources/operations">進階 MQTT 維運</Link>
          <button className="mgmt-action" disabled={!onRefresh} onClick={() => void handleRefresh()} type="button">重新整理</button>
          <button className="mgmt-action primary" disabled={!onSave || !isDirty || isSaving} onClick={() => void handleSave()} type="button">{isSaving ? "儲存中..." : "儲存 mappings"}</button>
        </div>
      </header>

      {errorMessage ? <div className="mgmt-status is-error" data-source-error role="alert">{errorMessage}</div> : null}
      {message ? <div className="mgmt-status is-success" role="status">{message}</div> : null}
      <div className="mgmt-card grid gap-3 p-4 text-sm text-[#4d554f] sm:grid-cols-3" data-source-connection-summary>
        <div><span className="block text-xs uppercase tracking-wide text-[#7b857d]">Central broker</span><strong>{model.status.broker || "未設定"}</strong></div>
        <div><span className="block text-xs uppercase tracking-wide text-[#7b857d]">Connection health</span><SourceHealthChip health={model.status.connected ? { label: "Connected", tone: "success" } : { label: "Offline", tone: "danger" }} /></div>
        <div><span className="block text-xs uppercase tracking-wide text-[#7b857d]">Source counts</span><strong>{managedRows.length} managed · {genericRows.length} generic</strong></div>
      </div>

      <section className="space-y-3" data-source-group="managed">
        <div>
          <h3 className="text-lg font-semibold text-[#27322b]">Managed Solar adapters</h3>
          <p className="text-sm text-[#687169]">由 Solar Collector adapter 擁有的 canonical metrics 與 discovered resources。</p>
        </div>
        {managedRows.length > 0 ? managedRows.map((row) => <ManagedSourceCard key={row.id} row={row} />) : <div className="mgmt-card p-5 text-sm text-[#687169]">目前沒有 managed Solar source diagnostics。</div>}
      </section>

      <section className="space-y-3" data-source-group="generic">
        <div>
          <h3 className="text-lg font-semibold text-[#27322b]">Generic MQTT mappings</h3>
          <p className="text-sm text-[#687169]">Operator 可調整 metric key、topic、scope、名稱與解析欄位；adapter-owned identity 會維持唯讀。</p>
        </div>
        {genericRows.length > 0 ? genericRows.map((row) => <GenericSourceCard key={row.id} onChange={handleGenericChange} row={row} />) : <div className="mgmt-card p-5 text-sm text-[#687169]">目前沒有 generic MQTT mappings。</div>}
      </section>
    </div>
  );
}

export function DataHubSources() {
  const [model, setModel] = useState<DataHubSourcesModel | null>(readCachedDataHubSourcesModel());
  const [errorMessage, setErrorMessage] = useState(readCachedDataHubSourcesErrorMessage());
  const [isLoading, setIsLoading] = useState(readCachedDataHubSourcesModel() === null && !readCachedDataHubSourcesErrorMessage());
  const [dirty, setDirty] = useState(false);
  const blocker = useBlocker(dirty);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    const shouldLeave = window.confirm("尚有未儲存的 generic MQTT mappings，確定離開嗎？");
    if (shouldLeave) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchDataHubSourcesModel();
      rememberDataHubSourcesModel(result.model, result.errorMessage);
      setModel(result.model);
      setErrorMessage(result.errorMessage);
    } catch (error) {
      const nextError = resolveSourcesSaveErrorMessage(error);
      rememberDataHubSourcesModel({ solar: emptySolarSources, status: defaultMqttStatus, topics: [] }, nextError);
      setModel(null);
      setErrorMessage(nextError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (readCachedDataHubSourcesModel() || readCachedDataHubSourcesErrorMessage()) {
      return;
    }
    void load();
  }, [load]);

  const save = useCallback(async (topics: ReturnType<typeof buildTopicMappingsSavePayload>) => {
    const response = await requestJson<TopicMappingsResponse>("/api/settings/mqtt/topics", {
      body: JSON.stringify({ topics }),
      method: "PUT"
    });
    const nextModel: DataHubSourcesModel = {
      solar: model?.solar ?? emptySolarSources,
      status: response.status,
      topics: response.topics.map(normalizeTopicMapping)
    };
    rememberDataHubSourcesModel(nextModel);
    setModel(nextModel);
    setErrorMessage("");
  }, [model]);

  if (!model && isLoading) {
    return <DataHubSectionState status="loading" />;
  }
  if (!model) {
    return <DataHubSectionState message={errorMessage || "Sources 資料同步失敗。"} status="error" />;
  }

  return <DataHubSourcesContent initialErrorMessage={errorMessage} model={model} onDirtyChange={setDirty} onRefresh={load} onSave={save} />;
}
