export type HeaderConnectionMeta = {
  label: string;
  status: "connected" | "connecting" | "disconnected";
};

export function resolveHeaderConnectionMeta(input: {
  connected: boolean;
  isHydrated: boolean;
  reason: string | null;
}): HeaderConnectionMeta {
  if (!input.isHydrated) {
    return {
      label: "連線中",
      status: "connecting"
    };
  }

  if (input.reason === "mock") {
    return {
      label: "Mock",
      status: "connected"
    };
  }

  if (input.connected || input.reason === "connected") {
    return {
      label: "Online",
      status: "connected"
    };
  }

  if (input.reason === "reconnecting") {
    return {
      label: "重新連線",
      status: "connecting"
    };
  }

  return {
    label: "離線",
    status: "disconnected"
  };
}
