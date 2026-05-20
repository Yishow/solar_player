import type { DisplayReadinessReport } from "@solar-display/shared";
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

const PREVIEW_ICON_GLYPHS: Record<string, string> = {
  bars: "▤",
  bolt: "⚡",
  co2: "CO₂",
  leaf: "🌱",
  plug: "⌁",
  refresh: "↻",
  sun: "☀"
};

type MqttSettingsContentProps = {
  actionState: ActionState;
  addTopicMapping: () => void;
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
  topics: TopicMapping[];
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
    topics: props.topics
  });
  const connStatusVariant = resolveConnStatus(viewModel.connection.statusTone);

  return (
    <div className="mqtt-settings-page">
      <section className="mqtt-title">
        <h1>資料來源與 <em>MQTT</em> 設定</h1>
        <p>Data Source &amp; MQTT Settings</p>
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

      <section className="settings-card mqtt-mode">
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

      <section className="settings-card mqtt-topic">
        <div className="settings-card__title">即時 Topic 清單<small>Live Topic List</small></div>
        {viewModel.liveTopicRows.length === 0 ? (
          <div className="empty-block">尚未建立 topic mapping，新增後這裡會顯示 broker 的即時收值。</div>
        ) : (
          <div className="topic-list">
            {viewModel.liveTopicRows.map((topic) => (
              <div className="topic-row" key={`live-${topic.id}`}>
                <span className={`topic-row__dot ${!topic.enabled ? "is-disabled" : topic.runtimeTone === "connected" ? "" : "is-idle"}`} aria-hidden />
                <div className="topic-row__topic">{topic.topic || "未設定 topic"}</div>
                <small className="topic-row__meta">{topic.metricLabelZh} · {topic.runtimeLabel} · 最後收值 {topic.lastReceivedLabel}</small>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="settings-card mqtt-map">
        <div className="settings-card__title">Topic 對應設定<small>Topic Mapping</small></div>
        <div className="map-list">
          {viewModel.mappingRows.length === 0 ? (
            <div className="empty-block">尚未設定任何 topic mapping。</div>
          ) : (
            viewModel.mappingRows.map((topic) => (
              <div className="map-row" key={`map-${topic.id}`}>
                <label className="map-row__label">{topic.metricLabelZh}<small>{topic.metricLabelEn}</small></label>
                <div className="map-row__fields">
                  <input type="text" placeholder="topic" value={topic.topic} onChange={(event) => props.handleTopicChange(topic.id, "topic", event.target.value)} />
                  <input type="text" placeholder="unit" value={topic.unit} onChange={(event) => props.handleTopicChange(topic.id, "unit", event.target.value)} />
                </div>
                <div className="map-row__controls">
                  <label className="map-row__toggle">
                    <input type="checkbox" checked={topic.enabled} onChange={(event) => props.handleTopicChange(topic.id, "enabled", event.target.checked)} />
                    啟用 ({topic.enabledLabel})
                  </label>
                  <button type="button" className="map-row__remove" onClick={() => props.removeTopicMapping(topic.id)}>移除</button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="map-actions">
          <button type="button" className="map-add" onClick={props.addTopicMapping}>＋ 新增 mapping</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="map-add" disabled={viewModel.actions.reloadTopicsDisabled} onClick={() => void props.reloadTopics()}>{viewModel.actions.reloadTopicsLabel}</button>
            <button type="button" className="map-save" disabled={viewModel.actions.saveMappingsDisabled} onClick={() => void props.saveTopicMappings()}>{viewModel.actions.saveMappingsLabel}</button>
          </div>
        </div>
      </section>

      <section className="settings-card mqtt-preview">
        <div className="settings-card__title">即時資料預覽<small>Live Data Preview</small></div>
        <div className="mqtt-runtime-summary">
          <div className={`conn-status mqtt-runtime-status ${resolveConnStatus(viewModel.runtimePreview.statusTone)}`} role="status">
            <span className="conn-status__dot" aria-hidden />
            {viewModel.runtimePreview.statusLabel}
            <small>{viewModel.runtimePreview.statusDetail}</small>
          </div>
          {props.readinessErrorMessage ? (
            <div className="mgmt-status is-error mqtt-runtime-feedback">{props.readinessErrorMessage}</div>
          ) : viewModel.coverageRows.length > 0 ? (
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
          ) : null}
        </div>
        {viewModel.emptyState ? (
          <div className="empty-block">{viewModel.emptyState.title}<br /><span style={{ display: "inline-block", marginTop: 8, fontSize: 13 }}>{viewModel.emptyState.description}</span></div>
        ) : (
          <div className="preview-list">
            {viewModel.previewCards.map((topic) => (
              <div className="preview-row" key={`preview-${topic.id}`}>
                <div className="preview-row__header">
                  <span className={`preview-row__icon ${topic.runtimeTone === "connected" ? "is-live" : ""}`} aria-hidden>{PREVIEW_ICON_GLYPHS[topic.icon] ?? "·"}</span>
                  <label className="preview-row__label">{topic.metricLabelZh}<small>{topic.metricLabelEn}</small></label>
                </div>
                <b className="preview-row__value">{topic.valueLabel}<small>{topic.unitLabel || "--"}</small></b>
              </div>
            ))}
          </div>
        )}
        <p className="last-update">最後更新時間 {viewModel.connection.lastUpdateLabel}</p>
      </section>
    </div>
  );
}
