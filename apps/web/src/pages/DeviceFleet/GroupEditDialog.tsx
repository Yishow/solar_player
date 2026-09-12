import { useState, type FormEvent } from "react";
import { useModalFocus } from "../../components/management/useModalFocus";
import type {
  DeviceGroup,
  PlaybackProfileSummary
} from "@solar-display/shared";

export type GroupEditInput = {
  enabled: boolean;
  name: string;
  playbackProfileId: number;
  siteScope: "cl" | "kn";
};

type GroupEditDialogProps = {
  group: DeviceGroup;
  mutationPending: boolean;
  onClose: () => void;
  onSubmit: (input: GroupEditInput) => Promise<boolean | void>;
  profiles: PlaybackProfileSummary[];
};

export function GroupEditDialog({
  group,
  mutationPending,
  onClose,
  onSubmit,
  profiles
}: GroupEditDialogProps) {
  const dialogRef = useModalFocus(onClose, mutationPending);
  const activeProfiles = profiles.filter((profile) => profile.archivedAt === null);
  const currentProfileIsActive = activeProfiles.some(
    (profile) => profile.id === group.playbackProfileId
  );
  const [enabled, setEnabled] = useState(group.enabled);
  const [name, setName] = useState(group.name);
  const [playbackProfileId, setPlaybackProfileId] = useState(
    currentProfileIsActive ? String(group.playbackProfileId) : ""
  );
  const [siteScope, setSiteScope] = useState<"cl" | "kn">(group.siteScope);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const parsedProfileId = Number(playbackProfileId);
    if (
      !trimmedName
      || !Number.isInteger(parsedProfileId)
      || !activeProfiles.some((profile) => profile.id === parsedProfileId)
    ) {
      return;
    }

    const saved = await onSubmit({
      enabled,
      name: trimmedName,
      playbackProfileId: parsedProfileId,
      siteScope
    });
    if (saved !== false) {
      onClose();
    }
  };

  return (
    <div className="device-fleet-dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        tabIndex={-1}
        aria-labelledby="device-fleet-group-edit-title"
        aria-modal="true"
        className="device-fleet-dialog"
        data-testid="group-edit-dialog"
        role="dialog"
      >
        <small>GROUP MANAGEMENT</small>
        <h2 id="device-fleet-group-edit-title">編輯群組</h2>
        {currentProfileIsActive ? null : (
          <p role="alert">目前 Playback Profile 已封存，請選擇 active profile。</p>
        )}
        <form onSubmit={submit}>
          <label>
            群組名稱
            <input
              className="mgmt-input"
              data-field="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={mutationPending}
            />
          </label>
          <label>
            廠區
            <select
              className="mgmt-select"
              data-field="group-site-scope"
              value={siteScope}
              onChange={(event) => setSiteScope(event.target.value as "cl" | "kn")}
              disabled={mutationPending}
            >
              <option value="cl">CL 中壢</option>
              <option value="kn">KN 觀音</option>
            </select>
          </label>
          <label>
            Playback Profile
            <select
              className="mgmt-select"
              data-field="group-playback-profile"
              value={playbackProfileId}
              onChange={(event) => setPlaybackProfileId(event.target.value)}
              disabled={mutationPending}
            >
              <option value="">選擇 active Playback Profile</option>
              {activeProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} · {profile.profileKey}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              data-field="group-enabled"
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              disabled={mutationPending}
              style={{ width: 18, height: 18, accentColor: "var(--green)" }}
            />
            啟用群組
          </label>
          <div className="device-fleet-dialog__actions">
            <button
              type="submit"
              data-action="save-group-edit"
              disabled={
                mutationPending
                || !name.trim()
                || !activeProfiles.some((profile) => profile.id === Number(playbackProfileId))
              }
            >
              儲存群組
            </button>
            <button
              type="button"
              data-action="cancel-group-edit"
              disabled={mutationPending}
              onClick={onClose}
            >
              取消
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
