import { useState, type FormEvent } from "react";
import type { DeviceGroup } from "@solar-display/shared";
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

type DeviceCreateInput = {
  clientId: string;
  displayName: string;
  enabled: true;
  groupId: number;
};

type GroupCreateInput = {
  enabled: true;
  name: string;
  playbackProfileId?: number;
  siteScope: "cl" | "kn";
};

export type DeviceFleetContentProps = {
  accessDenied: boolean;
  filter: string;
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
  onCreateDevice: (input: DeviceCreateInput) => Promise<void>;
  onCreateGroup: (input: GroupCreateInput) => Promise<void>;
  onEditDevice: (row: DeviceFleetRow) => Promise<void>;
  onEditGroup: (group: DeviceGroup) => Promise<void>;
  onFilterChange: (value: string) => void;
  onIssuePairing: (row: DeviceFleetRow) => Promise<void>;
  onToggleDevice: (row: DeviceFleetRow) => Promise<void>;
  onToggleGroup: (group: DeviceGroup) => Promise<void>;
  pairing: PairingDialogState;
  profileId: number | null;
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
  mutationError,
  mutationPending,
  onClosePairing,
  onCreateDevice,
  onCreateGroup,
  onEditDevice,
  onEditGroup,
  onFilterChange,
  onIssuePairing,
  onToggleDevice,
  onToggleGroup,
  pairing,
  profileId
}: DeviceFleetContentProps) {
  const [clientId, setClientId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [pairingCopied, setPairingCopied] = useState(false);
  const [siteScope, setSiteScope] = useState<"cl" | "kn">("cl");

  const submitDevice = async (event: FormEvent) => {
    event.preventDefault();
    const parsedGroupId = Number(groupId);
    if (!clientId.trim() || !displayName.trim() || !Number.isInteger(parsedGroupId)) {
      return;
    }
    await onCreateDevice({
      clientId: clientId.trim(),
      displayName: displayName.trim(),
      enabled: true,
      groupId: parsedGroupId
    });
    setClientId("");
    setDisplayName("");
  };

  const submitGroup = async (event: FormEvent) => {
    event.preventDefault();
    if (!groupName.trim()) return;
    await onCreateGroup({
      enabled: true,
      name: groupName.trim(),
      siteScope,
      ...(profileId === null ? {} : { playbackProfileId: profileId })
    });
    setGroupName("");
  };

  const issuePairing = async (row: DeviceFleetRow) => {
    if (
      row.pairingAction === "re-pair"
      && typeof window !== "undefined"
      && !window.confirm("重新配對後，新 Credential 交換成功時會撤銷舊 Credential。確定繼續？")
    ) {
      return;
    }
    await onIssuePairing(row);
  };

  const copyPairingPath = async () => {
    if (!pairing.issue || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(pairing.issue.pairingPath);
      setPairingCopied(true);
    } catch {
      setPairingCopied(false);
    }
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
          <OpsSurfaceTitle title="新增群組" caption="Site Scope 與 Default Profile" />
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
            <button type="submit" disabled={mutationPending}>
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
                    {group.name} · {group.siteScope.toUpperCase()}
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
                disabled={mutationPending}
                onClick={() => void onEditGroup(group)}
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
                        disabled={mutationPending}
                        onClick={() => void onEditDevice(row)}
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

      {pairing.issue ? (
        <div className="device-fleet-dialog-backdrop" role="presentation">
          <section
            aria-labelledby="device-fleet-pairing-title"
            aria-modal="true"
            className="device-fleet-dialog"
            role="dialog"
          >
            <small>ONE-TIME PAIRING</small>
            <h2 id="device-fleet-pairing-title">一次性配對連結</h2>
            <p>此連結只在本次建立後顯示；關閉視窗即從畫面記憶體清除。</p>
            <code>{pairing.issue.pairingPath}</code>
            <small>到期：{pairing.issue.expiresAt}</small>
            <button
              type="button"
              data-action="copy-pairing"
              onClick={() => void copyPairingPath()}
            >
              {pairingCopied ? "已複製" : "複製連結"}
            </button>
            <button
              type="button"
              data-action="close-pairing"
              onClick={() => {
                setPairingCopied(false);
                onClosePairing();
              }}
            >
              關閉並清除
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
