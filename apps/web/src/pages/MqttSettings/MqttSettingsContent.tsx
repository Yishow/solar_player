import { memo, useMemo } from "react";
import { buildMqttSettingsViewModel } from "./viewModel";
import {
  factoryTopicSiteOptions,
  isTopicMetricVisibleForFactorySite
} from "./factoryTopicSites";
import {
  isCardDataRowVisibleForSite,
  resolveConnStatus
} from "./MqttSettingsViewHelpers";
import { MqttCardDataPanel } from "./MqttCardDataPanel";
import { MqttConnectionsPanel } from "./MqttConnectionsPanel";
import { MqttSourcePanel } from "./MqttSourcePanel";
import { MqttTopicPanel } from "./MqttTopicPanel";
import { MqttWeatherPanel } from "./MqttWeatherPanel";
import type {
  CardDataSiteFilter,
  MqttSettingsContentProps,
  TopicWorkspaceTab
} from "./MqttSettingsContent.types";

export type {
  CardDataSiteFilter,
  MqttSettingsContentProps,
  MqttSettingsSurface,
  TopicWorkspaceTab
} from "./MqttSettingsContent.types";

/**
 * MQTT 設定頁面的主內容元件。
 * 只負責建立 view model、處理 surface/tab 分支，以及組合各個 focused panel。
 */
function MqttSettingsContentImpl(props: MqttSettingsContentProps) {
  const connectionsOnly = props.surface === "connections";
  const operationsOnly = props.surface === "operations";
  const viewModel = useMemo(
    () =>
      buildMqttSettingsViewModel({
        actionState: props.actionState,
        errorMessage: props.errorMessage,
        lastConnectionTest: props.lastConnectionTest,
        liveMetricsConnectionState: props.liveMetricsConnectionState,
        liveMetricsSnapshot: props.liveMetricsSnapshot,
        message: props.message,
        readiness: props.readiness,
        settings: props.settings,
        status: props.status,
        topics: props.topics,
        weatherDiagnostic: props.weatherDiagnostic,
        weatherOptions: props.weatherOptions,
        weatherOptionsErrorMessage: props.weatherOptionsErrorMessage,
        weatherPreviewContract: props.weatherPreviewContract,
        weatherPreviewErrorMessage: props.weatherPreviewErrorMessage,
        weatherSettings: props.weatherSettings
      }),
    [
      props.actionState,
      props.errorMessage,
      props.lastConnectionTest,
      props.liveMetricsConnectionState,
      props.liveMetricsSnapshot,
      props.message,
      props.readiness,
      props.settings,
      props.status,
      props.topics,
      props.weatherDiagnostic,
      props.weatherOptions,
      props.weatherOptionsErrorMessage,
      props.weatherPreviewContract,
      props.weatherPreviewErrorMessage,
      props.weatherSettings
    ]
  );
  const connStatusVariant = resolveConnStatus(viewModel.connection.statusTone);
  const requestedTopicWorkspaceTab = props.activeTopicWorkspaceTab ?? "topic";
  const activeTopicWorkspaceTab = connectionsOnly
    ? "source"
    : operationsOnly && requestedTopicWorkspaceTab === "source"
      ? "topic"
      : requestedTopicWorkspaceTab;
  const enabledCardDataSites = props.enabledCardDataSites ?? ["jungli", "guanyin"];
  const activeCardDataSite = props.activeCardDataSite ?? enabledCardDataSites[0] ?? "jungli";
  const cardDataSiteOptionsForEnabledPages = factoryTopicSiteOptions.filter((option) =>
    enabledCardDataSites.includes(option.value)
  );
  const visibleTopicWorkspaceRows = viewModel.topicWorkspaceRows.filter((topic) =>
    isTopicMetricVisibleForFactorySite(topic.metricKey, topic.metricScope, activeCardDataSite)
  );
  const visibleCoverageRows = viewModel.coverageRows.filter((row) =>
    isTopicMetricVisibleForFactorySite(row.requirementKey, row.metricScope, activeCardDataSite)
  );
  const visibleCardDataRows = (props.cardDataRows ?? []).filter((row) =>
    row.pageId === "factory-circuit"
      ? activeCardDataSite === "jungli" && enabledCardDataSites.includes("jungli")
      : row.pageId === "factory-circuit-guanyin"
        ? activeCardDataSite === "guanyin" && enabledCardDataSites.includes("guanyin")
        : isCardDataRowVisibleForSite(row, activeCardDataSite)
  );
  const selectTopicWorkspaceTab = (tab: TopicWorkspaceTab) => {
    props.handleTopicWorkspaceTabChange?.(tab);
  };
  const selectCardDataSite = (site: CardDataSiteFilter) => {
    props.handleCardDataSiteChange?.(site);
  };

  if (connectionsOnly) {
    return <MqttConnectionsPanel {...props} />;
  }

  return (
    <div className="mqtt-settings-page">
      <section className="mqtt-title mgmt-page-title">
        <h1 className="mgmt-page-title__heading"><em>{operationsOnly ? "MQTT Operations" : "MQTT"}</em> {operationsOnly ? "Topic / Card Data" : "設定"}</h1>
        <p className="mgmt-page-title__subtitle">{operationsOnly ? "MQTT Operations" : "MQTT Settings"}</p>
      </section>

      {!operationsOnly ? (
        <div className="flex flex-wrap justify-end gap-3 -mt-2">
          <button
            type="button"
            className="mgmt-action mqtt-test-conn"
            disabled={viewModel.actions.testConnectionDisabled}
            onClick={() => void props.testConnection()}
          >
            {viewModel.actions.testConnectionLabel}
            <small>Test Connection</small>
          </button>
          <button
            type="button"
            className="mgmt-action primary mqtt-save"
            disabled={viewModel.actions.saveSettingsDisabled}
            onClick={() => void props.saveSettings()}
          >
            {viewModel.actions.saveSettingsLabel}
            <small>Save Settings</small>
          </button>
        </div>
      ) : null}

      {props.remoteSyncBanner}

      <section className="settings-card mgmt-interactive-card mqtt-topic-workspace" data-mqtt-section="topic-workspace">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#92a294]/20 pb-4 mb-4">
          <div className="settings-card__title">
            {connectionsOnly ? "中央 Broker" : operationsOnly ? "MQTT 維運" : "Topic 工作區"}
            <small>{connectionsOnly ? "Central Broker" : operationsOnly ? "MQTT Operations" : "Topic Workspace"}</small>
          </div>
          <div className="mqtt-workspace-tabs" role="tablist" aria-label="Topic workspace views">
            {(operationsOnly
              ? [
                  { id: "topic" as const, label: "Topic mapping", subtitle: "Mappings" },
                  { id: "card-data" as const, label: "卡片資料管理", subtitle: "Card Data" }
                ]
              : [
                  { id: "source" as const, label: "資料來源模式", subtitle: "Data Mode" },
                  { id: "topic" as const, label: "Topic mapping", subtitle: "Mappings" },
                  { id: "card-data" as const, label: "卡片資料管理", subtitle: "Card Data" }
                ]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTopicWorkspaceTab === tab.id}
                className={activeTopicWorkspaceTab === tab.id ? "active" : ""}
                data-mqtt-workspace-tab={tab.id}
                onClick={() => selectTopicWorkspaceTab(tab.id)}
              >
                {tab.label}
                <small>{tab.subtitle}</small>
              </button>
            ))}
          </div>
        </div>

        {!operationsOnly && activeTopicWorkspaceTab === "source" ? (
          <MqttSourcePanel
            brokerFields={viewModel.brokerFields}
            connStatusVariant={connStatusVariant}
            feedbackBanner={viewModel.feedbackBanner}
            handleSettingChange={props.handleSettingChange}
            modeOptions={viewModel.modeOptions}
          />
        ) : null}

        {activeTopicWorkspaceTab === "topic" ? (
          <MqttTopicPanel
            activeCardDataSite={activeCardDataSite}
            actions={viewModel.actions}
            addTopicMapping={props.addTopicMapping}
            cardDataSiteOptions={cardDataSiteOptionsForEnabledPages}
            feedbackBanner={viewModel.feedbackBanner}
            handleCardDataSiteChange={selectCardDataSite}
            handleTopicChange={props.handleTopicChange}
            handleTopicPublishDraftChange={props.handleTopicPublishDraftChange}
            highlightedTopicMetricKey={props.highlightedTopicMetricKey}
            readinessErrorMessage={props.readinessErrorMessage}
            reloadTopics={props.reloadTopics}
            removeTopicMapping={props.removeTopicMapping}
            saveTopicMappings={props.saveTopicMappings}
            topicMappingsDirty={props.topicMappingsDirty}
            topicPublishDrafts={props.topicPublishDrafts}
            topics={visibleTopicWorkspaceRows}
            topicWorkspaceSummary={viewModel.topicWorkspaceSummary}
            publishTopicValue={props.publishTopicValue}
            publishingTopicKey={props.publishingTopicKey}
            visibleCoverageRows={visibleCoverageRows}
          />
        ) : null}

        {activeTopicWorkspaceTab === "card-data" ? (
          <MqttCardDataPanel
            activeCardDataSite={activeCardDataSite}
            cardDataErrorMessage={props.cardDataErrorMessage}
            cardDataSiteOptions={cardDataSiteOptionsForEnabledPages}
            clearDisplayOverride={props.clearDisplayOverride}
            handleConfigureTopicMetric={props.handleConfigureTopicMetric}
            handleOverrideDraftChange={props.handleOverrideDraftChange}
            handleTopicPublishDraftChange={props.handleTopicPublishDraftChange}
            isLoadingCardData={props.isLoadingCardData}
            overrideDrafts={props.overrideDrafts}
            publishTopicValue={props.publishTopicValue}
            publishingTopicKey={props.publishingTopicKey}
            saveDisplayOverride={props.saveDisplayOverride}
            savingOverrideTargetId={props.savingOverrideTargetId}
            selectCardDataSite={selectCardDataSite}
            topicPublishDrafts={props.topicPublishDrafts}
            viewModel={viewModel}
            visibleCardDataRows={visibleCardDataRows}
          />
        ) : null}
      </section>

      {!operationsOnly ? (
        <MqttWeatherPanel
          copyWeatherDiagnostic={props.copyWeatherDiagnostic}
          handleWeatherSettingChange={props.handleWeatherSettingChange}
          refreshWeather={props.refreshWeather}
          toggleWeatherField={props.toggleWeatherField}
          viewModel={viewModel}
          weatherSettings={props.weatherSettings}
        />
      ) : null}
    </div>
  );
}

/**
 * 以 React.memo 包裝的 MQTT 設定主內容元件；
 * 相同 props（由 index.tsx 穩定化的 handler 與狀態）下不重繪。
 */
export const MqttSettingsContent = memo(MqttSettingsContentImpl);
