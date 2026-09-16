import type Database from "better-sqlite3";
import { isMetricScope, type SingleSourceMutationPatch, type SourceMappingConfiguration } from "@solar-display/shared";
import { isSolarAdapterManagedMetricIdentity } from "../mqtt/SolarSourceAdapter.js";
import { listDerivedMetricDestinationIdentities } from "./metricDestinationOwnershipService.js";
import { readSourceImpact } from "./sourceImpactService.js";
import type { StoredTopicMappingRow } from "./sourceEditReceiptService.js";

export function canonicalizeMetricUnit(unit: string | null | undefined): string | null {
  const trimmed = unit?.trim();
  if (!trimmed) return null;
  switch (trimmed.toLowerCase()) {
    case "kw": return "kW";
    case "kwh": return "kWh";
    case "mwh": return "MWh";
    case "gwh": return "GWh";
    case "wh": return "Wh";
    case "kg": return "kg";
    case "t": return "t";
    case "%": return "%";
    default: return trimmed;
  }
}

export function resolveMultiplier(input: number | null | undefined, existing: number): number {
  return typeof input === "number" && Number.isFinite(input) ? input : existing;
}

export function resolveCustomName(input: string | null | undefined, existing: string | null): string | null {
  if (input === undefined) return existing;
  if (input === null) return null;
  return input.trim() || null;
}

export function findRegisteredMeterSource(
  database: Database.Database,
  scope: string,
  metricKey: string
): { input_unit: string; review_status: string } | undefined {
  return database
    .prepare("SELECT input_unit, review_status FROM meter_sources WHERE metric_scope = ? AND metric_key = ? AND review_status = 'reviewed' ORDER BY source_revision DESC LIMIT 1")
    .get(scope, metricKey) as { input_unit: string; review_status: string } | undefined;
}

export function validateSingleSourceMutation({
  authScope,
  current,
  database,
  expectedRevision,
  patch,
  sourceRef
}: {
  authScope?: "cl" | "kn" | "all";
  current: StoredTopicMappingRow;
  database: Database.Database;
  expectedRevision: number;
  patch: SingleSourceMutationPatch;
  sourceRef: string;
}) {
  if (authScope && authScope !== "all" && current.metric_scope !== authScope) {
    throw Object.assign(new Error("ACCESS_DENIED"), { code: "ACCESS_DENIED", statusCode: 403 });
  }

  const currentRev = current.config_revision ?? 1;
  if (currentRev !== expectedRevision) {
    throw Object.assign(new Error("SOURCE_REVISION_CONFLICT"), {
      code: "SOURCE_REVISION_CONFLICT",
      currentRevision: currentRev,
      sourceRef,
      statusCode: 409
    });
  }

  const targetScope = patch.metricScope ?? current.metric_scope;
  const targetKey = patch.metricKey ?? current.metric_key;
  const identityChanged = targetScope !== current.metric_scope || targetKey !== current.metric_key;

  if (!isMetricScope(targetScope)) {
    throw Object.assign(new Error("INVALID_METRIC_SCOPE"), { code: "INVALID_METRIC_SCOPE", statusCode: 400 });
  }
  if (authScope && authScope !== "all" && targetScope !== authScope) {
    throw Object.assign(new Error("ACCESS_DENIED"), { code: "ACCESS_DENIED", statusCode: 403 });
  }

  if (isSolarAdapterManagedMetricIdentity(targetScope, targetKey)) {
    throw Object.assign(new Error("MANAGED_SOURCE_METRIC_CONFLICT"), {
      code: "MANAGED_SOURCE_METRIC_CONFLICT",
      statusCode: 409
    });
  }

  const derived = listDerivedMetricDestinationIdentities(database);
  if (derived.has(`${targetScope}:${targetKey}`)) {
    throw Object.assign(new Error("DERIVED_METRIC_IDENTITY_CONFLICT"), {
      code: "DERIVED_METRIC_IDENTITY_CONFLICT",
      statusCode: 409
    });
  }

  const meterSource = findRegisteredMeterSource(database, current.metric_scope, current.metric_key);
  if (meterSource?.review_status === "reviewed") {
    const touchesReviewedSemantics = identityChanged
      || (patch.topic !== undefined && patch.topic.trim() !== current.topic)
      || (patch.valuePath !== undefined && patch.valuePath.trim() !== (current.value_path ?? ""))
      || (patch.multiplier !== undefined && patch.multiplier !== (current.multiplier ?? 1))
      || (patch.offset !== undefined && patch.offset !== (current.offset ?? 0))
      || (patch.decimalPlaces !== undefined && patch.decimalPlaces !== (current.decimal_places ?? (current.unit === "%" ? 1 : 2)))
      || (patch.unit !== undefined && canonicalizeMetricUnit(patch.unit) !== canonicalizeMetricUnit(current.unit));
    if (touchesReviewedSemantics) {
      throw Object.assign(new Error("E1_SOURCE_REVISION_REQUIRED"), {
        code: "E1_SOURCE_REVISION_REQUIRED",
        statusCode: 409
      });
    }
  }

  if (identityChanged) {
    const duplicate = database
      .prepare("SELECT id FROM topic_mappings WHERE metric_scope = ? AND metric_key = ? AND source_ref != ?")
      .get(targetScope, targetKey, sourceRef);
    if (duplicate) {
      throw Object.assign(new Error("DUPLICATE_METRIC_IDENTITY"), {
        code: "DUPLICATE_METRIC_IDENTITY",
        statusCode: 409
      });
    }
  }

  const nextEnabled = patch.enabled === undefined ? Boolean(current.enabled) : Boolean(patch.enabled);
  const destructive = (current.enabled === 1 && !nextEnabled) || identityChanged;
  if (destructive) {
    const impact = readSourceImpact(database, {
      metricKey: current.metric_key,
      metricScope: current.metric_scope
    });
    if (impact.unknown) {
      throw Object.assign(new Error("E1_SOURCE_IMPACT_UNKNOWN"), {
        code: "E1_SOURCE_IMPACT_UNKNOWN",
        statusCode: 409
      });
    }
    if (!impact.canMutate) {
      throw Object.assign(new Error("E1_SOURCE_IN_USE"), {
        code: "E1_SOURCE_IN_USE",
        statusCode: 409
      });
    }
  }

  return { targetKey, targetScope };
}

export function validateSingleSourceDeletion({
  authScope,
  current,
  database,
  expectedRevision,
  sourceRef
}: {
  authScope?: "cl" | "kn" | "all";
  current: StoredTopicMappingRow;
  database: Database.Database;
  expectedRevision: number;
  sourceRef: string;
}) {
  if (authScope && authScope !== "all" && current.metric_scope !== authScope) {
    throw Object.assign(new Error("ACCESS_DENIED"), { code: "ACCESS_DENIED", statusCode: 403 });
  }

  const currentRev = current.config_revision ?? 1;
  if (currentRev !== expectedRevision) {
    throw Object.assign(new Error("SOURCE_REVISION_CONFLICT"), {
      code: "SOURCE_REVISION_CONFLICT",
      currentRevision: currentRev,
      sourceRef,
      statusCode: 409
    });
  }

  if (isSolarAdapterManagedMetricIdentity(current.metric_scope, current.metric_key)) {
    throw Object.assign(new Error("MANAGED_SOURCE_METRIC_CONFLICT"), {
      code: "MANAGED_SOURCE_METRIC_CONFLICT",
      statusCode: 409
    });
  }

  const meterSource = findRegisteredMeterSource(database, current.metric_scope, current.metric_key);
  if (meterSource) {
    throw Object.assign(new Error("E1_SOURCE_REVISION_REQUIRED"), {
      code: "E1_SOURCE_REVISION_REQUIRED",
      statusCode: 409
    });
  }

  const impact = readSourceImpact(database, {
    metricKey: current.metric_key,
    metricScope: current.metric_scope
  });
  if (impact.unknown) {
    throw Object.assign(new Error("E1_SOURCE_IMPACT_UNKNOWN"), {
      code: "E1_SOURCE_IMPACT_UNKNOWN",
      statusCode: 409
    });
  }
  if (!impact.canMutate) {
    throw Object.assign(new Error("E1_SOURCE_IN_USE"), {
      code: "E1_SOURCE_IN_USE",
      statusCode: 409
    });
  }
}

export function validateSingleSourceCreation({
  authScope,
  database,
  source
}: {
  authScope?: "cl" | "kn" | "all";
  database: Database.Database;
  source: SourceMappingConfiguration;
}) {
  if (!isMetricScope(source.metricScope)) {
    throw Object.assign(new Error("INVALID_METRIC_SCOPE"), { code: "INVALID_METRIC_SCOPE", statusCode: 400 });
  }
  if (authScope && authScope !== "all" && source.metricScope !== authScope) {
    throw Object.assign(new Error("ACCESS_DENIED"), { code: "ACCESS_DENIED", statusCode: 403 });
  }

  if (isSolarAdapterManagedMetricIdentity(source.metricScope, source.metricKey)) {
    throw Object.assign(new Error("MANAGED_SOURCE_METRIC_CONFLICT"), {
      code: "MANAGED_SOURCE_METRIC_CONFLICT",
      statusCode: 409
    });
  }

  const derived = listDerivedMetricDestinationIdentities(database);
  if (derived.has(`${source.metricScope}:${source.metricKey}`)) {
    throw Object.assign(new Error("DERIVED_METRIC_IDENTITY_CONFLICT"), {
      code: "DERIVED_METRIC_IDENTITY_CONFLICT",
      statusCode: 409
    });
  }

  const duplicate = database
    .prepare("SELECT id FROM topic_mappings WHERE metric_scope = ? AND metric_key = ?")
    .get(source.metricScope, source.metricKey);
  if (duplicate) {
    throw Object.assign(new Error("DUPLICATE_METRIC_IDENTITY"), {
      code: "DUPLICATE_METRIC_IDENTITY",
      statusCode: 409
    });
  }
}
