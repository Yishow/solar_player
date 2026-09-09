import type { DeviceGroup } from "@solar-display/shared";
import {
  Chip,
  OpsSurface,
  OpsSurfaceTitle
} from "../../components/management";

export type GroupListSectionProps = {
  groups: DeviceGroup[];
  mutationPending: boolean;
  onEditGroup: (group: DeviceGroup) => void;
  onToggleGroup: (group: DeviceGroup) => Promise<void>;
};

export function GroupListSection({
  groups,
  mutationPending,
  onEditGroup,
  onToggleGroup
}: GroupListSectionProps) {
  const clCount = groups.filter((g) => g.siteScope === "cl").length;
  const knCount = groups.filter((g) => g.siteScope === "kn").length;

  return (
    <OpsSurface family="operations" aria-label="群組管理" id="group-list-section">
      <OpsSurfaceTitle
        caption={`共 ${groups.length} 個群組 (CL 中壢 ${clCount} · KN 觀音 ${knCount})，決定廠區數據與輪播節目清單`}
        title="裝置群組"
      />
      <div className="device-fleet-group-grid">
        {groups.map((group) => {
          const isCl = group.siteScope === "cl";
          return (
            <article
              className={`fleet-group-card ${!group.enabled ? "is-disabled" : ""}`}
              key={group.id}
            >
              <div className="fleet-group-card__header">
                <span
                  className={`fleet-site-badge ${
                    isCl ? "fleet-site-badge--cl" : "fleet-site-badge--kn"
                  }`}
                >
                  {group.siteScope.toUpperCase()} 廠區
                </span>
                <Chip tone={group.enabled ? "success" : "danger"}>
                  {group.enabled ? "啟用" : "停用"}
                </Chip>
              </div>

              <div className="fleet-group-card__body">
                <strong className="fleet-group-card__name">{group.name}</strong>
                <small className="fleet-group-card__meta">
                  {group.siteScope.toUpperCase()} · {group.playbackProfile.name}
                </small>
              </div>

              <div className="fleet-group-card__actions">
                <button
                  className="device-fleet-btn-action"
                  data-action="edit-group"
                  disabled={mutationPending}
                  onClick={() => onEditGroup(group)}
                  type="button"
                >
                  編輯
                </button>
                <button
                  className={`device-fleet-btn-action ${
                    group.enabled ? "is-danger" : ""
                  }`}
                  disabled={mutationPending}
                  onClick={() => void onToggleGroup(group)}
                  type="button"
                >
                  {group.enabled ? "停用" : "啟用"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </OpsSurface>
  );
}
