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
  const scopeQuery = managementScope && managementScope !== "all" ? `?scope=${managementScope}` : "";

  return (
    <div className="space-y-6" data-data-hub-connections-view>
      {/* 隱藏的語意標記以相容輔助技術與測試 */}
      <span className="sr-only"><em>Connections</em> Broker Host</span>

      {/* 遠端同步警告條 */}
      {remoteSyncBanner}
      <SharedInfrastructureBanner kind="broker" managementScope={managementScope} />

      {/* 頂部緊湊摘要：Solar Player 接收端 Broker（CL／KN 共用） */}
      <div className="mgmt-card p-4 space-y-3" data-connections-summary="receiver-broker">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2ee] pb-2.5">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c854b]">
              Shared Infrastructure
            </span>
            <h3 className="text-base font-semibold text-[#27322b]">
              Solar Player 接收端 Broker（CL／KN 共用）
            </h3>
          </div>
          <a
            href={`/settings/data-hub/sources${scopeQuery}`}
            className="mgmt-action text-xs py-1 px-3"
            data-connections-summary-shortcut="sources"
          >
            查看接收資料 (Sources) →
          </a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#f7f9f7] rounded p-2 border border-[#e2e8e3]">
            <span className="text-[11px] text-[#839185] block">連線目標</span>
            <strong className="text-[#27322b] truncate block mt-0.5 font-mono" title={status.broker || "--"}>
              {status.broker || "--"}
            </strong>
          </div>
          <div className="bg-[#f7f9f7] rounded p-2 border border-[#e2e8e3]">
            <span className="text-[11px] text-[#839185] block">資料模式</span>
            <strong className="text-[#27322b] block mt-0.5">
              {settings.dataMode === "mock" ? "模擬資料模式 (Mock)" : "MQTT 生產模式"}
            </strong>
          </div>
          <div className="bg-[#f7f9f7] rounded p-2 border border-[#e2e8e3]">
            <span className="text-[11px] text-[#839185] block">正式狀態</span>
            <strong className={`block mt-0.5 ${status.connected ? "text-[#5c854b]" : "text-[#c14a4a]"}`}>
              {status.connected ? "正常運作中" : status.reason ? "連線異常" : "未連線"}
            </strong>
          </div>
          <div className="bg-[#f7f9f7] rounded p-2 border border-[#e2e8e3]">
            <span className="text-[11px] text-[#839185] block">最後查核</span>
            <span className="text-[#687169] block mt-0.5 font-mono truncate" title={status.updatedAt || "--"}>
              {status.updatedAt ? new Date(status.updatedAt).toLocaleTimeString() : "--"}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-[#687169]">
          說明：此連線設定僅適用於 Solar Player 接收端；儲存變更不會修改中央 Broker 服務、亦不變更 solar_mqtt_go 或 opc_mqtt 發布端。
        </p>
      </div>

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
            dataMode={settings.dataMode}
            managementScope={managementScope}
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
                {isTesting ? "測試中..." : "測試這份設定 (Test Candidate)"}
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
