import { useCallback, useEffect, useMemo, useState } from "react";
import type { DisplayCardDataResponse, PlaybackPage } from "@solar-display/shared";
import {
  clearDisplayCardOverride,
  getDisplayCardData,
  saveDisplayCardOverride
} from "../../services/api";
import type { CardDataSiteFilter, TopicWorkspaceTab } from "./MqttSettingsContent.types";
import {
  buildCardDataOverrideKey
} from "./mqttSettingsRouteModel";
import type { MqttSettingsDataController } from "./useMqttSettingsData";

type UseMqttSettingsCardDataOptions = {
  data: MqttSettingsDataController;
};

export type MqttSettingsCardDataController = {
  activeCardDataSite: CardDataSiteFilter;
  activeTopicWorkspaceTab: TopicWorkspaceTab;
  cardData: DisplayCardDataResponse | null;
  cardDataErrorMessage: string;
  clearDisplayOverride: (
    targetId: string,
    metricScope: DisplayCardDataResponse["rows"][number]["metricScope"]
  ) => Promise<void>;
  enabledCardDataSites: CardDataSiteFilter[];
  handleCardDataSiteChange: (site: CardDataSiteFilter) => void;
  handleConfigureTopicMetric: (metricKey: string) => void;
  handleOverrideDraftChange: (
    targetId: string,
    metricScope: DisplayCardDataResponse["rows"][number]["metricScope"],
    value: string
  ) => void;
  highlightedTopicMetricKey: string | null;
  isLoadingCardData: boolean;
  loadCardData: () => Promise<void>;
  overrideDrafts: Record<string, string>;
  saveDisplayOverride: (
    targetId: string,
    metricScope: DisplayCardDataResponse["rows"][number]["metricScope"],
    value: number
  ) => Promise<void>;
  savingOverrideTargetId: string | null;
  setActiveTopicWorkspaceTab: (tab: TopicWorkspaceTab) => void;
};

export function useMqttSettingsCardData({
  data
}: UseMqttSettingsCardDataOptions): MqttSettingsCardDataController {
  const {
    actionState,
    hasLoadedMqttEditableModel,
    playbackPages,
    setActionState,
    setErrorMessage,
    setMessage
  } = data;
  const [activeTopicWorkspaceTab, setActiveTopicWorkspaceTab] = useState<TopicWorkspaceTab>("topic");
  const [activeCardDataSite, setActiveCardDataSite] = useState<CardDataSiteFilter>("jungli");
  const [highlightedTopicMetricKey, setHighlightedTopicMetricKey] = useState<string | null>(null);
  const [cardData, setCardData] = useState<DisplayCardDataResponse | null>(null);
  const [cardDataErrorMessage, setCardDataErrorMessage] = useState("");
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, string>>({});
  const [savingOverrideTargetId, setSavingOverrideTargetId] = useState<string | null>(null);

  const loadCardData = useCallback(async () => {
    setActionState((current) => ({ ...current, isLoadingCardData: true }));
    try {
      setCardData(await getDisplayCardData());
      setCardDataErrorMessage("");
    } catch (error) {
      setCardDataErrorMessage(error instanceof Error ? error.message : "載入卡片資料診斷失敗。");
    } finally {
      setActionState((current) => ({ ...current, isLoadingCardData: false }));
    }
  }, [setActionState]);

  useEffect(() => {
    if (!hasLoadedMqttEditableModel || activeTopicWorkspaceTab !== "card-data") {
      return;
    }

    void loadCardData();
  }, [activeTopicWorkspaceTab, hasLoadedMqttEditableModel, loadCardData]);

  const enabledCardDataSites = useMemo<CardDataSiteFilter[]>(() => {
    const enabledPageKeys = new Set(
      playbackPages.filter((page: PlaybackPage) => page.enabled).map((page) => page.pageKey)
    );
    const sites: CardDataSiteFilter[] = [];
    if (enabledPageKeys.has("factory-circuit")) sites.push("jungli");
    if (enabledPageKeys.has("factory-circuit-guanyin")) sites.push("guanyin");
    return sites.length > 0 ? sites : ["jungli", "guanyin"];
  }, [playbackPages]);

  useEffect(() => {
    if (!enabledCardDataSites.includes(activeCardDataSite)) {
      setActiveCardDataSite(enabledCardDataSites[0] ?? "jungli");
    }
  }, [activeCardDataSite, enabledCardDataSites]);

  const handleOverrideDraftChange = useCallback((
    targetId: string,
    metricScope: DisplayCardDataResponse["rows"][number]["metricScope"],
    value: string
  ) => {
    const overrideKey = buildCardDataOverrideKey(targetId, metricScope);
    setOverrideDrafts((current) => ({ ...current, [overrideKey]: value }));
  }, []);

  const handleConfigureTopicMetric = useCallback((metricKey: string) => {
    setHighlightedTopicMetricKey(metricKey);
    setActiveTopicWorkspaceTab("topic");
  }, []);

  const saveDisplayOverride = useCallback(async (
    targetId: string,
    metricScope: DisplayCardDataResponse["rows"][number]["metricScope"],
    value: number
  ) => {
    if (!Number.isFinite(value)) {
      setErrorMessage("展示覆寫值必須是數字。");
      return;
    }

    const overrideKey = buildCardDataOverrideKey(targetId, metricScope);
    setSavingOverrideTargetId(overrideKey);
    try {
      await saveDisplayCardOverride(targetId, metricScope, value);
      setOverrideDrafts((current) => ({ ...current, [overrideKey]: "" }));
      setMessage(`展示覆寫已套用：${targetId}`);
      setErrorMessage("");
      await loadCardData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "套用展示覆寫失敗。");
    } finally {
      setSavingOverrideTargetId(null);
    }
  }, [loadCardData, setErrorMessage, setMessage]);

  const clearDisplayOverride = useCallback(async (
    targetId: string,
    metricScope: DisplayCardDataResponse["rows"][number]["metricScope"]
  ) => {
    const overrideKey = buildCardDataOverrideKey(targetId, metricScope);
    setSavingOverrideTargetId(overrideKey);
    try {
      await clearDisplayCardOverride(targetId, metricScope);
      setOverrideDrafts((current) => ({ ...current, [overrideKey]: "" }));
      setMessage(`展示覆寫已清除：${targetId}`);
      setErrorMessage("");
      await loadCardData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "清除展示覆寫失敗。");
    } finally {
      setSavingOverrideTargetId(null);
    }
  }, [loadCardData, setErrorMessage, setMessage]);

  return {
    activeCardDataSite,
    activeTopicWorkspaceTab,
    cardData,
    cardDataErrorMessage,
    clearDisplayOverride,
    enabledCardDataSites,
    handleCardDataSiteChange: setActiveCardDataSite,
    handleConfigureTopicMetric,
    handleOverrideDraftChange,
    highlightedTopicMetricKey,
    isLoadingCardData: actionState.isLoadingCardData ?? false,
    loadCardData,
    overrideDrafts,
    saveDisplayOverride,
    savingOverrideTargetId,
    setActiveTopicWorkspaceTab
  };
}
