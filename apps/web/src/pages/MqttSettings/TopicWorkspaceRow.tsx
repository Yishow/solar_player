import { memo } from "react";
import { buildMqttScopedMetricKey } from "./viewModel";
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
  handleTopicPublishDraftChange?: (
    metricScope: TopicMapping["metricScope"],
    metricKey: string,
    value: string
  ) => void;
  hasUnsavedChanges?: boolean;
  highlighted?: boolean;
  publishDraftValue?: string;
  publishTopicValue?: (metricScope: TopicMapping["metricScope"], metricKey: string, value: number) => Promise<void>;
  publishingTopicKey?: string | null;
  /** 移除特定 Topic 對照的事件函式 */
  removeTopicMapping: (rowId: number) => void;
};

/**
 * 渲染帶有標籤的屬性輸入框，以消除重複 HTML 語義
 */
function TopicInputGroup({
  rowId,
  field,
  label,
  placeholder,
  value,
  handleTopicChange
}: {
  rowId: number;
  field: "topic" | "unit" | "nameZh" | "nameEn";
  label: string;
  placeholder: string;
  value: string | null;
  handleTopicChange: TopicWorkspaceRowProps["handleTopicChange"];
}) {
  return (
    <div className="input-group">
      <span className="input-prefix">{label}</span>
      <input
        type="text"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(event) => handleTopicChange(rowId, field, event.target.value)}
      />
    </div>
  );
}

function TopicMultiplierInput({
  rowId,
  value,
  handleTopicChange
}: {
  rowId: number;
  value: number;
  handleTopicChange: TopicWorkspaceRowProps["handleTopicChange"];
}) {
  return (
    <div className="input-group">
      <span className="input-prefix">倍率</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        placeholder="1"
        value={value}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          handleTopicChange(rowId, "multiplier", Number.isFinite(nextValue) ? nextValue : 1);
        }}
      />
    </div>
  );
}

/**
 * Topic 工作區的單一對照項目元件。
 * 主列：metric + runtime + 啟用/移除；次列：topic/unit/倍率；進階：名稱、測試發佈、meta。
 */
function TopicWorkspaceRowImpl({
  topic,
  handleTopicChange,
  handleTopicPublishDraftChange,
  hasUnsavedChanges = false,
  highlighted = false,
  publishDraftValue = "",
  publishTopicValue,
  publishingTopicKey = null,
  removeTopicMapping
}: TopicWorkspaceRowProps) {
  const trimmedPublishDraft = publishDraftValue.trim();
  const publishNumber = Number(trimmedPublishDraft);
  const publishValueIsValid = trimmedPublishDraft !== "" && Number.isFinite(publishNumber);
  const scopedKey = buildMqttScopedMetricKey(topic.metricScope, topic.metricKey);
  const isPublishing = publishingTopicKey === scopedKey;
  const publishDisabledReason = !topic.enabled
    ? "此 mapping 已停用"
    : topic.topic.trim() === ""
      ? "尚未設定 topic"
      : hasUnsavedChanges
        ? "請先儲存 topic mapping"
      : !publishValueIsValid
        ? "請輸入 finite number"
        : "";
  const publishDisabled = isPublishing || publishDisabledReason !== "" || !publishTopicValue;
  const hasCustomName = Boolean(topic.nameZh?.trim() || topic.nameEn?.trim());
  const runtimeChipClass =
    topic.runtimeTone === "connected"
      ? "is-success"
      : topic.runtimeTone === "connecting"
        ? "is-warning"
        : "is-danger";

  return (
    <div
      className={[
        "topic-workspace-row",
        "mgmt-interactive-card",
        highlighted ? "is-highlighted" : "",
        topic.enabled ? "" : "is-disabled"
      ]
        .filter(Boolean)
        .join(" ")}
      data-mqtt-row="editable-topic-row"
      data-mqtt-topic-highlighted={highlighted ? "true" : "false"}
    >
      <div className="topic-workspace-row__header">
        <div className="topic-workspace-row__metric-group">
          <span
            className={`topic-row__dot ${!topic.enabled ? "is-disabled" : topic.runtimeTone === "connected" ? "" : "is-idle"}`}
            aria-hidden
          />
          <div className="topic-workspace-row__metric">
            <strong>{topic.metricLabelZh}</strong>
            <small>{topic.metricLabelEn}</small>
          </div>
        </div>

        <div className="topic-workspace-row__aside">
          <div className={`topic-workspace-row__runtime is-${topic.runtimeTone}`}>
            <span className={`mgmt-chip ${runtimeChipClass}`}>{topic.runtimeLabel}</span>
            <span className="runtime-value">
              <b>{topic.valueLabel}</b>
              <small>{topic.runtimeUnit || "--"}</small>
            </span>
          </div>

          <div className="topic-workspace-row__actions">
            <div className="topic-workspace-row__enable">
              <span className="topic-workspace-row__enable-label">
                啟用
                <small>({topic.enabledLabel})</small>
              </span>
              <button
                type="button"
                className={`mgmt-switch topic-workspace-row__switch${topic.enabled ? " on" : ""}`}
                role="switch"
                aria-checked={topic.enabled}
                aria-label={`啟用 (${topic.enabledLabel})`}
                onClick={() => handleTopicChange(topic.id, "enabled", !topic.enabled)}
              />
            </div>
            <button
              type="button"
              className="map-row__remove"
              onClick={() => removeTopicMapping(topic.id)}
              title="移除此 mapping"
              aria-label="移除此 mapping"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="topic-workspace-row__fields">
        <label className="topic-input-group">
          <span className="topic-input-group__label">範圍</span>
          <select
            aria-label="Metric scope"
            value={topic.metricScope}
            onChange={(event) => handleTopicChange(topic.id, "metricScope", event.target.value as TopicMapping["metricScope"])}
          >
            <option value="cl">CL (中壢)</option>
            <option value="kn">KN (觀音)</option>
            <option value="global">全域 (Global)</option>
          </select>
        </label>
        <TopicInputGroup
          rowId={topic.id}
          field="topic"
          label="主題"
          placeholder="例如: factory/cl/power"
          value={topic.topic}
          handleTopicChange={handleTopicChange}
        />
        <TopicInputGroup
          rowId={topic.id}
          field="unit"
          label="單位"
          placeholder="單位 (如 kW)"
          value={topic.unit}
          handleTopicChange={handleTopicChange}
        />
        <TopicMultiplierInput
          rowId={topic.id}
          value={topic.multiplier ?? 1}
          handleTopicChange={handleTopicChange}
        />
      </div>

      <details className="topic-workspace-row__advanced">
        <summary className="topic-workspace-row__advanced-toggle">
          <span>進階設定</span>
          <small>{hasCustomName ? "含自訂名稱 · 測試發佈 · 診斷" : "名稱 · 測試發佈 · 診斷"}</small>
        </summary>

        <div className="topic-workspace-row__advanced-body">
          <div className="topic-workspace-row__names">
            <TopicInputGroup
              rowId={topic.id}
              field="nameZh"
              label="中文名稱"
              placeholder="自訂中文名稱..."
              value={topic.nameZh}
              handleTopicChange={handleTopicChange}
            />
            <TopicInputGroup
              rowId={topic.id}
              field="nameEn"
              label="英文名稱"
              placeholder="自訂英文名稱..."
              value={topic.nameEn}
              handleTopicChange={handleTopicChange}
            />
          </div>

          <div
            className="topic-workspace-row__publish"
            data-mqtt-publish-row={topic.metricKey}
            data-mqtt-publish-disabled={publishDisabled ? "true" : "false"}
          >
            <label className="input-group topic-workspace-row__publish-input">
              <span className="input-prefix">測試數值</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="輸入測試數值"
                value={publishDraftValue}
                onChange={(event) => handleTopicPublishDraftChange?.(topic.metricScope, topic.metricKey, event.target.value)}
              />
            </label>
            <button
              type="button"
              className="map-row__publish"
              disabled={publishDisabled}
              onClick={() => {
                if (publishDisabled || !publishTopicValue) return;
                void publishTopicValue(topic.metricScope, topic.metricKey, publishNumber);
              }}
            >
              {isPublishing ? "發佈中..." : "發佈測試值"}
            </button>
            <small>{publishDisabledReason || 'Payload: { "value": number }'}</small>
          </div>

          <div className="topic-workspace-row__meta">
            <span className="meta-item">最後收值 {topic.lastReceivedLabel}</span>
            <span className="meta-item">最後更新 {topic.lastUpdatedLabel}</span>
            <span className="meta-item">{topic.qualityLabel}</span>
            {topic.coverageStateLabel ? (
              <span className="meta-item coverage">
                {topic.coverageDetail ? `${topic.coverageStateLabel} · ${topic.coverageDetail}` : topic.coverageStateLabel}
              </span>
            ) : null}
          </div>
        </div>
      </details>
    </div>
  );
}

/**
 * 以 React.memo 包裝的 Topic 工作區單列元件；
 * 相同 props（穩定 handler + 不變 row 資料）下不重繪。
 */
export const TopicWorkspaceRow = memo(TopicWorkspaceRowImpl);
