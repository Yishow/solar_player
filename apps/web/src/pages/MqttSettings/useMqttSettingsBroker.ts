import { useCallback, useRef, useState } from "react";
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

const CONNECTION_AFFECTING_FIELDS = new Set<keyof MqttSettingsForm>([
  "dataMode",
  "host",
  "port",
  "username",
  "password",
  "clientId",
  "reconnectInterval",
  "messageTimeout"
]);

export type MqttSettingsBrokerController = {
  candidateRevision: number;
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

  const [candidateRevision, setCandidateRevision] = useState(1);
  const revisionRef = useRef(1);

  const handleSettingChange = useCallback(<Key extends keyof MqttSettingsForm>(
    key: Key,
    value: MqttSettingsForm[Key]
  ) => {
    markDirty("Broker 設定已變更，尚未儲存。");
    setSettings((current) => ({ ...current, [key]: value }));

    if (CONNECTION_AFFECTING_FIELDS.has(key)) {
      const nextRev = revisionRef.current + 1;
      revisionRef.current = nextRev;
      setCandidateRevision(nextRev);

      setLastConnectionTest((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          isSuperseded: true,
          message: "設定已變更，先前測試已失效，需重新測試。"
        };
      });
    }
  }, [markDirty, setLastConnectionTest, setSettings]);

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
    const testingRev = revisionRef.current;
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

      const isCurrent = testingRev === revisionRef.current;
      const feedback: ConnectionTestFeedback = {
        candidateRevision: testingRev,
        connected: response.connected,
        isSuperseded: !isCurrent,
        message: isCurrent
          ? (response.connected
              ? "這份設定可建立連線；尚未套用至正式環境。"
              : response.message)
          : "此測試結果屬於先前設定版本，目前草稿已變更，需重新測試。",
        testedAt: new Date().toISOString()
      };

      setLastConnectionTest(feedback);
      setMessage(feedback.message);
      setErrorMessage("");
    } catch (error) {
      const isCurrent = testingRev === revisionRef.current;
      if (isCurrent) {
        setLastConnectionTest({
          candidateRevision: testingRev,
          connected: false,
          isSuperseded: false,
          message: error instanceof Error ? error.message : "測試連線失敗。",
          testedAt: new Date().toISOString()
        });
      }
      setErrorMessage(error instanceof Error ? error.message : "測試連線失敗。");
    } finally {
      setActionState((current) => ({ ...current, isTestingConnection: false }));
    }
  }, [setActionState, setErrorMessage, setLastConnectionTest, setMessage, setStatus, settings]);

  return { candidateRevision, handleSettingChange, saveSettings, testConnection };
}
