import type { DataHubManagementScope } from "../../../app/dataHub";
import type { ConnectionTestFeedback, MqttStatus } from "../../MqttSettings/viewModel";

export type ConnectionStatusCardProps = {
  dataMode?: string;
  errorMessage?: string;
  isTesting?: boolean;
  lastConnectionTest: ConnectionTestFeedback;
  managementScope?: DataHubManagementScope;
  message?: string;
  status: MqttStatus;
};

export function ConnectionStatusCard({
  dataMode = "mqtt",
  errorMessage = "",
  isTesting = false,
  lastConnectionTest,
  managementScope = "all",
  message = "",
  status
}: ConnectionStatusCardProps) {
  const isConnected = status.connected;
  const statusTone = isConnected ? "connected" : status.reason ? "error" : "disconnected";
  const scopeQuery = managementScope && managementScope !== "all" ? `?scope=${managementScope}` : "";

  return (
    <div className="space-y-4 h-full flex flex-col justify-between" data-data-hub-connection-status-card>
      {/* 狀態燈號與即時狀態 */}
      <div className="mgmt-card space-y-3.5 p-5">
        <div className="flex items-center justify-between gap-3 border-b border-[#edf2ee] pb-2.5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#687169]">Live Status</p>
            <h4 className="text-base font-semibold text-[#27322b]">
              即時連線健康狀態
            </h4>
          </div>
          <span
            className={[
              "mgmt-chip text-xs",
              isConnected ? "is-success" : status.reason ? "is-danger" : "is-warning"
            ].join(" ")}
            data-connection-badge={statusTone}
          >
            {isConnected ? "Connected (正常連線)" : status.reason ? "Error (連線異常)" : "Disconnected (未連線)"}
          </span>
        </div>

        {dataMode === "mock" ? (
          <div className="rounded border border-[#d97706]/30 bg-[#fffbeb] p-2.5 text-xs text-[#92400e]" data-connection-mode="mock">
            ⚠️ <strong>模擬資料模式 (Simulation Mode)</strong>：目前系統處於 Mock 模式，未建立實體 MQTT 連線，不代表現場資料正常到件。
          </div>
        ) : null}

        <div className="flex items-center gap-3 rounded-lg border border-[#e2e8e3] bg-[#f7f9f7] p-3">
          <span
            className={[
              "inline-block h-3 w-3 rounded-full shrink-0",
              isConnected
                ? "bg-[#5c854b] shadow-[0_0_0_4px_rgba(92,133,75,0.2)]"
                : status.reason
                  ? "bg-[#c14a4a] shadow-[0_0_0_4px_rgba(193,74,74,0.2)]"
                  : "bg-[#c9881a] shadow-[0_0_0_4px_rgba(201,136,26,0.2)]"
            ].join(" ")}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-[#27322b]">
              {isConnected ? "MQTT Broker 連線運作中" : status.reason ? "連線發生錯誤" : "尚未與 Broker 連線"}
            </div>
            <div className="text-xs text-[#687169] truncate">
              {status.broker ? `連線目標: ${status.broker}` : "未指定 Broker 網址"}
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-xs text-[#4d554f] bg-[#f7f9f7] rounded-md p-2 border border-[#e2e8e3]">
          <div>
            <dt className="text-[11px] text-[#839185]">Client ID</dt>
            <dd className="mt-0.5 font-mono text-[#27322b] truncate" title={status.clientId || "--"}>
              {status.clientId || "--"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-[#839185]">最近更新時間</dt>
            <dd className="mt-0.5 font-mono text-[#27322b] truncate" title={status.updatedAt || "--"}>
              {status.updatedAt || "--"}
            </dd>
          </div>
        </dl>
      </div>

      {/* 測試結果反饋與快速維運導引 */}
      <div className="mgmt-card space-y-3 p-5" data-test-feedback-section>
        <div className="border-b border-[#edf2ee] pb-2 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#687169]">候選設定測試回饋</p>
            <h4 className="text-sm font-semibold text-[#27322b]">
              候選設定測試與捷徑
            </h4>
          </div>
        </div>
        {isTesting ? (
          <div className="mgmt-status text-xs" role="status">
            正在測試連線至 MQTT Broker...（候選設定驗證中）
          </div>
        ) : errorMessage ? (
          <div className="mgmt-status is-error text-xs" role="alert">
            {errorMessage}
          </div>
        ) : lastConnectionTest?.isSuperseded ? (
          <div
            className="mgmt-status is-warning text-xs"
            role="alert"
            data-test-result="superseded"
          >
            ⚠️ 此測試結果屬於先前版本，設定已變更，需重新測試。
          </div>
        ) : lastConnectionTest ? (
          <div
            className={`mgmt-status text-xs ${lastConnectionTest.connected ? "is-success" : "is-error"}`}
            role="alert"
            data-test-result={lastConnectionTest.connected ? "success" : "failure"}
          >
            {lastConnectionTest.message}
            {lastConnectionTest.testedAt ? (
              <span className="block text-[10px] text-[#687169] mt-0.5">
                測試時間: {new Date(lastConnectionTest.testedAt).toLocaleTimeString()}
              </span>
            ) : null}
          </div>
        ) : message ? (
          <div className="mgmt-status is-success text-xs" role="status">
            {message}
          </div>
        ) : (
          <div className="text-xs text-[#687169]">目前草稿尚未測試。點擊上方「測試這份設定」可即時驗證。</div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href={`/settings/data-hub/sources${scopeQuery}`}
            className="flex flex-col justify-between rounded-lg border border-[#e2e8e3] bg-[#f7f9f7] p-2.5 text-[#344039] hover:border-[#5c854b] hover:bg-[#5c854b]/5 transition-all"
            data-connections-shortcut="sources"
          >
            <strong className="text-xs font-semibold text-[#27322b]">資料來源 (Sources) →</strong>
            <small className="text-[11px] text-[#687169] truncate">Topic Mappings</small>
          </a>
          <a
            href={`/settings/data-hub/metrics${scopeQuery}`}
            className="flex flex-col justify-between rounded-lg border border-[#e2e8e3] bg-[#f7f9f7] p-2.5 text-[#344039] hover:border-[#5c854b] hover:bg-[#5c854b]/5 transition-all"
            data-connections-shortcut="metrics"
          >
            <strong className="text-xs font-semibold text-[#27322b]">語意指標 (Metrics) →</strong>
            <small className="text-[11px] text-[#687169] truncate">即時數據與診斷</small>
          </a>
        </div>
      </div>
    </div>
  );
}
