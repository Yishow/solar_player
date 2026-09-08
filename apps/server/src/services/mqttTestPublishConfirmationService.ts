import { createHash, randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { MetricScope } from "@solar-display/shared";
import { lookupEnabledMeterSource } from "./mqttMeterIngest.js";
import { canonicalJson } from "./authoringCanonicalJson.js";

const CONFIRMATION_TTL_MS = 5 * 60 * 1000;

export type ResolvedPublishTarget = {
  broker: string;
  confirmationToken: string;
  exactTopic: string;
  expiresAt: string;
  metricKey: string;
  metricScope: MetricScope;
  payload: string;
  retain: boolean;
  source: {
    channelId: string;
    inputUnit: string;
    measurementKind: string;
    meterId: string;
    sourceRevision: number;
  } | null;
  targetFingerprint: string;
  value: string;
};

type StoredConfirmation = Omit<ResolvedPublishTarget, "confirmationToken">;

const confirmations = new Map<string, StoredConfirmation>();

function prune() {
  const now = Date.now();
  for (const [token, entry] of confirmations) {
    if (Date.parse(entry.expiresAt) <= now) {
      confirmations.delete(token);
    }
  }
}

/** Accepts an operator-entered decimal, as a string or a finite number. */
export function normalizePublishValue(value: unknown): string | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return /^-?\d+(\.\d+)?$/u.test(trimmed) ? trimmed : null;
}

/**
 * A regenerated `timestamp` is not a target change; anything else in the payload
 * is.
 */
function comparablePayload(payload: string) {
  try {
    const parsed = JSON.parse(payload) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const { timestamp: _timestamp, ...rest } = parsed as Record<string, unknown>;
      return JSON.stringify(rest);
    }
  } catch {
    // A non-JSON payload compares verbatim.
  }
  return payload;
}

export function resolvePublishTarget(
  database: Database.Database,
  input: {
    broker: string;
    buildPayload: (value: number) => string;
    mapping: { enabled: number; metric_key: string; metric_scope: MetricScope; topic: string | null; value_path: string | null };
    metricScope: MetricScope;
    retain: boolean;
    value: string;
  }
): Omit<ResolvedPublishTarget, "confirmationToken" | "expiresAt"> {
  const exactTopic = input.mapping.topic?.trim() ?? "";
  const definition = lookupEnabledMeterSource(database, input.metricScope, input.mapping.metric_key);
  const source = definition
    ? {
      channelId: definition.channelId,
      inputUnit: definition.inputUnit,
      measurementKind: definition.measurementKind,
      meterId: definition.meterId,
      sourceRevision: definition.sourceRevision
    }
    : null;
  const targetFingerprint = createHash("sha256").update(canonicalJson({
    broker: input.broker,
    enabled: input.mapping.enabled,
    exactTopic,
    metricKey: input.mapping.metric_key,
    metricScope: input.metricScope,
    source: definition
      ? { ...source, epochId: definition.epochId, scaleDecimal: definition.scaleDecimal }
      : null,
    valuePath: input.mapping.value_path
  })).digest("hex");
  return {
    broker: input.broker,
    exactTopic,
    metricKey: input.mapping.metric_key,
    metricScope: input.metricScope,
    payload: input.buildPayload(Number(input.value)),
    retain: input.retain,
    source,
    targetFingerprint,
    value: input.value
  };
}

export function issuePublishConfirmation(
  target: Omit<ResolvedPublishTarget, "confirmationToken" | "expiresAt">
): ResolvedPublishTarget {
  prune();
  const confirmationToken = randomUUID();
  const stored: StoredConfirmation = {
    ...target,
    expiresAt: new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString()
  };
  confirmations.set(confirmationToken, stored);
  return { ...stored, confirmationToken };
}

export type ConfirmationCheck =
  | { ok: true; target: StoredConfirmation }
  | { ok: false; reason: "PUBLISH_CONFIRMATION_EXPIRED" | "PUBLISH_TARGET_CHANGED"; value: string | null };

/** Re-checks a confirmation against the target and payload resolved right now. */
export function consumePublishConfirmation(
  confirmationToken: string,
  current: Omit<ResolvedPublishTarget, "confirmationToken" | "expiresAt">
): ConfirmationCheck {
  prune();
  const stored = confirmations.get(confirmationToken);
  if (!stored) {
    return { ok: false, reason: "PUBLISH_CONFIRMATION_EXPIRED", value: null };
  }
  const changed = stored.targetFingerprint !== current.targetFingerprint
    || stored.exactTopic !== current.exactTopic
    || stored.retain !== current.retain
    || stored.value !== current.value
    || comparablePayload(stored.payload) !== comparablePayload(current.payload);
  if (changed) {
    confirmations.delete(confirmationToken);
    return { ok: false, reason: "PUBLISH_TARGET_CHANGED", value: stored.value };
  }
  confirmations.delete(confirmationToken);
  return { ok: true, target: stored };
}
