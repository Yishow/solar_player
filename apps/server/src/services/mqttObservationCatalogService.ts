import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  MQTT_CATALOG_LIMITS,
  catalogMustNotMutateAcceptedHistory,
  isAllowedDiscoveryFilter,
  redactObservationPayload,
  type CaptureSession,
  type MqttTransportEvidence,
  type ObservationCandidate,
  type ReceptionProfile
} from "@solar-display/shared";
import type { MeterSourceDefinition } from "@solar-display/shared";
import { countAcceptedReadings } from "./meterReadingService.js";

const featureEnabled = () => process.env.MQTT_OBSERVATION_CATALOG === "1";

const profiles: ReceptionProfile[] = [
  { allowedFilters: ["factory/cl/"], id: "cl-power", name: "中壢電力資料", siteScope: "cl" },
  { allowedFilters: ["factory/kn/"], id: "kn-power", name: "觀音電力資料", siteScope: "kn" }
];

const captures = new Map<string, CaptureSession & { candidates: ObservationCandidate[]; samples: Map<string, MqttTransportEvidence> }>();

export function listReceptionProfiles() {
  return profiles.map(({ allowedFilters, id, name, siteScope }) => ({ allowedFilters, id, name, siteScope }));
}

export function startCapture(input: {
  connectionRef: string;
  filter: string;
  receptionProfileId: string;
  siteScope: "cl" | "kn";
}): CaptureSession {
  if (!featureEnabled()) {
    throw Object.assign(new Error("SCOPE_NOT_CONFIGURED"), { code: "SCOPE_NOT_CONFIGURED" });
  }
  const profile = profiles.find((item) => item.id === input.receptionProfileId && item.siteScope === input.siteScope);
  if (!profile) {
    throw Object.assign(new Error("UNAUTHORIZED_SCOPE"), { code: "UNAUTHORIZED_SCOPE" });
  }
  if (!isAllowedDiscoveryFilter(input.filter, profile)) {
    throw Object.assign(new Error("SUBSCRIPTION_REFUSED"), { code: "SUBSCRIPTION_REFUSED" });
  }
  const captureId = randomUUID();
  const session: CaptureSession = {
    captureId,
    connectionRef: input.connectionRef,
    coverage: "no-traffic",
    dropped: 0,
    expiresAt: new Date(Date.now() + MQTT_CATALOG_LIMITS.sessionSeconds * 1000).toISOString(),
    featureEnabled: true,
    receptionProfileId: profile.id,
    siteScope: profile.siteScope
  };
  captures.set(captureId, { ...session, candidates: [], samples: new Map() });
  return session;
}

export function stopCapture(captureId: string) {
  captures.delete(captureId);
  return { captureId, stopped: true };
}

export function tapProductionObservation(evidence: MqttTransportEvidence, payload: string) {
  if (!featureEnabled() || captures.size === 0) {
    return;
  }
  for (const captureId of captures.keys()) {
    try {
      tapCatalogObservation(captureId, evidence, payload);
    } catch {
      // Capture expiry must not block production ingest.
    }
  }
}

export function tapCatalogObservation(
  captureId: string,
  evidence: MqttTransportEvidence,
  payload: string
) {
  const session = captures.get(captureId);
  if (!session) {
    throw Object.assign(new Error("CAPTURE_EXPIRED"), { code: "CAPTURE_EXPIRED" });
  }
  if (Buffer.byteLength(payload) > MQTT_CATALOG_LIMITS.payloadBytes) {
    session.dropped += 1;
    session.coverage = "partial";
    return { dropped: true };
  }
  const candidateId = evidence.exactTopic;
  let candidate = session.candidates.find((item) => item.candidateId === candidateId);
  if (!candidate) {
    if (session.candidates.length >= MQTT_CATALOG_LIMITS.candidates) {
      session.dropped += 1;
      return { dropped: true };
    }
    candidate = {
      candidateId,
      declaredTag: null,
      exactTopic: evidence.exactTopic,
      lastSeenAt: evidence.receivedAt,
      sampleRefs: [],
      schemaVersion: 1
    };
    session.candidates.push(candidate);
  }
  const sampleId = randomUUID();
  if (candidate.sampleRefs.length >= MQTT_CATALOG_LIMITS.samplesPerCandidate) {
    candidate.sampleRefs.shift();
  }
  candidate.sampleRefs.push(sampleId);
  candidate.lastSeenAt = evidence.receivedAt;
  session.samples.set(sampleId, evidence);
  session.coverage = "partial";
  return { dropped: false, redacted: redactObservationPayload(payload), sampleId };
}

export function listCandidates(captureId: string) {
  const session = captures.get(captureId);
  if (!session) {
    throw Object.assign(new Error("CAPTURE_EXPIRED"), { code: "CAPTURE_EXPIRED" });
  }
  return { captureId, candidates: session.candidates, coverage: session.coverage, dropped: session.dropped };
}

export function proveCatalogDoesNotWriteAcceptedHistory(
  database: Database.Database,
  definition: MeterSourceDefinition,
  evidence: MqttTransportEvidence
) {
  const before = countAcceptedReadings(database, definition);
  const decision = catalogMustNotMutateAcceptedHistory(definition, evidence, "10000");
  const after = countAcceptedReadings(database, definition);
  return { after, before, decision };
}
