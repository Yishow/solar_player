import type { buildDeviceStatusViewModel } from "./viewModel";

type RightWingMetricsPanelProps = {
  viewModel: ReturnType<typeof buildDeviceStatusViewModel>;
};

function NetworkGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 9c5-4 11-4 16 0M7 12c3-2 7-2 10 0M10 15c1-1 3-1 4 0" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}

export function RightWingMetricsPanel({ viewModel }: RightWingMetricsPanelProps) {
  return (
    <>
      <div className="ds-section-block">
        <h2>
          系統資源監控
          <small>硬體負載與溫度</small>
        </h2>
        <div className="ds-gauge-grid">
          {viewModel.resourceCards.map((card) => (
            <div key={card.label} className="ds-gauge">
              <div
                className="ds-gauge-ring"
                style={{
                  ["--gauge-color" as string]: card.gaugeColor,
                  ["--gauge-value" as string]: String(card.gaugePercent)
                }}
              >
                <span style={{ color: card.gaugeColor }}>{card.gaugeValue}</span>
              </div>
              <p>
                {card.label}
                <small>{card.helper}</small>
              </p>
            </div>
          ))}
        </div>

        <div className="ds-network-strip">
          <span className="ds-network__icon">
            <NetworkGlyph />
          </span>
          <div className="ds-network__row">
            <b>網路狀態</b>
            <small>連線狀態</small>
            <span className="ds-network__val">{viewModel.networkRows[0]?.value}</span>
          </div>
          <div className="ds-network__row">
            <b>訊號強度</b>
            <small>無線訊號</small>
            <span className="ds-network__val ds-network__val--sub">{viewModel.networkRows[1]?.value}</span>
          </div>
        </div>
      </div>

      <div className="ds-section-block">
        <h2>
          系統日誌
          <small>Journald 系統日誌</small>
        </h2>
        <div
          className={`mgmt-status ds-log-card ${
            viewModel.logsSummary.statusTitle === "日誌不可用" ? "is-error" : ""
          }`}
        >
          <div className="ds-log-card__header">
            <span className="ds-log-card__dot" />
            <b>{viewModel.logsSummary.statusTitle}</b>
            <span className="ds-log-card__badge">{viewModel.logsSummary.entryCountLabel}</span>
          </div>
          <p className="ds-log-card__detail">
            {viewModel.logsTriage.helper} · {viewModel.logsTriage.detail}
          </p>
        </div>
        {viewModel.logsTriage.exportAvailable ? (
          <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end" }}>
            <a className="ds-export-btn" href="/api/device/logs/export?limit=200">
              匯出日誌記錄
            </a>
          </div>
        ) : null}
      </div>

      <div className="ds-section-block">
        <h2>
          裝置資訊
          <small>系統與硬體規格</small>
        </h2>
        <dl className="ds-spec-list">
          {viewModel.systemRows.map((row) => (
            <div key={row.label} className="ds-spec-row">
              <dt>{row.label}</dt>
              <dd className={row.tone ?? (row.value.includes("●") ? "is-good" : "")}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
