import { useEffect, useState } from "react";
import { requestJson } from "../services/api";
import {
  getCachedMqttStatus,
  getSocketClient,
  subscribeSocketEvent,
  type MqttConnectionStatus
} from "../services/socket";

type MqttSettingsBootstrapResponse = {
  status: MqttConnectionStatus;
};

export function useMqttStatus() {
  const [status, setStatus] = useState<MqttConnectionStatus>(getCachedMqttStatus());
  const [isHydrated, setIsHydrated] = useState<boolean>(getCachedMqttStatus().updatedAt !== null);

  useEffect(() => {
    let active = true;

    const bootstrapStatus = async () => {
      try {
        const response = await requestJson<MqttSettingsBootstrapResponse>("/api/settings/mqtt");
        if (!active) {
          return;
        }

        setStatus(response.status);
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
