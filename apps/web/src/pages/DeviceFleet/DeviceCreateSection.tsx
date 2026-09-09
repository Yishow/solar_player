import { useState, type FormEvent } from "react";
import type {
  DeviceGroup,
  PlaybackProfileSummary
} from "@solar-display/shared";
import {
  OpsSurface,
  OpsSurfaceTitle
} from "../../components/management";
import type {
  DeviceCreateInput,
  GroupCreateInput
} from "./DeviceFleetContent";

export type DeviceCreateSectionProps = {
  groups: DeviceGroup[];
  mutationPending: boolean;
  onCreateDevice: (input: DeviceCreateInput) => Promise<boolean>;
  onCreateGroup: (input: GroupCreateInput) => Promise<boolean | void>;
  profiles: PlaybackProfileSummary[];
};

export function DeviceCreateSection({
  groups,
  mutationPending,
  onCreateDevice,
  onCreateGroup,
  profiles
}: DeviceCreateSectionProps) {
  const [groupName, setGroupName] = useState("");
  const [siteScope, setSiteScope] = useState<"cl" | "kn">("cl");
  const [groupPlaybackProfileId, setGroupPlaybackProfileId] = useState("");

  const [clientId, setClientId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [groupId, setGroupId] = useState("");

  const activeProfiles = profiles.filter((profile) => profile.archivedAt === null);
  const defaultActiveProfile = activeProfiles.find((profile) => profile.isDefault);
  const selectedCreateProfileId =
    groupPlaybackProfileId || String(defaultActiveProfile?.id ?? "");

  const activeGroups = groups.filter((g) => g.enabled);

  const submitGroup = async (event: FormEvent) => {
    event.preventDefault();
    const parsedProfileId = Number(selectedCreateProfileId);
    if (
      !groupName.trim() ||
      !Number.isInteger(parsedProfileId) ||
      !activeProfiles.some((profile) => profile.id === parsedProfileId)
    ) {
      return;
    }
    const saved = await onCreateGroup({
      enabled: true,
      name: groupName.trim(),
      playbackProfileId: parsedProfileId,
      siteScope
    });
    if (saved !== false) {
      setGroupName("");
    }
  };

  const submitDevice = async (event: FormEvent) => {
    event.preventDefault();
    const parsedGroupId = Number(groupId);
    if (!clientId.trim() || !displayName.trim() || !Number.isInteger(parsedGroupId)) {
      return;
    }
    const saved = await onCreateDevice({
      clientId: clientId.trim(),
      displayName: displayName.trim(),
      enabled: true,
      groupId: parsedGroupId
    });
    if (saved) {
      setClientId("");
      setDisplayName("");
    }
  };

  return (
    <section className="device-fleet-page__forms" aria-label="新增資源">
      <OpsSurface family="operations" id="create-device-section">
        <OpsSurfaceTitle
          caption="註冊實體展示機並綁定群組以套用對應廠區與節目"
          title="新增裝置"
        />
        <form className="device-fleet-form" onSubmit={submitDevice}>
          <label>
            Client ID
            <input
              className="mgmt-input"
              disabled={mutationPending}
              onChange={(event) => setClientId(event.target.value)}
              placeholder="例：cl-lobby-01"
              value={clientId}
            />
          </label>
          <label>
            顯示名稱
            <input
              className="mgmt-input"
              disabled={mutationPending}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="例：中壢大廳 01 號機"
              value={displayName}
            />
          </label>
          <label>
            所屬群組
            <select
              className="mgmt-select"
              disabled={mutationPending}
              onChange={(event) => setGroupId(event.target.value)}
              value={groupId}
            >
              <option value="">選擇運作中群組…</option>
              {activeGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} · {group.siteScope.toUpperCase()} · {group.playbackProfile.name}
                </option>
              ))}
            </select>
          </label>
          <div className="device-fleet-form__actions">
            <button
              className="device-fleet-btn-primary"
              disabled={
                mutationPending ||
                !clientId.trim() ||
                !displayName.trim() ||
                !groupId
              }
              type="submit"
            >
              建立裝置
            </button>
          </div>
        </form>
      </OpsSurface>

      <OpsSurface family="operations" id="create-group-section">
        <OpsSurfaceTitle
          caption="定義廠區範圍 (Site Scope) 與關聯播放節目清單 (Playback Profile)"
          title="新增群組"
        />
        <form className="device-fleet-form" onSubmit={submitGroup}>
          <label>
            群組名稱
            <input
              className="mgmt-input"
              disabled={mutationPending}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="例：CL Office"
              value={groupName}
            />
          </label>
          <label>
            廠區範圍
            <select
              className="mgmt-select"
              data-field="group-create-site-scope"
              disabled={mutationPending}
              onChange={(event) => setSiteScope(event.target.value as "cl" | "kn")}
              value={siteScope}
            >
              <option value="cl">CL (中壢廠)</option>
              <option value="kn">KN (觀音廠)</option>
            </select>
          </label>
          <label>
            套用 Playback Profile
            <select
              className="mgmt-select"
              data-field="group-create-playback-profile"
              disabled={mutationPending}
              onChange={(event) => setGroupPlaybackProfileId(event.target.value)}
              value={selectedCreateProfileId}
            >
              {activeProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                  {profile.isDefault ? " (預設)" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="device-fleet-form__actions">
            <button
              className="device-fleet-btn-primary"
              disabled={mutationPending || !groupName.trim()}
              type="submit"
            >
              建立群組
            </button>
          </div>
        </form>
      </OpsSurface>
    </section>
  );
}
