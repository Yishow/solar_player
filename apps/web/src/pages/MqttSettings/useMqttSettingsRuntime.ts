import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useDisplayReadiness } from "../../hooks/useDisplayReadiness";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import { useMqttStatus } from "../../hooks/useMqttStatus";
import {
  getSocketClient,
  type LiveMetricsSnapshot,
  type ScopedLiveMetricsSnapshot
} from "../../services/socket";
import {
  mergeScopedLiveMetricsSnapshot,
  type MqttStatus
} from "./viewModel";

type UseMqttSettingsRuntimeOptions = {
  connectionsOnly: boolean;
  hasLoadedMqttEditableModel: boolean;
  hasLoadedMqttSettings: boolean;
  setStatus: Dispatch<SetStateAction<MqttStatus>>;
};

export type MqttSettingsRuntimeController = {
  liveMetricsConnectionState: ReturnType<typeof useLiveMetrics>["connectionState"];
  mqttLiveMetricsSnapshot: LiveMetricsSnapshot | null;
  readiness: ReturnType<typeof useDisplayReadiness>["readiness"];
  readinessErrorMessage: string;
  reloadReadiness: ReturnType<typeof useDisplayReadiness>["reload"];
};

export function useMqttSettingsRuntime({
  connectionsOnly,
  hasLoadedMqttEditableModel,
  hasLoadedMqttSettings,
  setStatus
}: UseMqttSettingsRuntimeOptions): MqttSettingsRuntimeController {
  const {
    errorMessage: readinessErrorMessage,
    readiness,
    reload: reloadReadiness
  } = useDisplayReadiness({ enabled: hasLoadedMqttEditableModel });
  const { connectionState: liveMetricsConnectionState } = useLiveMetrics({ enabled: hasLoadedMqttEditableModel });
  const [mqttLiveMetricsSnapshot, setMqttLiveMetricsSnapshot] = useState<LiveMetricsSnapshot | null>(null);
  const mqttStatusStream = useMqttStatus(undefined, {
    enabled: connectionsOnly ? hasLoadedMqttSettings : hasLoadedMqttEditableModel
  });

  useEffect(() => {
    if (!hasLoadedMqttEditableModel) {
      return;
    }

    const client = getSocketClient();
    const handleLiveMetricsUpdate = (snapshot: ScopedLiveMetricsSnapshot) => {
      setMqttLiveMetricsSnapshot((current) => mergeScopedLiveMetricsSnapshot(current, snapshot));
    };
    client.on("liveMetrics:update", handleLiveMetricsUpdate);

    return () => {
      client.off("liveMetrics:update", handleLiveMetricsUpdate);
    };
  }, [hasLoadedMqttEditableModel]);

  useEffect(() => {
    if (!mqttStatusStream.isHydrated) {
      return;
    }

    setStatus(mqttStatusStream.status);
  }, [mqttStatusStream.isHydrated, mqttStatusStream.status, setStatus]);

  return {
    liveMetricsConnectionState,
    mqttLiveMetricsSnapshot,
    readiness,
    readinessErrorMessage,
    reloadReadiness
  };
}
