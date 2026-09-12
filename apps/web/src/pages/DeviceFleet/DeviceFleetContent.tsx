import { useMemo, useState } from "react";
import type {
  DeviceGroup,
  PlaybackProfileSummary
} from "@solar-display/shared";
import { OpsInfoBanner } from "../../components/management";
import { PlaybackProfilesContent } from "../PlaybackProfiles/PlaybackProfilesContent";
import type {
  DeviceFleetRow,
  PairingDialogState
} from "./viewModel";
import { DeviceCreateSection } from "./DeviceCreateSection";
import { DeviceEditDialog } from "./DeviceEditDialog";
import { DeviceTableSection } from "./DeviceTableSection";
import { FleetKpiBar, type FleetKpiStatusFilter } from "./FleetKpiBar";
import { GroupEditDialog, type GroupEditInput } from "./GroupEditDialog";
import { GroupListSection } from "./GroupListSection";
import { PairingDialog } from "./PairingDialog";

export type DeviceCreateInput = {
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
  activeTab?: "devices" | "profiles";
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
  onCreateDevice: (input: DeviceCreateInput) => Promise<boolean>;
  onCreateGroup: (input: GroupCreateInput) => Promise<boolean | void>;
  onEditDevice: (row: DeviceFleetRow, input: DeviceEditInput) => Promise<boolean | void>;
  onEditGroup: (group: DeviceGroup, input: GroupEditInput) => Promise<boolean | void>;
  onFilterChange: (value: string) => void;
  onIssuePairing: (row: DeviceFleetRow) => Promise<void>;
  onPreparePairing: (row: DeviceFleetRow) => void;
  onProfilesRefreshed?: (profiles: PlaybackProfileSummary[]) => void;
  onTabChange?: (tab: "devices" | "profiles") => void;
  onToggleDevice: (row: DeviceFleetRow) => Promise<void>;
  onToggleGroup: (group: DeviceGroup) => Promise<void>;
  pairing: PairingDialogState;
  pairingPreparation: DeviceFleetRow | null;
  profiles: PlaybackProfileSummary[];
};

export function DeviceFleetContent({
  accessDenied,
  activeTab: activeTabProp,
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
  onPreparePairing,
  onProfilesRefreshed,
  onTabChange,
  onToggleDevice,
  onToggleGroup,
  pairing,
  pairingPreparation,
  profiles
}: DeviceFleetContentProps) {
  const [internalTab, setInternalTab] = useState<"devices" | "profiles">("devices");
  const activeTab = activeTabProp ?? internalTab;
  const handleTabChange = (tab: "devices" | "profiles") => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };
  const [statusFilter, setStatusFilter] = useState<FleetKpiStatusFilter>("all");
  const [editingGroup, setEditingGroup] = useState<DeviceGroup | null>(null);
  const [editingDevice, setEditingDevice] = useState<DeviceFleetRow | null>(null);

  const displayedRows = useMemo(() => {
    if (statusFilter === "online") {
      return model.rows.filter((r) => r.operationalState === "online");
    }
    if (statusFilter === "unpaired") {
      return model.rows.filter((r) => !r.paired && r.enabled);
    }
    if (statusFilter === "offline") {
      return model.rows.filter(
        (r) => r.operationalState === "offline" || r.operationalState === "disabled"
      );
    }
    return model.rows;
  }, [model.rows, statusFilter]);

  const displayedModel = useMemo(() => {
    return {
      ...model,
      rows: displayedRows,
      state: (model.state === "ready" && displayedRows.length === 0 ? "empty" : model.state) as "ready" | "empty" | "loading"
    };
  }, [model, displayedRows]);

  if (accessDenied) {
    return (
      <main className="device-fleet-page">
        <header className="device-fleet-page__header">
          <div>
            <p className="device-fleet-page__kicker">DEVICE OPERATIONS</p>
            <h1>裝置管理</h1>
            <p className="device-fleet-page__subtitle">Device & Display Management</p>
          </div>
        </header>
        <OpsInfoBanner
          detail="請回到受信任的管理入口重新驗證後再操作。"
          title="管理權限已失效"
          tone="error"
        />
      </main>
    );
  }

  const hasUnpairedDevices = model.rows.some((row) => !row.paired && row.enabled);
  const unpairedCount = model.rows.filter((row) => !row.paired && row.enabled).length;

  return (
    <main className="device-fleet-page" data-dialog-focus-fallback tabIndex={-1}>
      <header className="device-fleet-page__header">
        <div>
          <p className="device-fleet-page__kicker">DISPLAY DEVICE HUB</p>
          <h1>裝置<em>管理</em></h1>
          <p className="device-fleet-page__subtitle">Device & Playback Governance</p>
          <p className="device-fleet-page__desc">
            集中管理智慧電子看板之身份認證、廠區數據源 (CL/KN)、連線狀態與播放策略版本。
          </p>
        </div>

        <nav aria-label="裝置管理分頁" className="device-mgmt-tabs" role="tablist">
          <button
            aria-selected={activeTab === "devices"}
            className={`device-mgmt-tab ${activeTab === "devices" ? "is-active" : ""}`}
            onClick={() => handleTabChange("devices")}
            role="tab"
            type="button"
          >
            <span className="device-mgmt-tab__title">實體看板與群組</span>
            <span className="device-mgmt-tab__desc">機台狀態 · 配對 · 廠區</span>
          </button>
          <button
            aria-selected={activeTab === "profiles"}
            className={`device-mgmt-tab ${activeTab === "profiles" ? "is-active" : ""}`}
            onClick={() => handleTabChange("profiles")}
            role="tab"
            type="button"
          >
            <span className="device-mgmt-tab__title">播放策略版本</span>
            <span className="device-mgmt-tab__desc">節目單 · 輪播秒數 · 發布</span>
          </button>
        </nav>
      </header>

      {activeTab === "devices" ? (
        <>
          <FleetKpiBar
            activeFilter={statusFilter}
            groupCount={model.groups.length}
            onScrollToGroups={() => {
              document.getElementById("group-list-section")?.scrollIntoView({ behavior: "smooth" });
            }}
            onSelectFilter={setStatusFilter}
            rolloutSummary={model.rolloutSummary}
            rows={model.rows}
          />

          {hasUnpairedDevices ? (
            <OpsInfoBanner
              detail={
                <span>
                  目前有裝置尚未完成配對。請在下方裝置表格點選「配對」簽發憑證並開啟網頁；亦可於展示機前往{" "}
                  <a
                    className="font-medium underline hover:text-amber-400"
                    href="/device-pairing"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    /device-pairing
                  </a>{" "}
                  輸入配對 Token。
                </span>
              }
              title={`注意：有 ${unpairedCount} 台已啟用裝置尚未配對`}
              tone="warning"
            />
          ) : null}

          {model.unavailable.length > 0 ? (
            <OpsInfoBanner
              detail={`Unavailable: ${model.unavailable.join(", ")}`}
              title="部分資料暫時無法取得"
              tone="warning"
            />
          ) : null}
          {mutationError ? (
            <OpsInfoBanner detail={mutationError} title="操作失敗" tone="error" />
          ) : null}
          {mutationPending ? <p role="status">正在儲存變更…</p> : null}

          <DeviceTableSection
            activeStatusFilter={statusFilter}
            filter={filter}
            model={displayedModel}
            mutationPending={mutationPending}
            onClearStatusFilter={() => setStatusFilter("all")}
            onEditDevice={setEditingDevice}
            onFilterChange={onFilterChange}
            onPreparePairing={onPreparePairing}
            onToggleDevice={onToggleDevice}
          />

          <GroupListSection
            groups={model.groups}
            mutationPending={mutationPending}
            onEditGroup={setEditingGroup}
            onToggleGroup={onToggleGroup}
          />

          <DeviceCreateSection
            groups={model.groups}
            mutationPending={mutationPending}
            onCreateDevice={onCreateDevice}
            onCreateGroup={onCreateGroup}
            profiles={profiles}
          />
        </>
      ) : (
        <section aria-label="播放策略版本治理" className="device-mgmt-profiles-panel">
          <div className="device-mgmt-domain-guide">
            <strong>📋 播放策略版本治理（Playback Profile Governance）</strong>
            <p>
              此處負責定義各廠區群組所套用的「節目輪播清單」、「每頁停留時間」與「排程亮度」。
              透過 Draft（草稿）編輯、CL／KN 預覽、受控不可變版本發布與一鍵 Rollback（回滾），
              保證現場看板即時無縫同步且絕不黑屏。
            </p>
          </div>
          <PlaybackProfilesContent
            devices={model.rows}
            groups={model.groups}
            loaderData={{ loadError: "", profiles }}
            onProfilesRefreshed={onProfilesRefreshed}
          />
        </section>
      )}

      {editingDevice ? (
        <DeviceEditDialog
          device={editingDevice}
          groups={model.groups}
          mutationPending={mutationPending}
          onClose={() => setEditingDevice(null)}
          onSubmit={(input) => onEditDevice(editingDevice, input)}
        />
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
