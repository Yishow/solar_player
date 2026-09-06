import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import type { MetricScope } from "@solar-display/shared";
import { requestJson } from "../../services/api";
import { DataHubSectionState } from "./sectionState";
import { applySourcesLiveSnapshot, useDataHubLiveMetrics } from "./liveActivity";
import { useDataHubDraftGuard } from "./draftGuard";
import { SourceDetailsDrawer } from "./SourceDetailsDrawer";
import {
  countSourceSummary,
  createGenericMappingDraft,
  filterSourceRows,
  mergeScopedTopicEdits,
  mergeLiveObservationSnapshot,
  overlayLiveObservations,
  sourceDisplayName,
  validateGenericMappingForSave,
  type LiveObservationOverlay,
  type SourceListQuery
} from "./sourceWorkspace";
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
  type MqttSourceStatus
} from "./SourcesModel";
import {
  GenericSourceCard,
  ManagedSourceCard,
  SourceHealthChip,
  SourceSummaryRow
} from "./SourceCards";
import { useDataHubWorkspace, type DataHubListFilter } from "./workspaceContext";
import { GuidedOnboardingPanel } from "./GuidedOnboardingPanel";

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
  SourceRowMeta,
  SourceSummaryRow
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
  listQuery,
  model,
  onRefresh,
  onSave,
  onDirtyChange
}: {
  initialErrorMessage?: string;
  listQuery?: SourceListQuery;
  model: DataHubSourcesModel;
  onDirtyChange?: (isDirty: boolean) => void;
  onRefresh?: () => Promise<void> | void;
  onSave?: (topics: ReturnType<typeof buildTopicMappingsSavePayload>) => Promise<void> | void;
}) {
  const workspace = useDataHubWorkspace();
  const draftGuard = useDataHubDraftGuard();
  const query: SourceListQuery = listQuery ?? {
    filter: workspace.filter,
    scope: workspace.managementScope,
    search: workspace.search
  };
  const [draftTopics, setDraftTopics] = useState(model.topics);
  const [liveSolar, setLiveSolar] = useState(model.solar);
  const [liveOverlay, setLiveOverlay] = useState<LiveObservationOverlay>({});
  const [pendingSiteChoiceIds, setPendingSiteChoiceIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage);
  const [openRowId, setOpenRowId] = useState<string | null>(workspace.selection);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    setLiveSolar(model.solar);
    setDraftTopics((current) => {
      const dirty = JSON.stringify(buildTopicMappingsSavePayload(current))
        !== JSON.stringify(buildTopicMappingsSavePayload(model.topics));
      return dirty ? current : model.topics;
    });
  }, [model.solar, model.topics]);

  useEffect(() => {
    setErrorMessage(initialErrorMessage);
  }, [initialErrorMessage]);

  const handleLiveSnapshot = useCallback((snapshot: Parameters<typeof applySourcesLiveSnapshot>[1]) => {
    setLiveOverlay((current) => mergeLiveObservationSnapshot(current, snapshot));
    setLiveSolar((current) => applySourcesLiveSnapshot({ ...model, solar: current, topics: draftTopics }, snapshot).solar);
  }, [draftTopics, model]);
  useDataHubLiveMetrics(handleLiveSnapshot);

  const displayTopics = useMemo(
    () => overlayLiveObservations(draftTopics, liveOverlay),
    [draftTopics, liveOverlay]
  );
  const rows = useMemo(
    () => buildSourceRows({ ...model, solar: liveSolar, topics: displayTopics }),
    [displayTopics, liveSolar, model]
  );
  const visibleRows = useMemo(() => filterSourceRows(rows, query), [query, rows]);
  const summary = countSourceSummary(visibleRows);
  const openRow = rows.find((row) => row.id === openRowId) ?? null;
  const isDirty = useMemo(
    () => JSON.stringify(buildTopicMappingsSavePayload(draftTopics)) !== JSON.stringify(buildTopicMappingsSavePayload(model.topics)),
    [draftTopics, model.topics]
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
    draftGuard.setDirty(isDirty);
  }, [draftGuard, isDirty, onDirtyChange]);

  const handleGenericChange = useCallback((id: number, patch: GenericMappingPatch) => {
    if (patch.metricScope) {
      setPendingSiteChoiceIds((current) => current.filter((pendingId) => pendingId !== id));
    }
    setDraftTopics((current) => updateGenericMapping(current, id, patch));
    setMessage("");
    setErrorMessage("");
  }, []);

  const handleAddGenericMapping = useCallback(() => {
    const created = createGenericMappingDraft({
      existing: draftTopics,
      managementScope: query.scope
    });
    setDraftTopics((current) => [...current, created.mapping]);
    if (created.siteChoicePending) {
      setPendingSiteChoiceIds((current) => [...current, created.mapping.id]);
    }
    const nextRows = buildSourceRows({
      ...model,
      solar: liveSolar,
      topics: [...draftTopics, created.mapping]
    });
    const createdRow = nextRows.find((row) => row.kind === "generic" && row.mapping.id === created.mapping.id);
    setOpenRowId(createdRow?.id ?? null);
    setMessage(created.siteChoicePending
      ? "已新增一筆資料。請先選擇 CL 或 KN 廠區後再儲存。"
      : "已新增一筆資料，請填寫後儲存。");
    setErrorMessage("");
  }, [draftTopics, liveSolar, model, query.scope]);

  const handleDeleteGenericMapping = useCallback((id: number) => {
    const topic = draftTopics.find((row) => row.id === id);
    if (!topic) {
      return;
    }
    void requestJson<{ canMutate: boolean; unknown: boolean; consumers: Array<{ kind: string; pageId?: string; metricKey: string }> }>(
      `/api/data-hub/source-impact?metricKey=${encodeURIComponent(topic.metricKey)}&metricScope=${encodeURIComponent(topic.metricScope)}`
    ).then((impact) => {
      if (!impact.canMutate) {
        const detail = impact.unknown
          ? "引用查詢失敗，未知影響不能當成沒有引用。"
          : impact.consumers.map((row) => `${row.kind}:${row.pageId ?? row.metricKey}`).join("、");
        setErrorMessage(`這個來源仍被引用，已阻擋刪除。${detail}`);
        return;
      }
      setDraftTopics((current) => current.filter((item) => item.id !== id));
      setPendingSiteChoiceIds((current) => current.filter((pendingId) => pendingId !== id));
      setOpenRowId(null);
      setMessage("");
      setErrorMessage("");
    }).catch(() => {
      setErrorMessage("無法確認引用影響，未知影響不能當成沒有引用。");
    });
  }, [draftTopics]);

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
    const pending = draftTopics.find((topic) => pendingSiteChoiceIds.includes(topic.id));
    if (pending) {
      const validation = validateGenericMappingForSave(pending, true);
      setErrorMessage(validation.message ?? "請先選擇 CL 或 KN 廠區，才能儲存實體電錶。");
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    try {
      const merged = mergeScopedTopicEdits({
        draft: draftTopics,
        original: model.topics,
        visibleScope: query.scope
      });
      await onSave(buildTopicMappingsSavePayload(merged));
      setMessage("資料來源設定已儲存。");
    } catch (error) {
      setErrorMessage(resolveSourcesSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [draftTopics, isDirty, model.topics, onSave, pendingSiteChoiceIds, query.scope]);

  const handleRefresh = useCallback(async () => {
    if (!canRefreshSources(isDirty, () => window.confirm("尚有未儲存的修改，重新整理會捨棄目前輸入，確定要繼續嗎？"))) {
      return;
    }
    try {
      await onRefresh?.();
      setLiveOverlay({});
      setPendingSiteChoiceIds([]);
      setMessage("來源列表已重新整理。");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(resolveSourcesSaveErrorMessage(error));
    }
  }, [isDirty, onRefresh]);

  const updateQuery = (patch: Partial<SourceListQuery>) => {
    workspace.updateWorkspace({
      filter: (patch.filter ?? query.filter) as DataHubListFilter,
      managementScope: patch.scope ?? query.scope,
      search: patch.search ?? query.search
    });
  };

  const closeDrawer = () => setOpenRowId(null);

  return (
    <div className="space-y-5" data-data-hub-section="sources" data-workspace-safe-viewport="1366">
      {workspace.task === "connect" ? (
        <GuidedOnboardingPanel scope={workspace.managementScope} />
      ) : null}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-[13px] text-[#687169]">
          先從摘要列表找到來源，再打開單筆詳情。進階傳輸欄位只在抽屜中展開。
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="mgmt-action min-h-[40px]" disabled={!onRefresh} onClick={() => void handleRefresh()} type="button">重新整理</button>
          <button className="mgmt-action primary min-h-[40px]" disabled={!onSave || !isDirty || isSaving} onClick={() => void handleSave()} type="button">{isSaving ? "儲存中..." : "儲存 mappings"}</button>
        </div>
      </header>

      {errorMessage ? <div className="mgmt-status is-error" data-source-error role="alert">{errorMessage}</div> : null}
      {message ? <div className="mgmt-status is-success" role="status">{message}</div> : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-[16rem] flex-1 gap-1 text-[13px] text-[#4d554f]">
          搜尋名稱、代碼或主題
          <input
            aria-label="搜尋來源"
            className="mgmt-input min-h-[40px] text-[14px]"
            onChange={(event) => updateQuery({ search: event.target.value })}
            value={query.search}
          />
        </label>
        <label className="grid gap-1 text-[13px] text-[#4d554f]">
          篩選
          <select
            aria-label="來源篩選"
            className="mgmt-input min-h-[40px] text-[14px]"
            onChange={(event) => updateQuery({ filter: event.target.value as DataHubListFilter })}
            value={query.filter}
          >
            <option value="all">全部</option>
            <option value="issue">異常</option>
            <option value="managed">託管</option>
            <option value="custom">自訂</option>
          </select>
        </label>
        <button className="mgmt-action primary min-h-[40px]" onClick={handleAddGenericMapping} type="button">
          + 新增通用 MQTT 主題
        </button>
      </div>

      <div className="mgmt-card grid gap-3 p-4 text-sm text-[#4d554f] sm:grid-cols-3" data-source-connection-summary>
        <div><span className="block text-xs uppercase tracking-wide text-[#7b857d]">中央 Broker</span><strong>{model.status.broker || "未設定"}</strong></div>
        <div><span className="block text-xs uppercase tracking-wide text-[#7b857d]">連線狀態</span><SourceHealthChip health={model.status.connected ? { label: "正常連線 (Connected)", tone: "success" } : { label: "未連線 (Offline)", tone: "danger" }} /></div>
        <div>
          <span className="block text-xs uppercase tracking-wide text-[#7b857d]">這個範圍的摘要</span>
          <strong data-source-summary-counts>{summary.total} 筆 · {summary.issues} 筆異常 · {summary.managed} 託管 · {summary.custom} 自訂</strong>
        </div>
      </div>

      <section className="space-y-2" data-source-summary-list>
        {visibleRows.length > 0 ? visibleRows.map((row) => (
          <SourceSummaryRow
            key={row.id}
            onOpen={() => setOpenRowId(row.id)}
            row={row}
            rowRef={(node) => {
              if (node) {
                rowRefs.current.set(row.id, node);
              } else {
                rowRefs.current.delete(row.id);
              }
            }}
          />
        )) : (
          <div className="mgmt-card p-5 text-sm text-[#687169]">這個範圍目前沒有符合條件的來源。</div>
        )}
      </section>

      {openRow ? (
        <SourceDetailsDrawer
          onClose={closeDrawer}
          returnFocusRef={{ current: rowRefs.current.get(openRow.id) ?? null }}
          title={sourceDisplayName(openRow)}
        >
          {openRow.kind === "managed" ? (
            <div className="space-y-3">
              <p className="rounded-lg border border-[#ead7aa] bg-[#fff8e8] p-3 text-[13px] text-[#6b5524]" role="note">
                這是系統託管的 Solar 轉接器來源，對應欄位由轉接器同步，因此無法在這裡修改。
              </p>
              <ManagedSourceCard row={openRow} />
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSiteChoiceIds.includes(openRow.mapping.id) ? (
                <p className="rounded-lg border border-[#ead7aa] bg-[#fff8e8] p-3 text-[13px] text-[#6b5524]" role="alert">
                  請先選擇 CL 或 KN 廠區，不能使用全域範圍儲存實體電錶。
                </p>
              ) : null}
              {!openRow.editable ? (
                <p className="rounded-lg border border-[#ead7aa] bg-[#fff8e8] p-3 text-[13px] text-[#6b5524]" role="note">
                  此來源由系統託管，Topic 與指標代碼維持唯讀。
                </p>
              ) : null}
              <section data-source-basic>
                <h3 className="mb-2 text-[13px] font-semibold text-[#637166]">基本資料</h3>
                <GenericSourceCard
                  onChange={handleGenericChange}
                  onDelete={handleDeleteGenericMapping}
                  onPublishTest={handlePublishTest}
                  row={openRow}
                  siteChoicePending={pendingSiteChoiceIds.includes(openRow.mapping.id)}
                />
              </section>
            </div>
          )}
        </SourceDetailsDrawer>
      ) : null}
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
