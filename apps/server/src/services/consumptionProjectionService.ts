import type { PeriodConsumptionResult } from "@solar-display/shared";

export type ConsumptionProjection = PeriodConsumptionResult & {
  active: boolean;
  algorithmVersion: "e2-v1";
  range: "day" | "month" | "year";
  scope: "cl" | "kn";
};

const projections: ConsumptionProjection[] = [];

export function shadowProject(result: PeriodConsumptionResult, scope: "cl" | "kn", range: ConsumptionProjection["range"]) {
  const next: ConsumptionProjection = {
    ...result,
    active: false,
    algorithmVersion: "e2-v1",
    range,
    scope
  };
  projections.push(next);
  return next;
}

export function activateProjection(candidate: ConsumptionProjection) {
  for (const projection of projections) {
    if (projection.scope === candidate.scope && projection.range === candidate.range) {
      projection.active = false;
    }
  }
  candidate.active = true;
  return candidate;
}

export function rollbackProjection(scope: "cl" | "kn", range: ConsumptionProjection["range"]) {
  const matches = projections.filter((projection) => projection.scope === scope && projection.range === range);
  const current = matches.find((projection) => projection.active);
  if (current) {
    current.active = false;
  }
  const previous = matches.filter((projection) => projection !== current).at(-1);
  if (previous) {
    previous.active = true;
  }
  return previous ?? null;
}

export function listProjections() {
  return projections.slice();
}
