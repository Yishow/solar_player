import { TopicWorkspaceRow } from "./TopicWorkspaceRow";
import { buildMqttScopedMetricKey } from "./viewModel";
import type { MqttSettingsContentProps, CardDataSiteFilter } from "./MqttSettingsContent.types";
import type { MqttSettingsViewModel } from "./MqttSettingsViewHelpers";
import {
  resolveCoverageChipClass,
  resolveConnStatus
} from "./MqttSettingsViewHelpers";
import { factoryTopicSiteOptions } from "./factoryTopicSites";

type MqttTopicPanelProps = {
  activeCardDataSite: CardDataSiteFilter;
  actions: Pick<
    MqttSettingsViewModel["actions"],
    "reloadTopicsDisabled" | "reloadTopicsLabel" | "saveMappingsDisabled" | "saveMappingsLabel"
  >;
  addTopicMapping: MqttSettingsContentProps["addTopicMapping"];
  cardDataSiteOptions: typeof factoryTopicSiteOptions;
  feedbackBanner: MqttSettingsViewModel["feedbackBanner"];
  handleCardDataSiteChange?: MqttSettingsContentProps["handleCardDataSiteChange"];
  handleTopicChange: MqttSettingsContentProps["handleTopicChange"];
  handleTopicPublishDraftChange?: MqttSettingsContentProps["handleTopicPublishDraftChange"];
  highlightedTopicMetricKey?: string | null;
  readinessErrorMessage: string;
  reloadTopics: MqttSettingsContentProps["reloadTopics"];
  removeTopicMapping: MqttSettingsContentProps["removeTopicMapping"];
  saveTopicMappings: MqttSettingsContentProps["saveTopicMappings"];
  topicMappingsDirty?: boolean;
  topicPublishDrafts?: Record<string, string>;
  topics: MqttSettingsViewModel["topicWorkspaceRows"];
  topicWorkspaceSummary: MqttSettingsViewModel["topicWorkspaceSummary"];
  publishTopicValue: MqttSettingsContentProps["publishTopicValue"];
  publishingTopicKey?: string | null;
  visibleCoverageRows: MqttSettingsViewModel["coverageRows"];
};

export function MqttTopicPanel(props: MqttTopicPanelProps) {
  const {
    activeCardDataSite,
    cardDataSiteOptions,
    feedbackBanner,
    actions,
    addTopicMapping,
    handleCardDataSiteChange,
    handleTopicChange,
    handleTopicPublishDraftChange,
    highlightedTopicMetricKey,
    readinessErrorMessage,
    removeTopicMapping,
    topicMappingsDirty,
    topicPublishDrafts,
    topics,
    topicWorkspaceSummary,
    publishTopicValue,
    publishingTopicKey,
    visibleCoverageRows
  } = props;
  return (
    <div className="mqtt-workspace-panel mqtt-topic-panel">
      <div className="mqtt-topic-toolbar">
        {feedbackBanner.detail ? (
          <div className={`mgmt-status mqtt-workspace-status is-${feedbackBanner.visualTone}`}>
            {feedbackBanner.detail}
          </div>
        ) : null}
        {cardDataSiteOptions.length > 1 ? (
          <div className="mqtt-card-data-site-toggle" role="tablist" aria-label="Topic mapping 廠區">
            {cardDataSiteOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={activeCardDataSite === option.value}
                className={activeCardDataSite === option.value ? "active" : ""}
                data-mqtt-topic-site-toggle={option.value}
                onClick={() => handleCardDataSiteChange?.(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mqtt-runtime-summary">
        <div className={`conn-status mqtt-runtime-status ${resolveConnStatus(topicWorkspaceSummary.runtimeStatusTone)}`} role="status">
          <span className="conn-status__dot" aria-hidden />
          {topicWorkspaceSummary.runtimeStatusLabel}
          <small>{topicWorkspaceSummary.runtimeStatusDetail}</small>
        </div>
        {readinessErrorMessage ? (
          <div className="mgmt-status is-error mqtt-runtime-feedback">{readinessErrorMessage}</div>
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
      {topics.length === 0 ? (
        <div className="empty-block">尚未設定任何 topic mapping。<br /><span style={{ display: "inline-block", marginTop: 8, fontSize: 13 }}>新增後即可在同一張卡內直接查看 runtime 狀態、coverage 與編輯欄位。</span></div>
      ) : (
        <div className="topic-workspace-list">
          {topics.map((topic) => (
            <TopicWorkspaceRow
              key={`workspace-${topic.id}`}
              topic={topic}
              handleTopicChange={handleTopicChange}
              handleTopicPublishDraftChange={handleTopicPublishDraftChange}
              hasUnsavedChanges={topicMappingsDirty}
              highlighted={highlightedTopicMetricKey === topic.metricKey}
              publishDraftValue={topicPublishDrafts?.[buildMqttScopedMetricKey(topic.metricScope, topic.metricKey)] ?? ""}
              publishTopicValue={publishTopicValue}
              publishingTopicKey={publishingTopicKey ?? null}
              removeTopicMapping={removeTopicMapping}
            />
          ))}
        </div>
      )}
      <div className="map-actions">
        <button type="button" className="map-add" onClick={addTopicMapping}>＋ 新增 mapping</button>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="map-add" disabled={actions.reloadTopicsDisabled} onClick={() => void props.reloadTopics()}>{actions.reloadTopicsLabel}</button>
          <button type="button" className="map-save" disabled={actions.saveMappingsDisabled} onClick={() => void props.saveTopicMappings()}>{actions.saveMappingsLabel}</button>
        </div>
      </div>
    </div>
  );
}
