import React from "react";
import type { DataMode, MqttSettingsForm } from "../../MqttSettings/viewModel";

export type BrokerFormProps = {
  settings: MqttSettingsForm;
  onChange: <Key extends keyof MqttSettingsForm>(key: Key, value: MqttSettingsForm[Key]) => void;
  disabled?: boolean;
};

export const brokerFieldDefinitions: Array<{
  key: keyof Omit<MqttSettingsForm, "dataMode">;
  label: string;
  type?: string;
  inputMode?: "numeric" | "text";
  placeholder?: string;
  description?: string;
}> = [
  { key: "host", label: "Broker 主機", placeholder: "例如: 127.0.0.1", description: "MQTT Broker 的 IP 或域名" },
  { key: "port", label: "通訊埠 (Port)", inputMode: "numeric", placeholder: "1883", description: "標準為 1883，TLS 為 8883" },
  { key: "clientId", label: "Client ID", placeholder: "solar-display-server", description: "伺服器在 Broker 的客戶端識別碼" },
  { key: "username", label: "使用者名稱", placeholder: "若無認證可留空", description: "MQTT 驗證帳號" },
  { key: "password", label: "密碼", type: "password", placeholder: "若無認證可留空", description: "MQTT 驗證密碼" },
  { key: "messageTimeout", label: "訊息逾時 (秒)", inputMode: "numeric", placeholder: "30", description: "未收到封包視為中斷的時間" },
  { key: "reconnectInterval", label: "重試間隔 (毫秒)", inputMode: "numeric", placeholder: "5000", description: "連線中斷後的自動重試間隔" }
];

export function BrokerForm({ settings, onChange, disabled = false }: BrokerFormProps) {
  const isMockMode = settings.dataMode === "mock";

  return (
    <div className="space-y-3.5" data-data-hub-broker-form>
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-[#687169]">
          資料來源模式 (Data Mode)
        </label>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#e2e8e3] bg-[#f7f9f7] p-1">
          <button
            type="button"
            role="tab"
            aria-selected={isMockMode}
            className={[
              "flex flex-col items-center justify-center rounded-md py-1.5 px-3 text-xs transition-all",
              isMockMode
                ? "bg-[#5c854b] text-white font-medium shadow-sm"
                : "text-[#4d554f] font-normal hover:bg-[#5c854b]/10"
            ].join(" ")}
            onClick={() => onChange("dataMode", "mock")}
            disabled={disabled}
            data-mode-toggle="mock"
          >
            <span className="font-semibold">模擬資料 (Simulated)</span>
            <small className={isMockMode ? "text-white/85 text-[11px]" : "text-[#687169] text-[11px]"}>
              內建測試發電機組數值
            </small>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isMockMode}
            className={[
              "flex flex-col items-center justify-center rounded-md py-1.5 px-3 text-xs transition-all",
              !isMockMode
                ? "bg-[#5c854b] text-white font-medium shadow-sm"
                : "text-[#4d554f] font-normal hover:bg-[#5c854b]/10"
            ].join(" ")}
            onClick={() => onChange("dataMode", "mqtt")}
            disabled={disabled}
            data-mode-toggle="mqtt"
          >
            <span className="font-semibold">即時 MQTT (Real)</span>
            <small className={!isMockMode ? "text-white/85 text-[11px]" : "text-[#687169] text-[11px]"}>
              訂閱現場實體 Broker
            </small>
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold text-[#687169]">
          Broker 連線參數
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {brokerFieldDefinitions.map((field) => (
            <label
              key={field.key}
              className={[
                "grid gap-1 text-xs text-[#4d554f]",
                field.key === "host" ? "sm:col-span-2" : ""
              ].join(" ")}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-medium text-[#4d554f]">{field.label}</span>
                {field.description ? (
                  <span className="text-[11px] text-[#687169]">{field.description}</span>
                ) : null}
              </div>
              <input
                type={field.type ?? "text"}
                inputMode={field.inputMode}
                disabled={disabled}
                placeholder={field.placeholder}
                value={settings[field.key]}
                onChange={(e) => onChange(field.key, e.target.value)}
                data-broker-field={field.key}
                className="w-full rounded-md border border-[#cbd8ce] bg-white px-3 py-1.5 text-xs text-[#27322b] shadow-sm transition-colors focus:border-[#5c854b] focus:outline-none focus:ring-1 focus:ring-[#5c854b] disabled:bg-[#f0f4f1] disabled:text-[#7a827c]"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
