import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  classifyObservationCandidate,
  MQTT_CATALOG_LIMITS,
  catalogMustNotMutateAcceptedHistory,
  isAllowedDiscoveryFilter,
  redactObservationPayload,
  type CaptureMode,
  type CaptureSampleEvidence,
  type CaptureSession,
  type MqttTransportEvidence,
  type ObservationCandidate,
  type ReceptionProfile
} from "@solar-display/shared";
import type { MeterSourceDefinition } from "@solar-display/shared";
import { countAcceptedReadings } from "./meterReadingService.js";
import { matchesMqttTopicFilter } from "../mqtt/topicFilter.js";

const featureEnabled = () => process.env.MQTT_OBSERVATION_CATALOG === "1";

const profiles: ReceptionProfile[] = [
  { allowedFilters: ["factory/cl/"], description: "中壢標準電力 topic 接收範圍", id: "cl-power", kind: "generic", name: "中壢電力資料", siteScope: "cl" },
  { allowedFilters: ["opc/v1/cl/raw/", "opc/raw/"], description: "中壢 OPC/DDE 實體電錶讀值", id: "cl-opc", kind: "physical", name: "中壢實體電錶資料", siteScope: "cl" },
  { allowedFilters: ["solar/cl/"], description: "中壢 Solar 系統託管資料範圍", id: "cl-solar", kind: "solar", name: "中壢 Solar 託管資料", siteScope: "cl" },
  { allowedFilters: ["factory/guanyin/"], description: "觀音八工程成果 MQTT topic", id: "kn-engineering", kind: "engineering", name: "觀音八工程成果", siteScope: "kn" },
  { allowedFilters: ["factory/kn/"], description: "觀音標準電力 topic 接收範圍", id: "kn-power", kind: "generic", name: "觀音電力資料", siteScope: "kn" },
  { allowedFilters: ["solar/kn/"], description: "觀音 Solar 系統託管資料範圍", id: "kn-solar", kind: "solar", name: "觀音 Solar 託管資料", siteScope: "kn" }
];

type StoredSample = {
  evidence: MqttTransportEvidence;
  redactedPayload: string;
  truncated: boolean;
};

type DiscoverySubscription = { close: () => void | Promise<void> };

/**
 * Opens an isolated, short-lived subscription for an approved discovery filter.
 * It is never the production subscription owner, so releasing it can never
 * unsubscribe production topics.
 */
export type DiscoveryTransport = {
  open(input: {
    connectionRef: string;
    filter: string;
    onMessage: (evidence: MqttTransportEvidence, payload: string) => void;
  }): Promise<DiscoverySubscription>;
};

type StoredCapture = CaptureSession & {
  candidates: ObservationCandidate[];
  discoverySubscription: DiscoverySubscription | null;
  filter: string;
  samples: Map<string, StoredSample>;
};

const captures = new Map<string, StoredCapture>();
let discoveryTransport: DiscoveryTransport | null = null;

export function setDiscoveryTransport(transport: DiscoveryTransport | null) {
  discoveryTransport = transport;
}

function releaseCapture(captureId: string) {
  const session = captures.get(captureId);
  captures.delete(captureId);
  const subscription = session?.discoverySubscription;
  if (!subscription) {
    return;
  }
  session.discoverySubscription = null;
  // Releasing discovery must never block or fail a capture lifecycle transition.
  void Promise.resolve()
    .then(() => subscription.close())
    .catch(() => undefined);
}

function pruneCaptures() {
  for (const [id, session] of captures) {
    if (!featureEnabled() || Date.parse(session.expiresAt) <= Date.now()) {
      releaseCapture(id);
    }
  }
}

function requireCapture(captureId: string) {
  pruneCaptures();
  const session = captures.get(captureId);
  if (!session) {
    throw Object.assign(new Error("CAPTURE_EXPIRED"), { code: "CAPTURE_EXPIRED" });
  }
  return session;
}

function toSession(session: StoredCapture): CaptureSession {
  const { candidates: _candidates, discoverySubscription: _subscription, filter: _filter, samples: _samples, ...rest } = session;
  return rest;
}

export function listReceptionProfiles() {
  return profiles.map(({ allowedFilters, description, id, kind, name, siteScope }) => ({
    allowedFilters,
    description,
    id,
    kind,
    name,
    siteScope
  }));
}

export function startCapture(input: {
  connectionRef: string;
  filter: string;
  mode?: CaptureMode;
  receptionProfileId: string;
  siteScope: "cl" | "kn";
}): CaptureSession {
  pruneCaptures();
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
  const mode: CaptureMode = input.mode === "active" ? "active" : "passive";
  const stored: StoredCapture = {
    candidates: [],
    captureId,
    connectionRef: input.connectionRef,
    coverage: "no-traffic",
    discoverySubscription: null,
    dropped: 0,
    expiresAt: new Date(Date.now() + MQTT_CATALOG_LIMITS.sessionSeconds * 1000).toISOString(),
    featureEnabled: true,
    filter: input.filter,
    mode,
    receptionProfileId: profile.id,
    samples: new Map(),
    siteScope: profile.siteScope,
    ...(mode === "active" ? { discovery: { reason: null, state: "unavailable" as const } } : {})
  };
  captures.set(captureId, stored);
  return toSession(stored);
}

/**
 * A passive tap only sees topics production already subscribes to, so an active
 * capture opens its own subscription and reports the broker's actual answer.
 */
export async function openCaptureDiscovery(captureId: string): Promise<CaptureSession> {
  const session = requireCapture(captureId);
  if (!discoveryTransport) {
    session.discovery = { reason: "DISCOVERY_TRANSPORT_UNAVAILABLE", state: "unavailable" };
    return toSession(session);
  }
  try {
    session.discoverySubscription = await discoveryTransport.open({
      connectionRef: session.connectionRef,
      filter: session.filter,
      onMessage: (evidence, payload) => {
        try {
          tapCatalogObservation(captureId, evidence, payload);
        } catch {
          // An expired capture must not surface through its own transport.
        }
      }
    });
    session.discovery = { reason: null, state: "granted" };
  } catch (error) {
    const reason = (error as { code?: string }).code ?? "SUBSCRIPTION_REFUSED";
    session.discovery = { reason, state: "refused" };
    session.coverage = "subscription-refused";
  }
  return toSession(session);
}

export function stopCapture(captureId: string) {
  releaseCapture(captureId);
  return { captureId, stopped: true };
}

/** Resolves a candidate sample reference to bounded, redacted payload evidence. */
export function readCaptureSample(captureId: string, sampleId: string): CaptureSampleEvidence {
  pruneCaptures();
  const session = captures.get(captureId);
  const sample = session?.samples.get(sampleId);
  if (!session || !sample) {
    throw Object.assign(new Error("CAPTURE_REFRESH_REQUIRED"), { code: "CAPTURE_REFRESH_REQUIRED" });
  }
  return {
    captureId,
    connectionRef: session.connectionRef,
    exactTopic: sample.evidence.exactTopic,
    receptionProfileId: session.receptionProfileId,
    redactedPayload: sample.redactedPayload,
    sampleId,
    schemaVersion: session.candidates.find((candidate) => candidate.candidateId === sample.evidence.exactTopic)?.schemaVersion ?? 1,
    siteScope: session.siteScope,
    transportEvidence: {
      dup: sample.evidence.dup,
      origin: sample.evidence.origin,
      qos: sample.evidence.qos,
      receivedAt: sample.evidence.receivedAt,
      retain: sample.evidence.retain
    },
    truncated: sample.truncated
  };
}

export function tapProductionObservation(evidence: MqttTransportEvidence, payload: string) {
  pruneCaptures();
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
  const session = requireCapture(captureId);
  if (evidence.connectionRef !== session.connectionRef || !matchesMqttTopicFilter(session.filter, evidence.exactTopic)) {
    return { dropped: true };
  }
  if (Buffer.byteLength(payload) > MQTT_CATALOG_LIMITS.payloadBytes) {
    session.dropped += 1;
    session.coverage = "partial";
    return { dropped: true };
  }
  let declaredTag: string | null = null;
  let sourceTimestampEvidence = evidence.sourceTimestampEvidence;
  try {
    const parsed = JSON.parse(payload);
    if (parsed && typeof parsed === "object") {
      const tagCandidate = parsed as { channelId?: unknown; declaredTag?: unknown; tag?: unknown; tagId?: unknown };
      const rawTag = tagCandidate.tagId ?? tagCandidate.declaredTag ?? tagCandidate.tag ?? tagCandidate.channelId;
      if (typeof rawTag === "string" && rawTag.trim().length > 0) {
        declaredTag = rawTag.trim();
      }
      const timeCandidate = parsed as { readAt?: unknown; sourceTimestamp?: unknown; timestamp?: unknown };
      const rawTime = timeCandidate.sourceTimestamp ?? timeCandidate.readAt ?? timeCandidate.timestamp;
      if (typeof rawTime === "string" && rawTime.trim().length > 0) {
        sourceTimestampEvidence = rawTime.trim();
      }
    }
  } catch {
    // Non-JSON payload
  }
  const candidateId = declaredTag ? `${evidence.exactTopic}#${declaredTag}` : evidence.exactTopic;
  let candidate = session.candidates.find((item) => item.candidateId === candidateId);
  if (!candidate) {
    if (session.candidates.length >= MQTT_CATALOG_LIMITS.candidates) {
      session.dropped += 1;
      return { dropped: true };
    }
    candidate = {
      candidateId,
      candidateKind: classifyObservationCandidate(evidence.exactTopic),
      declaredTag,
      exactTopic: evidence.exactTopic,
      lastSeenAt: evidence.receivedAt,
      sampleRefs: [],
      schemaVersion: 1
    };
    session.candidates.push(candidate);
  }
  const sampleId = randomUUID();
  if (candidate.sampleRefs.length >= MQTT_CATALOG_LIMITS.samplesPerCandidate) {
    const expired = candidate.sampleRefs.shift();
    if (expired) session.samples.delete(expired);
  }
  candidate.sampleRefs.push(sampleId);
  candidate.lastSeenAt = evidence.receivedAt;
  const redacted = redactObservationPayload(payload);
  session.samples.set(sampleId, {
    evidence: { ...evidence, sourceTimestampEvidence },
    redactedPayload: redacted,
    truncated: false
  });
  session.coverage = "partial";
  return { dropped: false, redacted, sampleId };
}

export function listCandidates(captureId: string) {
  const session = requireCapture(captureId);
  return {
    captureId,
    candidates: session.candidates,
    coverage: session.coverage,
    ...(session.discovery ? { discovery: session.discovery } : {}),
    dropped: session.dropped
  };
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
