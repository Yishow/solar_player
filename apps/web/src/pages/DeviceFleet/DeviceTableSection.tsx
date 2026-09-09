import {
  Chip,
  OpsSurface,
  OpsSurfaceTitle
} from "../../components/management";
import type { DeviceFleetRow } from "./viewModel";

export type DeviceTableSectionProps = {
  activeStatusFilter?: string;
  filter: string;
  model: {
    rows: DeviceFleetRow[];
    state: "empty" | "loading" | "ready";
  };
  mutationPending: boolean;
  onClearStatusFilter?: () => void;
  onEditDevice: (row: DeviceFleetRow) => void;
  onFilterChange: (value: string) => void;
  onPreparePairing: (row: DeviceFleetRow) => void;
  onToggleDevice: (row: DeviceFleetRow) => Promise<void>;
};

const stateLabels = {
  disabled: "已停用",
  offline: "離線",
  online: "上線",
  stale: "逾時",
  unavailable: "狀態無法取得",
  unpaired: "未配對"
} as const;

const stateTones = {
  disabled: "danger",
  offline: "default",
  online: "success",
  stale: "warning",
  unavailable: "warning",
  unpaired: "warning"
} as const;

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "從未連線";
  const date = new Date(isoString);
  const time = date.getTime();
  if (Number.isNaN(time)) return isoString;
  const diffSeconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (diffSeconds < 10) return "剛剛";
  if (diffSeconds < 60) return `${diffSeconds} 秒前`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} 分鐘前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小時前`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} 天前`;
}

export function DeviceTableSection({
  activeStatusFilter,
  filter,
  model,
  mutationPending,
  onClearStatusFilter,
  onEditDevice,
  onFilterChange,
  onPreparePairing,
  onToggleDevice
}: DeviceTableSectionProps) {
  const quickFilters = [
    { label: "全部", value: "" },
    { label: "CL 中壢廠", value: "cl" },
    { label: "KN 觀音廠", value: "kn" }
  ];

  return (
    <OpsSurface family="operations" aria-label="裝置清單">
      <div className="fleet-table-header">
        <OpsSurfaceTitle
          caption="監控全場實體螢幕之配對憑證、Socket 活躍度與節目版本套用進度"
          title="展示裝置清單"
        />
        <div className="fleet-table-toolbar">
          <div className="fleet-quick-filters">
            {quickFilters.map((qf) => (
              <button
                className={`fleet-quick-filter-btn ${
                  filter.toLowerCase() === qf.value ? "is-active" : ""
                }`}
                key={qf.label}
                onClick={() => onFilterChange(qf.value)}
                type="button"
              >
                {qf.label}
              </button>
            ))}
          </div>
          <label className="device-fleet-filter">
            <span className="sr-only">搜尋裝置</span>
            <input
              className="mgmt-input"
              data-testid="fleet-filter"
              onChange={(event) => onFilterChange(event.target.value)}
              placeholder="搜尋 Client ID、顯示名稱或群組…"
              value={filter}
            />
          </label>
          <div className="fleet-quick-actions">
            <a
              className="device-fleet-btn-action"
              href="#create-device-section"
              title="快速前往註冊裝置表單"
            >
              + 新增裝置
            </a>
            <a
              className="device-fleet-btn-action"
              href="#create-group-section"
              title="快速前往建立群組表單"
            >
              + 新增群組
            </a>
          </div>
        </div>
      </div>

      {activeStatusFilter && activeStatusFilter !== "all" ? (
        <div className="fleet-active-filter-banner">
          <span>目前套用 KPI 快速過濾：</span>
          <span className="fleet-active-filter-tag">
            {activeStatusFilter === "online"
              ? "只顯示「在線機台」"
              : activeStatusFilter === "unpaired"
              ? "只顯示「待配對裝置」"
              : activeStatusFilter === "offline"
              ? "只顯示「離線機台」"
              : activeStatusFilter}
          </span>
          <button
            className="fleet-active-filter-clear"
            onClick={onClearStatusFilter}
            type="button"
          >
            ✕ 清除條件
          </button>
        </div>
      ) : null}

      {model.state === "loading" ? <p role="status">正在載入裝置清單…</p> : null}
      {model.state === "empty" ? (
        <div className="fleet-empty-card">
          <p role="status">目前沒有符合條件的裝置。</p>
          {(filter || (activeStatusFilter && activeStatusFilter !== "all")) && (
            <button
              className="device-fleet-btn-action"
              onClick={() => {
                onFilterChange("");
                onClearStatusFilter?.();
              }}
              type="button"
            >
              清除所有篩選條件
            </button>
          )}
        </div>
      ) : null}
      {model.state === "ready" ? (
        <div className="device-fleet-table-wrap">
          <table className="fleet-table">
            <thead>
              <tr>
                <th>裝置身份</th>
                <th>群組 / 廠區</th>
                <th>運作狀態</th>
                <th>播放診斷</th>
                <th>節目版本 (Rollout)</th>
                <th>維運操作</th>
              </tr>
            </thead>
            <tbody>
              {model.rows.map((row) => (
                <tr key={row.key}>
                  <td>
                    <div className="fleet-device-identity">
                      <strong>{row.displayName}</strong>
                      <code className="fleet-device-client-id">{row.clientId}</code>
                    </div>
                  </td>
                  <td>
                    <div className="fleet-group-cell">
                      <strong>{row.groupName ?? "未指派"}</strong>
                      <span
                        className={`fleet-site-pill ${
                          row.siteScope === "cl"
                            ? "fleet-site-pill--cl"
                            : row.siteScope === "kn"
                            ? "fleet-site-pill--kn"
                            : ""
                        }`}
                      >
                        {row.siteScope?.toUpperCase() ?? "—"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="fleet-status-chips">
                      <Chip tone={stateTones[row.operationalState]}>
                        {stateLabels[row.operationalState]}
                      </Chip>
                      <Chip tone={row.paired ? "success" : "warning"}>
                        {row.paired ? "已配對" : "未配對"}
                      </Chip>
                      <Chip tone={row.enabled ? "success" : "danger"}>
                        {row.enabled ? "已啟用" : "已停用"}
                      </Chip>
                      {row.duplicateIdentity ? (
                        <Chip tone="danger">重複身分</Chip>
                      ) : null}
                      <small className="fleet-connection-count">{row.connectedCount} 個連線</small>
                    </div>
                  </td>
                  <td>
                    <div className="fleet-playback-diag">
                      <strong>{row.route ?? "—"}</strong>
                      <small
                        className="fleet-last-seen"
                        title={row.lastSeenAt ? `最後心跳：${row.lastSeenAt}` : "從未連線"}
                      >
                        {row.lastSeenAt ? (
                          <>
                            <span className="fleet-relative-time">
                              {formatRelativeTime(row.lastSeenAt)}
                            </span>
                            <span className="fleet-exact-time">
                              {" "}· {row.lastSeenAt.slice(11, 19)}
                            </span>
                          </>
                        ) : (
                          "從未連線"
                        )}
                      </small>
                    </div>
                  </td>
                  <td>
                    <div className="fleet-rollout-cell">
                      <strong>
                        {row.appliedVersion !== null ? `v${row.appliedVersion}` : "未套用"}
                        {row.desiredVersion !== null && row.appliedVersion !== row.desiredVersion
                          ? ` (預期 v${row.desiredVersion})`
                          : ""}
                      </strong>
                      <small>{row.rolloutError ?? row.rolloutState}</small>
                    </div>
                  </td>
                  <td>
                    <div className="fleet-table-actions">
                      <button
                        className="device-fleet-btn-action"
                        data-action="edit-device"
                        disabled={mutationPending}
                        onClick={() => onEditDevice(row)}
                        type="button"
                      >
                        編輯
                      </button>
                      <button
                        className={`device-fleet-btn-action ${
                          !row.paired ? "is-accent" : ""
                        }`}
                        data-action={row.pairingAction}
                        disabled={mutationPending}
                        onClick={() => onPreparePairing(row)}
                        type="button"
                      >
                        {row.pairingAction === "re-pair" ? "重新配對" : "配對"}
                      </button>
                      <button
                        className={`device-fleet-btn-action ${
                          row.enabled ? "is-danger" : ""
                        }`}
                        disabled={mutationPending}
                        onClick={() => void onToggleDevice(row)}
                        type="button"
                      >
                        {row.enabled ? "停用" : "啟用"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </OpsSurface>
  );
}
