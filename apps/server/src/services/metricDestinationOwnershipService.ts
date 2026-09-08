import type Database from "better-sqlite3";
import type { MetricScope } from "@solar-display/shared";
import { isSolarAdapterManagedMetricIdentity } from "../mqtt/SolarSourceAdapter.js";
import { listDerivedMetricDefinitions } from "./derivedMetricRegistryService.js";

/**
 * A metric destination is addressed by scope *and* key. They are passed as one
 * named object so the two strings cannot be swapped at a call site.
 */
export type MetricDestination = {
  metricKey: string;
  metricScope: MetricScope;
};

export type MetricDestinationOwner = "derived-metric" | "solar-adapter";

const OWNER_CONFLICT_CODES: Readonly<Record<MetricDestinationOwner, string>> = {
  "derived-metric": "DERIVED_METRIC_IDENTITY_CONFLICT",
  "solar-adapter": "MANAGED_SOURCE_METRIC_CONFLICT"
};

function scopedIdentity(destination: MetricDestination) {
  return `${destination.metricScope}:${destination.metricKey}`;
}

/**
 * Every destination identity the derived-metric registry holds, including the
 * disabled definitions: a registered identity stays reserved while disabled, so
 * a generic mapping may not take it over in the meantime.
 */
export function listDerivedMetricDestinationIdentities(database: Database.Database) {
  return new Set(
    listDerivedMetricDefinitions(database).flatMap((definition) => {
      const scopes: MetricScope[] = definition.outputScopePolicy === "site"
        ? definition.siteScopes ?? ["cl", "kn"]
        : ["global"];
      return scopes.map((scope) => scopedIdentity({ metricKey: definition.metricKey, metricScope: scope }));
    })
  );
}

/**
 * Resolves the authority that already owns a destination, consulting the same
 * catalogs the legacy mapping route uses. An unreadable registry is not an
 * answer: it throws rather than reporting the destination as unowned.
 */
export function findMetricDestinationOwner(
  database: Database.Database,
  destination: MetricDestination
): MetricDestinationOwner | null {
  let derivedIdentities: ReadonlySet<string>;
  try {
    derivedIdentities = listDerivedMetricDestinationIdentities(database);
  } catch (error) {
    throw Object.assign(new Error("METRIC_OWNERSHIP_UNVERIFIED"), {
      cause: error,
      code: "METRIC_OWNERSHIP_UNVERIFIED",
      statusCode: 503
    });
  }
  if (derivedIdentities.has(scopedIdentity(destination))) return "derived-metric";
  if (isSolarAdapterManagedMetricIdentity(destination.metricScope, destination.metricKey)) return "solar-adapter";
  return null;
}

/**
 * Blocking guard for a generic mapping write. It throws instead of returning a
 * verdict so a caller cannot proceed by ignoring the result.
 */
export function assertUnownedMetricDestination(
  database: Database.Database,
  destination: MetricDestination
) {
  const owner = findMetricDestinationOwner(database, destination);
  if (!owner) return;
  const code = OWNER_CONFLICT_CODES[owner];
  throw Object.assign(new Error(`${code}: ${scopedIdentity(destination)}`), { code, owner, statusCode: 409 });
}
