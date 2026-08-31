import type {
  DisplayCardDataAction,
  DisplayCardDataRow,
  DerivedMetricDependencyIdentity,
  DisplayReadinessReport,
  WeatherDiagnostic,
  WeatherFieldKey,
  WeatherHeaderContract,
  WeatherOptionsResponse,
  WeatherSettings
} from "@solar-display/shared";
import { memo, useMemo } from "react";
import type { ReactNode } from "react";
import type { LiveMetricsSnapshot, SocketConnectionState } from "../../services/socket";
import type {
  ActionState,
  ConnectionTestFeedback,
  MqttSettingsForm,
  MqttStatus,
  TopicMapping
} from "./viewModel";
import { ConnectionsView } from "../DataHub/Connections/ConnectionsView";
import { buildMqttScopedMetricKey, buildMqttSettingsViewModel } from "./viewModel";
import { CustomSelect } from "../../components/management";
import { TopicWorkspaceRow } from "./TopicWorkspaceRow";
import {
  factoryTopicSiteOptions,
  isTopicMetricVisibleForFactorySite,
  type FactoryTopicSite
} from "./factoryTopicSites";

export type TopicWorkspaceTab = "source" | "topic" | "card-data";
export type CardDataSiteFilter = FactoryTopicSite;

type MqttSettingsContentProps = {
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
  handleOverrideDraftChange?: (targetId: string, metricScope: DisplayCardDataRow["metricScope"], value: string) => void;
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
  publishTopicValue?: (metricScope: DisplayCardDataRow["metricScope"], metricKey: string, value: number) => Promise<void>;
  publishingTopicKey?: string | null;
  clearDisplayOverride?: (targetId: string, metricScope: DisplayCardDataRow["metricScope"]) => Promise<void>;
  reloadTopics: () => Promise<void>;
  remoteSyncBanner: ReactNode;
  saveSettings: () => Promise<void>;
  saveDisplayOverride?: (targetId: string, metricScope: DisplayCardDataRow["metricScope"], value: number) => Promise<void>;
  saveTopicMappings: () => Promise<void>;
  savingOverrideTargetId?: string | null;
  settings: MqttSettingsForm;
  status: MqttStatus;
  surface?: "full" | "connections" | "operations";
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

function resolveConnStatus(statusTone: "connected" | "connecting" | "disconnected") {
  if (statusTone === "connected") return "is-connected";
  if (statusTone === "disconnected") return "is-error";
  return "is-warning";
}

function resolveCoverageChipClass(stateLabel: string) {
  if (stateLabel === "Ready") return "mgmt-chip is-success";
  if (stateLabel === "Mapping Gap") return "mgmt-chip is-danger";
  if (stateLabel === "Idle Runtime") return "mgmt-chip is-warning";
  return "mgmt-chip";
}

function resolveCardDataPageLabel(pageId: string) {
  if (pageId === "factory-circuit") return "Factory Circuit";
  if (pageId === "factory-circuit-guanyin") return "Factory Circuit (Guanyin)";
  if (pageId === "overview") return "Overview";
  if (pageId === "solar") return "Solar";
  if (pageId === "sustainability") return "Sustainability";
  return pageId;
}

function isCardDataRowVisibleForSite(row: DisplayCardDataRow, site: CardDataSiteFilter) {
  if (row.pageId === "factory-circuit") return site === "jungli";
  if (row.pageId === "factory-circuit-guanyin") return site === "guanyin";
  return true;
}

function resolveCardDataStatusClass(status: string) {
  if (status === "ready") return "mgmt-chip is-success";
  if (status === "missing-topic" || status === "formula-input-missing") return "mgmt-chip is-danger";
  if (status === "overridden") return "mgmt-chip is-success";
  return "mgmt-chip is-warning";
}

function formatDerivedProvenance(dependencies: DerivedMetricDependencyIdentity[]): string {
  const entries: string[] = [];
  const visit = (dependency: DerivedMetricDependencyIdentity) => {
    entries.push(
      dependency.kind === "metric"
        ? `${dependency.metricScope ?? "?"}/${dependency.metricKey ?? dependency.alias}${dependency.sourceTopic ? `=${dependency.sourceTopic}` : ""}`
        : `setting/${dependency.settingKey ?? dependency.alias}@${dependency.settingRevision ?? "?"}`
    );
    dependency.upstream?.forEach(visit);
  };
  dependencies.forEach(visit);
  return entries.join(" → ");
}

function isPublishAction(
  action: DisplayCardDataAction
): action is DisplayCardDataAction & { metricKey: string; type: "publish-test-value" } {
  return action.type === "publish-test-value" && "metricKey" in action;
}

function isConfigureTopicAction(
  action: DisplayCardDataAction
): action is DisplayCardDataAction & { metricKey: string; type: "configure-topic" } {
  return action.type === "configure-topic" && "metricKey" in action;
}

function isCalculationAction(
  action: DisplayCardDataAction
): action is Extract<DisplayCardDataAction, { type: "edit-calculation-settings" }> {
  return action.type === "edit-calculation-settings";
}

/**
 * MQTT 設定頁面的主內容元件
 * 負責渲染資料來源模式、Topic 工作區以及天氣設定等卡片
 *
 * @param props 元件屬性，包含 viewModel 所需資料與事件處理函式
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
    return (
      <ConnectionsView
        settings={props.settings}
        status={props.status}
        lastConnectionTest={props.lastConnectionTest}
        isTesting={props.actionState.isTestingConnection}
        isSaving={props.actionState.isSavingSettings}
        isDirty={props.draftSections?.broker ?? false}
        message={props.message}
        errorMessage={props.errorMessage}
        remoteSyncBanner={props.remoteSyncBanner}
        onChange={props.handleSettingChange}
        onTestConnection={props.testConnection}
        onSaveSettings={props.saveSettings}
      />
    );
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
          {!connectionsOnly ? (
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
          ) : null}
        </div>

        {!operationsOnly && activeTopicWorkspaceTab === "source" ? (
          <div className="mqtt-workspace-panel mqtt-source-panel">
            {viewModel.feedbackBanner.detail ? (
              <div className={`mgmt-status mqtt-workspace-status is-${viewModel.feedbackBanner.visualTone}`}>
                {viewModel.feedbackBanner.detail}
              </div>
            ) : null}

            <div className="seg mqtt-mode-seg" role="tablist">
              {viewModel.modeOptions.map((option) => (
                <button key={option.value} type="button" role="tab" aria-selected={option.isActive} className={option.isActive ? "active" : ""} onClick={() => props.handleSettingChange("dataMode", option.value)}>
                  {option.label}
                </button>
              ))}
            </div>
            <div className="broker-fields">
              {viewModel.brokerFields.map((field) => (
                <label key={field.key} className="text-field">
                  <span className="field-label">{field.label}</span>
                  <input type={field.type} disabled={field.disabled} inputMode={field.inputMode === "numeric" ? "numeric" : undefined} value={field.value} onChange={(event) => props.handleSettingChange(field.key as keyof MqttSettingsForm, event.target.value as MqttSettingsForm[keyof MqttSettingsForm])} />
                </label>
              ))}
            </div>
            <div className={`conn-status mqtt-source-status ${connStatusVariant}`} role="status">
              <span className="conn-status__dot" aria-hidden />
              {viewModel.feedbackBanner.title}
              <small>{viewModel.feedbackBanner.detail}</small>
            </div>
          </div>
        ) : null}

        {!connectionsOnly && activeTopicWorkspaceTab === "topic" ? (
          <div className="mqtt-workspace-panel mqtt-topic-panel">
            <div className="mqtt-topic-toolbar">
              {viewModel.feedbackBanner.detail ? (
                <div className={`mgmt-status mqtt-workspace-status is-${viewModel.feedbackBanner.visualTone}`}>
                  {viewModel.feedbackBanner.detail}
                </div>
              ) : null}
              {cardDataSiteOptionsForEnabledPages.length > 1 ? (
                <div className="mqtt-card-data-site-toggle" role="tablist" aria-label="Topic mapping 廠區">
                  {cardDataSiteOptionsForEnabledPages.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={activeCardDataSite === option.value}
                      className={activeCardDataSite === option.value ? "active" : ""}
                      data-mqtt-topic-site-toggle={option.value}
                      onClick={() => selectCardDataSite(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mqtt-runtime-summary">
              <div className={`conn-status mqtt-runtime-status ${resolveConnStatus(viewModel.topicWorkspaceSummary.runtimeStatusTone)}`} role="status">
                <span className="conn-status__dot" aria-hidden />
                {viewModel.topicWorkspaceSummary.runtimeStatusLabel}
                <small>{viewModel.topicWorkspaceSummary.runtimeStatusDetail}</small>
              </div>
              {props.readinessErrorMessage ? (
                <div className="mgmt-status is-error mqtt-runtime-feedback">{props.readinessErrorMessage}</div>
              ) : visibleCoverageRows.length > 0 ? (
                <details className="mqtt-coverage-details">
                  <summary className="mqtt-coverage-summary-toggle">
                    <span>播放器指標覆蓋狀況 (Coverage Findings)</span>
                    <span className="coverage-badge-count">{visibleCoverageRows.length}</span>
                  </summary>
                  <div className="mqtt-runtime-feedback">
                    {visibleCoverageRows.slice(0, 3).map((row) => (
                      <div key={`${row.pageId}-${row.requirementKey}`} className="mqtt-runtime-feedback__row">
                        <span className={resolveCoverageChipClass(row.stateLabel)}>{row.stateLabel}</span>
                        <div className="mqtt-runtime-feedback__copy">
                          <strong>{row.metricLabelZh}</strong>
                          <small>{row.detail}</small>
                        </div>
                      </div>
                    ))}
                    {visibleCoverageRows.length > 3 ? (
                      <p className="mqtt-runtime-feedback__more">另有 {visibleCoverageRows.length - 3} 項 coverage finding，請完成 topic mapping 或等待首筆收值。</p>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </div>
            {visibleTopicWorkspaceRows.length === 0 ? (
              <div className="empty-block">尚未設定任何 topic mapping。<br /><span style={{ display: "inline-block", marginTop: 8, fontSize: 13 }}>新增後即可在同一張卡內直接查看 runtime 狀態、coverage 與編輯欄位。</span></div>
            ) : (
              <div className="topic-workspace-list">
                {visibleTopicWorkspaceRows.map((topic) => (
                  <TopicWorkspaceRow
                    key={`workspace-${topic.id}`}
                    topic={topic}
                    handleTopicChange={props.handleTopicChange}
                    handleTopicPublishDraftChange={props.handleTopicPublishDraftChange}
                    hasUnsavedChanges={props.topicMappingsDirty}
                    highlighted={props.highlightedTopicMetricKey === topic.metricKey}
                    publishDraftValue={props.topicPublishDrafts?.[buildMqttScopedMetricKey(topic.metricScope, topic.metricKey)] ?? ""}
                    publishTopicValue={props.publishTopicValue}
                    publishingTopicKey={props.publishingTopicKey ?? null}
                    removeTopicMapping={props.removeTopicMapping}
                  />
                ))}
              </div>
            )}
            <div className="map-actions">
              <button type="button" className="map-add" onClick={props.addTopicMapping}>＋ 新增 mapping</button>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="map-add" disabled={viewModel.actions.reloadTopicsDisabled} onClick={() => void props.reloadTopics()}>{viewModel.actions.reloadTopicsLabel}</button>
                <button type="button" className="map-save" disabled={viewModel.actions.saveMappingsDisabled} onClick={() => void props.saveTopicMappings()}>{viewModel.actions.saveMappingsLabel}</button>
              </div>
            </div>
          </div>
        ) : null}

        {!connectionsOnly && activeTopicWorkspaceTab === "card-data" ? (
          <div className="mqtt-workspace-panel mqtt-card-data-panel">
            <div className="mqtt-card-data-toolbar">
              {viewModel.feedbackBanner.detail ? (
                <div className={`mgmt-status mqtt-workspace-status is-${viewModel.feedbackBanner.visualTone}`}>
                  {viewModel.feedbackBanner.detail}
                </div>
              ) : null}
              {cardDataSiteOptionsForEnabledPages.length > 1 ? (
                <div className="mqtt-card-data-site-toggle" role="tablist" aria-label="卡片資料廠區">
                  {cardDataSiteOptionsForEnabledPages.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={activeCardDataSite === option.value}
                      className={activeCardDataSite === option.value ? "active" : ""}
                      data-mqtt-card-data-site-toggle={option.value}
                      onClick={() => selectCardDataSite(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {props.cardDataErrorMessage ? (
              <div className="mgmt-status is-error mqtt-card-data-feedback">{props.cardDataErrorMessage}</div>
            ) : null}
            {props.isLoadingCardData ? (
              <div className="empty-block">正在載入卡片資料診斷...</div>
            ) : visibleCardDataRows.length === 0 ? (
              <div className="empty-block">
                尚未取得卡片資料診斷。<br />
                <span style={{ display: "inline-block", marginTop: 8, fontSize: 13 }}>切換到此分頁後會列出卡片來源、缺值原因與展示覆寫。</span>
              </div>
            ) : (
              <div className="mqtt-card-data-list">
                {visibleCardDataRows.map((row) => {
                  const rowKey = `${row.metricScope}:${row.cardId}`;
                  const publishActions = row.actions.filter(isPublishAction);
                  const configureActions = row.actions.filter(isConfigureTopicAction);
                  const calculationActions = row.actions.filter(isCalculationAction);
                  const canSetOverride = row.actions.some((action) => action.type === "set-display-override");
                  const overrideDraftValue = props.overrideDrafts?.[rowKey] ?? "";
                  const trimmedOverrideValue = overrideDraftValue.trim();
                  const numericOverrideValue = Number(trimmedOverrideValue);
                  const overrideInputInvalid =
                    trimmedOverrideValue !== "" && !Number.isFinite(numericOverrideValue);
                  const canSaveOverride =
                    trimmedOverrideValue !== "" &&
                    Number.isFinite(numericOverrideValue) &&
                    props.savingOverrideTargetId !== rowKey &&
                    Boolean(props.saveDisplayOverride);
                  const canClearOverride =
                    Boolean(row.override) &&
                    props.savingOverrideTargetId !== rowKey &&
                    Boolean(props.clearDisplayOverride);

                  return (
                  <article
                    key={rowKey}
                    className="mqtt-card-data-row mgmt-interactive-card"
                    data-mqtt-card-data-row={row.cardId}
                    data-mqtt-card-data-row-key={rowKey}
                  >
                    <div className="mqtt-card-data-row__header">
                      <div className="mqtt-card-data-row__title">
                        <span className={resolveCardDataStatusClass(row.status)}>{row.status}</span>
                        <strong>{resolveCardDataPageLabel(row.pageId)} · {row.label}</strong>
                        <small>{row.metricKey}</small>
                      </div>
                      <div className="mqtt-card-data-row__value">
                        <b>{row.displayValue}</b>
                        <small>{row.unit}</small>
                        {row.override ? (
                          <span data-mqtt-card-override-state={row.override.active ? "active" : "inactive"}>
                            {row.override.active ? "展示覆寫" : "覆寫停用"} · 原始 {row.originalValue ?? "--"} {row.unit}
                          </span>
                        ) : row.status === "overridden" ? (
                          <span>原始 {row.originalValue ?? "--"} {row.unit}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mqtt-card-data-row__meta">
                      <span>來源：{row.sourceClassification}</span>
                      {row.aggregateSource ? <span>聚合：{row.aggregateSource}</span> : null}
                      {row.formula ? <span>公式：{row.formula}</span> : null}
                      {row.derivedMetric ? (
                        <span>
                          Registry r{row.derivedMetric.definitionRevision} · {row.derivedMetric.effectiveOutputScope} · {row.derivedMetric.evaluation?.status ?? "unavailable"} · {row.derivedMetric.evaluation?.freshnessState ?? "unavailable"}
                        </span>
                      ) : null}
                      {row.lastUpdatedAt ? <span>更新：{row.lastUpdatedAt}</span> : null}
                    </div>
                    <div className="mqtt-card-data-row__sources">
                      <div>
                        <span className="field-label">MQTT 主題</span>
                        <p>{row.sourceTopics.length > 0 ? row.sourceTopics.map((topic) => `${topic.metricKey}=${topic.topic}`).join(", ") : "--"}</p>
                      </div>
                      <div>
                        <span className="field-label">依賴指標</span>
                        <p>{row.dependencies.length > 0 ? row.dependencies.map((dependency) => `${dependency.metricKey}${dependency.topic ? `=${dependency.topic}` : ""}`).join(", ") : "--"}</p>
                      </div>
                      <div>
                        <span className="field-label">計算欄位</span>
                        <p>{row.calculationFields.length > 0 ? row.calculationFields.join(", ") : "--"}</p>
                      </div>
                      {row.derivedMetric ? (
                        <div>
                          <span className="field-label">註冊庫追溯 (Registry Provenance)</span>
                          <p>{formatDerivedProvenance(row.derivedMetric.provenance) || "--"}</p>
                        </div>
                      ) : null}
                    </div>
                    <div className="mqtt-card-data-row__actions">
                      {canSetOverride ? (
                        <div
                          className="mqtt-card-data-row__override"
                          data-mqtt-card-override-row={row.cardId}
                          data-mqtt-card-override-row-key={rowKey}
                          data-mqtt-card-override-invalid={overrideInputInvalid ? "true" : "false"}
                          title="只改播放頁顯示值，不寫回 MQTT 或歷史資料"
                        >
                          <label className="input-group topic-workspace-row__publish-input">
                            <span className="input-prefix">只改展示值</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              placeholder={row.originalValue ?? row.displayValue}
                              title="只改播放頁顯示值，不寫回 MQTT 或歷史資料"
                              value={overrideDraftValue}
                              onChange={(event) => props.handleOverrideDraftChange?.(row.cardId, row.metricScope, event.target.value)}
                            />
                          </label>
                          <button
                            type="button"
                            className="map-row__publish"
                            disabled={!canSaveOverride}
                            title="只改播放頁顯示值，不寫回 MQTT 或歷史資料"
                            onClick={() => {
                              if (!canSaveOverride || !props.saveDisplayOverride) return;
                              void props.saveDisplayOverride(row.cardId, row.metricScope, numericOverrideValue);
                            }}
                          >
                            {props.savingOverrideTargetId === rowKey ? "套用中..." : "套用展示值"}
                          </button>
                          <button
                            type="button"
                            className="map-add"
                            disabled={!canClearOverride}
                            title="清除展示覆寫，恢復原始資料顯示"
                            onClick={() => {
                              if (!canClearOverride || !props.clearDisplayOverride) return;
                              void props.clearDisplayOverride(row.cardId, row.metricScope);
                            }}
                          >
                            清除覆寫
                          </button>
                          {overrideInputInvalid ? <small>請輸入數字</small> : null}
                        </div>
                      ) : null}
                      {publishActions.map((action) => {
                        const scopedKey = buildMqttScopedMetricKey(action.metricScope, action.metricKey);
                        const draftValue = props.topicPublishDrafts?.[scopedKey] ?? "";
                        const trimmedValue = draftValue.trim();
                        const numericValue = Number(trimmedValue);
                        const canPublish =
                          trimmedValue !== "" &&
                          Number.isFinite(numericValue) &&
                          props.publishingTopicKey !== scopedKey &&
                          Boolean(props.publishTopicValue);

                        return (
                          <div
                            key={`publish-${action.metricKey}`}
                            className="mqtt-card-data-row__publish"
                            data-mqtt-card-publish-row={action.metricKey}
                            data-mqtt-card-publish-disabled={canPublish ? "false" : "true"}
                            title="發佈數字到此 metric 對應的 MQTT topic，會走真實資料流程"
                          >
                            <label className="input-group topic-workspace-row__publish-input">
                              <span className="input-prefix">發佈到 MQTT</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                placeholder="輸入要發佈的 MQTT 數值"
                                title="發佈數字到此 metric 對應的 MQTT topic，會走真實資料流程"
                                value={draftValue}
                                onChange={(event) => props.handleTopicPublishDraftChange?.(action.metricScope, action.metricKey, event.target.value)}
                              />
                            </label>
                            <button
                              type="button"
                              className="map-row__publish"
                              disabled={!canPublish}
                              title="發佈數字到此 metric 對應的 MQTT topic，會走真實資料流程"
                              onClick={() => {
                                if (!canPublish || !props.publishTopicValue) return;
                                void props.publishTopicValue(action.metricScope, action.metricKey, numericValue);
                              }}
                            >
                              {props.publishingTopicKey === scopedKey ? "發佈中..." : "發佈到 MQTT"}
                            </button>
                          </div>
                        );
                      })}
                      {configureActions.map((action) => (
                        <button
                          key={`configure-${action.metricKey}`}
                          type="button"
                          className="map-add"
                          data-mqtt-card-configure-topic={action.metricKey}
                          onClick={() => props.handleConfigureTopicMetric?.(action.metricKey)}
                        >
                          設定 Topic：{action.metricKey}
                        </button>
                      ))}
                      {calculationActions.flatMap((action) =>
                        action.fields.map((field) => (
                          <span key={`calc-${field}`} className="mgmt-chip" data-mqtt-card-calculation-field={field}>
                            {field}
                          </span>
                        ))
                      )}
                    </div>
                  </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </section>

      {!connectionsOnly && !operationsOnly ? <section className="settings-card mgmt-interactive-card mqtt-weather-card" data-mqtt-section="weather-card">
        <div className="settings-card__title">天氣設定<small>Weather Settings</small></div>
        <div className="mqtt-weather-card__header-actions">
          <div className="seg mqtt-weather-card__presets" role="tablist" aria-label="Preset">
            {viewModel.weatherCard.presetOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={viewModel.weatherCard.preset === option.value}
                className={viewModel.weatherCard.preset === option.value ? "active" : ""}
                onClick={() => props.handleWeatherSettingChange("preset", option.value as WeatherSettings["preset"])}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mqtt-weather-card__refresh-btn"
            disabled={viewModel.actions.refreshWeatherDisabled}
            onClick={() => void props.refreshWeather()}
          >
            {viewModel.actions.refreshWeatherLabel}
          </button>
        </div>
        <div className="mqtt-weather-card__body">
          {viewModel.weatherCard.configFeedback ? (
            <div className="mgmt-status mqtt-weather-card__config-notice">{viewModel.weatherCard.configFeedback}</div>
          ) : null}
          <div
            className={`mqtt-weather-diagnostic ${viewModel.weatherCard.diagnostic.tone === "error" ? "is-error" : viewModel.weatherCard.diagnostic.tone === "warning" ? "is-warning" : ""}`}
            data-weather-diagnostic-source={viewModel.weatherCard.diagnostic.source}
            data-weather-diagnostic-stage={viewModel.weatherCard.diagnostic.stage}
            data-weather-diagnostic-state={viewModel.weatherCard.diagnostic.state}
          >
            <div className="mqtt-weather-diagnostic__header">
              <div>
                <strong>最近一次天氣資料診斷</strong>
                <small>{viewModel.weatherCard.diagnostic.stateLabel}</small>
              </div>
              <button
                type="button"
                className="map-add"
                data-weather-diagnostic-copy
                onClick={() => void props.copyWeatherDiagnostic?.(viewModel.weatherCard.diagnostic.copyText)}
              >
                複製診斷
              </button>
            </div>
            <p>{viewModel.weatherCard.diagnostic.safeSummary}</p>
            <dl className="mqtt-weather-diagnostic__details">
              <div><dt>錯誤碼</dt><dd>{viewModel.weatherCard.diagnostic.code ?? "—"}</dd></div>
              <div><dt>來源</dt><dd>{viewModel.weatherCard.diagnostic.sourceLabel}</dd></div>
              {viewModel.weatherCard.diagnostic.stageLabel ? (
                <div><dt>階段</dt><dd>{viewModel.weatherCard.diagnostic.stageLabel}</dd></div>
              ) : null}
              <div><dt>操作</dt><dd>{viewModel.weatherCard.diagnostic.operationLabel}</dd></div>
              <div><dt>發生時間</dt><dd>{viewModel.weatherCard.diagnostic.occurredAtLabel}</dd></div>
              <div><dt>上次成功</dt><dd>{viewModel.weatherCard.diagnostic.lastSuccessAtLabel}</dd></div>
              <div><dt>重試</dt><dd>{viewModel.weatherCard.diagnostic.retryableLabel}</dd></div>
              {viewModel.weatherCard.diagnostic.httpStatusLabel ? (
                <div><dt>HTTP</dt><dd>{viewModel.weatherCard.diagnostic.httpStatusLabel}</dd></div>
              ) : null}
            </dl>
          </div>
          <div className="mqtt-weather-card__controls">
            <label className="map-row__toggle mqtt-weather-card__toggle">
              <input
                type="checkbox"
                checked={viewModel.weatherCard.enabled}
                onChange={(event) => props.handleWeatherSettingChange("enabled", event.target.checked)}
              />
              啟用天氣顯示
            </label>

            <div className="mqtt-weather-card__field-row">
              <label className="text-field mqtt-weather-card__field">
                <span className="field-label">定位方式</span>
                <CustomSelect
                  value={viewModel.weatherCard.locationMode}
                  onChange={(value) => props.handleWeatherSettingChange("locationMode", value as WeatherSettings["locationMode"])}
                  options={viewModel.weatherCard.locationOptions}
                />
              </label>

              <label className="text-field mqtt-weather-card__field">
                <span className="field-label">更新頻率</span>
                <CustomSelect
                  value={String(props.weatherSettings.updateIntervalMinutes ?? 30)}
                  onChange={(value) => props.handleWeatherSettingChange("updateIntervalMinutes", Number(value))}
                  options={[
                    { label: "10 分鐘", value: "10" },
                    { label: "30 分鐘", value: "30" },
                    { label: "1 小時", value: "60" },
                    { label: "3 小時", value: "180" },
                    { label: "6 小時", value: "360" },
                    { label: "12 小時", value: "720" },
                    { label: "手動更新", value: "0" }
                  ]}
                />
              </label>
            </div>

            <div className="mqtt-weather-card__field-row">
              <label className="text-field mqtt-weather-card__field">
                <span className="field-label">縣市</span>
                <CustomSelect
                  value={props.weatherSettings.countyName ?? ""}
                  onChange={(value) => props.handleWeatherSettingChange("countyName", value || null)}
                  options={[
                    { label: "請選擇縣市", value: "" },
                    ...viewModel.weatherCard.countyOptions.map((county) => ({
                      label: county,
                      value: county
                    }))
                  ]}
                />
              </label>

              {viewModel.weatherCard.locationMode === "station" ? (
                <label className="text-field mqtt-weather-card__field">
                  <span className="field-label">測站</span>
                  <CustomSelect
                    value={props.weatherSettings.stationId ?? ""}
                    onChange={(value) => props.handleWeatherSettingChange("stationId", value || null)}
                    options={[
                      { label: "請選擇測站", value: "" },
                      ...viewModel.weatherCard.stationOptions.map((station) => ({
                        label: station.stationName,
                        value: station.stationId
                      }))
                    ]}
                  />
                </label>
              ) : null}
            </div>

            {viewModel.weatherCard.customFieldOptions.length > 0 ? (
              <div className="mqtt-weather-card__custom-fields">
                <span className="field-label">自訂欄位</span>
                <div className="mqtt-weather-card__custom-grid">
                  {viewModel.weatherCard.customFieldOptions.map((option) => (
                    <label key={option.value} className="map-row__toggle">
                      <input
                        type="checkbox"
                        checked={option.checked}
                        onChange={(event) => props.toggleWeatherField(option.value, event.target.checked)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {viewModel.weatherCard.stationFeedback ? (
            <div className="mgmt-status is-error mqtt-weather-card__feedback">{viewModel.weatherCard.stationFeedback}</div>
          ) : null}
          {viewModel.weatherCard.localValidationFeedback ? (
            <div className="mgmt-status is-error mqtt-weather-card__feedback">
              {viewModel.weatherCard.localValidationFeedback}
            </div>
          ) : null}
        </div>

        <div className="mqtt-weather-card__preview">
          <div style={{ marginBottom: 8 }}>
            <strong>Header Preview</strong>
          </div>
          <p>{viewModel.weatherCard.preview.primaryText}</p>
          {viewModel.weatherCard.preview.secondaryText ? (
            <small>{viewModel.weatherCard.preview.secondaryText}</small>
          ) : null}
        </div>

        {viewModel.weatherCard.previewFeedback ? (
          <div className="mgmt-status is-error mqtt-weather-card__feedback">{viewModel.weatherCard.previewFeedback}</div>
        ) : null}
      </section> : null}
    </div>
  );
}

/**
 * 以 React.memo 包裝的 MQTT 設定主內容元件；
 * 相同 props（由 index.tsx 穩定化的 handler 與狀態）下不重繪。
 */
export const MqttSettingsContent = memo(MqttSettingsContentImpl);
