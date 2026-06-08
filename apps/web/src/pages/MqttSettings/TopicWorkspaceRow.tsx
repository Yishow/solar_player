import type { buildMqttSettingsViewModel, TopicMapping } from "./viewModel";

/**
 * Topic 工作區單一卡片資料的推導型別，包含 runtime 狀態與翻譯文字
 */
export type TopicWorkspaceRowModel = ReturnType<typeof buildMqttSettingsViewModel>["topicWorkspaceRows"][number];

/**
 * Topic 工作區單一對照項目屬性
 */
export type TopicWorkspaceRowProps = {
  /** Topic 對照資料物件，包含實時狀態與語系標籤 */
  topic: TopicWorkspaceRowModel;
  /** 處理 Topic 欄位或狀態變更的事件函式 */
  handleTopicChange: <Key extends keyof TopicMapping>(
    rowId: number,
    key: Key,
    value: TopicMapping[Key]
  ) => void;
  /** 移除特定 Topic 對照的事件函式 */
  removeTopicMapping: (rowId: number) => void;
};

/**
 * Topic 工作區的單一對照項目元件。
 * 提供即時數值顯示、Topic/Unit 欄位編輯，以及啟用與移除之控制項。
 *
 * @param props 元件屬性，包含單一對照項目資料與其變更/移除事件
 */
export function TopicWorkspaceRow({
  topic,
  handleTopicChange,
  removeTopicMapping
}: TopicWorkspaceRowProps) {
  /**
   * 渲染帶有標籤的屬性輸入框，以消除重複 HTML 語義
   *
   * @param field 欄位名稱
   * @param label 顯示的前綴標籤
   * @param placeholder 輸入框佔位符
   */
  const renderInputGroup = (
    field: "topic" | "unit",
    label: string,
    placeholder: string
  ) => (
    <div className="input-group">
      <span className="input-prefix">{label}</span>
      <input
        type="text"
        placeholder={placeholder}
        value={topic[field]}
        onChange={(event) => handleTopicChange(topic.id, field, event.target.value)}
      />
    </div>
  );

  return (
    <div className="topic-workspace-row mgmt-interactive-card" data-mqtt-row="editable-topic-row">
      <div className="topic-workspace-row__header">
        <div className="topic-workspace-row__metric-group">
          <span className={`topic-row__dot ${!topic.enabled ? "is-disabled" : topic.runtimeTone === "connected" ? "" : "is-idle"}`} aria-hidden />
          <div className="topic-workspace-row__metric">
            <strong>{topic.metricLabelZh}</strong>
            <small>{topic.metricLabelEn}</small>
          </div>
        </div>
        <div className="topic-workspace-row__actions">
          <label className="map-row__toggle">
            <input type="checkbox" checked={topic.enabled} onChange={(event) => handleTopicChange(topic.id, "enabled", event.target.checked)} />
            啟用 ({topic.enabledLabel})
          </label>
          <button type="button" className="map-row__remove" onClick={() => removeTopicMapping(topic.id)} title="移除此 mapping">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            移除
          </button>
        </div>
      </div>

      <div className="topic-workspace-row__body">
        <div className="topic-workspace-row__fields">
          {renderInputGroup("topic", "Topic", "輸入 MQTT topic...")}
          {renderInputGroup("unit", "Unit", "單位")}
        </div>

        <div className="topic-workspace-row__runtime">
          <span className={`mgmt-chip ${topic.runtimeTone === "connected" ? "is-success" : topic.runtimeTone === "connecting" ? "is-warning" : "is-danger"}`}>{topic.runtimeLabel}</span>
          <span className="runtime-value">
            <b>{topic.valueLabel}</b>
            <small>{topic.unit || "--"}</small>
          </span>
        </div>
      </div>

      <div className="topic-workspace-row__meta">
        <span className="meta-item">最後收值 {topic.lastReceivedLabel}</span>
        <span className="meta-item">最後更新 {topic.lastUpdatedLabel}</span>
        <span className="meta-item">{topic.qualityLabel}</span>
        {topic.coverageStateLabel ? (
          <span className="meta-item coverage">{topic.coverageStateLabel} · {topic.coverageDetail}</span>
        ) : null}
      </div>
    </div>
  );
}
