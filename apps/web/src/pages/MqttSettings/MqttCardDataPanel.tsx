import type { DisplayCardDataRow } from "@solar-display/shared";
import { buildMqttScopedMetricKey } from "./viewModel";
import type { MqttSettingsContentProps, CardDataSiteFilter } from "./MqttSettingsContent.types";
import type { MqttSettingsViewModel } from "./MqttSettingsViewHelpers";
import {
  formatDerivedProvenance,
  isCalculationAction,
  isConfigureTopicAction,
  isPublishAction,
  resolveCardDataPageLabel,
  resolveCardDataStatusClass
} from "./MqttSettingsViewHelpers";
import { factoryTopicSiteOptions } from "./factoryTopicSites";

type MqttCardDataPanelProps = {
  activeCardDataSite: CardDataSiteFilter;
  cardDataErrorMessage?: string;
  cardDataSiteOptions: typeof factoryTopicSiteOptions;
  clearDisplayOverride?: MqttSettingsContentProps["clearDisplayOverride"];
  handleConfigureTopicMetric?: MqttSettingsContentProps["handleConfigureTopicMetric"];
  handleOverrideDraftChange?: MqttSettingsContentProps["handleOverrideDraftChange"];
  handleTopicPublishDraftChange?: MqttSettingsContentProps["handleTopicPublishDraftChange"];
  isLoadingCardData?: boolean;
  overrideDrafts?: Record<string, string>;
  publishTopicValue: MqttSettingsContentProps["publishTopicValue"];
  publishingTopicKey?: string | null;
  saveDisplayOverride?: MqttSettingsContentProps["saveDisplayOverride"];
  savingOverrideTargetId?: string | null;
  selectCardDataSite: (site: CardDataSiteFilter) => void;
  topicPublishDrafts?: Record<string, string>;
  viewModel: MqttSettingsViewModel;
  visibleCardDataRows: DisplayCardDataRow[];
};

export function MqttCardDataPanel({
  activeCardDataSite,
  cardDataErrorMessage,
  cardDataSiteOptions,
  clearDisplayOverride,
  handleConfigureTopicMetric,
  handleOverrideDraftChange,
  handleTopicPublishDraftChange,
  isLoadingCardData,
  overrideDrafts,
  publishTopicValue,
  publishingTopicKey,
  saveDisplayOverride,
  savingOverrideTargetId,
  selectCardDataSite,
  topicPublishDrafts,
  viewModel,
  visibleCardDataRows
}: MqttCardDataPanelProps) {
  return (
    <div className="mqtt-workspace-panel mqtt-card-data-panel">
      <div className="mqtt-card-data-toolbar">
        {viewModel.feedbackBanner.detail ? (
          <div className={`mgmt-status mqtt-workspace-status is-${viewModel.feedbackBanner.visualTone}`}>
            {viewModel.feedbackBanner.detail}
          </div>
        ) : null}
        {cardDataSiteOptions.length > 1 ? (
          <div className="mqtt-card-data-site-toggle" role="tablist" aria-label="卡片資料廠區">
            {cardDataSiteOptions.map((option) => (
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
      {cardDataErrorMessage ? (
        <div className="mgmt-status is-error mqtt-card-data-feedback">{cardDataErrorMessage}</div>
      ) : null}
      {isLoadingCardData ? (
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
            const overrideDraftValue = overrideDrafts?.[rowKey] ?? "";
            const trimmedOverrideValue = overrideDraftValue.trim();
            const numericOverrideValue = Number(trimmedOverrideValue);
            const overrideInputInvalid =
              trimmedOverrideValue !== "" && !Number.isFinite(numericOverrideValue);
            const canSaveOverride =
              trimmedOverrideValue !== "" &&
              Number.isFinite(numericOverrideValue) &&
              savingOverrideTargetId !== rowKey &&
              Boolean(saveDisplayOverride);
            const canClearOverride =
              Boolean(row.override) &&
              savingOverrideTargetId !== rowKey &&
              Boolean(clearDisplayOverride);

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
                          onChange={(event) => handleOverrideDraftChange?.(row.cardId, row.metricScope, event.target.value)}
                        />
                      </label>
                      <button
                        type="button"
                        className="map-row__publish"
                        disabled={!canSaveOverride}
                        title="只改播放頁顯示值，不寫回 MQTT 或歷史資料"
                        onClick={() => {
                          if (!canSaveOverride || !saveDisplayOverride) return;
                          void saveDisplayOverride(row.cardId, row.metricScope, numericOverrideValue);
                        }}
                      >
                        {savingOverrideTargetId === rowKey ? "套用中..." : "套用展示值"}
                      </button>
                      <button
                        type="button"
                        className="map-add"
                        disabled={!canClearOverride}
                        title="清除展示覆寫，恢復原始資料顯示"
                        onClick={() => {
                          if (!canClearOverride || !clearDisplayOverride) return;
                          void clearDisplayOverride(row.cardId, row.metricScope);
                        }}
                      >
                        清除覆寫
                      </button>
                      {overrideInputInvalid ? <small>請輸入數字</small> : null}
                    </div>
                  ) : null}
                  {publishActions.map((action) => {
                    const scopedKey = buildMqttScopedMetricKey(action.metricScope, action.metricKey);
                    const draftValue = topicPublishDrafts?.[scopedKey] ?? "";
                    const trimmedValue = draftValue.trim();
                    const numericValue = Number(trimmedValue);
                    const canPublish =
                      trimmedValue !== "" &&
                      Number.isFinite(numericValue) &&
                      publishingTopicKey !== scopedKey &&
                      Boolean(publishTopicValue);

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
                            onChange={(event) => handleTopicPublishDraftChange?.(action.metricScope, action.metricKey, event.target.value)}
                          />
                        </label>
                        <button
                          type="button"
                          className="map-row__publish"
                          disabled={!canPublish}
                          title="發佈數字到此 metric 對應的 MQTT topic，會走真實資料流程"
                          onClick={() => {
                            if (!canPublish || !publishTopicValue) return;
                            void publishTopicValue(action.metricScope, action.metricKey, numericValue);
                          }}
                        >
                          {publishingTopicKey === scopedKey ? "發佈中..." : "發佈到 MQTT"}
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
                      onClick={() => handleConfigureTopicMetric?.(action.metricKey)}
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
  );
}
