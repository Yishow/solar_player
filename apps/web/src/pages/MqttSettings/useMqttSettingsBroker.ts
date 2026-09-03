import { useCallback } from "react";
import { requestJson } from "../../services/api";
import { refreshDeferredSettingsDiagnostics } from "../shared/editableSettingsLoader";
import {
  buildSettingsPayload,
  rememberMqttConnectionModel
} from "./mqttSettingsRouteModel";
import { toFormState, type MqttSettingsResponse } from "./loadModel";
import type { MqttSettingsDataController } from "./useMqttSettingsData";
import type {
  ConnectionTestFeedback,
  MqttSettingsForm,
  MqttStatus
} from "./viewModel";

export type MqttSettingsBrokerController = {
  handleSettingChange: <Key extends keyof MqttSettingsForm>(
    key: Key,
    value: MqttSettingsForm[Key]
  ) => void;
  saveSettings: () => Promise<void>;
  testConnection: () => Promise<void>;
};

export function useMqttSettingsBroker({
  connectionsOnly,
  data,
  reloadReadiness
}: {
  connectionsOnly: boolean;
  data: MqttSettingsDataController;
  reloadReadiness: () => Promise<void>;
}): MqttSettingsBrokerController {
  const {
    settings,
    markDirty,
    setActionState,
    setErrorMessage,
    setLastConnectionTest,
    setLastSyncedSettings,
    setMessage,
    setSettings,
    setStatus
  } = data;

  const handleSettingChange = useCallback(<Key extends keyof MqttSettingsForm>(
    key: Key,
    value: MqttSettingsForm[Key]
  ) => {
    markDirty("Broker 設定已變更，尚未儲存。");
    setSettings((current) => ({ ...current, [key]: value }));
  }, [markDirty, setSettings]);

  const saveSettings = useCallback(async () => {
    setActionState((current) => ({ ...current, isSavingSettings: true }));
    try {
      const response = await requestJson<MqttSettingsResponse>("/api/settings/mqtt", {
        body: JSON.stringify(buildSettingsPayload(settings)),
        method: "PUT"
      });
      const nextSettings = toFormState(response.settings);
      setSettings(nextSettings);
      setLastSyncedSettings(nextSettings);
      setStatus(response.status);
      if (connectionsOnly) {
        rememberMqttConnectionModel({ settings: nextSettings, status: response.status });
      }
      setLastConnectionTest(null);
      setMessage("MQTT broker 設定已儲存；連線狀態請查看診斷。");
      setErrorMessage("");
      refreshDeferredSettingsDiagnostics([reloadReadiness]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存設定失敗。");
    } finally {
      setActionState((current) => ({ ...current, isSavingSettings: false }));
    }
  }, [connectionsOnly, reloadReadiness, setActionState, setErrorMessage, setLastConnectionTest, setLastSyncedSettings, setMessage, setSettings, setStatus, settings]);

  const testConnection = useCallback(async () => {
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
      const feedback: ConnectionTestFeedback = {
        connected: response.connected,
        message: response.message
      };
      setLastConnectionTest(feedback);
      setMessage(response.message);
      setErrorMessage("");
    } catch (error) {
      setLastConnectionTest(null);
      setErrorMessage(error instanceof Error ? error.message : "測試連線失敗。");
    } finally {
      setActionState((current) => ({ ...current, isTestingConnection: false }));
    }
  }, [setActionState, setErrorMessage, setLastConnectionTest, setMessage, setStatus, settings]);

  return { handleSettingChange, saveSettings, testConnection };
}
