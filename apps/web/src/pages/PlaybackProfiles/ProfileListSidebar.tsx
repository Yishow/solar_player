import type { DeviceGroup, PlaybackProfileSummary } from "@solar-display/shared";
import { Chip } from "../../components/management";

export type ProfileListSidebarProps = {
  groups?: DeviceGroup[];
  onCreateProfile: () => void;
  onSelectProfile: (id: number) => void;
  pending: boolean;
  profiles: PlaybackProfileSummary[];
  selectedId: number | null;
};

export function ProfileListSidebar({
  groups,
  onCreateProfile,
  onSelectProfile,
  pending,
  profiles,
  selectedId
}: ProfileListSidebarProps) {
  return (
    <aside aria-label="Playback Profiles" className="profile-list-sidebar">
      <div className="profile-list-sidebar__header">
        <span className="profile-list-sidebar__title">策略清單</span>
        <button
          className="profile-btn-new"
          disabled={pending}
          onClick={onCreateProfile}
          type="button"
        >
          ＋ 新增
        </button>
      </div>

      <div className="profile-list-sidebar__items">
        {profiles.map((profile) => {
          const isSelected = profile.id === selectedId;
          const linkedGroups = (groups ?? []).filter(
            (g) => g.playbackProfileId === profile.id
          );
          return (
            <button
              className={`profile-nav-item ${isSelected ? "is-selected" : ""}`}
              disabled={pending || Boolean(profile.archivedAt)}
              key={profile.id}
              onClick={() => onSelectProfile(profile.id)}
              type="button"
            >
              <div className="profile-nav-item__content">
                <strong>{profile.name}</strong>
                <small>
                  {profile.isDefault ? "Default" : "Reusable"}
                  {linkedGroups.length > 0
                    ? ` · ${linkedGroups.length} 群組套用`
                    : ""}
                  {profile.archivedAt ? " · 已封存" : ""}
                </small>
              </div>
              <div className="profile-nav-item__badge">
                {profile.isDefault ? (
                  <Chip tone="success">預設</Chip>
                ) : profile.archivedAt ? (
                  <Chip tone="danger">封存</Chip>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
