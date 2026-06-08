import { type CircuitConfig, type DisplayReadinessReport } from "@solar-display/shared";
import type { ReactNode } from "react";
import { CircuitRow } from "./CircuitRow";
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

function chipClass(tone: string) {
  if (tone === "success") return "mgmt-chip is-success";
  if (tone === "warning") return "mgmt-chip is-warning";
  if (tone === "danger") return "mgmt-chip is-danger";
  if (tone === "accent") return "mgmt-chip is-accent";
  return "mgmt-chip";
}

function readinessReferenceLabel(
  finding: DisplayReadinessReport["findings"][number],
  row: ReturnType<typeof buildCircuitSettingsViewModel>["rows"][number] | undefined
) {
  const slotLabel = slotLabelMap[finding.requirementKey] ?? finding.requirementKey;
  if (!row) {
    return slotLabel;
  }

  return `${slotLabel} · ${row.nameZh ?? row.nameEn ?? "未命名迴路"}`;
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
  const rowById = new Map(viewModel.rows.map((row) => [String(row.id), row] as const));
  const rowBySlot = new Map(
    viewModel.rows
      .filter((row) => row.displaySlot)
      .map((row) => [row.displaySlot as string, row] as const)
  );

  return (
    <div className="cs-page">
      <section className="cs-title mgmt-page-title">
        <h1 className="mgmt-page-title__heading">
          迴路<em>設定</em>
        </h1>
        <p className="mgmt-page-title__subtitle">Circuit Settings</p>
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

      <section className="settings-card mgmt-interactive-card cs-card">
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
                  <strong>
                    {readinessReferenceLabel(
                      finding,
                      (finding.sourceId ? rowById.get(finding.sourceId.split(",")[0] ?? "") : undefined)
                        ?? rowBySlot.get(finding.requirementKey)
                    )}
                  </strong>
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
                    <CircuitRow
                      key={row.id}
                      row={row}
                      handleFieldChange={handleFieldChange}
                      handleDelete={handleDelete}
                      parseNumberInput={parseNumberInput}
                    />
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
