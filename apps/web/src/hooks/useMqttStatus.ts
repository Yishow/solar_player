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

export function useMqttStatus() {
  const [status, setStatus] = useState<MqttConnectionStatus>(getCachedMqttStatus());
  const [isHydrated, setIsHydrated] = useState<boolean>(getCachedMqttStatus().updatedAt !== null);

  useEffect(() => {
    let active = true;

    const bootstrapStatus = async () => {
      try {
        const response = await loadRuntimeMqttStatus();
        if (!active) {
          return;
        }

        setStatus(response);
        setIsHydrated(true);
      } catch {
        // Socket.IO will keep trying; bootstrap failure should not block route rendering.
      }
    };

    const unsubscribe = subscribeSocketEvent("mqtt:status", (nextStatus) => {
      setStatus(nextStatus);
      setIsHydrated(true);
    });

    getSocketClient();
    void bootstrapStatus();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return {
    isHydrated,
    status
  };
}
