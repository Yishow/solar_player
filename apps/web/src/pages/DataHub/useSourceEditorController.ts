import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ObservationCandidate } from "@solar-display/shared";
import { requestJson } from "../../services/api";
import {
  createGenericMappingDraft,
  mergeScopedTopicEdits,
  validateGenericMappingForSave
} from "./sourceWorkspace";
import {
  buildSourceRows,
  buildTopicMappingsSavePayload,
  createSingleSourceMappingApi,
  deleteSingleSourceMappingApi,
  normalizeSavedTopicMapping,
  resolveSourcesSaveErrorMessage,
  saveSingleSourceMappingApi,
  updateGenericMapping,
  type DataHubSourcesModel,
  type GenericMappingPatch,
  type GenericMqttMapping
} from "./SourcesModel";
import type { DataHubManagementScope } from "./workspaceContext";

export function canRefreshSources(isDirty: boolean, confirmDiscard: () => boolean): boolean {
  return !isDirty || confirmDiscard();
}

function topicsMatch(left: GenericMqttMapping[], right: GenericMqttMapping[]) {
  return JSON.stringify(buildTopicMappingsSavePayload(left))
    === JSON.stringify(buildTopicMappingsSavePayload(right));
}

export type SourceEditorControllerParams = {
  initialErrorMessage?: string;
  initialSelection: string | null;
  listQueryScope: DataHubManagementScope;
  liveSolar: DataHubSourcesModel["solar"];
  model: DataHubSourcesModel;
  onDirtyChange?: (isDirty: boolean) => void;
  onRefresh?: () => Promise<void> | void;
  onSave?: (topics: ReturnType<typeof buildTopicMappingsSavePayload>) => Promise<void> | void;
  onUpdateWorkspace: (patch: { selection?: string | null; view?: "configured" | "received" }) => void;
};

export function useSourceEditorController({
  initialErrorMessage = "",
  initialSelection,
  listQueryScope,
  liveSolar,
  model,
  onDirtyChange,
  onRefresh,
  onSave,
  onUpdateWorkspace
}: SourceEditorControllerParams) {
  const [draftTopics, setDraftTopics] = useState(model.topics);
  const [baselineTopics, setBaselineTopics] = useState(model.topics);
  const [pendingSiteChoiceIds, setPendingSiteChoiceIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage);
  const [openRowId, setOpenRowId] = useState<string | null>(initialSelection);
  const modelPayloadRef = useRef(JSON.stringify(buildTopicMappingsSavePayload(model.topics)));

  useEffect(() => {
    const nextModelPayload = JSON.stringify(buildTopicMappingsSavePayload(model.topics));
    if (modelPayloadRef.current === nextModelPayload) {
      return;
    }
    modelPayloadRef.current = nextModelPayload;
    if (topicsMatch(draftTopics, baselineTopics)) {
      setDraftTopics(model.topics);
      setBaselineTopics(model.topics);
    }
  }, [baselineTopics, draftTopics, model.topics]);

  useEffect(() => {
    setErrorMessage(initialErrorMessage);
  }, [initialErrorMessage]);

  const isDirty = useMemo(
    () => !topicsMatch(draftTopics, baselineTopics),
    [baselineTopics, draftTopics]
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleGenericChange = useCallback((id: number, patch: GenericMappingPatch) => {
    if (patch.metricScope) {
      setPendingSiteChoiceIds((current) => current.filter((pendingId) => pendingId !== id));
    }
    setDraftTopics((current) => updateGenericMapping(current, id, patch));
    if (patch.metricScope || patch.metricKey) {
      setOpenRowId((current) => {
        if (!current?.startsWith("mqtt:")) return current;
        const parts = current.split(":");
        if (parts[parts.length - 1] === String(id)) {
          const nextScope = patch.metricScope ?? parts[1];
          const nextKey = patch.metricKey ?? parts[2];
          return `mqtt:${nextScope || "all"}:${nextKey}:${id}`;
        }
        return current;
      });
    }
    setMessage("");
    setErrorMessage("");
  }, []);

  const handleAddGenericMapping = useCallback(() => {
    const created = createGenericMappingDraft({
      existing: draftTopics,
      managementScope: listQueryScope
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
  }, [draftTopics, listQueryScope, liveSolar, model]);

  const handleAddFromReceived = useCallback((candidate?: ObservationCandidate) => {
    if (!candidate) {
      onUpdateWorkspace({ view: "received" });
      return;
    }
    const created = createGenericMappingDraft({
      existing: draftTopics,
      managementScope: listQueryScope
    });
    const updatedMapping = {
      ...created.mapping,
      nameZh: candidate.declaredTag ? `觀測點 ${candidate.declaredTag}` : `接收 ${candidate.exactTopic}`,
      topic: candidate.exactTopic
    };
    setDraftTopics((current) => [...current, updatedMapping]);
    if (created.siteChoicePending) {
      setPendingSiteChoiceIds((current) => [...current, updatedMapping.id]);
    }
    const nextRows = buildSourceRows({
      ...model,
      solar: liveSolar,
      topics: [...draftTopics, updatedMapping]
    });
    const createdRow = nextRows.find((row) => row.kind === "generic" && row.mapping.id === updatedMapping.id);
    onUpdateWorkspace({ selection: createdRow?.id ?? null, view: "configured" });
    setOpenRowId(createdRow?.id ?? null);
    setMessage("已從接收樣本填入 Topic，請設定指標代碼與單位後儲存。");
  }, [draftTopics, listQueryScope, liveSolar, model, onUpdateWorkspace]);

  const handleDeleteGenericMapping = useCallback((id: number) => {
    const topic = draftTopics.find((row) => row.id === id);
    if (!topic) return;
    if (!topic.sourceRef) {
      setDraftTopics((current) => current.filter((item) => item.id !== id));
      setPendingSiteChoiceIds((current) => current.filter((pendingId) => pendingId !== id));
      setOpenRowId(null);
      setMessage("已捨棄未儲存的新草稿。");
      setErrorMessage("");
      return;
    }
    void requestJson<{ canMutate: boolean; unknown: boolean; consumers: Array<{ kind: string; pageId?: string; metricKey: string }> }>(
      `/api/data-hub/source-impact?metricKey=${encodeURIComponent(topic.metricKey)}&metricScope=${encodeURIComponent(topic.metricScope)}`
    ).then(async (impact) => {
      if (!impact.canMutate) {
        const detail = impact.unknown
          ? "引用查詢失敗，未知影響不能當成沒有引用。"
          : impact.consumers.map((row) => `${row.kind}:${row.pageId ?? row.metricKey}`).join("、");
        setErrorMessage(`這個來源仍被引用，已阻擋刪除。${detail}`);
        return;
      }
      try {
        if (model.capabilities?.versionedSourceEditing !== false && topic.sourceRef) {
          await deleteSingleSourceMappingApi({
            expectedRevision: topic.configRevision ?? 1,
            sourceRef: topic.sourceRef
          });
        }
        setDraftTopics((current) => current.filter((item) => item.id !== id));
        setPendingSiteChoiceIds((current) => current.filter((pendingId) => pendingId !== id));
        setOpenRowId(null);
        setMessage("資料來源已成功刪除。");
        setErrorMessage("");
      } catch (error) {
        setErrorMessage(resolveSourcesSaveErrorMessage(error));
      }
    }).catch(() => {
      setErrorMessage("無法確認引用影響，未知影響不能當成沒有引用。");
    });
  }, [draftTopics, model.capabilities?.versionedSourceEditing]);

  const handleSaveSingle = useCallback(async (id: number) => {
    const topic = draftTopics.find((row) => row.id === id);
    if (!topic) return;
    const pending = pendingSiteChoiceIds.includes(topic.id);
    const validation = validateGenericMappingForSave(topic, pending);
    if (!validation.ok) {
      setErrorMessage(validation.message ?? "請先選擇 CL 或 KN 廠區，才能儲存實體電錶。");
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    try {
      if (model.capabilities?.versionedSourceEditing !== false && topic.sourceRef) {
        const res = await saveSingleSourceMappingApi({
          expectedRevision: topic.configRevision ?? 1,
          patch: {
            enabled: topic.enabled,
            metricKey: topic.metricKey,
            metricScope: topic.metricScope,
            multiplier: topic.multiplier ?? 1,
            nameEn: topic.nameEn ?? "",
            nameZh: topic.nameZh ?? "",
            topic: topic.topic,
            unit: topic.unit,
            valuePath: topic.valuePath
          },
          sourceRef: topic.sourceRef
        });
        const savedTopic = normalizeSavedTopicMapping(res, topic);
        setDraftTopics((current) => current.map((item) => (item.id === id ? savedTopic : item)));
        setBaselineTopics((current) => current.map((item) => (item.id === id ? savedTopic : item)));
        setMessage("此資料來源已成功儲存。");
      } else if (model.capabilities?.versionedSourceEditing !== false && (!topic.sourceRef || topic.id < 0)) {
        const res = await createSingleSourceMappingApi({ source: topic });
        const savedTopic = normalizeSavedTopicMapping(res, topic);
        setDraftTopics((current) => current.map((item) => (item.id === id ? savedTopic : item)));
        setBaselineTopics((current) => current.map((item) => (item.id === id ? savedTopic : item)));
        setPendingSiteChoiceIds((current) => current.filter((pendingId) => pendingId !== id));
        setMessage("新資料來源已成功建立並儲存。");
      } else {
        const merged = mergeScopedTopicEdits({
          draft: draftTopics,
          original: model.topics,
          visibleScope: listQueryScope
        });
        await onSave?.(buildTopicMappingsSavePayload(merged));
        setDraftTopics(merged);
        setBaselineTopics(merged);
        setMessage("資料來源設定已儲存。");
      }
    } catch (error) {
      setErrorMessage(resolveSourcesSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [draftTopics, listQueryScope, model.capabilities?.versionedSourceEditing, model.topics, onSave, pendingSiteChoiceIds]);

  const handleDiscardSingle = useCallback((id: number) => {
    const original = baselineTopics.find((item) => item.id === id);
    if (original) {
      setDraftTopics((current) => current.map((item) => (item.id === id ? original : item)));
      setMessage("已還原此來源修改。");
    } else {
      setDraftTopics((current) => current.filter((item) => item.id !== id));
      setPendingSiteChoiceIds((current) => current.filter((pendingId) => pendingId !== id));
      setOpenRowId(null);
      setMessage("已捨棄新草稿。");
    }
    setErrorMessage("");
  }, [baselineTopics]);

  const handleSave = useCallback(async () => {
    if (!onSave || !isDirty) return;
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
        visibleScope: listQueryScope
      });
      await onSave(buildTopicMappingsSavePayload(merged));
      setDraftTopics(merged);
      setBaselineTopics(merged);
      setMessage("資料來源設定已儲存。");
    } catch (error) {
      setErrorMessage(resolveSourcesSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [draftTopics, isDirty, listQueryScope, model.topics, onSave, pendingSiteChoiceIds]);

  return {
    draftTopics,
    errorMessage,
    handleAddFromReceived,
    handleAddGenericMapping,
    handleDeleteGenericMapping,
    handleDiscardSingle,
    handleGenericChange,
    handleSave,
    handleSaveSingle,
    isDirty,
    isSaving,
    message,
    openRowId,
    pendingSiteChoiceIds,
    setDraftTopics,
    setErrorMessage,
    setMessage,
    setOpenRowId,
    setPendingSiteChoiceIds
  };
}
