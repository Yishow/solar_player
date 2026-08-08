export const MANAGEMENT_ACCESS_DENIED_CODE = "management_access_denied";
export const MANAGEMENT_ACCESS_DENIED_MESSAGE = "Management access denied";

/** What management origin classification can conclude about a handshake. */
export type ManagementSocketSessionClass =
  | "playback-safe"
  | "management-trusted";

/**
 * What the socket layer knows about a live connection. `unidentified` is never
 * a management classification — it is assigned when Display Client Context
 * resolution fails on a session already classified `playback-safe`.
 */
export type DisplaySocketSessionClass =
  | ManagementSocketSessionClass
  | "unidentified";

export type ManagementAccessDeniedEnvelope = {
  access: "denied";
  code: typeof MANAGEMENT_ACCESS_DENIED_CODE;
  error: string;
  requiredRole: "management-trusted";
  success: false;
  timestamp: string;
};

export type RuntimeMqttStatus = {
  broker: string;
  clientId: string;
  connected: boolean;
  reason: string | null;
  updatedAt: string | null;
};
