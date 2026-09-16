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

export type ObservationCandidateKind = "solar-managed" | "engineering" | "physical-raw" | "diagnostic" | "generic";

export type ObservationCandidate = {
  candidateId: string;
  candidateKind?: ObservationCandidateKind;
  declaredTag: string | null;
  exactTopic: string;
  lastSeenAt: string;
  sampleRefs: string[];
  schemaVersion: number;
};

export type ReceptionProfileKind = "solar" | "engineering" | "physical" | "generic";

export type ReceptionProfile = {
  allowedFilters: string[];
  description?: string;
  id: string;
  kind?: ReceptionProfileKind;
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
  if (filter === "#" || filter === "+") {
    return false;
  }
  return profile.allowedFilters.some((allowed) => {
    const prefix = allowed.endsWith("/") ? allowed : `${allowed}/`;
    return filter === allowed || filter.startsWith(prefix);
  });
}

export function isManagedSolarTopic(topic: string): boolean {
  const normalized = topic.toLowerCase();
  return /^solar\/(cl|kn)\/(summary|zone\/[^/]+)$/.test(normalized);
}

export function isKnEngineeringTopic(topic: string): boolean {
  const normalized = topic.toLowerCase();
  return /^factory\/guanyin\/(stamping|body|painting|assembly|utility|office|heavy_vehicle|ed_coating)(\/.*)?$/.test(normalized);
}

export function isPhysicalRawTopic(topic: string): boolean {
  const normalized = topic.toLowerCase();
  return /^opc(\/v\d+)?\/(cl|kn)\/raw\/[^/]+$/.test(normalized) || /^opc\/raw\/[^/]+$/.test(normalized);
}

export function isDiagnosticTopic(topic: string): boolean {
  const normalized = topic.toLowerCase();
  return /\/(status|heartbeat|alert|snapshot)(\/.*)?$/.test(normalized) || /^solar\/(cl|kn)\/(status|heartbeat|alert)$/.test(normalized);
}

export function classifyObservationCandidate(topic: string): ObservationCandidateKind {
  if (isManagedSolarTopic(topic)) return "solar-managed";
  if (isDiagnosticTopic(topic)) return "diagnostic";
  if (isKnEngineeringTopic(topic)) return "engineering";
  if (isPhysicalRawTopic(topic)) return "physical-raw";
  return "generic";
}

export function sanitizeObservationMarkup(text: string): string {
  return text.replace(/[<>]/g, (char) => (char === "<" ? "&lt;" : "&gt;"));
}

export function redactObservationPayload(raw: string) {
  const redacted = raw.replace(/(password|token|secret)("?\s*[:=]\s*"?)[^"}\s]+/gi, "$1$2****");
  return sanitizeObservationMarkup(redacted);
}
