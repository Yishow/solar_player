export const MANAGEMENT_ACCESS_DENIED_CODE = "management_access_denied";
export const MANAGEMENT_ACCESS_DENIED_MESSAGE = "Management access denied";

export type ManagementSocketSessionClass = "playback-safe" | "management-trusted";

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
