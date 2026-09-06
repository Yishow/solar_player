import React from "react";
import type { ReactNode } from "react";
import type { DataHubManagementScope } from "../../../app/dataHub";
import type { ConnectionTestFeedback, MqttSettingsForm, MqttStatus } from "../../MqttSettings/viewModel";
import { SharedInfrastructureBanner } from "../SharedInfrastructureBanner";
import { BrokerForm } from "./BrokerForm";
import { ConnectionStatusCard } from "./ConnectionStatusCard";

export type ConnectionsViewProps = {
  settings: MqttSettingsForm;
  status: MqttStatus;
  lastConnectionTest: ConnectionTestFeedback;
  isTesting?: boolean;
  isSaving?: boolean;
  isDirty?: boolean;
  managementScope?: DataHubManagementScope;
  message?: string;
  errorMessage?: string;
  remoteSyncBanner?: ReactNode;
  onChange: <Key extends keyof MqttSettingsForm>(key: Key, value: MqttSettingsForm[Key]) => void;
  onTestConnection: () => void | Promise<void>;
  onSaveSettings: () => void | Promise<void>;
};

export function ConnectionsView({
  settings,
  status,
  lastConnectionTest,
  isTesting = false,
  isSaving = false,
  isDirty = false,
  managementScope = "all",
  message = "",
  errorMessage = "",
  remoteSyncBanner = null,
  onChange,
  onTestConnection,
  onSaveSettings
}: ConnectionsViewProps) {
  return (
    <div className="space-y-6" data-data-hub-connections-view>
      {/* 隱藏的語意標記以相容輔助技術與測試 */}
      <span className="sr-only"><em>Connections</em> Broker Host</span>

      {/* 遠端同步警告條 */}
      {remoteSyncBanner}
      <SharedInfrastructureBanner kind="broker" managementScope={managementScope} />

      {/* 全域回饋提示 */}
      {errorMessage ? (
        <div className="mgmt-status is-error" data-connections-error role="alert">
          {errorMessage}
        </div>
      ) : message ? (
        <div className="mgmt-status is-success" data-connections-message role="status">
          {message}
        </div>
      ) : null}

      {/* 主內容：自適應雙欄流動佈局 */}
      <div className="grid gap-6 lg:grid-cols-12 items-stretch">
        {/* 左欄：即時連線健康、測試回饋與導引 (佔 5 欄) */}
        <section className="lg:col-span-5 flex flex-col justify-between gap-6" data-connections-panel="diagnostics">
          <ConnectionStatusCard
            status={status}
            lastConnectionTest={lastConnectionTest}
            isTesting={isTesting}
          />
        </section>

        {/* 右欄：Broker 設定表單 (佔 7 欄) */}
        <section className="mgmt-card p-5 lg:col-span-7 space-y-4 h-full flex flex-col justify-between" data-connections-panel="settings">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2ee] pb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#687169]">Broker Connection</p>
              <h3 className="text-base font-semibold text-[#27322b]">
                中央 MQTT Broker 連線配置
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`mgmt-chip text-xs ${isDirty ? "is-warning" : "is-success"}`}
                data-connections-dirty={isDirty}
              >
                {isDirty ? "尚未儲存設定變更" : "設定已同步"}
              </span>
              <button
                type="button"
                className="mgmt-action text-xs py-1.5 px-3"
                disabled={isTesting || isSaving}
                onClick={() => void onTestConnection()}
                data-connections-action="test"
              >
                {isTesting ? "測試中..." : "測試連線 (Test Connection)"}
              </button>
              <button
                type="button"
                className="mgmt-action primary text-xs py-1.5 px-3"
                disabled={!isDirty || isSaving || isTesting}
                onClick={() => void onSaveSettings()}
                data-connections-action="save"
              >
                {isSaving ? "儲存中..." : "儲存連線設定 (Save Settings)"}
              </button>
            </div>
          </div>
          <BrokerForm settings={settings} onChange={onChange} disabled={isSaving} />
        </section>
      </div>
    </div>
  );
}
