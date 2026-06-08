import type {
  DisplayReadinessReport,
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
import { buildMqttSettingsViewModel } from "./viewModel";
import { CustomSelect } from "../../components/management";
import { TopicWorkspaceRow } from "./TopicWorkspaceRow";


type MqttSettingsContentProps = {
  actionState: ActionState;
  addTopicMapping: () => void;
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
  handleWeatherSettingChange: <Key extends keyof WeatherSettings>(
    key: Key,
    value: WeatherSettings[Key]
  ) => void;
  lastConnectionTest: ConnectionTestFeedback;
  liveMetricsConnectionState: SocketConnectionState["status"];
  liveMetricsSnapshot: LiveMetricsSnapshot | null;
  message: string;
  readiness: DisplayReadinessReport | null;
  readinessErrorMessage: string;
  removeTopicMapping: (rowId: number) => void;
  reloadTopics: () => Promise<void>;
  remoteSyncBanner: ReactNode;
  saveSettings: () => Promise<void>;
  saveTopicMappings: () => Promise<void>;
  settings: MqttSettingsForm;
  status: MqttStatus;
  testConnection: () => Promise<void>;
  toggleWeatherField: (fieldKey: WeatherFieldKey, enabled: boolean) => void;
  topics: TopicMapping[];
  weatherOptions: WeatherOptionsResponse | null;
  weatherOptionsErrorMessage: string;
  weatherPreviewContract: WeatherHeaderContract | null;
  weatherPreviewErrorMessage: string;
  weatherSettings: WeatherSettings;
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

/**
 * MQTT 設定頁面的主內容元件
 * 負責渲染資料來源模式、Topic 工作區以及天氣設定等卡片
 *
 * @param props 元件屬性，包含 viewModel 所需資料與事件處理函式
 */
export function MqttSettingsContent(props: MqttSettingsContentProps) {
  const viewModel = buildMqttSettingsViewModel({
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
    weatherOptions: props.weatherOptions,
    weatherOptionsErrorMessage: props.weatherOptionsErrorMessage,
    weatherPreviewContract: props.weatherPreviewContract,
    weatherPreviewErrorMessage: props.weatherPreviewErrorMessage,
    weatherSettings: props.weatherSettings
  });
  const connStatusVariant = resolveConnStatus(viewModel.connection.statusTone);

  return (
    <div className="mqtt-settings-page">
      <section className="mqtt-title mgmt-page-title">
        <h1 className="mgmt-page-title__heading"><em>MQTT</em> 設定</h1>
        <p className="mgmt-page-title__subtitle">MQTT Settings</p>
      </section>

      <button type="button" className="mgmt-action mqtt-test-conn" disabled={viewModel.actions.testConnectionDisabled} onClick={() => void props.testConnection()}>
        {viewModel.actions.testConnectionLabel}
        <small>Test Connection</small>
      </button>
      <button type="button" className="mgmt-action primary mqtt-save" disabled={viewModel.actions.saveSettingsDisabled} onClick={() => void props.saveSettings()}>
        {viewModel.actions.saveSettingsLabel}
        <small>Save Settings</small>
      </button>

      {props.remoteSyncBanner}

      <section className="settings-card mgmt-interactive-card mqtt-mode">
        <div className="settings-card__title">資料來源模式<small>Data Mode</small></div>
        <div className="seg" role="tablist">
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
        <div className={`conn-status ${connStatusVariant}`} role="status">
          <span className="conn-status__dot" aria-hidden />
          {viewModel.feedbackBanner.title}
          <small>{viewModel.feedbackBanner.detail}</small>
        </div>
      </section>

      <section className="settings-card mgmt-interactive-card mqtt-topic-workspace" data-mqtt-section="topic-workspace">
        <div className="settings-card__title">Topic 工作區<small>Topic Workspace</small></div>
        <div className="mqtt-runtime-summary">
          <div className={`conn-status mqtt-runtime-status ${resolveConnStatus(viewModel.topicWorkspaceSummary.runtimeStatusTone)}`} role="status">
            <span className="conn-status__dot" aria-hidden />
            {viewModel.topicWorkspaceSummary.runtimeStatusLabel}
            <small>{viewModel.topicWorkspaceSummary.runtimeStatusDetail}</small>
          </div>
          {props.readinessErrorMessage ? (
            <div className="mgmt-status is-error mqtt-runtime-feedback">{props.readinessErrorMessage}</div>
          ) : viewModel.coverageRows.length > 0 ? (
            <details className="mqtt-coverage-details">
              <summary className="mqtt-coverage-summary-toggle">
                <span>播放器指標覆蓋狀況 (Coverage Findings)</span>
                <span className="coverage-badge-count">{viewModel.topicWorkspaceSummary.coverageCount}</span>
              </summary>
              <div className="mqtt-runtime-feedback">
                {viewModel.coverageRows.slice(0, 3).map((row) => (
                  <div key={`${row.pageId}-${row.requirementKey}`} className="mqtt-runtime-feedback__row">
                    <span className={resolveCoverageChipClass(row.stateLabel)}>{row.stateLabel}</span>
                    <div className="mqtt-runtime-feedback__copy">
                      <strong>{row.metricLabelZh}</strong>
                      <small>{row.detail}</small>
                    </div>
                  </div>
                ))}
                {viewModel.coverageRows.length > 3 ? (
                  <p className="mqtt-runtime-feedback__more">另有 {viewModel.coverageRows.length - 3} 項 coverage finding，請完成 topic mapping 或等待首筆收值。</p>
                ) : null}
              </div>
            </details>
          ) : null}
        </div>
        {viewModel.topicWorkspaceRows.length === 0 ? (
          <div className="empty-block">尚未設定任何 topic mapping。<br /><span style={{ display: "inline-block", marginTop: 8, fontSize: 13 }}>新增後即可在同一張卡內直接查看 runtime 狀態、coverage 與編輯欄位。</span></div>
        ) : (
          <div className="topic-workspace-list">
            {viewModel.topicWorkspaceRows.map((topic) => (
              <TopicWorkspaceRow
                key={`workspace-${topic.id}`}
                topic={topic}
                handleTopicChange={props.handleTopicChange}
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
      </section>

      <section className="settings-card mgmt-interactive-card mqtt-weather-card" data-mqtt-section="weather-card">
        <div className="settings-card__title">天氣設定<small>Weather Settings</small></div>
        {viewModel.weatherCard.configFeedback ? (
          <div className="mgmt-status mqtt-weather-card__config-notice">{viewModel.weatherCard.configFeedback}</div>
        ) : null}
        <div className="mqtt-weather-card__controls">
          <label className="map-row__toggle mqtt-weather-card__toggle">
            <input
              type="checkbox"
              checked={viewModel.weatherCard.enabled}
              onChange={(event) => props.handleWeatherSettingChange("enabled", event.target.checked)}
            />
            啟用天氣顯示
          </label>

          <label className="text-field mqtt-weather-card__field">
            <span className="field-label">定位方式</span>
            <CustomSelect
              value={viewModel.weatherCard.locationMode}
              onChange={(value) => props.handleWeatherSettingChange("locationMode", value as WeatherSettings["locationMode"])}
              options={viewModel.weatherCard.locationOptions}
            />
          </label>

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

          <div className="mqtt-weather-card__preset-group">
            <span className="field-label">Preset</span>
            <div className="seg mqtt-weather-card__presets" role="tablist">
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

        <div className="mqtt-weather-card__preview">
          <strong>Header Preview</strong>
          <p>{viewModel.weatherCard.preview.primaryText}</p>
          {viewModel.weatherCard.preview.secondaryText ? (
            <small>{viewModel.weatherCard.preview.secondaryText}</small>
          ) : null}
        </div>

        {viewModel.weatherCard.previewFeedback ? (
          <div className="mgmt-status is-error mqtt-weather-card__feedback">{viewModel.weatherCard.previewFeedback}</div>
        ) : null}
      </section>
    </div>
  );
}
