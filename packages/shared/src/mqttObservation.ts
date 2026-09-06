import { admitMeterReading, type MeterReadingSample, type MeterSourceDefinition } from "./meterReading.js";

export type MqttTransportEvidence = {
  connectionRef: string;
  dup: boolean | null;
  exactTopic: string;
  origin: "mqtt" | "catalog" | "offline";
  qos: number | null;
  receivedAt: string;
  retain: boolean | null;
  sourceTimestampEvidence: string | null;
};

export type ObservationCandidate = {
  candidateId: string;
  declaredTag: string | null;
  exactTopic: string;
  lastSeenAt: string;
  sampleRefs: string[];
  schemaVersion: number;
};

export type ReceptionProfile = {
  allowedFilters: string[];
  id: string;
  name: string;
  siteScope: "cl" | "kn";
};

export type CaptureSession = {
  captureId: string;
  connectionRef: string;
  coverage: "complete" | "partial" | "no-traffic" | "subscription-refused";
  dropped: number;
  expiresAt: string;
  featureEnabled: boolean;
  receptionProfileId: string;
  siteScope: "cl" | "kn";
};

export const MQTT_CATALOG_LIMITS = {
  candidates: 5000,
  payloadBytes: 256 * 1024,
  samplesPerCandidate: 10,
  sessionSeconds: 180
} as const;

export function mapCatalogRetainedToSampleRetain(retained: boolean | null): boolean | null {
  return retained;
}

export function toMeterReadingSample(evidence: MqttTransportEvidence, rawValueDecimal: string): MeterReadingSample {
  return {
    dup: evidence.dup,
    origin: evidence.origin,
    qos: evidence.qos,
    rawValueDecimal,
    receivedAt: evidence.receivedAt,
    retain: mapCatalogRetainedToSampleRetain(evidence.retain),
    sourceTimestamp: evidence.sourceTimestampEvidence
  };
}

export function catalogMustNotMutateAcceptedHistory(
  definition: MeterSourceDefinition,
  evidence: MqttTransportEvidence,
  rawValueDecimal: string
) {
  const sample = toMeterReadingSample(evidence, rawValueDecimal);
  if (sample.origin !== "mqtt") {
    return {
      mutateAccepted: false,
      reason: "CATALOG_OR_OFFLINE_NOT_INGESTED"
    };
  }
  const result = admitMeterReading(definition, sample);
  return {
    mutateAccepted: result.status === "accepted",
    reason: result.reason
  };
}

export function isAllowedDiscoveryFilter(filter: string, profile: ReceptionProfile) {
  if (filter === "#") {
    return false;
  }
  return profile.allowedFilters.some((allowed) => filter === allowed || filter.startsWith(`${allowed}`));
}

export function redactObservationPayload(raw: string) {
  return raw.replace(/(password|token|secret)("?\s*[:=]\s*"?)[^"}\s]+/gi, "$1$2****");
}
