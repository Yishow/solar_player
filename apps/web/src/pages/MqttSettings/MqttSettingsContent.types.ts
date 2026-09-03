import type {
  DisplayCardDataRow,
  DisplayReadinessReport,
  WeatherDiagnostic,
  WeatherFieldKey,
  WeatherHeaderContract,
  WeatherOptionsResponse,
  WeatherSettings
} from "@solar-display/shared";
import type { ReactNode } from "react";
import type { LiveMetricsSnapshot, SocketConnectionState } from "../../services/socket";
import type {
  ActionState,
  ConnectionTestFeedback,
  MqttSettingsForm,
  MqttStatus,
  TopicMapping
} from "./viewModel";
import type { FactoryTopicSite } from "./factoryTopicSites";

export type TopicWorkspaceTab = "source" | "topic" | "card-data";
export type CardDataSiteFilter = FactoryTopicSite;
export type MqttSettingsSurface = "full" | "connections" | "operations";

export type MqttSettingsContentProps = {
  actionState: ActionState;
  activeCardDataSite?: CardDataSiteFilter;
  activeTopicWorkspaceTab?: TopicWorkspaceTab;
  addTopicMapping: () => void;
  cardDataErrorMessage?: string;
  cardDataRows?: DisplayCardDataRow[];
  copyWeatherDiagnostic?: (text: string) => Promise<void> | void;
  enabledCardDataSites?: CardDataSiteFilter[];
  draftSections?: {
    broker: boolean;
    topic: boolean;
    weather: boolean;
  };
  errorMessage: string;
  handleSettingChange: <Key extends keyof MqttSettingsForm>(
    key: Key,
    value: MqttSettingsForm[Key]
  ) => void;
  handleTopicChange: <Key extends keyof TopicMapping>(
    rowId: number,
    key: Key,
    value: TopicMapping[Key]
  ) => void;
  handleCardDataSiteChange?: (site: CardDataSiteFilter) => void;
  handleConfigureTopicMetric?: (metricKey: string) => void;
  handleTopicWorkspaceTabChange?: (tab: TopicWorkspaceTab) => void;
  handleTopicPublishDraftChange?: (
    metricScope: TopicMapping["metricScope"],
    metricKey: string,
    value: string
  ) => void;
  handleOverrideDraftChange?: (
    targetId: string,
    metricScope: DisplayCardDataRow["metricScope"],
    value: string
  ) => void;
  handleWeatherSettingChange: <Key extends keyof WeatherSettings>(
    key: Key,
    value: WeatherSettings[Key]
  ) => void;
  lastConnectionTest: ConnectionTestFeedback;
  liveMetricsConnectionState: SocketConnectionState["status"];
  liveMetricsSnapshot: LiveMetricsSnapshot | null;
  message: string;
  highlightedTopicMetricKey?: string | null;
  isLoadingCardData?: boolean;
  readiness: DisplayReadinessReport | null;
  readinessErrorMessage: string;
  removeTopicMapping: (rowId: number) => void;
  publishTopicValue?: (
    metricScope: DisplayCardDataRow["metricScope"],
    metricKey: string,
    value: number
  ) => Promise<void>;
  publishingTopicKey?: string | null;
  clearDisplayOverride?: (
    targetId: string,
    metricScope: DisplayCardDataRow["metricScope"]
  ) => Promise<void>;
  reloadTopics: () => Promise<void>;
  remoteSyncBanner: ReactNode;
  saveSettings: () => Promise<void>;
  saveDisplayOverride?: (
    targetId: string,
    metricScope: DisplayCardDataRow["metricScope"],
    value: number
  ) => Promise<void>;
  saveTopicMappings: () => Promise<void>;
  savingOverrideTargetId?: string | null;
  settings: MqttSettingsForm;
  status: MqttStatus;
  surface?: MqttSettingsSurface;
  testConnection: () => Promise<void>;
  toggleWeatherField: (fieldKey: WeatherFieldKey, enabled: boolean) => void;
  topicPublishDrafts?: Record<string, string>;
  topicMappingsDirty?: boolean;
  overrideDrafts?: Record<string, string>;
  topics: TopicMapping[];
  weatherOptions: WeatherOptionsResponse | null;
  weatherDiagnostic?: WeatherDiagnostic | null;
  weatherOptionsErrorMessage: string;
  weatherPreviewContract: WeatherHeaderContract | null;
  weatherPreviewErrorMessage: string;
  weatherSettings: WeatherSettings;
  refreshWeather: () => Promise<void>;
};
