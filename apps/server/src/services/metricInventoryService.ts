import type Database from "better-sqlite3";
import {
  isMetricScope,
  metricScopes,
  scopedIdentityKey,
  type DerivedMetricDefinition,
  type DerivedMetricDependencyIdentity,
  type MetricCatalogEntry,
  type MetricScope,
  type MonitoringMetricSourceClass
} from "@solar-display/shared";
import { isSolarAdapterManagedMetricIdentity } from "../mqtt/SolarSourceAdapter.js";
import { resolveMetric } from "./MetricResolver.js";
import {
  listDerivedMetricDefinitions,
  readDerivedMetricEvaluation
} from "./derivedMetricRegistryService.js";
import { resolveServerPlaybackMetricCatalog } from "./derivedMetricCatalogService.js";
import { safeDiagnosticText } from "./safeDiagnosticText.js";

export const metricInventoryScopes = [...metricScopes, "all"] as const;
export type MetricInventoryScope = typeof metricInventoryScopes[number];

export type MetricInventorySourceClass = MonitoringMetricSourceClass | "solar-adapter";
export type MetricInventoryOwnership = "managed" | "operator" | "catalog";
export type MetricInventoryEvaluationState = "ready" | "degraded" | "unavailable" | "not-evaluated";

export type MetricInventoryDependency = {
  alias: string;
  kind: "metric" | "calculation-setting";
  metricKey?: string;
  metricScope?: MetricScope;
  settingKey?: string;
  unit: string;
};

export type MetricInventoryProvenance = {
  dependencies: MetricInventoryDependency[];
  sourceId: string | null;
  sourceTimestamp: string | null;
  sourceTopic: string | null;
};

export type MetricInventoryEvaluation = {
  evaluatedAt: string | null;
  failureCode: string | null;
  freshnessState: "fresh" | "stale" | "unavailable" | null;
  retainedLastGood: boolean;
  status: MetricInventoryEvaluationState;
};

export type MetricInventoryFreshness = {
  ageMs: number | null;
  category: string;
  nextTransitionAt: string | null;
  sourceTimestamp: string | null;
  state: "live" | "delayed" | "stale" | "historical" | "unavailable";
};

export type MetricInventoryRow = {
  evaluation: MetricInventoryEvaluation | null;
  evaluationState: MetricInventoryEvaluationState;
  freshness: MetricInventoryFreshness | null;
  freshnessState: MetricInventoryFreshness["state"];
  id: string;
  label: string;
  metricKey: string;
  metricScope: MetricScope;
  ownership: MetricInventoryOwnership;
  provenance: MetricInventoryProvenance;
  sourceClass: MetricInventorySourceClass;
  unit: string | null;
  value: number | null;
};

type TopicRow = {
  enabled: number;
  metric_key: string;
  metric_scope: MetricScope;
  topic: string;
  unit: string | null;
};

type LiveMetricRow = {
  metric_key: string;
  metric_scope: MetricScope;
  unit: string | null;
};

type CatalogDescriptor = Pick<MetricCatalogEntry, "label" | "metricKey" | "sourceClass" | "unit"> & {
  allowedScopes?: readonly MetricScope[];
  dependencyKeys: readonly string[];
};

const sourceTopicLimit = 256;
const dependencyLimit = 16;

function boundedText(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, sourceTopicLimit) : null;
}

function mergeCatalogDescriptor(previous: CatalogDescriptor, next: MetricCatalogEntry): CatalogDescriptor {
  const allowedScopes = new Set<MetricScope>([
    ...(previous.allowedScopes ?? []),
    ...(next.allowedScopes ?? []).filter(isMetricScope)
  ]);
  return {
    ...previous,
    allowedScopes: allowedScopes.size > 0 ? [...allowedScopes] : undefined,
    dependencyKeys: [...new Set([...previous.dependencyKeys, ...next.dependencyKeys])]
  };
}

function addCatalogDescriptor(
  catalog: Map<string, CatalogDescriptor>,
  descriptor: MetricCatalogEntry
) {
  const existing = catalog.get(descriptor.metricKey);
  if (existing) {
    catalog.set(descriptor.metricKey, mergeCatalogDescriptor(existing, descriptor));
    return;
  }
  catalog.set(descriptor.metricKey, {
    allowedScopes: descriptor.allowedScopes?.filter(isMetricScope),
    dependencyKeys: [...descriptor.dependencyKeys],
    label: descriptor.label,
    metricKey: descriptor.metricKey,
    sourceClass: descriptor.sourceClass,
    unit: descriptor.unit
  });
}

function addDefinitionDescriptor(
  catalog: Map<string, CatalogDescriptor>,
  definition: DerivedMetricDefinition
) {
  if (catalog.has(definition.metricKey)) return;
  catalog.set(definition.metricKey, {
    allowedScopes: definition.outputScopePolicy === "global"
      ? ["global"]
      : definition.siteScopes ?? ["cl", "kn"],
    dependencyKeys: [
      definition.metricKey,
      ...definition.inputs.flatMap((input) => input.kind === "metric" ? [input.metricKey] : [])
    ],
    label: definition.name,
    metricKey: definition.metricKey,
    sourceClass: "derived-metric",
    unit: definition.outputUnit
  });
}

function readCatalog(database: Database.Database) {
  // resolveServerPlaybackMetricCatalog uses the same database singleton as the
  // application. Reading all page catalogs keeps this read model tied to the
  // existing playback catalog rather than introducing a second metric list.
  const catalog = new Map<string, CatalogDescriptor>();
  for (const pageKey of ["overview", "solar", "factory-circuit", "factory-circuit-guanyin"] as const) {
    for (const entry of resolveServerPlaybackMetricCatalog(pageKey)) {
      addCatalogDescriptor(catalog, entry);
    }
  }
  for (const definition of listDerivedMetricDefinitions(database)) {
    if (definition.enabled) addDefinitionDescriptor(catalog, definition);
  }
  return catalog;
}

function readConfiguredSources(database: Database.Database) {
  const mappings = database.prepare(`
    SELECT metric_scope, metric_key, topic, unit, enabled
    FROM topic_mappings
    ORDER BY metric_scope, metric_key, id
  `).all() as TopicRow[];
  const mappingByIdentity = new Map<string, TopicRow>();
  for (const mapping of mappings) {
    if (!isMetricScope(mapping.metric_scope)) continue;
    const identity = scopedIdentityKey(mapping.metric_scope, mapping.metric_key);
    if (!mappingByIdentity.has(identity)) mappingByIdentity.set(identity, mapping);
  }

  const liveValues = database.prepare(`
    SELECT metric_scope, metric_key, unit
    FROM live_metric_values
    ORDER BY metric_scope, metric_key
  `).all() as LiveMetricRow[];
  const liveByIdentity = new Map<string, LiveMetricRow>();
  for (const liveValue of liveValues) {
    if (!isMetricScope(liveValue.metric_scope)) continue;
    liveByIdentity.set(scopedIdentityKey(liveValue.metric_scope, liveValue.metric_key), liveValue);
  }
  return { liveByIdentity, mappingByIdentity };
}

function explicitCatalogScopes(descriptor: CatalogDescriptor | undefined): MetricScope[] {
  if (!descriptor?.allowedScopes) return [...metricScopes];
  return descriptor.allowedScopes.filter(isMetricScope);
}

function readEvaluation(
  database: Database.Database,
  metricScope: MetricScope,
  metricKey: string
) {
  try {
    return readDerivedMetricEvaluation(metricScope, metricKey, database);
  } catch {
    // A malformed persisted provenance row must not turn a read-only inventory
    // into a raw exception response. The row remains visible as unavailable.
    return null;
  }
}

function mapEvaluationFreshness(
  state: "fresh" | "stale" | "unavailable"
): MetricInventoryFreshness["state"] {
  return state === "fresh" ? "live" : state;
}

function safeDependency(dependency: DerivedMetricDependencyIdentity): MetricInventoryDependency {
  return {
    alias: boundedText(dependency.alias) ?? "dependency",
    kind: dependency.kind,
    ...(dependency.metricKey ? { metricKey: boundedText(dependency.metricKey) ?? undefined } : {}),
    ...(dependency.metricScope ? { metricScope: dependency.metricScope } : {}),
    ...(dependency.settingKey ? { settingKey: boundedText(dependency.settingKey) ?? undefined } : {}),
    unit: boundedText(dependency.unit) ?? ""
  };
}

function definitionDependencies(
  definition: DerivedMetricDefinition,
  metricScope: MetricScope
): MetricInventoryDependency[] {
  return definition.inputs.slice(0, dependencyLimit).map((input) => input.kind === "metric"
    ? {
        alias: boundedText(input.alias) ?? "dependency",
        kind: "metric" as const,
        metricKey: boundedText(input.metricKey) ?? input.metricKey,
        metricScope: input.scope === "output-site" ? metricScope : input.scope,
        unit: boundedText(input.unit) ?? ""
      }
    : {
        alias: boundedText(input.alias) ?? "dependency",
        kind: "calculation-setting" as const,
        settingKey: boundedText(input.settingKey) ?? input.settingKey,
        unit: boundedText(input.unit) ?? ""
      });
}

function managedSolarTopic(metricScope: MetricScope, metricKey: string) {
  if (metricScope === "global") return null;
  if (metricKey.startsWith("factoryGeneration.")) {
    return `solar/${metricScope.toUpperCase()}/summary`;
  }
  const zoneId = /^solarZone\.([^\.]+)\./u.exec(metricKey)?.[1];
  return zoneId ? `solar/${metricScope.toUpperCase()}/zone/${zoneId}` : null;
}

function sourceOwnership(
  metricScope: MetricScope,
  metricKey: string,
  definition: DerivedMetricDefinition | undefined,
  mapping: TopicRow | undefined
): MetricInventoryOwnership {
  if (isSolarAdapterManagedMetricIdentity(metricScope, metricKey) || definition?.managed) {
    return "managed";
  }
  if (definition) return "operator";
  if (mapping) return "operator";
  return "catalog";
}

function sourceClassFor(
  metricScope: MetricScope,
  metricKey: string,
  descriptor: CatalogDescriptor | undefined,
  definition: DerivedMetricDefinition | undefined,
  mapping: TopicRow | undefined
): MetricInventorySourceClass {
  if (isSolarAdapterManagedMetricIdentity(metricScope, metricKey)) return "solar-adapter";
  if (definition) return "derived-metric";
  if (mapping) return "mqtt-live";
  return descriptor?.sourceClass ?? "mqtt-live";
}

function buildRow(
  database: Database.Database,
  catalog: Map<string, CatalogDescriptor>,
  definitions: Map<string, DerivedMetricDefinition>,
  mappingByIdentity: Map<string, TopicRow>,
  metricScope: MetricScope,
  metricKey: string,
  nowMs: number
): MetricInventoryRow {
  const identity = scopedIdentityKey(metricScope, metricKey);
  const descriptor = catalog.get(metricKey);
  const definition = definitions.get(metricKey);
  const mapping = mappingByIdentity.get(identity);
  const resolved = resolveMetric(database, { metricScope, metricKey }, nowMs);
  const evaluation = definition ? readEvaluation(database, metricScope, metricKey) : null;
  const managedSolar = isSolarAdapterManagedMetricIdentity(metricScope, metricKey);
  const sourceTopic = managedSolar
    ? managedSolarTopic(metricScope, metricKey)
    : safeDiagnosticText(resolved.provenance?.topic ?? mapping?.topic);
  const value = definition && evaluation ? evaluation.value : resolved.value;
  const freshnessState = resolved.freshness?.state
    ?? (evaluation ? mapEvaluationFreshness(evaluation.freshnessState) : "unavailable");
  const freshness = resolved.freshness
    ? {
        ageMs: resolved.freshness.ageMs,
        category: resolved.freshness.category,
        nextTransitionAt: resolved.freshness.nextTransitionAt,
        sourceTimestamp: resolved.freshness.sourceTimestamp,
        state: resolved.freshness.state
      }
    : null;
  const dependencies = evaluation?.dependencies.slice(0, dependencyLimit).map(safeDependency)
    ?? (definition ? definitionDependencies(definition, metricScope) : []);
  const evaluationState: MetricInventoryEvaluationState = definition
    ? evaluation?.status ?? "not-evaluated"
    : "not-evaluated";

  return {
    evaluation: definition
      ? {
          evaluatedAt: evaluation?.evaluatedAt ?? null,
          failureCode: evaluation?.failureCode ?? null,
          freshnessState: evaluation?.freshnessState ?? null,
          retainedLastGood: evaluation?.retainedLastGood ?? false,
          status: evaluationState
        }
      : null,
    evaluationState,
    freshness,
    freshnessState,
    id: identity,
    label: descriptor?.label ?? definition?.name ?? metricKey,
    metricKey,
    metricScope,
    ownership: sourceOwnership(metricScope, metricKey, definition, mapping),
    provenance: {
      dependencies,
      sourceId: managedSolar ? "solar-collector" : definition ? "derived-metric-registry" : null,
      sourceTimestamp: boundedText(resolved.timestamp ?? evaluation?.timestamp),
      sourceTopic
    },
    sourceClass: sourceClassFor(metricScope, metricKey, descriptor, definition, mapping),
    unit: evaluation?.outputUnit ?? resolved.unit ?? mapping?.unit ?? descriptor?.unit ?? null,
    value
  };
}

export function parseMetricInventoryScope(value: unknown): MetricInventoryScope | null {
  if (value === undefined) return "all";
  return typeof value === "string" && (metricInventoryScopes as readonly string[]).includes(value)
    ? value as MetricInventoryScope
    : null;
}

export function readMetricInventory(
  database: Database.Database,
  scope: MetricInventoryScope = "all",
  nowMs = Date.now()
) {
  const catalog = readCatalog(database);
  const definitions = new Map(
    listDerivedMetricDefinitions(database)
      .filter((definition) => definition.enabled)
      .map((definition) => [definition.metricKey, definition])
  );
  const { liveByIdentity, mappingByIdentity } = readConfiguredSources(database);
  const identities = new Map<string, { metricKey: string; metricScope: MetricScope }>();
  const addIdentity = (metricScope: MetricScope, metricKey: string) => {
    identities.set(scopedIdentityKey(metricScope, metricKey), { metricKey, metricScope });
  };

  for (const [metricKey, descriptor] of catalog) {
    for (const metricScope of explicitCatalogScopes(descriptor)) addIdentity(metricScope, metricKey);
  }
  for (const definition of definitions.values()) {
    const descriptor = catalog.get(definition.metricKey);
    for (const metricScope of explicitCatalogScopes(descriptor)) addIdentity(metricScope, definition.metricKey);
  }
  for (const identity of [...mappingByIdentity.keys(), ...liveByIdentity.keys()]) {
    const parsed = JSON.parse(identity) as [unknown, unknown];
    if (isMetricScope(parsed[0]) && typeof parsed[1] === "string") addIdentity(parsed[0], parsed[1]);
  }

  return [...identities.values()]
    .filter(({ metricScope }) => scope === "all" || metricScope === scope)
    .map(({ metricKey, metricScope }) => buildRow(
      database,
      catalog,
      definitions,
      mappingByIdentity,
      metricScope,
      metricKey,
      nowMs
    ))
    .sort((left, right) => {
      const keyOrder = left.metricKey.localeCompare(right.metricKey);
      return keyOrder !== 0 ? keyOrder : left.metricScope.localeCompare(right.metricScope);
    });
}
