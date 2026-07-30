export type SiteScope = "cl" | "kn";

export type PlaybackProfileSummary = {
  archivedAt?: string | null;
  id: number;
  isDefault: boolean;
  name: string;
  profileKey: string;
};

export type DeviceGroup = {
  desiredVersion: number | null;
  enabled: boolean;
  id: number;
  name: string;
  playbackProfile: PlaybackProfileSummary;
  playbackProfileId: number;
  siteScope: SiteScope;
};

export type Device = {
  appliedVersion: number | null;
  clientId: string;
  displayName: string;
  enabled: boolean;
  group: DeviceGroup | null;
  groupId: number | null;
  id: number;
  paired: boolean;
  profileUpdateError: string | null;
  profileUpdateState: import("./deviceProfileRollout.js").ProfileUpdateState;
};
