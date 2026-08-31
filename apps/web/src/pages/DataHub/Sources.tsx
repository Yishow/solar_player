import { useCallback, useEffect, useMemo, useState } from "react";
import { useBlocker } from "react-router-dom";
import type { MetricScope } from "@solar-display/shared";
import { requestJson } from "../../services/api";
import { DataHubSectionState } from "./sectionState";
import { applySourcesLiveSnapshot, useDataHubLiveMetrics } from "./liveActivity";
import {
  buildSourceRows,
  buildTopicMappingsSavePayload,
  defaultMqttStatus,
  emptySolarSources,
  fetchDataHubSourcesModel,
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
  type MqttSourceStatus
} from "./SourcesModel";
import {
  GenericSourceCard,
  ManagedSourceCard,
  SourceHealthChip,
  SourceResourceList,
  SourceRowMeta
} from "./SourceCards";

export {
  buildSourceRows,
  buildTopicMappingsSavePayload,
  fetchDataHubSourcesModel,
  isSolarAdapterManagedMetricIdentity,
  loadDataHubSourcesRoute,
  resolveSourcesSaveErrorMessage,
  updateGenericMapping
} from "./SourcesModel";
export {
  GenericSourceCard,
  ManagedSourceCard,
  SourceHealthChip,
  SourceResourceList,
  SourceRowMeta
} from "./SourceCards";
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

  const handleAddGenericMapping = useCallback(() => {
    const nextId = draftTopics.length > 0
      ? Math.min(0, ...draftTopics.map((t) => t.id)) - 1
      : -1;
    const newMapping: GenericMqttMapping = {
      enabled: true,
      id: nextId,
      lastReceivedAt: null,
      lastValue: null,
      metricKey: "custom.metric",
      metricScope: "cl",
      multiplier: 1,
      nameEn: "",
      nameZh: "自訂指標",
      quality: null,
      topic: "custom/cl/metric",
      unit: "kW",
      updatedAt: null,
      valuePath: "$.value"
    };
    setDraftTopics((current) => [...current, newMapping]);
    setMessage("已新增一筆自訂通用 MQTT 主題，請填寫參數後儲存。");
    setErrorMessage("");
  }, [draftTopics]);

  const handleDeleteGenericMapping = useCallback((id: number) => {
    setDraftTopics((current) => current.filter((t) => t.id !== id));
    setMessage("");
    setErrorMessage("");
  }, []);

  const handlePublishTest = useCallback(async (metricScope: MetricScope, metricKey: string, value: number) => {
    setErrorMessage("");
    try {
      await requestJson<{ status: MqttSourceStatus }>(
        `/api/settings/mqtt/topics/${encodeURIComponent(metricKey)}/publish`,
        {
          body: JSON.stringify({ metricScope, value }),
          method: "POST"
        }
      );
      setMessage(`MQTT 測試值已發佈：${metricKey} (${metricScope.toUpperCase()}) = ${value}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "發佈 MQTT 測試值失敗。");
    }
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
    <div className="space-y-5" data-data-hub-section="sources">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-[#687169]">
          集中查看 Solar managed adapter 與 operator-managed generic MQTT mappings；可在本頁直接編輯、新增、刪除與測試發佈。
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="mgmt-action" disabled={!onRefresh} onClick={() => void handleRefresh()} type="button">重新整理</button>
          <button className="mgmt-action primary" disabled={!onSave || !isDirty || isSaving} onClick={() => void handleSave()} type="button">{isSaving ? "儲存中..." : "儲存 mappings"}</button>
        </div>
      </header>

      {errorMessage ? <div className="mgmt-status is-error" data-source-error role="alert">{errorMessage}</div> : null}
      {message ? <div className="mgmt-status is-success" role="status">{message}</div> : null}
      <div className="mgmt-card grid gap-3 p-4 text-sm text-[#4d554f] sm:grid-cols-3" data-source-connection-summary>
        <div><span className="block text-xs uppercase tracking-wide text-[#7b857d]">中央 Broker</span><strong>{model.status.broker || "未設定"}</strong></div>
        <div><span className="block text-xs uppercase tracking-wide text-[#7b857d]">連線狀態</span><SourceHealthChip health={model.status.connected ? { label: "正常連線 (Connected)", tone: "success" } : { label: "未連線 (Offline)", tone: "danger" }} /></div>
        <div><span className="block text-xs uppercase tracking-wide text-[#7b857d]">來源統計</span><strong>{managedRows.length} 託管來源 · {genericRows.length} 通用來源</strong></div>
      </div>

      <section className="space-y-3" data-source-group="managed">
        <div>
          <h3 className="text-lg font-semibold text-[#27322b]">託管 Solar 轉接器 (Managed Solar Adapters)</h3>
          <p className="text-sm text-[#687169]">由 Solar Collector 轉接器擁有的標準指標與自動探索資源。</p>
        </div>
        {managedRows.length > 0 ? managedRows.map((row) => <ManagedSourceCard key={row.id} row={row} />) : <div className="mgmt-card p-5 text-sm text-[#687169]">目前沒有託管的 Solar 來源診斷。</div>}
      </section>

      <section className="space-y-3" data-source-group="generic">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#27322b]">通用 MQTT 來源 (Generic MQTT Mappings)</h3>
            <p className="text-sm text-[#687169]">維運人員可直接新增、編輯、測試發佈與刪除主題映射；轉接器託管指標維持唯讀。</p>
          </div>
          <button
            type="button"
            className="mgmt-action primary"
            onClick={handleAddGenericMapping}
          >
            + 新增通用 MQTT 主題
          </button>
        </div>
        {genericRows.length > 0 ? genericRows.map((row) => (
          <GenericSourceCard
            key={row.id}
            onChange={handleGenericChange}
            onDelete={handleDeleteGenericMapping}
            onPublishTest={handlePublishTest}
            row={row}
          />
        )) : <div className="mgmt-card p-5 text-sm text-[#687169]">目前沒有自訂通用 MQTT 映射。</div>}
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
