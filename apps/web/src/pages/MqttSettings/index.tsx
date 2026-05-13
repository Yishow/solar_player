import { useEffect, useMemo, useState } from "react";
import { KioskButton } from "../../components/KioskButton";
import { KioskInput } from "../../components/KioskInput";
import { PanelCard } from "../../components/PanelCard";
import { StatusBadge } from "../../components/StatusBadge";
import { requestJson } from "../../services/api";
import { PageScaffold } from "../shared/PageScaffold";
import {
  buildMqttSettingsViewModel,
  type ActionState,
  type ConnectionTestFeedback,
  type DataMode,
  type MqttSettingsForm,
  type MqttStatus,
  type TopicMapping
} from "./viewModel";

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

type TopicMappingsResponse = {
  topics: TopicMapping[];
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

function SummaryCard({
  helper,
  label,
  value
}: {
  helper: string;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[28px] border border-white/75 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(241,246,235,0.82))] p-5 shadow-card">
      <p className="text-sm font-medium tracking-[0.08em] text-neutral-600">{label}</p>
      <p className="mt-3 text-3xl font-bold leading-tight text-brand-900">{value}</p>
      <p className="mt-3 text-sm text-neutral-500">{helper}</p>
    </article>
  );
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
  const [lastConnectionTest, setLastConnectionTest] = useState<ConnectionTestFeedback>(null);
  const [message, setMessage] = useState("正在載入 MQTT 設定...");
  const [errorMessage, setErrorMessage] = useState("");
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

  const markDirty = (nextMessage: string) => {
    setLastConnectionTest(null);
    setMessage(nextMessage);
    setErrorMessage("");
  };

  const loadSettings = async () => {
    setActionState((current) => ({ ...current, isLoadingSettings: true }));

    try {
      const response = await requestJson<MqttSettingsResponse>("/api/settings/mqtt");
      setSettings(toFormState(response.settings));
      setStatus(response.status);
      setLastConnectionTest(null);
      setMessage("MQTT 設定已同步。");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "載入 MQTT 設定失敗。");
    } finally {
      setActionState((current) => ({ ...current, isLoadingSettings: false }));
    }
  };

  const loadTopics = async (isPolling: boolean) => {
    if (!isPolling) {
      setActionState((current) => ({ ...current, isLoadingTopics: true }));
    }

    try {
      const response = await requestJson<TopicMappingsResponse>("/api/settings/mqtt/topics");
      setTopics(response.topics);
      if (!isPolling) {
        setLastConnectionTest(null);
        setMessage("Topic mappings 已同步。");
        setErrorMessage("");
      }
    } catch (error) {
      if (!isPolling) {
        setErrorMessage(error instanceof Error ? error.message : "載入 topic mappings 失敗。");
      }
    } finally {
      if (!isPolling) {
        setActionState((current) => ({ ...current, isLoadingTopics: false }));
      }
    }
  };

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        await Promise.all([loadSettings(), loadTopics(false)]);
      } catch {
        // individual loaders already set visible errors
      }
    };

    void bootstrap();

    const pollTimer = window.setInterval(() => {
      if (active) {
        void loadTopics(true);
      }
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(pollTimer);
    };
  }, []);

  const handleSettingChange = <Key extends keyof MqttSettingsForm>(
    key: Key,
    value: MqttSettingsForm[Key]
  ) => {
    markDirty("Broker 設定已變更，尚未儲存。");
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
    markDirty("Topic mappings 已變更，尚未儲存。");
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
      setLastConnectionTest(null);
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
      setLastConnectionTest({
        connected: response.connected,
        message: response.message
      });
      setMessage(response.message);
      setErrorMessage("");
    } catch (error) {
      setLastConnectionTest(null);
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
      setLastConnectionTest(null);
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
      setLastConnectionTest(null);
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

    markDirty("已新增一筆 topic mapping，尚未儲存。");
    setTopics((current) => [...current, createEmptyMapping(nextMetricKey)]);
  };

  const removeTopicMapping = (rowId: number) => {
    markDirty("已移除一筆 topic mapping，尚未儲存。");
    setTopics((current) => current.filter((topic) => topic.id !== rowId));
  };

  const viewModel = buildMqttSettingsViewModel({
    actionState,
    errorMessage,
    lastConnectionTest,
    message,
    settings,
    status,
    topics
  });

  return (
    <PageScaffold
      path="/settings/mqtt"
      description="管理 MQTT / Mock 資料來源、broker 連線與 topic 對應，並提供最後收值預覽。"
    >
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          label="資料模式"
          value={viewModel.summary.modeLabel}
          helper="切換 MQTT 或 Mock，維持同一組展示資料契約"
        />
        <SummaryCard
          label="映射總數"
          value={String(viewModel.summary.totalTopicCount)}
          helper="目前 topic mapping 列數"
        />
        <SummaryCard
          label="已啟用 Topic"
          value={String(viewModel.summary.enabledTopicCount)}
          helper="會進入播放器資料流的 topic 數量"
        />
        <SummaryCard
          label="即時收值"
          value={String(viewModel.summary.connectedTopicCount)}
          helper="最近有收到訊息的 topic 數量"
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <PanelCard title="Broker 設定" subtitle="MQTT BROKER" className="col-span-4">
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
              label="Broker 主機"
              disabled={actionState.isLoadingSettings || actionState.isSavingSettings}
              value={settings.host}
              onChange={(event) => handleSettingChange("host", event.target.value)}
            />
            <KioskInput
              label="連接埠"
              disabled={actionState.isLoadingSettings || actionState.isSavingSettings}
              inputMode="numeric"
              value={settings.port}
              onChange={(event) => handleSettingChange("port", event.target.value)}
            />
            <KioskInput
              label="Client ID"
              disabled={actionState.isLoadingSettings || actionState.isSavingSettings}
              value={settings.clientId}
              onChange={(event) => handleSettingChange("clientId", event.target.value)}
            />
            <KioskInput
              label="使用者名稱"
              disabled={actionState.isLoadingSettings || actionState.isSavingSettings}
              value={settings.username}
              onChange={(event) => handleSettingChange("username", event.target.value)}
            />
            <KioskInput
              label="密碼"
              disabled={actionState.isLoadingSettings || actionState.isSavingSettings}
              type="password"
              value={settings.password}
              onChange={(event) => handleSettingChange("password", event.target.value)}
            />
            <KioskInput
              label="重新連線間隔 (ms)"
              disabled={actionState.isLoadingSettings || actionState.isSavingSettings}
              inputMode="numeric"
              value={settings.reconnectInterval}
              onChange={(event) => handleSettingChange("reconnectInterval", event.target.value)}
            />
            <KioskInput
              label="訊息逾時 (sec)"
              disabled={actionState.isLoadingSettings || actionState.isSavingSettings}
              inputMode="numeric"
              value={settings.messageTimeout}
              onChange={(event) => handleSettingChange("messageTimeout", event.target.value)}
              className="col-span-2"
            />
          </div>
        </PanelCard>

        <PanelCard title="即時 Topic 清單" subtitle="LIVE TOPIC LIST" className="col-span-4">
          <div className="grid gap-3">
            {viewModel.topicRows.map((topic) => (
              <div
                key={`live-topic-${topic.id}`}
                className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-800">{topic.topic || "未設定 topic"}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">{topic.metricKey}</p>
                  </div>
                  <StatusBadge status={topic.runtimeTone} label={topic.runtimeLabel} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-brand-50 px-3 py-1 font-semibold text-brand-900">
                    {topic.enabledLabel}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 font-semibold text-neutral-600">
                    {topic.unit || "unit --"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-neutral-500">最後收值：{topic.lastReceivedLabel}</p>
              </div>
            ))}
            {viewModel.topicRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/55 px-6 py-10 text-center text-neutral-500">
                尚未建立 topic mapping。
              </div>
            ) : null}
          </div>
        </PanelCard>

        <PanelCard title="連線與操作" subtitle="ACTION AREA" className="col-span-4">
          <div
            className={[
              "rounded-2xl border p-5 shadow-soft",
              viewModel.feedbackBanner.tone === "error"
                ? "border-[rgba(230,0,18,0.18)] bg-[rgba(255,241,241,0.92)]"
                : viewModel.feedbackBanner.tone === "testing"
                  ? "border-[rgba(224,161,42,0.2)] bg-[rgba(255,247,229,0.92)]"
                  : viewModel.feedbackBanner.tone === "saving"
                    ? "border-[rgba(78,121,55,0.18)] bg-[rgba(244,248,239,0.92)]"
                    : viewModel.feedbackBanner.tone === "loading"
                      ? "border-[rgba(138,148,132,0.18)] bg-[rgba(249,249,247,0.92)]"
                      : "border-[rgba(78,121,55,0.18)] bg-[rgba(244,248,239,0.92)]"
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xl font-semibold text-neutral-800">{viewModel.feedbackBanner.title}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{viewModel.feedbackBanner.detail}</p>
              </div>
              <StatusBadge status={viewModel.connection.statusTone} label={viewModel.connection.statusLabel} />
            </div>
          </div>
          <div className="mt-4 grid gap-4">
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-soft">
              <p className="text-sm font-medium tracking-[0.08em] text-neutral-500">Broker</p>
              <p className="mt-2 text-lg font-semibold text-neutral-800">{viewModel.connection.brokerLabel}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-soft">
              <p className="text-sm font-medium tracking-[0.08em] text-neutral-500">Client ID</p>
              <p className="mt-2 text-lg font-semibold text-neutral-800">{viewModel.connection.clientIdLabel}</p>
            </div>
            <div className="grid gap-3">
              <KioskButton onClick={() => void testConnection()} disabled={viewModel.actions.testConnectionDisabled}>
                {viewModel.actions.testConnectionLabel}
              </KioskButton>
              <KioskButton
                variant="secondary"
                onClick={() => void saveSettings()}
                disabled={viewModel.actions.saveSettingsDisabled}
              >
                {viewModel.actions.saveSettingsLabel}
              </KioskButton>
              <KioskButton
                variant="ghost"
                onClick={() => void reloadTopics()}
                disabled={viewModel.actions.reloadTopicsDisabled}
              >
                {viewModel.actions.reloadTopicsLabel}
              </KioskButton>
            </div>
          </div>
        </PanelCard>
      </div>

      <PanelCard title="Topic 對應設定" subtitle="TOPIC MAPPING">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500">
              將 metric key 對應到 topic、unit 與 payload value path。value path 留空時預設讀取 `value`。
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              這裡的修改會影響播放器 live metrics 與 MQTT smoke feedback。
            </p>
          </div>
          <div className="flex gap-3">
            <KioskButton variant="ghost" onClick={addTopicMapping}>
              新增 mapping
            </KioskButton>
            <KioskButton
              onClick={() => void saveTopicMappings()}
              disabled={viewModel.actions.saveMappingsDisabled}
            >
              {viewModel.actions.saveMappingsLabel}
            </KioskButton>
          </div>
        </div>

        <div className="overflow-x-auto rounded-[28px] border border-white/70 bg-white/78">
          <table className="min-w-full text-left text-sm text-neutral-700">
            <thead className="border-b border-neutral-200 bg-white/95 text-xs uppercase tracking-[0.18em] text-neutral-500">
              <tr>
                <th className="px-4 py-3">Metric Key</th>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Value Path</th>
                <th className="px-4 py-3">狀態</th>
                <th className="px-4 py-3">最後收值</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {viewModel.topicRows.map((topic) => (
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
                      placeholder="$.value"
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm shadow-soft outline-none focus:border-brand-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={topic.runtimeTone} label={topic.runtimeLabel} />
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
                        {topic.enabledLabel}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500">{topic.lastReceivedLabel}</td>
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
              {viewModel.topicRows.length === 0 ? (
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

      <PanelCard title="即時資料預覽" subtitle="LIVE DATA PREVIEW">
        {viewModel.emptyState ? (
          <div className="rounded-[28px] border border-dashed border-brand-200 bg-brand-50/60 px-6 py-10 text-center">
            <p className="text-2xl font-semibold text-brand-900">{viewModel.emptyState.title}</p>
            <p className="mt-3 text-sm leading-6 text-neutral-600">{viewModel.emptyState.description}</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            {viewModel.previewCards.map((topic) => (
              <article
                key={`preview-${topic.id}`}
                className="col-span-4 rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">{topic.metricKey}</p>
                    <p className="mt-2 text-sm text-neutral-500">{topic.topicLabel}</p>
                  </div>
                  <StatusBadge status={topic.runtimeTone} label={topic.runtimeLabel} />
                </div>
                <p className="mt-5 text-4xl font-semibold text-brand-900">
                  {topic.valueLabel}
                  <span className="ml-2 text-lg text-neutral-500">{topic.unitLabel}</span>
                </p>
                <p className="mt-3 text-sm text-neutral-500">{topic.qualityLabel}</p>
                <p className="mt-1 text-sm text-neutral-500">最後收值：{topic.lastReceivedLabel}</p>
                <p className="mt-3 rounded-xl bg-neutral-100 px-3 py-2 font-mono text-xs text-neutral-600">
                  {topic.payloadLabel}
                </p>
              </article>
            ))}
          </div>
        )}
      </PanelCard>
    </PageScaffold>
  );
}
