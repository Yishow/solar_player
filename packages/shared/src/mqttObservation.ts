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

export const CAPTURE_MODES = ["passive", "active"] as const;
export type CaptureMode = (typeof CAPTURE_MODES)[number];

export type CaptureDiscoveryState = "granted" | "refused" | "unavailable";

/** State of the isolated short-lived subscription an active capture opens. */
export type CaptureDiscovery = {
  reason: string | null;
  state: CaptureDiscoveryState;
};

export type CaptureSession = {
  captureId: string;
  connectionRef: string;
  coverage: "complete" | "partial" | "no-traffic" | "subscription-refused";
  discovery?: CaptureDiscovery;
  dropped: number;
  expiresAt: string;
  featureEnabled: boolean;
  mode?: CaptureMode;
  receptionProfileId: string;
  siteScope: "cl" | "kn";
};

/** Bounded, redacted payload evidence a candidate sample reference resolves to. */
export type CaptureSampleEvidence = {
  captureId: string;
  connectionRef: string;
  exactTopic: string;
  receptionProfileId: string;
  redactedPayload: string;
  sampleId: string;
  schemaVersion: number;
  siteScope: "cl" | "kn";
  transportEvidence: {
    dup: boolean | null;
    origin: MqttTransportEvidence["origin"];
    qos: number | null;
    receivedAt: string;
    retain: boolean | null;
  };
  truncated: boolean;
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
