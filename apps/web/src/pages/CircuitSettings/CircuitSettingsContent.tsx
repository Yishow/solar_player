import { displayCircuitSlotKeys, type CircuitConfig, type DisplayReadinessReport } from "@solar-display/shared";
import type { ReactNode } from "react";
import { Switch } from "../../components/management";
import { buildCircuitSettingsViewModel } from "./viewModel";

type CircuitSettingsContentProps = {
  dirtyCount: number;
  handleAdd: () => Promise<void>;
  handleDelete: (id: number) => Promise<void>;
  handleFieldChange: <Key extends keyof CircuitConfig>(
    id: number,
    key: Key,
    value: CircuitConfig[Key]
  ) => void;
  isLoading: boolean;
  loadCircuits: (options?: { silent?: boolean }) => Promise<void>;
  parseNumberInput: (value: string, fallback?: number) => number;
  readiness: DisplayReadinessReport | null;
  readinessErrorMessage: string;
  readinessLoading: boolean;
  remoteSyncBanner: ReactNode;
  saveAll: () => Promise<void>;
  viewModel: ReturnType<typeof buildCircuitSettingsViewModel>;
};

const slotLabelMap: Record<string, string> = {
  ev: "EV",
  hvac: "HVAC",
  infrastructure: "Infrastructure",
  lighting: "Lighting",
  office: "Office",
  production: "Production"
};

const iconGlyphMap: Record<string, string> = {
  bolt: "⚡",
  car: "🚗",
  fan: "❄",
  light: "☀"
};

function chipClass(tone: string) {
  if (tone === "success") return "mgmt-chip is-success";
  if (tone === "warning") return "mgmt-chip is-warning";
  if (tone === "danger") return "mgmt-chip is-danger";
  if (tone === "accent") return "mgmt-chip is-accent";
  return "mgmt-chip";
}

function iconGlyph(icon: string | null | undefined) {
  if (!icon) return "·";
  return iconGlyphMap[icon] ?? "·";
}

export function CircuitSettingsContent({
  dirtyCount,
  handleAdd,
  handleDelete,
  handleFieldChange,
  isLoading,
  loadCircuits,
  parseNumberInput,
  readiness,
  readinessErrorMessage,
  readinessLoading,
  remoteSyncBanner,
  saveAll,
  viewModel
}: CircuitSettingsContentProps) {
  const statusVariant =
    viewModel.feedbackBanner.tone === "error"
      ? "is-error"
      : viewModel.feedbackBanner.tone === "loading"
        ? "is-loading"
        : "";
  const readinessFindings =
    readiness?.findings.filter((finding) => finding.sourceType === "circuit-slot") ?? [];
  const blockingReadinessCount = readinessFindings.filter((finding) => finding.status === "blocking").length;
  const warningReadinessCount = readinessFindings.filter((finding) => finding.status === "warning").length;
  const readinessVariant = readinessErrorMessage
    ? "is-error"
    : readinessLoading
      ? "is-loading"
      : blockingReadinessCount > 0
        ? "is-error"
        : warningReadinessCount > 0
          ? "is-warning"
          : "";
  const readinessSummary = readinessErrorMessage
    ? readinessErrorMessage
    : readinessLoading
      ? "正在計算 display slot 綁定 readiness..."
      : readinessFindings.length === 0
        ? "所有 display slot 綁定正常，未發現 readiness finding。"
        : `目前有 ${blockingReadinessCount} 項 blocking、${warningReadinessCount} 項 warning 的 display slot readiness finding。`;

  return (
    <div className="cs-page">
      <section className="cs-title">
        <h1>
          迴路<em>設定</em>
        </h1>
        <p>Circuit Settings</p>
      </section>

      <button
        type="button"
        className="mgmt-action cs-resync"
        disabled={viewModel.actions.reloadDisabled}
        onClick={() => void loadCircuits({ silent: true })}
      >
        {viewModel.actions.reloadLabel}
        <small>Resync</small>
      </button>
      <button
        type="button"
        className="mgmt-action cs-add"
        disabled={viewModel.actions.addDisabled}
        onClick={() => void handleAdd()}
      >
        {viewModel.actions.addLabel}
        <small>Add Circuit</small>
      </button>
      <button
        type="button"
        className="mgmt-action primary cs-save"
        disabled={viewModel.actions.saveDisabled}
        onClick={() => void saveAll()}
      >
        {viewModel.actions.saveLabel}
        <small>Save Settings</small>
      </button>

      <div className={`mgmt-status cs-status ${statusVariant}`} role="status">
        {viewModel.feedbackBanner.title}
        {viewModel.feedbackBanner.detail ? (
          <>
            　·
            <span style={{ opacity: 0.78 }}>{viewModel.feedbackBanner.detail}</span>
          </>
        ) : null}
      </div>

      {remoteSyncBanner}

      <section className="settings-card cs-card">
        <div className="settings-card__title">
          廠區用電迴路
          <small>Factory Circuits · 共 {viewModel.summary.totalCircuitCount} 筆</small>
        </div>

        <div className="cs-stats mgmt-stat-strip">
          <div className="cs-stat mgmt-stat">
            <span className="cs-stat__label">
              迴路總數
              <small>Total</small>
            </span>
            <span className="cs-stat__value">{viewModel.summary.totalCircuitCount}</span>
          </div>
          <div className="cs-stat mgmt-stat">
            <span className="cs-stat__label">
              顯示中
              <small>Visible</small>
            </span>
            <span className="cs-stat__value">{viewModel.summary.enabledCircuitCount}</span>
          </div>
          <div className="cs-stat mgmt-stat">
            <span className="cs-stat__label">
              隱藏中
              <small>Hidden</small>
            </span>
            <span className="cs-stat__value" style={{ color: "#888d86" }}>
              {viewModel.summary.disabledCircuitCount}
            </span>
          </div>
          <div className="cs-stat mgmt-stat">
            <span className="cs-stat__label">
              額定容量總和
              <small>Capacity</small>
            </span>
            <span className="cs-stat__value">{viewModel.summary.capacityLabel}</span>
          </div>
          <div className="cs-stat mgmt-stat">
            <span className="cs-stat__label">
              待儲存
              <small>Dirty</small>
            </span>
            <span className="cs-stat__value" style={{ color: dirtyCount > 0 ? "#c9881a" : "#888d86" }}>
              {dirtyCount}
            </span>
          </div>
        </div>

        <div className={`mgmt-status cs-readiness ${readinessVariant}`.trim()} role="status">
          {readinessSummary}
        </div>
        {readinessFindings.length > 0 && !readinessErrorMessage && !readinessLoading ? (
          <div className="cs-readiness-list">
            {readinessFindings.slice(0, 3).map((finding) => (
              <div key={`${finding.pageId}-${finding.requirementKey}`} className="cs-readiness-item mgmt-banner">
                <span className={chipClass(finding.status === "blocking" ? "danger" : "warning")}>
                  {finding.status === "blocking" ? "Blocking" : "Warning"}
                </span>
                <div className="cs-readiness-item__copy">
                  <strong>{finding.requirementKey}</strong>
                  <small>{finding.reason}</small>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {isLoading ? (
          <div className="cs-empty">
            <strong>正在載入迴路設定</strong>
            <span style={{ fontSize: 13 }}>同步 circuits route 中，請稍候。</span>
          </div>
        ) : viewModel.emptyState ? (
          <div className="cs-empty">
            <strong>{viewModel.emptyState.title}</strong>
            <span style={{ fontSize: 13 }}>{viewModel.emptyState.description}</span>
          </div>
        ) : (
          <>
            <div className="cs-legend">
              <span className="cs-legend-item cs-legend-item--normal">Normal</span>
              <span className="cs-legend-item cs-legend-item--attention">Attention</span>
              <span className="cs-legend-item cs-legend-item--warning">Warning</span>
            </div>
            <div className="cs-table-wrap">
              <table className="cs-table">
                <thead>
                  <tr>
                    <th className="col-order">順序</th>
                    <th className="col-name">迴路名稱</th>
                    <th className="col-icon">圖示 / 單位</th>
                    <th className="col-topic">MQTT Topic</th>
                    <th className="col-thr">
                      <span className="cs-th-dot cs-th-dot--normal" />
                      Normal
                    </th>
                    <th className="col-thr">
                      <span className="cs-th-dot cs-th-dot--attention" />
                      Attention
                    </th>
                    <th className="col-thr">
                      <span className="cs-th-dot cs-th-dot--warning" />
                      Warning
                    </th>
                    <th className="col-display">Display Slot / 驗證</th>
                    <th className="col-ops">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModel.rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`${row.isDirty ? "is-dirty" : ""} ${row.enabled ? "" : "is-disabled"}`}
                    >
                      <td className="col-order">
                        <input
                          className="cs-input cs-input--order"
                          type="number"
                          min={1}
                          value={row.displayOrder ?? 0}
                          onChange={(event) =>
                            handleFieldChange(row.id, "displayOrder", parseNumberInput(event.target.value, 1))
                          }
                        />
                      </td>
                      <td className="col-name">
                        <div className="cs-name-stack">
                          <input
                            className="cs-input cs-input--zh"
                            placeholder="中文名稱"
                            value={row.nameZh ?? ""}
                            onChange={(event) => handleFieldChange(row.id, "nameZh", event.target.value)}
                          />
                          <input
                            className="cs-input"
                            placeholder="English"
                            value={row.nameEn ?? ""}
                            onChange={(event) => handleFieldChange(row.id, "nameEn", event.target.value)}
                          />
                          <p className="cs-cell-caption">
                            額定 {row.ratedCapacity ?? 0} {row.unitLabel}
                          </p>
                        </div>
                      </td>
                      <td className="col-icon">
                        <div className="cs-icon-stack">
                          <div className="cs-icon-row">
                            <span className="cs-icon-glyph">{iconGlyph(row.icon)}</span>
                            <input
                              className="cs-input"
                              placeholder="bolt"
                              value={row.icon ?? ""}
                              onChange={(event) => handleFieldChange(row.id, "icon", event.target.value)}
                            />
                          </div>
                          <input
                            className="cs-input"
                            placeholder="kW"
                            value={row.unit ?? ""}
                            onChange={(event) => handleFieldChange(row.id, "unit", event.target.value)}
                          />
                        </div>
                      </td>
                      <td className="col-topic">
                        <input
                          className="cs-input"
                          placeholder="factory/power/..."
                          value={row.mqttTopic ?? ""}
                          onChange={(event) => handleFieldChange(row.id, "mqttTopic", event.target.value)}
                        />
                        <p className="cs-cell-caption">{row.topicLabel}</p>
                      </td>
                      <td className="col-thr">
                        <div className="cs-thr">
                          <input
                            className="cs-input is-narrow"
                            type="number"
                            value={row.normalMin ?? 0}
                            onChange={(event) => handleFieldChange(row.id, "normalMin", parseNumberInput(event.target.value))}
                          />
                          <small>—</small>
                          <input
                            className="cs-input is-narrow"
                            type="number"
                            value={row.normalMax ?? 0}
                            onChange={(event) => handleFieldChange(row.id, "normalMax", parseNumberInput(event.target.value))}
                          />
                        </div>
                        <p className="cs-thr-pill cs-thr-pill--normal">{row.normalRangeLabel}</p>
                      </td>
                      <td className="col-thr">
                        <div className="cs-thr">
                          <input
                            className="cs-input is-narrow"
                            type="number"
                            value={row.attentionMin ?? 0}
                            onChange={(event) => handleFieldChange(row.id, "attentionMin", parseNumberInput(event.target.value))}
                          />
                          <small>—</small>
                          <input
                            className="cs-input is-narrow"
                            type="number"
                            value={row.attentionMax ?? 0}
                            onChange={(event) => handleFieldChange(row.id, "attentionMax", parseNumberInput(event.target.value))}
                          />
                        </div>
                        <p className="cs-thr-pill cs-thr-pill--attention">{row.attentionRangeLabel}</p>
                      </td>
                      <td className="col-thr">
                        <div className="cs-thr">
                          <input
                            className="cs-input is-narrow"
                            type="number"
                            value={row.warningMin ?? 0}
                            onChange={(event) => handleFieldChange(row.id, "warningMin", parseNumberInput(event.target.value))}
                          />
                          <small>—</small>
                          <input
                            className="cs-input is-narrow"
                            type="number"
                            value={row.warningMax ?? 0}
                            onChange={(event) => handleFieldChange(row.id, "warningMax", parseNumberInput(event.target.value))}
                          />
                        </div>
                        <p className="cs-thr-pill cs-thr-pill--warning">{row.warningRangeLabel}</p>
                      </td>
                      <td className="col-display">
                        <div className="cs-display-stack">
                          <select
                            className="cs-input"
                            value={row.displaySlot ?? ""}
                            onChange={(event) =>
                              handleFieldChange(
                                row.id,
                                "displaySlot",
                                event.target.value === "" ? null : event.target.value
                              )
                            }
                          >
                            <option value="">未綁定 slot</option>
                            {displayCircuitSlotKeys.map((slot) => (
                              <option key={slot} value={slot}>
                                {slotLabelMap[slot] ?? slot}
                              </option>
                            ))}
                          </select>
                          <div className="cs-toggle">
                            <Switch
                              ariaLabel={`${row.nameZh ?? "迴路"} 顯示`}
                              on={row.enabled}
                              onChange={(next) => handleFieldChange(row.id, "enabled", next)}
                            />
                            <span className="cs-toggle-label">{row.visibilityLabel}</span>
                          </div>
                          <span className={chipClass(row.validationTone)}>{row.validationLabel}</span>
                          <p className="cs-cell-caption">
                            Slot: {row.displaySlot ? (slotLabelMap[row.displaySlot] ?? row.displaySlot) : "未綁定"} · {row.validationDetail}
                          </p>
                        </div>
                      </td>
                      <td className="col-ops">
                        <div className="cs-ops">
                          <span className={chipClass(row.dirtyTone)}>{row.dirtyLabel}</span>
                          <button
                            type="button"
                            className="cs-delete"
                            disabled={row.deleting}
                            onClick={() => void handleDelete(row.id)}
                          >
                            {row.deleting ? "刪除中..." : "刪除"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
