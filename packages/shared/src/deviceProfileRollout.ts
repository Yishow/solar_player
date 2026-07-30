import type { PlaybackProfileVersion } from "./playbackProfileVersion.js";

export const profileUpdateStates = ["waiting", "applied", "failed"] as const;
export type ProfileUpdateState = (typeof profileUpdateStates)[number];

export type DeviceProfileRolloutHeartbeat = {
  appliedVersion: number | null;
  desiredVersion: number | null;
  updateError?: string | null;
  updateState: ProfileUpdateState;
};

export type DeviceProfileRolloutStatus = {
  appliedVersion: number | null;
  desiredVersion: number | null;
  lastError: string | null;
  updatedAt: string | null;
  updateState: ProfileUpdateState;
};

export type DeviceProfileRolloutSnapshot = DeviceProfileRolloutStatus & {
  desired: PlaybackProfileVersion | null;
};

export type FleetProfileRolloutDevice = DeviceProfileRolloutStatus & {
  deviceId: number;
  liveness: "offline" | "online" | "stale";
};

export type FleetProfileRollout = {
  devices: FleetProfileRolloutDevice[];
  summary: {
    applied: number;
    failed: number;
    offline: number;
    total: number;
    waiting: number;
  };
};
