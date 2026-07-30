import type { SiteScope } from "./deviceIdentity.js";
import type { DisplayRotationPreview } from "./displayRotation.js";
import type { PlaybackSettings } from "./types.js";

export type DisplayClientContext = {
  clientId: string;
  contextRevision: string;
  deviceId: number;
  groupId: number;
  profileId: number;
  siteScope: SiteScope;
};

export type DisplayClientContextErrorCode =
  | "credential_expired"
  | "credential_revoked"
  | "device_disabled"
  | "device_unpaired"
  | "group_disabled"
  | "group_missing"
  | "profile_missing"
  | "site_scope_mismatch";

export type DisplayPlaybackRuntimeResponse = {
  context: DisplayClientContext;
  effectiveRotationRevision: string;
  preview: DisplayRotationPreview;
  settings: PlaybackSettings;
};
