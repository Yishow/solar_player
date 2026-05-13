import { useEffect, useMemo, useState } from "react";
import { KioskButton } from "../../components/KioskButton";
import { KioskInput } from "../../components/KioskInput";
import { PanelCard } from "../../components/PanelCard";
import { StatusBadge } from "../../components/StatusBadge";
import { PageScaffold } from "../shared/PageScaffold";

const defaultMetricOptions = [
  "realTimePower",
  "todayGeneration",
  "totalGeneration",
  "todayCo2Reduction",
  "totalCo2Reduction",
  "selfConsumptionEnergy",
  "consumptionEnergy",
  "systemEfficiency",
  "factoryProductionPower",
  "factoryHvacPower",
  "factoryLightingPower",
  "factoryOfficePower",
  "factoryEvGreenPower",
  "factoryInfrastructurePower"
] as const;

type DataMode = "mqtt" | "mock";

type MqttSettingsForm = {
  dataMode: DataMode;
  host: string;
  port: string;
  username: string;
  password: string;
  clientId: string;
  reconnectInterval: string;
  messageTimeout: string;
};

type MqttStatus = {
  connected: boolean;
  broker: string;
  clientId: string;
};

type MqttSettingsResponse = {
  settings: {
    dataMode: DataMode;
    host: string;
    port: number;
    username: string;
    password: string;
    clientId: string;
    reconnectInterval: number;
    messageTimeout: number;
  };
  status: MqttStatus;
};

type TopicMapping = {
  id: number;
  metricKey: string;
  topic: string;
  unit: string;
  valuePath: string;
  enabled: boolean;
  updatedAt: string | null;
  lastReceivedAt: string | null;
  lastValue: number | null;
  quality: string | null;
  rawPayload: string | null;
};

type TopicMappingsResponse = {
  topics: TopicMapping[];
};

type ActionState = {
  isLoadingSettings: boolean;
  isLoadingTopics: boolean;
  isSavingSettings: boolean;
  isSavingTopics: boolean;
  isTestingConnection: boolean;
  isReloadingTopics: boolean;
};

const defaultFormState: MqttSettingsForm = {
  clientId: "solar-display-player",
  dataMode: "mqtt",
  host: "localhost",
  messageTimeout: "30",
  password: "",
  port: "1883",
  reconnectInterval: "5000",
  username: ""
};

function buildUrl(path: string) {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (configuredBaseUrl) {
    return `${configuredBaseUrl}${path}`;
  }

  if (typeof window === "undefined") {
    return `http://localhost:3000${path}`;
  }

  const apiPort = window.location.port === "5173" ? "3000" : window.location.port || "3000";
  return `${window.location.protocol}//${window.location.hostname}:${apiPort}${path}`;
}

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(buildUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "尚未收到";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("zh-TW", {
    hour12: false
  });
}

function buildSettingsPayload(settings: MqttSettingsForm) {
  return {
    clientId: settings.clientId.trim(),
    dataMode: settings.dataMode,
    host: settings.host.trim(),
    messageTimeout: Number.parseInt(settings.messageTimeout, 10) || 30,
    password: settings.password,
    port: Number.parseInt(settings.port, 10) || 1883,
    reconnectInterval: Number.parseInt(settings.reconnectInterval, 10) || 5000,
    username: settings.username.trim()
  };
}

function toFormState(settings: MqttSettingsResponse["settings"]): MqttSettingsForm {
  return {
    clientId: settings.clientId,
    dataMode: settings.dataMode,
    host: settings.host,
    messageTimeout: String(settings.messageTimeout),
    password: settings.password,
    port: String(settings.port),
    reconnectInterval: String(settings.reconnectInterval),
    username: settings.username
  };
}

function createEmptyMapping(metricKey: string): TopicMapping {
  return {
    enabled: true,
    id: -Date.now(),
    lastReceivedAt: null,
    lastValue: null,
    metricKey,
    quality: null,
    rawPayload: null,
    topic: "",
    unit: "",
    updatedAt: null,
    valuePath: ""
  };
}

export function MqttSettings() {
  const [settings, setSettings] = useState<MqttSettingsForm>(defaultFormState);
  const [status, setStatus] = useState<MqttStatus>({
    broker: "",
    clientId: "",
    connected: false
  });
  const [topics, setTopics] = useState<TopicMapping[]>([]);
  const [message, setMessage] = useState<string>("正在載入 MQTT 設定...");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [actionState, setActionState] = useState<ActionState>({
    isLoadingSettings: true,
    isLoadingTopics: true,
    isReloadingTopics: false,
    isSavingSettings: false,
    isSavingTopics: false,
    isTestingConnection: false
  });

  const metricOptions = useMemo(() => {
    const optionSet = new Set<string>(defaultMetricOptions);
    topics.forEach((topic) => {
      optionSet.add(topic.metricKey);
    });
    return [...optionSet];
  }, [topics]);

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      setActionState((current) => ({ ...current, isLoadingSettings: true }));

      try {
        const response = await requestJson<MqttSettingsResponse>("/api/settings/mqtt");
        if (!active) {
          return;
        }

        setSettings(toFormState(response.settings));
        setStatus(response.status);
        setMessage("MQTT 設定已同步。");
        setErrorMessage("");
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "載入 MQTT 設定失敗。");
      } finally {
        if (active) {
          setActionState((current) => ({ ...current, isLoadingSettings: false }));
        }
      }
    };

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadTopics = async (isPolling: boolean) => {
      if (!isPolling) {
        setActionState((current) => ({ ...current, isLoadingTopics: true }));
      }

      try {
        const response = await requestJson<TopicMappingsResponse>("/api/settings/mqtt/topics");
        if (!active) {
          return;
        }

        setTopics(response.topics);
        if (!isPolling) {
          setMessage("Topic mappings 已同步。");
          setErrorMessage("");
        }
      } catch (error) {
        if (!active) {
          return;
        }

        if (!isPolling) {
          setErrorMessage(error instanceof Error ? error.message : "載入 topic mappings 失敗。");
        }
      } finally {
        if (active && !isPolling) {
          setActionState((current) => ({ ...current, isLoadingTopics: false }));
        }
      }
    };

    void loadTopics(false);

    const pollTimer = window.setInterval(() => {
      void loadTopics(true);
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(pollTimer);
    };
  }, []);

  const livePreviewItems = topics.filter((topic) => topic.enabled);
  const statusType =
    settings.dataMode === "mock"
      ? "connecting"
      : status.connected
        ? "connected"
        : "disconnected";
  const statusLabel =
    settings.dataMode === "mock"
      ? "Mock mode"
      : status.connected
        ? "Broker 已連線"
        : "Broker 未連線";

  const handleSettingChange = <Key extends keyof MqttSettingsForm>(
    key: Key,
    value: MqttSettingsForm[Key]
  ) => {
    setSettings((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleTopicChange = <Key extends keyof TopicMapping>(
    rowId: number,
    key: Key,
    value: TopicMapping[Key]
  ) => {
    setTopics((current) =>
      current.map((topic) =>
        topic.id === rowId
          ? {
              ...topic,
              [key]: value
            }
          : topic
      )
    );
  };

  const saveSettings = async () => {
    setActionState((current) => ({ ...current, isSavingSettings: true }));

    try {
      const response = await requestJson<MqttSettingsResponse>("/api/settings/mqtt", {
        body: JSON.stringify(buildSettingsPayload(settings)),
        method: "PUT"
      });

      setSettings(toFormState(response.settings));
      setStatus(response.status);
      setMessage("MQTT broker 設定已儲存並重新連線。");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存 MQTT 設定失敗。");
    } finally {
      setActionState((current) => ({ ...current, isSavingSettings: false }));
    }
  };

  const testConnection = async () => {
    setActionState((current) => ({ ...current, isTestingConnection: true }));

    try {
      const response = await requestJson<{
        connected: boolean;
        message: string;
        status: MqttStatus;
      }>("/api/settings/mqtt/test", {
        body: JSON.stringify(buildSettingsPayload(settings)),
        method: "POST"
      });

      setStatus(response.status);
      setMessage(response.message);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "測試連線失敗。");
    } finally {
      setActionState((current) => ({ ...current, isTestingConnection: false }));
    }
  };

  const saveTopicMappings = async () => {
    setActionState((current) => ({ ...current, isSavingTopics: true }));

    try {
      const response = await requestJson<TopicMappingsResponse>("/api/settings/mqtt/topics", {
        body: JSON.stringify({
          topics: topics.map((topic) => ({
            enabled: topic.enabled,
            metricKey: topic.metricKey,
            topic: topic.topic.trim(),
            unit: topic.unit.trim(),
            valuePath: topic.valuePath.trim()
          }))
        }),
        method: "PUT"
      });

      setTopics(response.topics);
      setMessage("Topic mappings 已更新並重新載入訂閱。");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存 topic mappings 失敗。");
    } finally {
      setActionState((current) => ({ ...current, isSavingTopics: false }));
    }
  };

  const reloadTopics = async () => {
    setActionState((current) => ({ ...current, isReloadingTopics: true }));

    try {
      const response = await requestJson<TopicMappingsResponse>("/api/settings/mqtt/reload", {
        method: "POST"
      });

      setTopics(response.topics);
      setMessage("MQTT 訂閱清單已重新載入。");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "重新載入 topic mappings 失敗。");
    } finally {
      setActionState((current) => ({ ...current, isReloadingTopics: false }));
    }
  };

  const addTopicMapping = () => {
    const nextMetricKey = metricOptions.find(
      (option) => !topics.some((topic) => topic.metricKey === option)
    ) ?? metricOptions[0];

    if (!nextMetricKey) {
      return;
    }

    setTopics((current) => [...current, createEmptyMapping(nextMetricKey)]);
  };

  const removeTopicMapping = (rowId: number) => {
    setTopics((current) => current.filter((topic) => topic.id !== rowId));
  };

  return (
    <PageScaffold
      path="/settings/mqtt"
      description="管理 MQTT / Mock 資料來源、broker 連線與 topic 對應，並提供最後收值預覽。"
    >
      <div className="grid grid-cols-12 gap-6">
        <PanelCard title="Broker 設定" subtitle="MQTT BROKER" className="col-span-8">
          <div className="mb-5">
            <p className="mb-2 text-sm font-medium text-neutral-600">Data Mode</p>
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/70 bg-white/72 p-2">
              {(["mqtt", "mock"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleSettingChange("dataMode", mode)}
                  className={[
                    "rounded-xl px-4 py-3 text-base font-semibold transition-colors",
                    settings.dataMode === mode
                      ? "bg-brand-900 text-white shadow-card"
                      : "bg-white/70 text-neutral-600"
                  ].join(" ")}
                >
                  {mode === "mqtt" ? "MQTT" : "Mock"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <KioskInput
              label="Host"
              value={settings.host}
              onChange={(event) => handleSettingChange("host", event.target.value)}
            />
            <KioskInput
              label="Port"
              inputMode="numeric"
              value={settings.port}
              onChange={(event) => handleSettingChange("port", event.target.value)}
            />
            <KioskInput
              label="Username"
              value={settings.username}
              onChange={(event) => handleSettingChange("username", event.target.value)}
            />
            <KioskInput
              label="Password"
              type="password"
              value={settings.password}
              onChange={(event) => handleSettingChange("password", event.target.value)}
            />
            <KioskInput
              label="Client ID"
              value={settings.clientId}
              onChange={(event) => handleSettingChange("clientId", event.target.value)}
            />
            <KioskInput
              label="Reconnect Interval (ms)"
              inputMode="numeric"
              value={settings.reconnectInterval}
              onChange={(event) => handleSettingChange("reconnectInterval", event.target.value)}
            />
            <KioskInput
              label="Message Timeout (sec)"
              inputMode="numeric"
              value={settings.messageTimeout}
              onChange={(event) => handleSettingChange("messageTimeout", event.target.value)}
              className="col-span-2"
            />
          </div>
        </PanelCard>

        <PanelCard title="連線狀態" subtitle="CONNECTION" className="col-span-4">
          <div className="space-y-4">
            <StatusBadge status={statusType} label={statusLabel} />
            <div className="rounded-2xl border border-white/70 bg-white/78 p-4">
              <p className="text-sm font-medium text-neutral-500">Broker</p>
              <p className="mt-1 text-lg font-semibold text-neutral-800">
                {status.broker || `${settings.host}:${settings.port}`}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/78 p-4">
              <p className="text-sm font-medium text-neutral-500">Client ID</p>
              <p className="mt-1 text-lg font-semibold text-neutral-800">
                {status.clientId || settings.clientId}
              </p>
            </div>
            <div className="grid gap-3">
              <KioskButton
                onClick={() => {
                  void testConnection();
                }}
                disabled={actionState.isTestingConnection}
              >
                {actionState.isTestingConnection ? "Testing..." : "Test connection"}
              </KioskButton>
              <KioskButton
                variant="secondary"
                onClick={() => {
                  void saveSettings();
                }}
                disabled={actionState.isSavingSettings}
              >
                {actionState.isSavingSettings ? "Saving..." : "Save settings"}
              </KioskButton>
              <KioskButton
                variant="ghost"
                onClick={() => {
                  void reloadTopics();
                }}
                disabled={actionState.isReloadingTopics}
              >
                {actionState.isReloadingTopics ? "Reloading..." : "Reload topics"}
              </KioskButton>
            </div>
          </div>
        </PanelCard>
      </div>

      <PanelCard title="Topic Mapping" subtitle="TOPIC CONFIGURATION">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500">
              將 metric key 對應到 topic、unit 與 payload value path。value path 留空時預設讀取 `value`。
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {actionState.isLoadingTopics ? "正在載入 topic list..." : message}
            </p>
            {errorMessage ? <p className="mt-1 text-sm text-[var(--color-status-error-500)]">{errorMessage}</p> : null}
          </div>
          <div className="flex gap-3">
            <KioskButton variant="ghost" onClick={addTopicMapping}>
              新增 mapping
            </KioskButton>
            <KioskButton
              onClick={() => {
                void saveTopicMappings();
              }}
              disabled={actionState.isSavingTopics}
            >
              {actionState.isSavingTopics ? "Saving..." : "Save mappings"}
            </KioskButton>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/70 bg-white/70">
          <table className="min-w-full text-left text-sm text-neutral-700">
            <thead className="border-b border-neutral-200 bg-white/90 text-xs uppercase tracking-[0.18em] text-neutral-500">
              <tr>
                <th className="px-4 py-3">Metric Key</th>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Value Path</th>
                <th className="px-4 py-3">Enabled</th>
                <th className="px-4 py-3">最後更新時間</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((topic) => (
                <tr key={topic.id} className="border-b border-neutral-100 last:border-b-0">
                  <td className="px-4 py-3">
                    <select
                      value={topic.metricKey}
                      onChange={(event) => handleTopicChange(topic.id, "metricKey", event.target.value)}
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm shadow-soft outline-none focus:border-brand-500"
                    >
                      {metricOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={topic.topic}
                      onChange={(event) => handleTopicChange(topic.id, "topic", event.target.value)}
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm shadow-soft outline-none focus:border-brand-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={topic.unit}
                      onChange={(event) => handleTopicChange(topic.id, "unit", event.target.value)}
                      className="h-11 w-24 rounded-xl border border-neutral-200 bg-white px-3 text-sm shadow-soft outline-none focus:border-brand-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={topic.valuePath}
                      onChange={(event) => handleTopicChange(topic.id, "valuePath", event.target.value)}
                      placeholder="data.power"
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm shadow-soft outline-none focus:border-brand-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleTopicChange(topic.id, "enabled", !topic.enabled)}
                      className={[
                        "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors",
                        topic.enabled
                          ? "bg-[rgba(35,122,34,0.14)] text-[var(--color-status-success-500)]"
                          : "bg-neutral-200 text-neutral-500"
                      ].join(" ")}
                    >
                      {topic.enabled ? "ON" : "OFF"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500">
                    {formatTimestamp(topic.lastReceivedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => removeTopicMapping(topic.id)}
                      className="text-sm font-semibold text-[var(--color-status-error-500)]"
                    >
                      移除
                    </button>
                  </td>
                </tr>
              ))}
              {topics.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-500">
                    尚無 topic mappings。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </PanelCard>

      <PanelCard title="Live Data Preview" subtitle="LAST MESSAGE SNAPSHOT">
        <div className="grid grid-cols-12 gap-4">
          {livePreviewItems.map((topic) => (
            <article
              key={`preview-${topic.id}`}
              className="col-span-4 rounded-2xl border border-white/70 bg-white/80 p-4 shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">{topic.metricKey}</p>
                  <p className="mt-1 text-sm text-neutral-500">{topic.topic || "未設定 topic"}</p>
                </div>
                <StatusBadge
                  status={topic.lastReceivedAt ? "connected" : "disconnected"}
                  label={topic.lastReceivedAt ? "Live" : "Idle"}
                />
              </div>
              <p className="mt-5 text-4xl font-semibold text-brand-900">
                {topic.lastValue ?? "--"}
                <span className="ml-2 text-lg text-neutral-500">{topic.unit}</span>
              </p>
              <p className="mt-3 text-sm text-neutral-500">
                {topic.quality ? `Quality: ${topic.quality}` : "Quality: --"}
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                最後收值: {formatTimestamp(topic.lastReceivedAt)}
              </p>
              <p className="mt-3 rounded-xl bg-neutral-100 px-3 py-2 font-mono text-xs text-neutral-600">
                {topic.rawPayload ?? "尚未收到 payload"}
              </p>
            </article>
          ))}
          {livePreviewItems.length === 0 ? (
            <div className="col-span-12 rounded-2xl border border-dashed border-neutral-300 bg-white/55 px-6 py-10 text-center text-neutral-500">
              尚未啟用任何 topic，或目前沒有 live data。
            </div>
          ) : null}
        </div>
      </PanelCard>
    </PageScaffold>
  );
}
