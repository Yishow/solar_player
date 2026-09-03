import { useCallback, useMemo, useState } from "react";
import { requestJson } from "../../services/api";
import { refreshDeferredSettingsDiagnostics } from "../shared/editableSettingsLoader";
import {
  factoryTopicMetricKeysBySite,
  isTopicMetricVisibleForFactorySite
} from "./factoryTopicSites";
import {
  buildMqttScopedMetricKey,
  type TopicMapping
} from "./viewModel";
import {
  createEmptyMapping,
  defaultMetricOptions
} from "./mqttSettingsRouteModel";
import type { MqttSettingsDataController } from "./useMqttSettingsData";
import type { CardDataSiteFilter, TopicWorkspaceTab } from "./MqttSettingsContent.types";
import type { MqttStatus } from "./viewModel";
import type { TopicMappingsResponse } from "./loadModel";

export type MqttSettingsTopicsController = {
  addTopicMapping: () => void;
  handleTopicChange: <Key extends keyof TopicMapping>(
    rowId: number,
    key: Key,
    value: TopicMapping[Key]
  ) => void;
  handleTopicPublishDraftChange: (
    metricScope: TopicMapping["metricScope"],
    metricKey: string,
    value: string
  ) => void;
  metricOptions: string[];
  publishTopicValue: (
    metricScope: TopicMapping["metricScope"],
    metricKey: string,
    value: number
  ) => Promise<void>;
  publishingTopicKey: string | null;
  reloadTopics: () => Promise<void>;
  removeTopicMapping: (rowId: number) => void;
  saveTopicMappings: () => Promise<void>;
  topicPublishDrafts: Record<string, string>;
};

export function useMqttSettingsTopics({
  activeCardDataSite,
  activeTopicWorkspaceTab,
  data,
  loadCardData,
  reloadReadiness
}: {
  activeCardDataSite: CardDataSiteFilter;
  activeTopicWorkspaceTab: TopicWorkspaceTab;
  data: MqttSettingsDataController;
  loadCardData: () => Promise<void>;
  reloadReadiness: () => Promise<void>;
}): MqttSettingsTopicsController {
  const {
    loadTopics,
    lastSyncedTopicsRef,
    markDirty,
    setActionState,
    setErrorMessage,
    setLastConnectionTest,
    setLastSyncedTopics,
    setMessage,
    setStatus,
    setTopics,
    topics
  } = data;
  const [topicPublishDrafts, setTopicPublishDrafts] = useState<Record<string, string>>({});
  const [publishingTopicKey, setPublishingTopicKey] = useState<string | null>(null);

  const metricOptions = useMemo(() => {
    const optionSet = new Set<string>(defaultMetricOptions);
    topics.forEach((topic) => optionSet.add(topic.metricKey));
    return [...optionSet];
  }, [topics]);

  const handleTopicChange = useCallback(<Key extends keyof TopicMapping>(
    rowId: number,
    key: Key,
    value: TopicMapping[Key]
  ) => {
    markDirty("Topic mappings 已變更，尚未儲存。");
    setTopics((current) =>
      current.map((topic) => (topic.id === rowId ? { ...topic, [key]: value } : topic))
    );
  }, [markDirty, setTopics]);

  const handleTopicPublishDraftChange = useCallback((
    metricScope: TopicMapping["metricScope"],
    metricKey: string,
    value: string
  ) => {
    const scopedKey = buildMqttScopedMetricKey(metricScope, metricKey);
    setTopicPublishDrafts((current) => ({ ...current, [scopedKey]: value }));
  }, []);

  const publishTopicValue = useCallback(async (
    metricScope: TopicMapping["metricScope"],
    metricKey: string,
    value: number
  ) => {
    setPublishingTopicKey(buildMqttScopedMetricKey(metricScope, metricKey));
    try {
      const response = await requestJson<{ status: MqttStatus }>(
        `/api/settings/mqtt/topics/${encodeURIComponent(metricKey)}/publish`,
        {
          body: JSON.stringify({ metricScope, value }),
          method: "POST"
        }
      );
      setStatus(response.status);
      setMessage(`MQTT 測試值已發佈：${metricKey}`);
      setErrorMessage("");
      await loadTopics({ isPolling: true });
      if (activeTopicWorkspaceTab === "card-data") {
        await loadCardData();
      }
      refreshDeferredSettingsDiagnostics([reloadReadiness]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "發佈 MQTT 測試值失敗。");
    } finally {
      setPublishingTopicKey(null);
    }
  }, [activeTopicWorkspaceTab, loadCardData, loadTopics, reloadReadiness, setErrorMessage, setMessage, setStatus]);

  const saveTopicMappings = useCallback(async () => {
    setActionState((current) => ({ ...current, isSavingTopics: true }));
    try {
      const response = await requestJson<TopicMappingsResponse>("/api/settings/mqtt/topics", {
        body: JSON.stringify({
          topics: topics.map((topic) => ({
            enabled: topic.enabled,
            metricKey: topic.metricKey,
            metricScope: topic.metricScope,
            multiplier: topic.multiplier ?? 1,
            nameZh: topic.nameZh?.trim() ?? "",
            nameEn: topic.nameEn?.trim() ?? "",
            topic: topic.topic.trim(),
            unit: topic.unit.trim(),
            valuePath: topic.valuePath.trim()
          }))
        }),
        method: "PUT"
      });
      setStatus(response.status);
      setTopics(response.topics);
      setLastSyncedTopics(response.topics);
      lastSyncedTopicsRef.current = response.topics;
      setLastConnectionTest(null);
      setMessage("Topic mappings 已更新並重新載入訂閱。");
      setErrorMessage("");
      refreshDeferredSettingsDiagnostics([reloadReadiness]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存 topic mappings 失敗。");
    } finally {
      setActionState((current) => ({ ...current, isSavingTopics: false }));
    }
  }, [lastSyncedTopicsRef, reloadReadiness, setActionState, setErrorMessage, setLastConnectionTest, setLastSyncedTopics, setMessage, setStatus, setTopics, topics]);

  const reloadTopics = useCallback(async () => {
    setActionState((current) => ({ ...current, isReloadingTopics: true }));
    try {
      const response = await requestJson<TopicMappingsResponse>("/api/settings/mqtt/reload", {
        method: "POST"
      });
      setStatus(response.status);
      setTopics(response.topics);
      setLastSyncedTopics(response.topics);
      lastSyncedTopicsRef.current = response.topics;
      setLastConnectionTest(null);
      setMessage("MQTT 訂閱清單已重新載入。");
      setErrorMessage("");
      refreshDeferredSettingsDiagnostics([reloadReadiness]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "重新載入 topic mappings 失敗。");
    } finally {
      setActionState((current) => ({ ...current, isReloadingTopics: false }));
    }
  }, [lastSyncedTopicsRef, reloadReadiness, setActionState, setErrorMessage, setLastConnectionTest, setLastSyncedTopics, setMessage, setStatus, setTopics]);

  const addTopicMapping = useCallback(() => {
    const metricScope = activeCardDataSite === "jungli" ? "cl" : "kn";
    const activeMetricOptions = metricOptions.filter((option) =>
      isTopicMetricVisibleForFactorySite(option, metricScope, activeCardDataSite)
    );
    const activeFactoryMetricOptions = factoryTopicMetricKeysBySite[activeCardDataSite].filter((option) =>
      activeMetricOptions.includes(option)
    );
    const addableMetricOptions = [...activeFactoryMetricOptions, ...activeMetricOptions.filter(
      (option) => !activeFactoryMetricOptions.includes(option)
    )];
    const nextMetricKey =
      addableMetricOptions.find((option) => !topics.some(
        (topic) => topic.metricScope === metricScope && topic.metricKey === option
      )) ??
      addableMetricOptions[0];
    if (!nextMetricKey) return;
    markDirty("已新增一筆 topic mapping，尚未儲存。");
    setTopics((current) => [...current, createEmptyMapping(nextMetricKey, metricScope)]);
  }, [activeCardDataSite, markDirty, metricOptions, setTopics, topics]);

  const removeTopicMapping = useCallback((rowId: number) => {
    markDirty("已移除一筆 topic mapping，尚未儲存。");
    setTopics((current) => current.filter((topic) => topic.id !== rowId));
  }, [markDirty, setTopics]);

  return {
    addTopicMapping,
    handleTopicChange,
    handleTopicPublishDraftChange,
    metricOptions,
    publishTopicValue,
    publishingTopicKey,
    reloadTopics,
    removeTopicMapping,
    saveTopicMappings,
    topicPublishDrafts
  };
}
