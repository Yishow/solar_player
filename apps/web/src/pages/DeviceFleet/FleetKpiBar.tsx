import type { DeviceFleetRow } from "./viewModel";

export type FleetKpiStatusFilter = "all" | "online" | "unpaired" | "offline";

export type FleetKpiBarProps = {
  activeFilter?: FleetKpiStatusFilter;
  groupCount: number;
  onScrollToGroups?: () => void;
  onSelectFilter?: (filter: FleetKpiStatusFilter) => void;
  rolloutSummary: {
    applied: number;
    failed: number;
    offline: number;
    total: number;
    waiting: number;
  };
  rows: DeviceFleetRow[];
};

export function FleetKpiBar({
  activeFilter = "all",
  groupCount,
  onScrollToGroups,
  onSelectFilter,
  rolloutSummary,
  rows
}: FleetKpiBarProps) {
  const total = rows.length;
  const onlineCount = rows.filter((r) => r.operationalState === "online").length;
  const offlineCount = rows.filter(
    (r) => r.operationalState === "offline" || r.operationalState === "disabled"
  ).length;
  const unpairedCount = rows.filter((r) => !r.paired && r.enabled).length;

  return (
    <section className="fleet-kpi-bar" aria-label="看板運行指標">
      <div
        aria-pressed={activeFilter === "all"}
        className={`fleet-kpi-card fleet-kpi-card--primary ${
          activeFilter === "all" ? "is-active-filter" : ""
        } ${onSelectFilter ? "is-interactive" : ""}`}
        onClick={() => onSelectFilter?.("all")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectFilter?.("all");
          }
        }}
        role={onSelectFilter ? "button" : undefined}
        tabIndex={onSelectFilter ? 0 : undefined}
        title={onSelectFilter ? "點擊檢視全部裝置" : undefined}
      >
        <div className="fleet-kpi-card__header">
          <span className="fleet-kpi-card__label">裝置總數</span>
          <span className="fleet-kpi-badge fleet-kpi-badge--neutral">{total} 台</span>
        </div>
        <div className="fleet-kpi-card__body">
          <strong className="fleet-kpi-card__value">{total}</strong>
          <small className="fleet-kpi-card__detail">
            已套用 {rolloutSummary.applied} · 等待 {rolloutSummary.waiting} · 離線 {rolloutSummary.offline} · 失敗 {rolloutSummary.failed}
          </small>
        </div>
      </div>

      <div
        aria-pressed={activeFilter === "online"}
        className={`fleet-kpi-card fleet-kpi-card--success ${
          activeFilter === "online" ? "is-active-filter" : ""
        } ${onSelectFilter ? "is-interactive" : ""}`}
        onClick={() =>
          onSelectFilter?.(activeFilter === "online" ? "all" : "online")
        }
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectFilter?.(activeFilter === "online" ? "all" : "online");
          }
        }}
        role={onSelectFilter ? "button" : undefined}
        tabIndex={onSelectFilter ? 0 : undefined}
        title={onSelectFilter ? "點擊只篩選在線機台" : undefined}
      >
        <div className="fleet-kpi-card__header">
          <span className="fleet-kpi-card__label">在線正常</span>
          <span className="fleet-kpi-badge fleet-kpi-badge--online">● LIVE</span>
        </div>
        <div className="fleet-kpi-card__body">
          <strong className="fleet-kpi-card__value">{onlineCount}</strong>
          <small className="fleet-kpi-card__detail">
            佔整體 {total > 0 ? Math.round((onlineCount / total) * 100) : 0}% 裝置即時連線中
          </small>
        </div>
      </div>

      <div
        aria-pressed={activeFilter === "unpaired"}
        className={`fleet-kpi-card ${unpairedCount > 0 ? "fleet-kpi-card--warning" : ""} ${
          activeFilter === "unpaired" ? "is-active-filter" : ""
        } ${onSelectFilter ? "is-interactive" : ""}`}
        onClick={() =>
          onSelectFilter?.(activeFilter === "unpaired" ? "all" : "unpaired")
        }
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectFilter?.(activeFilter === "unpaired" ? "all" : "unpaired");
          }
        }}
        role={onSelectFilter ? "button" : undefined}
        tabIndex={onSelectFilter ? 0 : undefined}
        title={onSelectFilter ? "點擊只篩選待配對裝置" : undefined}
      >
        <div className="fleet-kpi-card__header">
          <span className="fleet-kpi-card__label">待配對裝置</span>
          {unpairedCount > 0 ? (
            <span className="fleet-kpi-badge fleet-kpi-badge--warning">需配對</span>
          ) : (
            <span className="fleet-kpi-badge fleet-kpi-badge--success">全數在席</span>
          )}
        </div>
        <div className="fleet-kpi-card__body">
          <strong className="fleet-kpi-card__value">{unpairedCount}</strong>
          <small className="fleet-kpi-card__detail">
            {unpairedCount > 0 ? "需於列表簽發 Token 一鍵配對" : "所有已啟用裝置皆完成授權"}
          </small>
        </div>
      </div>

      <div
        className={`fleet-kpi-card ${onScrollToGroups ? "is-interactive" : ""}`}
        onClick={onScrollToGroups}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onScrollToGroups?.();
          }
        }}
        role={onScrollToGroups ? "button" : undefined}
        tabIndex={onScrollToGroups ? 0 : undefined}
        title={onScrollToGroups ? "點擊跳至群組列表" : undefined}
      >
        <div className="fleet-kpi-card__header">
          <span className="fleet-kpi-card__label">運行群組</span>
          <span className="fleet-kpi-badge fleet-kpi-badge--neutral">{groupCount} 群組</span>
        </div>
        <div className="fleet-kpi-card__body">
          <strong className="fleet-kpi-card__value">{groupCount}</strong>
          <small className="fleet-kpi-card__detail">
            離線機台 {offlineCount} 台 · 跨 CL / KN 雙廠區
          </small>
        </div>
      </div>
    </section>
  );
}
