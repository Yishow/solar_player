import type { SiteScope } from "./deviceIdentity.js";

export type DevicePairingErrorCode =
  | "credential_expired"
  | "credential_invalid"
  | "credential_missing"
  | "credential_revoked"
  | "device_disabled"
  | "device_not_found"
  | "group_disabled"
  | "pairing_token_expired"
  | "pairing_token_invalid"
  | "pairing_token_used"
  | "pairing_https_required";

export type PairingTokenIssue = {
  expiresAt: string;
  pairingPath: string;
  token: string;
};

export type AuthenticatedDeviceIdentity = {
  clientId: string;
  credentialId: number;
  deviceId: number;
  groupId: number;
  playbackProfileId: number;
  siteScope: SiteScope;
};
