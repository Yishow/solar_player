import { useEffect, useState } from "react";
import { getRuntimeMqttStatus } from "../services/api";
import {
  getCachedMqttStatus,
  getSocketClient,
  subscribeSocketEvent,
  type MqttConnectionStatus
} from "../services/socket";

export async function loadRuntimeMqttStatus(
  loadStatus: () => Promise<MqttConnectionStatus> = getRuntimeMqttStatus
) {
  return loadStatus();
}

const DEFAULT_BOOTSTRAP_MQTT_STATUS: MqttConnectionStatus = {
  broker: "",
  clientId: "",
  connected: false,
  reason: "unavailable",
  updatedAt: null
};

export function resolveInitialMqttState(
  initialStatus?: MqttConnectionStatus | null,
  cachedStatus: MqttConnectionStatus = getCachedMqttStatus()
) {
  const status =
    initialStatus === undefined
      ? cachedStatus
      : initialStatus ?? DEFAULT_BOOTSTRAP_MQTT_STATUS;

  return {
    isHydrated:
      initialStatus === undefined
        ? cachedStatus.updatedAt !== null
        : initialStatus !== null,
    status
  };
}

type UseMqttStatusOptions = {
  enabled?: boolean;
};

export function useMqttStatus(
  initialStatus?: MqttConnectionStatus | null,
  options: UseMqttStatusOptions = {}
) {
  const enabled = options.enabled ?? true;
  const [{ isHydrated, status }, setState] = useState(() => resolveInitialMqttState(initialStatus));

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;

    const bootstrapStatus = async () => {
      try {
        const response = await loadRuntimeMqttStatus();
        if (!active) {
          return;
        }

        setState({
          isHydrated: true,
          status: response
        });
      } catch {
        // Socket.IO will keep trying; bootstrap failure should not block route rendering.
      }
    };

    const unsubscribe = subscribeSocketEvent("mqtt:status", (nextStatus) => {
      setState({
        isHydrated: true,
        status: nextStatus
      });
    });

    getSocketClient();
    void bootstrapStatus();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [enabled]);

  return {
    isHydrated,
    status
  };
}
