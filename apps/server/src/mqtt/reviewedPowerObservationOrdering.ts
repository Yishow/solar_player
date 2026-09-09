import { normalizeMetricTimestamp } from "../metrics/metricTimestamp.js";

export type PersistedLivePowerObservation = {
  timestamp: string | null;
  unit: string | null;
  value: number | null;
};

type ReviewedPowerObservation = {
  timestamp: string;
  unit: string;
  value: number;
};

export type ReviewedPowerObservationDecision =
  | "update"
  | "late"
  | "replay"
  | "conflict"
  | "invalid-candidate";

export function decideReviewedPowerObservation(
  candidate: ReviewedPowerObservation,
  prior: PersistedLivePowerObservation | undefined
): ReviewedPowerObservationDecision {
  const candidateTimestampMs = Date.parse(candidate.timestamp);
  if (!Number.isFinite(candidateTimestampMs)) return "invalid-candidate";
  if (!prior || prior.value === null || !Number.isFinite(prior.value) || !prior.timestamp) return "update";

  const priorTimestampMs = Date.parse(normalizeMetricTimestamp(prior.timestamp));
  if (!Number.isFinite(priorTimestampMs)) return "update";
  if (candidateTimestampMs > priorTimestampMs) return "update";
  if (candidateTimestampMs < priorTimestampMs) return "late";
  return prior.value === candidate.value && prior.unit === candidate.unit ? "replay" : "conflict";
}
