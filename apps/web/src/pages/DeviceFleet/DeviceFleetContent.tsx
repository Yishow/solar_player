import { useState, type FormEvent } from "react";
import type {
  DeviceGroup,
  PlaybackProfileSummary
} from "@solar-display/shared";
import {
  Chip,
  OpsInfoBanner,
  OpsSurface,
  OpsSurfaceTitle
} from "../../components/management";
import type {
  DeviceFleetRow,
  PairingDialogState
} from "./viewModel";
import {
  GroupEditDialog,
  type GroupEditInput
} from "./GroupEditDialog";
import { PairingDialog } from "./PairingDialog";

type DeviceCreateInput = {
  clientId: string;
  displayName: string;
  enabled: true;
  groupId: number;
};

export type DeviceEditInput = {
  displayName: string;
  enabled: boolean;
  groupId: number;
};

export type GroupCreateInput = {
  enabled: true;
  name: string;
  playbackProfileId: number;
  siteScope: "cl" | "kn";
};

export type DeviceFleetContentProps = {
  accessDenied: boolean;
  filter: string;
  profiles: PlaybackProfileSummary[];
  model: {
    groups: DeviceGroup[];
    rows: DeviceFleetRow[];
    rolloutSummary: {
      applied: number;
      failed: number;
      offline: number;
      total: number;
      waiting: number;
    };
    state: "empty" | "loading" | "ready";
    unavailable: string[];
  };
  mutationError: string;
  mutationPending: boolean;
  onClosePairing: () => void;
  onCreateDevice: (input: DeviceCreateInput) => Promise<boolean>;
  onCreateGroup: (input: GroupCreateInput) => Promise<boolean | void>;
  onEditDevice: (row: DeviceFleetRow, input: DeviceEditInput) => Promise<boolean | void>;
  onEditGroup: (group: DeviceGroup, input: GroupEditInput) => Promise<boolean | void>;
  onFilterChange: (value: string) => void;
  onIssuePairing: (row: DeviceFleetRow) => Promise<void>;
  onPreparePairing: (row: DeviceFleetRow) => void;
  onToggleDevice: (row: DeviceFleetRow) => Promise<void>;
  onToggleGroup: (group: DeviceGroup) => Promise<void>;
  pairing: PairingDialogState;
  pairingPreparation: DeviceFleetRow | null;
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

export function DeviceFleetContent({
  accessDenied,
  filter,
  model,
  profiles,
  mutationError,
  mutationPending,
  onClosePairing,
  onCreateDevice,
  onCreateGroup,
  onEditDevice,
  onEditGroup,
  onFilterChange,
  onIssuePairing,
  onPreparePairing,
  onToggleDevice,
  onToggleGroup,
  pairing,
  pairingPreparation
}: DeviceFleetContentProps) {
  const [clientId, setClientId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [deviceEditDisplayName, setDeviceEditDisplayName] = useState("");
  const [deviceEditEnabled, setDeviceEditEnabled] = useState(true);
  const [deviceEditGroupId, setDeviceEditGroupId] = useState("");
  const [editingDevice, setEditingDevice] = useState<DeviceFleetRow | null>(null);
  const [groupId, setGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupPlaybackProfileId, setGroupPlaybackProfileId] = useState("");
  const [editingGroup, setEditingGroup] = useState<DeviceGroup | null>(null);
  const [siteScope, setSiteScope] = useState<"cl" | "kn">("cl");
  const activeProfiles = profiles.filter((profile) => profile.archivedAt === null);
  const defaultActiveProfile = activeProfiles.find((profile) => profile.isDefault);
  const selectedCreateProfileId =
    groupPlaybackProfileId || String(defaultActiveProfile?.id ?? "");

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

  const submitGroup = async (event: FormEvent) => {
    event.preventDefault();
    const parsedProfileId = Number(selectedCreateProfileId);
    if (
      !groupName.trim()
      || !Number.isInteger(parsedProfileId)
      || !activeProfiles.some((profile) => profile.id === parsedProfileId)
    ) return;
    const saved = await onCreateGroup({
      enabled: true,
      name: groupName.trim(),
      playbackProfileId: parsedProfileId,
      siteScope,
    });
    if (saved !== false) {
      setGroupName("");
    }
  };

  const openDeviceEdit = (row: DeviceFleetRow) => {
    setEditingDevice(row);
    setDeviceEditDisplayName(row.displayName);
    setDeviceEditEnabled(row.enabled);
    setDeviceEditGroupId(row.groupId === null ? "" : String(row.groupId));
  };

  const closeDeviceEdit = () => {
    setEditingDevice(null);
    setDeviceEditDisplayName("");
    setDeviceEditGroupId("");
  };

  const submitDeviceEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingDevice || !deviceEditDisplayName.trim()) return;

    const parsedGroupId = Number(deviceEditGroupId);
    const selectedGroup = model.groups.find((group) => group.id === parsedGroupId);
    if (!selectedGroup || !Number.isInteger(parsedGroupId) || parsedGroupId <= 0) {
      return;
    }
    if (deviceEditEnabled && !selectedGroup.enabled) {
      return;
    }

    const saved = await onEditDevice(editingDevice, {
      displayName: deviceEditDisplayName.trim(),
      enabled: deviceEditEnabled,
      groupId: parsedGroupId
    });
    if (saved !== false) {
      closeDeviceEdit();
    }
  };

  const issuePairing = (row: DeviceFleetRow) => {
    onPreparePairing(row);
  };

  if (accessDenied) {
    return (
      <main className="device-fleet-page">
        <header className="device-fleet-page__header">
          <div>
            <small>DEVICE FLEET</small>
            <h1>裝置與群組</h1>
          </div>
        </header>
        <OpsInfoBanner
          tone="error"
          title="管理權限已失效"
          detail="請回到受信任的管理入口重新驗證後再操作。"
        />
      </main>
    );
  }

  return (
    <main className="device-fleet-page">
      <header className="device-fleet-page__header">
        <div>
          <small>DEVICE FLEET</small>
          <h1>裝置與群組</h1>
          <p>集中管理約 50 台展示端的身份、配對、廠區與運行狀態。</p>
        </div>
        <div className="device-fleet-page__summary">
          <strong>{model.rows.length}</strong>
          <span>目前裝置</span>
          <small>
            已套用 {model.rolloutSummary.applied} · 等待 {model.rolloutSummary.waiting}
            {" "}· 離線 {model.rolloutSummary.offline} · 失敗 {model.rolloutSummary.failed}
          </small>
        </div>
      </header>

      {model.unavailable.length > 0 ? (
        <OpsInfoBanner
          tone="warning"
          title="部分資料暫時無法取得"
          detail={`Unavailable: ${model.unavailable.join(", ")}`}
        />
      ) : null}
      {mutationError ? (
        <OpsInfoBanner tone="error" title="操作失敗" detail={mutationError} />
      ) : null}
      {mutationPending ? <p role="status">正在儲存變更…</p> : null}

      <section className="device-fleet-page__forms" aria-label="新增資源">
        <OpsSurface family="operations">
          <OpsSurfaceTitle title="新增群組" caption="Site Scope 與 Playback Profile" />
          <form onSubmit={submitGroup}>
            <label>
              群組名稱
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                disabled={mutationPending}
              />
            </label>
            <label>
              廠區
              <select
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
                data-field="group-create-playback-profile"
                value={selectedCreateProfileId}
                onChange={(event) => setGroupPlaybackProfileId(event.target.value)}
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
            <button
              type="submit"
              disabled={
                mutationPending
                || !groupName.trim()
                || !activeProfiles.some((profile) => profile.id === Number(selectedCreateProfileId))
              }
            >
              建立群組
            </button>
          </form>
        </OpsSurface>

        <OpsSurface family="operations">
          <OpsSurfaceTitle title="新增裝置" caption="建立後再簽發一次性配對連結" />
          <form onSubmit={submitDevice}>
            <label>
              Client ID
              <input
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                disabled={mutationPending}
              />
            </label>
            <label>
              顯示名稱
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                disabled={mutationPending}
              />
            </label>
            <label>
              群組
              <select
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                disabled={mutationPending}
              >
                <option value="">選擇群組</option>
                {model.groups.filter((group) => group.enabled).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} · {group.siteScope.toUpperCase()} · {group.playbackProfile.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={mutationPending || !groupId}>
              建立裝置
            </button>
          </form>
        </OpsSurface>
      </section>

      <OpsSurface family="operations" aria-label="群組管理">
        <OpsSurfaceTitle title="群組" caption={`${model.groups.length} groups`} />
        <div className="device-fleet-group-list">
          {model.groups.map((group) => (
            <article key={group.id}>
              <div>
                <strong>{group.name}</strong>
                <small>
                  {group.siteScope.toUpperCase()} · {group.playbackProfile.name}
                </small>
              </div>
              <Chip tone={group.enabled ? "success" : "danger"}>
                {group.enabled ? "啟用" : "停用"}
              </Chip>
              <button
                type="button"
                data-action="edit-group"
                disabled={mutationPending}
                onClick={() => setEditingGroup(group)}
              >
                編輯
              </button>
              <button
                type="button"
                disabled={mutationPending}
                onClick={() => void onToggleGroup(group)}
              >
                {group.enabled ? "停用" : "啟用"}
              </button>
            </article>
          ))}
        </div>
      </OpsSurface>

      <OpsSurface family="operations" aria-label="裝置清單">
        <OpsSurfaceTitle title="裝置狀態" caption="Identity-led operational table" />
        <label className="device-fleet-filter">
          搜尋裝置
          <input
            data-testid="fleet-filter"
            placeholder="Client ID、顯示名稱或群組"
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
          />
        </label>
        {model.state === "loading" ? <p role="status">正在載入裝置清單…</p> : null}
        {model.state === "empty" ? <p role="status">目前沒有符合條件的裝置。</p> : null}
        {model.state === "ready" ? (
          <div className="device-fleet-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>裝置</th>
                  <th>群組 / 廠區</th>
                  <th>狀態</th>
                  <th>播放診斷</th>
                  <th>Profile rollout</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {model.rows.map((row) => (
                  <tr key={row.key}>
                    <td>
                      <strong>{row.displayName}</strong>
                      <small>{row.clientId}</small>
                    </td>
                    <td>
                      <strong>{row.groupName ?? "未指派"}</strong>
                      <small>{row.siteScope?.toUpperCase() ?? "—"}</small>
                    </td>
                    <td>
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
                      <small>{row.connectedCount} 個連線</small>
                    </td>
                    <td>
                      <strong>{row.route ?? "—"}</strong>
                      <small>
                        {row.pageKey ?? "無頁面"} · {row.isPlaying ? "播放中" : "未播放"}
                      </small>
                      <small>最後上線：{row.lastSeenAt ?? "尚無紀錄"}</small>
                    </td>
                    <td>
                      <strong>{row.rolloutState}</strong>
                      <small>
                        desired {row.desiredVersion ?? "—"} · applied {row.appliedVersion ?? "—"}
                      </small>
                      {row.rolloutError ? <small>{row.rolloutError}</small> : null}
                    </td>
                    <td>
                      <button
                        type="button"
                        data-action={row.pairingAction}
                        disabled={mutationPending}
                        onClick={() => void issuePairing(row)}
                      >
                        {row.pairingAction === "pair" ? "配對" : "重新配對"}
                      </button>
                      <button
                        type="button"
                        data-action="edit-device"
                        disabled={mutationPending}
                        onClick={() => openDeviceEdit(row)}
                      >
                        編輯
                      </button>
                      <button
                        type="button"
                        disabled={mutationPending}
                        onClick={() => void onToggleDevice(row)}
                      >
                        {row.enabled ? "停用" : "啟用"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </OpsSurface>

      {editingDevice ? (
        <div className="device-fleet-dialog-backdrop" role="presentation">
          <section
            aria-labelledby="device-fleet-device-edit-title"
            aria-modal="true"
            className="device-fleet-dialog"
            data-testid="device-edit-dialog"
            role="dialog"
          >
            <small>DEVICE MANAGEMENT</small>
            <h2 id="device-fleet-device-edit-title">編輯裝置</h2>
            <form onSubmit={submitDeviceEdit}>
              <label>
                顯示名稱
                <input
                  data-field="device-display-name"
                  value={deviceEditDisplayName}
                  onChange={(event) => setDeviceEditDisplayName(event.target.value)}
                  disabled={mutationPending}
                />
              </label>
              <label>
                群組
                <select
                  data-field="device-group"
                  value={deviceEditGroupId}
                  onChange={(event) => setDeviceEditGroupId(event.target.value)}
                  disabled={mutationPending}
                >
                  <option value="">選擇群組</option>
                  {model.groups
                    .filter((group) => !deviceEditEnabled || group.enabled)
                    .map((group) => (
                      <option
                        key={group.id}
                        value={group.id}
                        disabled={deviceEditEnabled && !group.enabled}
                      >
                        {group.name} · {group.siteScope.toUpperCase()} · {group.playbackProfile.name}
                        {!group.enabled ? " · 已停用" : ""}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <input
                  data-field="device-enabled"
                  type="checkbox"
                  checked={deviceEditEnabled}
                  onChange={(event) => setDeviceEditEnabled(event.target.checked)}
                  disabled={mutationPending}
                />
                啟用裝置
              </label>
              <div className="device-fleet-dialog__actions">
                <button
                  type="submit"
                  data-action="save-device-edit"
                  disabled={
                    mutationPending
                    || !deviceEditGroupId
                    || (
                      deviceEditEnabled
                      && !model.groups.find((group) => String(group.id) === deviceEditGroupId)?.enabled
                    )
                  }
                >
                  儲存裝置
                </button>
                <button
                  type="button"
                  data-action="cancel-device-edit"
                  disabled={mutationPending}
                  onClick={closeDeviceEdit}
                >
                  取消
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {editingGroup ? (
        <GroupEditDialog
          group={editingGroup}
          mutationPending={mutationPending}
          onClose={() => setEditingGroup(null)}
          onSubmit={(input) => onEditGroup(editingGroup, input)}
          profiles={profiles}
        />
      ) : null}

      {pairingPreparation ? (
        <PairingDialog
          device={pairingPreparation}
          issue={pairing.issue}
          mutationError={mutationError}
          mutationPending={mutationPending}
          onClose={onClosePairing}
          onConfirm={() => onIssuePairing(pairingPreparation)}
        />
      ) : null}
    </main>
  );
}
