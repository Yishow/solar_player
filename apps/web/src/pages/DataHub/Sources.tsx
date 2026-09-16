import { useCallback, useEffect, useMemo, useState } from "react";
import { useBlocker } from "react-router-dom";
import type { MetricScope } from "@solar-display/shared";
import { requestJson } from "../../services/api";
import { DataHubSectionState } from "./sectionState";
import { applySourcesLiveSnapshot, useDataHubLiveMetrics } from "./liveActivity";
import { useDataHubDraftGuard } from "./draftGuard";
import {
  countSourceSummary,
  filterSourceRows,
  mergeLiveObservationSnapshot,
  overlayLiveObservations,
  type LiveObservationOverlay,
  type SourceListQuery
} from "./sourceWorkspace";
import {
  buildSourceRows,
  buildTopicMappingsSavePayload,
  defaultMqttStatus,
  emptySolarSources,
  fetchDataHubSourcesModel,
  normalizeTopicMapping,
  readCachedDataHubSourcesErrorMessage,
  readCachedDataHubSourcesModel,
  rememberDataHubSourcesModel,
  resolveSourcesSaveErrorMessage,
  type DataHubSourcesModel,
  type GenericMqttMapping,
  type MqttSourceStatus
} from "./SourcesModel";
import { useDataHubWorkspace } from "./workspaceContext";
import { ConfiguredSourcesView } from "./ConfiguredSourcesView";
import { ReceivedDataWorkspace } from "./ReceivedDataWorkspace";
import {
  canRefreshSources,
  useSourceEditorController
} from "./useSourceEditorController";

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
export { applySourcesLiveSnapshot, canRefreshSources };
export type {
  DataHubSourcesModel,
  GenericMappingPatch,
  GenericMqttMapping,
  MqttSourceStatus,
  SourceRow
} from "./SourcesModel";

type TopicMappingsResponse = {
  capabilities?: {
    legacyReplaceSupported: boolean;
    versionedSourceEditing: boolean;
  };
  collectionRevision?: number;
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
  const [liveSolar, setLiveSolar] = useState(model.solar);
  const [liveOverlay, setLiveOverlay] = useState<LiveObservationOverlay>({});

  useEffect(() => {
    setLiveSolar(model.solar);
  }, [model.solar]);

  const onUpdateWorkspace = useCallback((patch: { selection?: string | null; view?: "configured" | "received" }) => {
    workspace.updateWorkspace(patch);
  }, [workspace]);

  const editor = useSourceEditorController({
    initialErrorMessage,
    initialSelection: workspace.selection,
    listQueryScope: query.scope,
    liveSolar,
    model,
    onDirtyChange,
    onRefresh,
    onSave,
    onUpdateWorkspace
  });

  useEffect(() => {
    draftGuard.setDirty(editor.isDirty);
  }, [draftGuard, editor.isDirty]);

  const handleLiveSnapshot = useCallback((snapshot: Parameters<typeof applySourcesLiveSnapshot>[1]) => {
    setLiveOverlay((current) => mergeLiveObservationSnapshot(current, snapshot));
    setLiveSolar((current) => applySourcesLiveSnapshot({ ...model, solar: current, topics: editor.draftTopics }, snapshot).solar);
  }, [editor.draftTopics, model]);
  useDataHubLiveMetrics(handleLiveSnapshot);

  const displayTopics = useMemo(
    () => overlayLiveObservations(editor.draftTopics, liveOverlay),
    [editor.draftTopics, liveOverlay]
  );
  const rows = useMemo(
    () => buildSourceRows({ ...model, solar: liveSolar, topics: displayTopics }),
    [displayTopics, liveSolar, model]
  );
  const visibleRows = useMemo(() => filterSourceRows(rows, query), [query, rows]);
  const summary = countSourceSummary(visibleRows);

  const handlePublishTest = useCallback(async (metricScope: MetricScope, metricKey: string, value: number) => {
    editor.setErrorMessage("");
    try {
      await requestJson<{ status: MqttSourceStatus }>(
        `/api/settings/mqtt/topics/${encodeURIComponent(metricKey)}/publish`,
        { body: JSON.stringify({ metricScope, value }), method: "POST" }
      );
      editor.setMessage(`MQTT 測試值已發佈：${metricKey} (${metricScope.toUpperCase()}) = ${value}`);
    } catch (error) {
      editor.setErrorMessage(error instanceof Error ? error.message : "發佈 MQTT 測試值失敗。");
    }
  }, [editor]);

  const handleRefresh = useCallback(async () => {
    if (!canRefreshSources(editor.isDirty, () => window.confirm("尚有未儲存的 generic MQTT mappings，重新整理會捨棄目前修改，確定要繼續嗎？"))) {
      return;
    }
    try {
      await onRefresh?.();
      setLiveOverlay({});
      editor.setPendingSiteChoiceIds([]);
      editor.setMessage("來源列表已重新整理。");
      editor.setErrorMessage("");
    } catch (error) {
      editor.setErrorMessage(resolveSourcesSaveErrorMessage(error));
    }
  }, [editor, onRefresh]);

  const updateQuery = (patch: Partial<SourceListQuery & { panel?: "drawer" | "full"; section?: typeof workspace.section }>) => {
    if (patch.scope && patch.scope !== query.scope) {
      draftGuard.requestNavigation(() => {
        workspace.updateWorkspace({
          filter: patch.filter ?? query.filter,
          managementScope: patch.scope ?? query.scope,
          panel: patch.panel ?? workspace.panel,
          search: patch.search ?? query.search,
          section: patch.section ?? workspace.section
        });
      });
      return;
    }
    workspace.updateWorkspace({
      filter: patch.filter ?? query.filter,
      managementScope: patch.scope ?? query.scope,
      panel: patch.panel ?? workspace.panel,
      search: patch.search ?? query.search,
      section: patch.section ?? workspace.section
    });
  };

  const concreteSite = query.scope === "cl" || query.scope === "kn" ? query.scope : null;
  const configuredQuery = {
    ...query,
    hasExplicitSection: workspace.searchParams.has("section"),
    panel: workspace.panel,
    section: workspace.section
  };

  return (
    <div className="space-y-5" data-data-hub-section="sources" data-workspace-safe-viewport="1366">
      <div className="flex border-b border-[#d0d7d1]">
        <button
          aria-selected={workspace.view === "configured"}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors min-h-[40px] ${
            workspace.view === "configured"
              ? "border-[#1b4332] text-[#1b4332]"
              : "border-transparent text-[#687169] hover:text-[#2d3730]"
          }`}
          data-tab-configured
          onClick={() => workspace.updateWorkspace({ view: "configured" })}
          type="button"
        >
          已接入來源
        </button>
        <button
          aria-selected={workspace.view === "received"}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors min-h-[40px] ${
            workspace.view === "received"
              ? "border-[#1b4332] text-[#1b4332]"
              : "border-transparent text-[#687169] hover:text-[#2d3730]"
          }`}
          data-tab-received
          onClick={() => workspace.updateWorkspace({ view: "received" })}
          type="button"
        >
          已接收資料
        </button>
      </div>

      {workspace.view === "received" ? (
        <ReceivedDataWorkspace
          configuredMappings={editor.draftTopics}
          initialSearchQuery={workspace.search}
          onAddFromReceived={(candidate) => editor.handleAddFromReceived(candidate)}
          siteScope={concreteSite}
        />
      ) : (
        <ConfiguredSourcesView
          errorMessage={editor.errorMessage}
          isDirty={editor.isDirty}
          isSaving={editor.isSaving}
          message={editor.message}
          model={model}
          onAddFromReceived={() => workspace.updateWorkspace({ view: "received" })}
          onAddGenericMapping={editor.handleAddGenericMapping}
          onCloseDrawer={() => {
            draftGuard.requestNavigation(() => {
              editor.setOpenRowId(null);
              workspace.updateWorkspace({ selection: null });
            });
          }}
          onDeleteGenericMapping={editor.handleDeleteGenericMapping}
          onDiscardSingle={editor.handleDiscardSingle}
          onGenericChange={editor.handleGenericChange}
          onOpenDrawer={(rowId) => {
            if (rowId === editor.openRowId) return;
            draftGuard.requestNavigation(() => {
              editor.setOpenRowId(rowId);
              workspace.updateWorkspace({ selection: rowId }, { replace: false });
            });
          }}
          onPublishTest={handlePublishTest}
          onRefresh={handleRefresh}
          onSave={editor.handleSave}
          onSaveSingle={editor.handleSaveSingle}
          openRowId={editor.openRowId}
          pendingSiteChoiceIds={editor.pendingSiteChoiceIds}
          query={configuredQuery}
          rows={rows}
          summary={summary}
          updateQuery={updateQuery}
          visibleRows={visibleRows}
        />
      )}
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
      body: JSON.stringify({
        expectedCollectionRevision: model?.collectionRevision,
        topics
      }),
      method: "PUT"
    });
    const nextModel: DataHubSourcesModel = {
      capabilities: response.capabilities ?? model?.capabilities,
      collectionRevision: response.collectionRevision ?? model?.collectionRevision,
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
