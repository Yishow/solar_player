import type Database from "better-sqlite3";
import type {
  DerivedMetricDefinition,
  DerivedMetricDependencyIdentity,
  DerivedMetricEvaluation,
  DerivedMetricInput,
  DerivedMetricValidationError,
  MetricScope
} from "@solar-display/shared";
import {
  co2TreeEquivalentFactor,
  DERIVED_METRIC_SCOPE_SELECTORS,
  resolvePlaybackMetricCatalog
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { normalizeMetricTimestamp } from "../metrics/metricTimestamp.js";
import { isSolarAdapterManagedMetricIdentity } from "../mqtt/SolarSourceAdapter.js";
import { resolveMetric } from "./MetricResolver.js";
import { readCalculationSettings } from "./calculationSettingsService.js";
import { evaluateMetricFreshness } from "./freshnessPolicyService.js";
import {
  convertDerivedMetricExpressionValue,
  DerivedMetricExpressionError,
  evaluateDerivedMetricExpression,
  parseDerivedMetricExpression,
  validateDerivedMetricExpressionUnit,
  type DerivedMetricExpressionNode
} from "./derivedMetricExpression.js";

type DefinitionRow = {
  acceptance_policy: string | null;
  description: string;
  enabled: number;
  expression: string;
  fallback_policy: DerivedMetricDefinition["fallbackPolicy"];
  managed: number;
  metric_key: string;
  name: string;
  output_scope_policy: DerivedMetricDefinition["outputScopePolicy"];
  output_unit: string;
  precision: number;
  revision: number;
  site_scopes_json: string | null;
};

type InputRow = {
  alias: string;
  derived_metric_key: string;
  input_kind: DerivedMetricInput["kind"];
  metric_key: string | null;
  scope_selector: string | null;
  setting_key: string | null;
  unit: string;
};

type CompiledDefinition = {
  ast: DerivedMetricExpressionNode;
  definition: DerivedMetricDefinition;
};

type CompiledNode = {
  definition: CompiledDefinition;
  metricScope: MetricScope;
  nodeId: string;
};

type CompiledRegistry = {
  definitions: ReadonlyMap<string, CompiledDefinition>;
  nodes: readonly CompiledNode[];
  reverseMetricDependencies: ReadonlyMap<string, readonly string[]>;
  reverseSettingDependencies: ReadonlyMap<string, readonly string[]>;
  revision: number;
};

export type DerivedMetricChange = {
  metricScope: MetricScope;
  metricKey: string;
};

export type DerivedMetricEvaluationOptions = {
  materialize?: boolean;
  changedMetrics?: readonly DerivedMetricChange[];
  changedSettings?: readonly string[];
};

export type DerivedMetricRegistryDiagnostic = {
  errors: readonly DerivedMetricValidationError[];
  metricKey: string;
};

type EvaluationRow = {
  definition_revision: number;
  evaluated_at: string;
  failure_code: DerivedMetricEvaluation["failureCode"];
  metric_key: string;
  metric_scope: MetricScope;
  provenance_json: string;
  retained_last_good: number;
  source_timestamp: string | null;
  status: DerivedMetricEvaluation["status"];
  unit: string;
  value: number | null;
};

export class DerivedMetricRegistryError extends Error {
  readonly code: string;
  readonly errors: DerivedMetricValidationError[];
  readonly statusCode: number;

  constructor(code: string, message: string, errors: DerivedMetricValidationError[] = [], statusCode = 400) {
    super(message);
    this.name = "DerivedMetricRegistryError";
    this.code = code;
    this.errors = errors;
    this.statusCode = statusCode;
  }
}

const registrySnapshots = new WeakMap<Database.Database, CompiledRegistry>();
const registryDiagnostics = new WeakMap<Database.Database, readonly DerivedMetricRegistryDiagnostic[]>();

function immutableMap<K, V>(source: ReadonlyMap<K, V>): ReadonlyMap<K, V> {
  const backing = new Map(source);
  let view: ReadonlyMap<K, V>;
  const candidate: ReadonlyMap<K, V> = {
    get size() {
      return backing.size;
    },
    get(key: K) {
      return backing.get(key);
    },
    has(key: K) {
      return backing.has(key);
    },
    forEach(callback, thisArg) {
      backing.forEach((value, key) => callback.call(thisArg, value, key, view));
    },
    entries() {
      return backing.entries();
    },
    keys() {
      return backing.keys();
    },
    values() {
      return backing.values();
    },
    [Symbol.iterator]() {
      return backing[Symbol.iterator]();
    }
  };
  view = Object.freeze(candidate);
  return view;
}

function freezeDeep<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child);
  return Object.freeze(value);
}

function freezeCompiledRegistry(registry: CompiledRegistry): CompiledRegistry {
  const definitions = new Map(
    [...registry.definitions].map(([key, value]) => [key, freezeDeep(value)] as const)
  );
  const nodes = Object.freeze(registry.nodes.map((node) => freezeDeep(node)));
  const reverseMetricDependencies = new Map(
    [...registry.reverseMetricDependencies].map(([key, value]) => [key, Object.freeze([...value])] as const)
  );
  const reverseSettingDependencies = new Map(
    [...registry.reverseSettingDependencies].map(([key, value]) => [key, Object.freeze([...value])] as const)
  );
  return Object.freeze({
    definitions: immutableMap(definitions),
    nodes,
    reverseMetricDependencies: immutableMap(reverseMetricDependencies),
    reverseSettingDependencies: immutableMap(reverseSettingDependencies),
    revision: registry.revision
  });
}

const settingInputs = {
  carbonEmissionFactor: { unit: "kg/kWh" },
  estimatedTariffPerKwh: { unit: "TWD/kWh" },
  householdDailyUsageKwh: { unit: "kWh" },
  householdMonthlyUsageKwh: { unit: "kWh" },
  treeEquivalentFactor: { unit: "" }
} as const;
const MAX_DERIVED_METRIC_INPUTS = 64;
const MAX_DERIVED_METRIC_IDENTITY_LENGTH = 128;

const playbackMetricInputKeys = new Set(
  (["overview", "solar", "factory-circuit", "factory-circuit-guanyin"] as const)
    .flatMap((pageKey) => resolvePlaybackMetricCatalog(pageKey))
    .flatMap((entry) => entry.dependencyKeys)
);

function resolveMetricInputScopes(
  definition: DerivedMetricDefinition,
  input: Extract<DerivedMetricInput, { kind: "metric" }>
): MetricScope[] {
  return input.scope === "output-site" ? outputScopes(definition) : [input.scope];
}

function isManagedSourceMetricInput(
  definition: DerivedMetricDefinition,
  input: Extract<DerivedMetricInput, { kind: "metric" }>
) {
  return resolveMetricInputScopes(definition, input)
    .some((scope) => isSolarAdapterManagedMetricIdentity(scope, input.metricKey));
}

function isRegisteredSourceMetricInput(
  definition: DerivedMetricDefinition,
  input: Extract<DerivedMetricInput, { kind: "metric" }>,
  registeredSourceMetricIds: ReadonlySet<string>
) {
  return playbackMetricInputKeys.has(input.metricKey)
    || isManagedSourceMetricInput(definition, input)
    || resolveMetricInputScopes(definition, input)
      .some((scope) => registeredSourceMetricIds.has(`${scope}:${input.metricKey}`));
}

const requiresCurrentMetricInputs = new Set([
  "monthGeneration",
  "todayGeneration",
  "totalGeneration"
]);

const unitScales: Readonly<Record<string, number>> = {
  "": 1,
  "%": 1,
  W: 0.001,
  kW: 1,
  MW: 1_000,
  Wh: 0.001,
  kWh: 1,
  MWh: 1_000,
  GWh: 1_000_000,
  kg: 1,
  t: 1_000,
  trees: 1_000,
  "kg/kWh": 1,
  h: 1,
  TWD: 1,
  "TWD/kWh": 1
};

const unitFamilies: Readonly<Record<string, string>> = {
  "": "dimensionless",
  "%": "dimensionless",
  W: "power",
  kW: "power",
  MW: "power",
  Wh: "energy",
  kWh: "energy",
  MWh: "energy",
  GWh: "energy",
  kg: "mass",
  t: "mass",
  trees: "mass",
  "kg/kWh": "mass-per-energy",
  h: "time",
  TWD: "currency",
  "TWD/kWh": "currency-per-energy"
};

const canonicalDefinitions: DerivedMetricDefinition[] = [
  {
    description: "Site self-consumption energy divided by site consumption energy.",
    enabled: true,
    expression: "self / consumption * 100",
    fallbackPolicy: "unavailable",
    inputs: [
      { alias: "self", kind: "metric", metricKey: "selfConsumptionEnergy", scope: "output-site", unit: "kWh" },
      { alias: "consumption", kind: "metric", metricKey: "consumptionEnergy", scope: "output-site", unit: "kWh" }
    ],
    managed: true,
    metricKey: "selfConsumptionRatio",
    name: "Self-consumption Ratio",
    outputScopePolicy: "site",
    outputUnit: "%",
    precision: 6,
    revision: 1
  },
  {
    description: "Site daily generation converted with the configured carbon factor.",
    enabled: true,
    expression: "generation * carbonFactor",
    fallbackPolicy: "unavailable",
    inputs: [
      { alias: "generation", kind: "metric", metricKey: "factoryGeneration.todayMwh", scope: "output-site", unit: "MWh" },
      { alias: "carbonFactor", kind: "calculation-setting", settingKey: "carbonEmissionFactor", unit: "kg/kWh" }
    ],
    managed: true,
    metricKey: "todayCo2Reduction",
    name: "Today's CO2 Reduction",
    outputScopePolicy: "site",
    outputUnit: "t",
    precision: 6,
    revision: 1
  },
  {
    description: "Site cumulative generation converted with the configured carbon factor.",
    enabled: true,
    expression: "generation * carbonFactor",
    fallbackPolicy: "retain-last-good",
    inputs: [
      { alias: "generation", kind: "metric", metricKey: "factoryGeneration.totalMwh", scope: "output-site", unit: "MWh" },
      { alias: "carbonFactor", kind: "calculation-setting", settingKey: "carbonEmissionFactor", unit: "kg/kWh" }
    ],
    managed: true,
    metricKey: "totalCo2Reduction",
    name: "Total CO2 Reduction",
    outputScopePolicy: "site",
    outputUnit: "t",
    precision: 6,
    revision: 1
  },
  {
    description: "Site cumulative generation converted to carbon reduction.",
    enabled: true,
    expression: "generation * carbonFactor",
    fallbackPolicy: "unavailable",
    inputs: [
      { alias: "generation", kind: "metric", metricKey: "factoryGeneration.totalMwh", scope: "output-site", unit: "MWh" },
      { alias: "carbonFactor", kind: "calculation-setting", settingKey: "carbonEmissionFactor", unit: "kg/kWh" }
    ],
    managed: true,
    metricKey: "sustainability.site.accumulatedCarbonReductionTons",
    name: "Site Accumulated Carbon Reduction",
    outputScopePolicy: "site",
    outputUnit: "t",
    precision: 3,
    revision: 1
  },
  {
    description: "Site annual self-consumption energy as a percentage of consumption energy.",
    enabled: true,
    expression: "self / consumption * 100",
    fallbackPolicy: "unavailable",
    inputs: [
      { alias: "self", kind: "metric", metricKey: "selfConsumptionEnergy", scope: "output-site", unit: "kWh" },
      { alias: "consumption", kind: "metric", metricKey: "consumptionEnergy", scope: "output-site", unit: "kWh" }
    ],
    managed: true,
    metricKey: "sustainability.site.annualEnergySavingPercent",
    name: "Site Annual Energy Saving",
    outputScopePolicy: "site",
    outputUnit: "%",
    precision: 1,
    revision: 1
  },
  {
    description: "Site accumulated carbon reduction converted to tree equivalents.",
    enabled: true,
    expression: `adaptiveRound(co2) * ${co2TreeEquivalentFactor}`,
    fallbackPolicy: "unavailable",
    inputs: [
      { alias: "co2", kind: "metric", metricKey: "sustainability.site.accumulatedCarbonReductionTons", scope: "output-site", unit: "t" }
    ],
    managed: true,
    metricKey: "sustainability.site.plantedTreeEquivalent",
    name: "Site Planted Tree Equivalent",
    outputScopePolicy: "site",
    outputUnit: "trees",
    precision: 0,
    revision: 1
  },
  {
    description: "Global cumulative generation converted to carbon reduction.",
    enabled: true,
    expression: "generation * carbonFactor",
    fallbackPolicy: "retain-last-good",
    inputs: [
      { alias: "generation", kind: "metric", metricKey: "totalGeneration", scope: "global", unit: "MWh" },
      { alias: "carbonFactor", kind: "calculation-setting", settingKey: "carbonEmissionFactor", unit: "kg/kWh" }
    ],
    managed: true,
    metricKey: "sustainability.global.accumulatedCarbonReductionTons",
    name: "Global Accumulated Carbon Reduction",
    outputScopePolicy: "global",
    outputUnit: "t",
    precision: 3,
    revision: 1
  },
  {
    description: "Global annual self-consumption energy as a percentage of consumption energy.",
    enabled: true,
    expression: "self / consumption * 100",
    fallbackPolicy: "unavailable",
    inputs: [
      { alias: "self", kind: "metric", metricKey: "selfConsumptionEnergy", scope: "global", unit: "kWh" },
      { alias: "consumption", kind: "metric", metricKey: "consumptionEnergy", scope: "global", unit: "kWh" }
    ],
    managed: true,
    metricKey: "sustainability.global.annualEnergySavingPercent",
    name: "Global Annual Energy Saving",
    outputScopePolicy: "global",
    outputUnit: "%",
    precision: 1,
    revision: 1
  },
  {
    description: "Global accumulated carbon reduction converted to tree equivalents.",
    enabled: true,
    expression: `adaptiveRound(co2) * ${co2TreeEquivalentFactor}`,
    fallbackPolicy: "unavailable",
    inputs: [
      { alias: "co2", kind: "metric", metricKey: "sustainability.global.accumulatedCarbonReductionTons", scope: "global", unit: "t" }
    ],
    managed: true,
    metricKey: "sustainability.global.plantedTreeEquivalent",
    name: "Global Planted Tree Equivalent",
    outputScopePolicy: "global",
    outputUnit: "trees",
    precision: 0,
    revision: 1
  },
  ...([
    {
      aliases: ["stamping", "body", "painting", "assembly", "utility", "office"],
      metricKey: "factoryCircuit.jungliTotalPower",
      name: "Jungli Factory Circuit Total Power"
    },
    {
      aliases: ["stamping", "body", "painting", "assembly", "utility", "office", "heavyVehicle", "edCoating"],
      metricKey: "factoryCircuit.guanyinTotalPower",
      name: "Guanyin Factory Circuit Total Power"
    }
  ] as const).map(({ aliases, metricKey, name }) => ({
    description: "Sum of the configured Factory Circuit slots for one page definition.",
    enabled: true,
    expression: `sum(${aliases.join(", ")})`,
    fallbackPolicy: "unavailable" as const,
    inputs: aliases.map((alias) => ({
      alias,
      kind: "metric" as const,
      metricKey: `factoryCircuit.${alias === "heavyVehicle" ? "heavyVehicle" : alias === "edCoating" ? "edCoating" : alias}Power`,
      scope: "output-site" as const,
      unit: "kW"
    })),
    managed: true,
    metricKey,
    name,
    outputScopePolicy: "site" as const,
    outputUnit: "kW",
    precision: 1,
    revision: 1,
    siteScopes: (metricKey === "factoryCircuit.jungliTotalPower" ? ["cl"] : ["kn"]) as Array<"cl" | "kn">
  })),
  ...(["today", "month", "total"] as const).map((period) => ({
    ...(period === "total" ? { acceptancePolicy: "cumulative-nondecreasing" as const } : {}),
    description: `Canonical CL+KN ${period} generation.`,
    enabled: true,
    expression: "clValue + knValue",
    fallbackPolicy: "retain-last-good" as const,
    inputs: [
      { alias: "clValue", kind: "metric" as const, metricKey: `factoryGeneration.${period}Mwh`, scope: "cl" as const, unit: "MWh" },
      { alias: "knValue", kind: "metric" as const, metricKey: `factoryGeneration.${period}Mwh`, scope: "kn" as const, unit: "MWh" }
    ],
    managed: true,
    metricKey: `${period}Generation`,
    name: `Canonical ${period} Generation`,
    outputScopePolicy: "global" as const,
    outputUnit: "MWh",
    precision: 3,
    revision: 1
  }))
];

function serializeDefinition(row: DefinitionRow, inputs: DerivedMetricInput[]): DerivedMetricDefinition {
  let siteScopes: DerivedMetricDefinition["siteScopes"];
  if (typeof row.site_scopes_json === "string") {
    try {
      const parsed = JSON.parse(row.site_scopes_json);
      siteScopes = Array.isArray(parsed) ? parsed as DerivedMetricDefinition["siteScopes"] : [];
    } catch {
      siteScopes = [];
    }
  }
  return {
    ...(row.acceptance_policy === "cumulative-nondecreasing"
      ? { acceptancePolicy: "cumulative-nondecreasing" as const }
      : {}),
    description: row.description,
    enabled: row.enabled === 1,
    expression: row.expression,
    fallbackPolicy: row.fallback_policy,
    inputs,
    managed: row.managed === 1,
    metricKey: row.metric_key,
    name: row.name,
    outputScopePolicy: row.output_scope_policy,
    outputUnit: row.output_unit,
    precision: row.precision,
    revision: row.revision,
    ...(siteScopes !== undefined ? { siteScopes } : {})
  };
}

function readDefinitions(database: Database.Database): DerivedMetricDefinition[] {
  const rows = database.prepare(`
    SELECT metric_key, name, description, output_scope_policy, expression, output_unit,
      precision, fallback_policy, acceptance_policy, enabled, managed, revision, site_scopes_json
    FROM derived_metric_definitions ORDER BY metric_key
  `).all() as DefinitionRow[];
  const inputRows = database.prepare(`
    SELECT derived_metric_key, alias, input_kind, metric_key, scope_selector, setting_key, unit
    FROM derived_metric_inputs ORDER BY derived_metric_key, sort_order
  `).all() as InputRow[];
  return rows.map((row) => serializeDefinition(
    row,
    inputRows.filter((input) => input.derived_metric_key === row.metric_key).map((input) =>
      input.input_kind === "metric"
        ? {
            alias: input.alias,
            kind: "metric",
            metricKey: input.metric_key!,
            scope: input.scope_selector as "output-site" | "cl" | "kn" | "global",
            unit: input.unit
          }
        : {
            alias: input.alias,
            kind: "calculation-setting",
            settingKey: input.setting_key!,
            unit: input.unit
          }
    )
  ));
}

function outputScopes(definition: DerivedMetricDefinition): MetricScope[] {
  if (definition.outputScopePolicy !== "site") return ["global"];
  return definition.siteScopes ?? ["cl", "kn"];
}

function retireExcludedRuntimeRows(
  database: Database.Database,
  definitions: readonly DerivedMetricDefinition[],
  diagnostics: readonly DerivedMetricRegistryDiagnostic[]
) {
  const excluded = new Set(diagnostics.map(({ metricKey }) => metricKey));
  if (excluded.size === 0) return;
  const liveRows = database.prepare(`
    SELECT metric_scope, metric_key, raw_payload
    FROM live_metric_values
  `).all() as Array<{ metric_key: string; metric_scope: MetricScope; raw_payload: string | null }>;
  const deleteEvaluation = database.prepare(
    "DELETE FROM derived_metric_evaluations WHERE metric_scope = ? AND metric_key = ?"
  );
  const deleteLive = database.prepare(
    "DELETE FROM live_metric_values WHERE metric_scope = ? AND metric_key = ?"
  );
  const hasPersistedMapping = database.prepare(
    "SELECT 1 FROM topic_mappings WHERE metric_scope = ? AND metric_key = ?"
  );
  database.transaction(() => {
    for (const definition of definitions) {
      if (!definition.enabled || !excluded.has(definition.metricKey)) continue;
      for (const metricScope of outputScopes(definition)) {
        deleteEvaluation.run(metricScope, definition.metricKey);
        const liveRow = liveRows.find(({ metric_key: metricKey, metric_scope: rowScope }) =>
          rowScope === metricScope && metricKey === definition.metricKey
        );
        if (!liveRow) continue;
        if (hasPersistedMapping.get(metricScope, definition.metricKey)) continue;
        try {
          const payload = liveRow.raw_payload
            ? JSON.parse(liveRow.raw_payload) as { source?: unknown }
            : null;
          if (payload?.source === "derived-metric-registry") deleteLive.run(metricScope, definition.metricKey);
        } catch {
          // Preserve an unrecognized live payload because it may belong to a source adapter.
        }
      }
    }
  })();
}

function reconcileRuntimeRows(database: Database.Database, registry: CompiledRegistry) {
  const compiledNodeIds = new Set(registry.nodes.map(({ nodeId }) => nodeId));
  const evaluations = database.prepare(`
    SELECT metric_scope, metric_key FROM derived_metric_evaluations
  `).all() as Array<{ metric_key: string; metric_scope: MetricScope }>;
  const liveRows = database.prepare(`
    SELECT metric_scope, metric_key, raw_payload FROM live_metric_values
  `).all() as Array<{ metric_key: string; metric_scope: MetricScope; raw_payload: string | null }>;
  const registryEvaluationIds = new Set(
    evaluations.map(({ metric_scope, metric_key }) => `${metric_scope}:${metric_key}`)
  );
  const persistedSourceMetricIds = new Set(
    (database.prepare(`
      SELECT metric_scope, metric_key FROM topic_mappings
    `).all() as Array<{ metric_key: string; metric_scope: MetricScope }>)
      .map(({ metric_scope, metric_key }) => `${metric_scope}:${metric_key}`)
  );
  const deleteEvaluation = database.prepare(
    "DELETE FROM derived_metric_evaluations WHERE metric_scope = ? AND metric_key = ?"
  );
  const deleteLive = database.prepare(
    "DELETE FROM live_metric_values WHERE metric_scope = ? AND metric_key = ?"
  );
  database.transaction(() => {
    for (const row of evaluations) {
      if (!compiledNodeIds.has(`${row.metric_scope}:${row.metric_key}`)) {
        deleteEvaluation.run(row.metric_scope, row.metric_key);
      }
    }
    for (const row of liveRows) {
      const metricId = `${row.metric_scope}:${row.metric_key}`;
      if (
        compiledNodeIds.has(metricId)
        || persistedSourceMetricIds.has(metricId)
        || isSolarAdapterManagedMetricIdentity(row.metric_scope, row.metric_key)
      ) continue;
      try {
        const payload = row.raw_payload
          ? JSON.parse(row.raw_payload) as { source?: unknown }
          : null;
        if (
          payload?.source === "derived-metric-registry"
          || registryEvaluationIds.has(metricId)
        ) {
          deleteLive.run(row.metric_scope, row.metric_key);
        }
      } catch {
        // Preserve an unrecognized live payload because it may belong to a source adapter.
      }
    }
  })();
}

function resolveInputScope(input: Extract<DerivedMetricInput, { kind: "metric" }>, outputScope: MetricScope) {
  return input.scope === "output-site" ? outputScope : input.scope;
}

function validateDefinitionScalars(definition: DerivedMetricDefinition): DerivedMetricValidationError[] {
  const errors: DerivedMetricValidationError[] = [];
  if (typeof definition.description !== "string") {
    errors.push({ code: "invalid-definition", message: "description must be a string" });
  }
  if (typeof definition.enabled !== "boolean") {
    errors.push({ code: "invalid-definition", message: "enabled must be a boolean" });
  }
  if (typeof definition.managed !== "boolean") {
    errors.push({ code: "invalid-definition", message: "managed must be a boolean" });
  }
  if (typeof definition.outputUnit !== "string") {
    errors.push({ code: "invalid-definition", message: "outputUnit must be a string" });
  }
  if (
    typeof definition.precision !== "number"
    || !Number.isInteger(definition.precision)
    || definition.precision < 0
    || definition.precision > 6
  ) {
    errors.push({ code: "invalid-definition", message: "precision must be an integer from 0 to 6" });
  }
  if (
    typeof definition.revision !== "number"
    || !Number.isInteger(definition.revision)
    || definition.revision < 0
  ) {
    errors.push({ code: "invalid-definition", message: "revision must be a non-negative integer" });
  }
  if (
    definition.acceptancePolicy !== undefined
    && definition.acceptancePolicy !== "cumulative-nondecreasing"
  ) {
    errors.push({ code: "invalid-definition", message: "Invalid acceptancePolicy" });
  }
  return errors;
}

function validateSiteScopes(definition: DerivedMetricDefinition): DerivedMetricValidationError[] {
  const siteScopes: unknown = definition.siteScopes;
  if (siteScopes === undefined) return [];
  if (definition.outputScopePolicy !== "site") {
    return [{ code: "invalid-scope", message: "siteScopes require a site output definition" }];
  }
  if (!Array.isArray(siteScopes) || siteScopes.length === 0) {
    return [{ code: "invalid-scope", message: "siteScopes must contain at least one site" }];
  }
  const seen = new Set<string>();
  const errors: DerivedMetricValidationError[] = [];
  for (const site of siteScopes) {
    if (site !== "cl" && site !== "kn") {
      errors.push({ code: "invalid-scope", message: `Invalid site scope: ${String(site)}` });
      continue;
    }
    if (seen.has(site)) errors.push({ code: "invalid-scope", message: `Duplicate site scope: ${site}` });
    seen.add(site);
  }
  return errors;
}

function validateDefinitionShape(definition: DerivedMetricDefinition) {
  const errors: DerivedMetricValidationError[] = [];
  if (
    !definition
    || typeof definition.metricKey !== "string"
    || typeof definition.name !== "string"
    || typeof definition.expression !== "string"
    || !Array.isArray(definition.inputs)
  ) {
    return { errors: [{ code: "invalid-definition" as const, message: "Invalid derived metric definition" }] };
  }
  if (!definition.metricKey || !definition.name || !definition.expression) {
    errors.push({ code: "invalid-definition", message: "metricKey, name, and expression are required" });
  }
  if (Buffer.byteLength(definition.metricKey, "utf8") > MAX_DERIVED_METRIC_IDENTITY_LENGTH) {
    errors.push({ code: "invalid-definition", message: "metricKey must be at most 128 bytes" });
  }
  if (!(["site", "global"] as const).includes(definition.outputScopePolicy)) {
    errors.push({ code: "invalid-definition", message: "outputScopePolicy must be site or global" });
  }
  if (!(["unavailable", "retain-last-good"] as const).includes(definition.fallbackPolicy)) {
    errors.push({ code: "invalid-definition", message: "Invalid fallbackPolicy" });
  }
  if (!definition.managed && !definition.metricKey.startsWith("custom.")) {
    errors.push({ code: "invalid-definition", message: "Operator definitions must use the custom.* namespace" });
  }
  errors.push(...validateDefinitionScalars(definition));
  errors.push(...validateSiteScopes(definition));
  if (definition.inputs.length > MAX_DERIVED_METRIC_INPUTS) {
    errors.push({ code: "expression-limit", message: "Derived metric definitions support at most 64 inputs" });
  }
  const aliases = new Set<string>();
  for (const input of definition.inputs) {
    if (!input || typeof input.alias !== "string" || typeof input.unit !== "string") {
      errors.push({ code: "invalid-definition", message: "Each input requires an alias and unit" });
      continue;
    }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(input.alias)) {
      errors.push({ code: "invalid-definition", message: `Invalid input alias: ${input.alias}` });
    } else if (Buffer.byteLength(input.alias, "utf8") > MAX_DERIVED_METRIC_IDENTITY_LENGTH) {
      errors.push({ code: "invalid-definition", message: "Input aliases must be at most 128 bytes" });
    } else if (aliases.has(input.alias)) {
      errors.push({ code: "duplicate-alias", message: `Duplicate input alias: ${input.alias}` });
    }
    aliases.add(input.alias);
    if (input.kind !== "metric" && input.kind !== "calculation-setting") {
      errors.push({ code: "invalid-definition", message: "Invalid input kind" });
      continue;
    }
    if (input.kind === "metric" && input.scope === "output-site" && definition.outputScopePolicy === "global") {
      errors.push({ code: "invalid-scope", message: "output-site inputs require a site output definition" });
    }
    if (
      input.kind === "metric"
      && (
        typeof input.metricKey !== "string"
        || !(DERIVED_METRIC_SCOPE_SELECTORS as readonly string[]).includes(input.scope)
      )
    ) {
      errors.push({ code: "invalid-definition", message: `Invalid metric input: ${input.alias}` });
    }
    if (
      input.kind === "metric"
      && typeof input.metricKey === "string"
      && Buffer.byteLength(input.metricKey, "utf8") > MAX_DERIVED_METRIC_IDENTITY_LENGTH
    ) {
      errors.push({ code: "invalid-definition", message: "Metric input keys must be at most 128 bytes" });
    }
    if (input.kind === "calculation-setting") {
      const registered = settingInputs[input.settingKey as keyof typeof settingInputs];
      if (!registered || registered.unit !== input.unit) {
        errors.push({ code: "unknown-setting", message: `Unknown calculation setting: ${input.settingKey}` });
      }
    }
  }
  if (errors.length > 0) return { errors };
  try {
    const ast = parseDerivedMetricExpression(definition.expression, aliases);
    const unitError = validateDerivedMetricExpressionUnit(
      ast,
      Object.fromEntries(definition.inputs.map((input) => [input.alias, input.unit])),
      definition.outputUnit
    );
    return unitError ? { errors: [unitError] } : { ast };
  } catch (error) {
    return {
      errors: [error instanceof DerivedMetricExpressionError
        ? error.detail
        : { code: "syntax" as const, message: error instanceof Error ? error.message : "Invalid expression" }]
    };
  }
}

function compileRegistry(database: Database.Database, definitions: DerivedMetricDefinition[]): CompiledRegistry {
  const errors: DerivedMetricValidationError[] = [];
  const compiledDefinitions = new Map<string, CompiledDefinition>();
  for (const definition of definitions.filter(({ enabled }) => enabled)) {
    const validation = validateDefinitionShape(definition);
    if ("errors" in validation && validation.errors) errors.push(...validation.errors);
    else compiledDefinitions.set(definition.metricKey, {
      ast: validation.ast,
      definition: {
        ...definition,
        inputs: definition.inputs.map((input) => ({ ...input }))
      }
    });
  }
  const sourceMetricIds = new Set(
    (database.prepare("SELECT DISTINCT metric_scope, metric_key FROM topic_mappings WHERE enabled = 1").all() as Array<{
      metric_key: string;
      metric_scope: MetricScope;
    }>).map(({ metric_key, metric_scope }) => `${metric_scope}:${metric_key}`)
  );
  const registeredSourceMetricIds = new Set(
    (database.prepare("SELECT DISTINCT metric_scope, metric_key FROM topic_mappings").all() as Array<{
      metric_key: string;
      metric_scope: MetricScope;
    }>).map(({ metric_key, metric_scope }) => `${metric_scope}:${metric_key}`)
  );
  for (const compiled of compiledDefinitions.values()) {
    for (const input of compiled.definition.inputs) {
      if (
        input.kind === "metric"
        && !compiledDefinitions.has(input.metricKey)
        && !isRegisteredSourceMetricInput(compiled.definition, input, registeredSourceMetricIds)
      ) {
        errors.push({
          code: "unknown-input",
          message: `Unknown metric input: ${input.metricKey}`
        });
      }
    }
  }
  for (const definition of definitions.filter(({ enabled }) => enabled)) {
    if (outputScopes(definition).some((scope) => sourceMetricIds.has(`${scope}:${definition.metricKey}`))) {
      errors.push({
        code: "metric-key-conflict",
        message: `Derived metric key conflicts with a configured source metric: ${definition.metricKey}`
      });
    }
  }
  const nodes = [...compiledDefinitions.values()].flatMap((definition) =>
    outputScopes(definition.definition).map((metricScope) => ({
      definition,
      metricScope,
      nodeId: `${metricScope}:${definition.definition.metricKey}`
    }))
  );
  const nodeIds = new Set(nodes.map(({ nodeId }) => nodeId));
  const outgoing = new Map<string, Set<string>>();
  const reverseMetricDependencies = new Map<string, Set<string>>();
  const reverseSettingDependencies = new Map<string, Set<string>>();
  const indegree = new Map(nodes.map(({ nodeId }) => [nodeId, 0]));
  for (const node of nodes) {
    for (const input of node.definition.definition.inputs) {
      if (input.kind === "calculation-setting") {
        const dependents = reverseSettingDependencies.get(input.settingKey) ?? new Set<string>();
        dependents.add(node.nodeId);
        reverseSettingDependencies.set(input.settingKey, dependents);
        continue;
      }
      const dependencyId = `${resolveInputScope(input, node.metricScope)}:${input.metricKey}`;
      const reverseDependents = reverseMetricDependencies.get(dependencyId) ?? new Set<string>();
      reverseDependents.add(node.nodeId);
      reverseMetricDependencies.set(dependencyId, reverseDependents);
      if (!compiledDefinitions.has(input.metricKey)) continue;
      if (!nodeIds.has(dependencyId)) continue;
      const dependents = outgoing.get(dependencyId) ?? new Set<string>();
      if (!dependents.has(node.nodeId)) {
        dependents.add(node.nodeId);
        outgoing.set(dependencyId, dependents);
        indegree.set(node.nodeId, (indegree.get(node.nodeId) ?? 0) + 1);
      }
    }
  }
  const queue = nodes.filter(({ nodeId }) => indegree.get(nodeId) === 0).map(({ nodeId }) => nodeId);
  const orderedIds: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    orderedIds.push(nodeId);
    for (const dependent of outgoing.get(nodeId) ?? []) {
      indegree.set(dependent, indegree.get(dependent)! - 1);
      if (indegree.get(dependent) === 0) queue.push(dependent);
    }
  }
  if (orderedIds.length !== nodes.length) errors.push({ code: "cycle", message: "Derived metric dependency cycle detected" });
  if (errors.length > 0) {
    throw new DerivedMetricRegistryError("derived_metric_validation_failed", "Derived metric registry validation failed", errors, 422);
  }
  const revisionRow = database.prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1").get() as { revision: number } | undefined;
  const nodesById = new Map(nodes.map((node) => [node.nodeId, node]));
  return freezeCompiledRegistry({
    definitions: compiledDefinitions,
    nodes: orderedIds.map((nodeId) => nodesById.get(nodeId)!),
    reverseMetricDependencies: new Map(
      [...reverseMetricDependencies].map(([key, value]) => [key, [...value]])
    ),
    reverseSettingDependencies: new Map(
      [...reverseSettingDependencies].map(([key, value]) => [key, [...value]])
    ),
    revision: revisionRow?.revision ?? 1
  });
}

function compileStoredRegistry(
  database: Database.Database,
  definitions: DerivedMetricDefinition[]
): { compiled: CompiledRegistry; diagnostics: readonly DerivedMetricRegistryDiagnostic[] } {
  const excluded = new Map<string, DerivedMetricValidationError[]>();
  const sourceMetricIds = new Set(
    (database.prepare("SELECT DISTINCT metric_scope, metric_key FROM topic_mappings WHERE enabled = 1").all() as Array<{
      metric_key: string;
      metric_scope: MetricScope;
    }>).map(({ metric_key, metric_scope }) => `${metric_scope}:${metric_key}`)
  );
  const registeredSourceMetricIds = new Set(
    (database.prepare("SELECT DISTINCT metric_scope, metric_key FROM topic_mappings").all() as Array<{
      metric_key: string;
      metric_scope: MetricScope;
    }>).map(({ metric_key, metric_scope }) => `${metric_scope}:${metric_key}`)
  );
  const markExcluded = (metricKey: string, error: DerivedMetricValidationError) => {
    const errors = excluded.get(metricKey);
    if (errors) {
      if (!errors.some((candidate) => candidate.code === error.code && candidate.message === error.message)) {
        errors.push(error);
      }
      return false;
    }
    excluded.set(metricKey, [error]);
    return true;
  };
  const enabledDefinitions = definitions.filter(({ enabled }) => enabled);

  while (true) {
    let changed = false;
    const validDefinitions: CompiledDefinition[] = [];
    for (const definition of enabledDefinitions) {
      if (excluded.has(definition.metricKey)) continue;
      const validation = validateDefinitionShape(definition);
      if ("errors" in validation && validation.errors) {
        for (const error of validation.errors) changed = markExcluded(definition.metricKey, error) || changed;
        continue;
      }
      validDefinitions.push({
        ast: validation.ast,
        definition: {
          ...definition,
          inputs: definition.inputs.map((input) => ({ ...input }))
        }
      });
    }

    const validByKey = new Map(validDefinitions.map((compiled) => [compiled.definition.metricKey, compiled]));
    for (const compiled of validDefinitions) {
      for (const input of compiled.definition.inputs) {
        if (
          input.kind === "metric"
          && !validByKey.has(input.metricKey)
          && !isRegisteredSourceMetricInput(compiled.definition, input, registeredSourceMetricIds)
        ) {
          changed = markExcluded(compiled.definition.metricKey, {
            code: "unknown-input",
            message: `Unknown metric input: ${input.metricKey}`
          }) || changed;
        }
      }
    }
    for (const definition of enabledDefinitions) {
      if (outputScopes(definition).some((scope) => sourceMetricIds.has(`${scope}:${definition.metricKey}`))) {
        changed = markExcluded(definition.metricKey, {
          code: "metric-key-conflict",
          message: `Derived metric key conflicts with a configured source metric: ${definition.metricKey}`
        }) || changed;
      }
    }

    const survivingDefinitions = validDefinitions.filter(({ definition }) => !excluded.has(definition.metricKey));
    const nodes = survivingDefinitions.flatMap((definition) =>
      outputScopes(definition.definition).map((metricScope) => ({
        definition,
        metricScope,
        nodeId: `${metricScope}:${definition.definition.metricKey}`
      }))
    );
    const nodeIds = new Set(nodes.map(({ nodeId }) => nodeId));
    const outgoing = new Map<string, Set<string>>(nodes.map(({ nodeId }) => [nodeId, new Set()]));
    const byKey = new Map(survivingDefinitions.map((compiled) => [compiled.definition.metricKey, compiled]));
    for (const node of nodes) {
      for (const input of node.definition.definition.inputs) {
        if (input.kind !== "metric" || !byKey.has(input.metricKey)) continue;
        const dependencyId = `${resolveInputScope(input, node.metricScope)}:${input.metricKey}`;
        if (nodeIds.has(dependencyId)) outgoing.get(dependencyId)!.add(node.nodeId);
      }
    }
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const path: string[] = [];
    const cyclic = new Set<string>();
    const visit = (nodeId: string): void => {
      if (visiting.has(nodeId)) {
        const cycleStart = path.indexOf(nodeId);
        for (const cyclicNodeId of path.slice(cycleStart)) cyclic.add(cyclicNodeId);
        return;
      }
      if (visited.has(nodeId)) return;
      visiting.add(nodeId);
      path.push(nodeId);
      for (const dependent of outgoing.get(nodeId) ?? []) visit(dependent);
      path.pop();
      visiting.delete(nodeId);
      visited.add(nodeId);
    };
    for (const { nodeId } of nodes) visit(nodeId);
    for (const nodeId of cyclic) {
      const node = nodes.find((candidate) => candidate.nodeId === nodeId);
      if (node) {
        changed = markExcluded(node.definition.definition.metricKey, {
          code: "cycle",
          message: "Derived metric dependency cycle detected"
        }) || changed;
      }
    }
    if (!changed) break;
  }

  const compilableDefinitions = definitions.map((definition) =>
    excluded.has(definition.metricKey) ? { ...definition, enabled: false } : definition
  );
  const compiled = compileRegistry(database, compilableDefinitions);
  const diagnostics = Object.freeze(definitions
    .filter(({ enabled, metricKey }) => enabled && excluded.has(metricKey))
    .map(({ metricKey }) => Object.freeze({
      errors: Object.freeze([...(excluded.get(metricKey) ?? [])]),
      metricKey
    })));
  return { compiled, diagnostics };
}

function writeDefinition(database: Database.Database, definition: DerivedMetricDefinition) {
  database.prepare(`
    INSERT INTO derived_metric_definitions (
      metric_key, name, description, output_scope_policy, expression, output_unit,
      precision, fallback_policy, acceptance_policy, enabled, managed, revision,
      site_scopes_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(metric_key) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      output_scope_policy = excluded.output_scope_policy,
      expression = excluded.expression,
      output_unit = excluded.output_unit,
      precision = excluded.precision,
      fallback_policy = excluded.fallback_policy,
      acceptance_policy = excluded.acceptance_policy,
      enabled = excluded.enabled,
      managed = excluded.managed,
      revision = excluded.revision,
      site_scopes_json = excluded.site_scopes_json,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    definition.metricKey,
    definition.name,
    definition.description,
    definition.outputScopePolicy,
    definition.expression,
    definition.outputUnit,
    definition.precision,
    definition.fallbackPolicy,
    definition.acceptancePolicy ?? null,
    definition.enabled ? 1 : 0,
    definition.managed ? 1 : 0,
    definition.revision,
    definition.siteScopes === undefined ? null : JSON.stringify(definition.siteScopes)
  );
  database.prepare("DELETE FROM derived_metric_inputs WHERE derived_metric_key = ?").run(definition.metricKey);
  const insertInput = database.prepare(`
    INSERT INTO derived_metric_inputs (
      derived_metric_key, alias, input_kind, metric_key, scope_selector, setting_key, unit, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  definition.inputs.forEach((input, index) => {
    insertInput.run(
      definition.metricKey,
      input.alias,
      input.kind,
      input.kind === "metric" ? input.metricKey : null,
      input.kind === "metric" ? input.scope : null,
      input.kind === "calculation-setting" ? input.settingKey : null,
      input.unit,
      index
    );
  });
}

export function ensureManagedDerivedMetricDefinitions(database: Database.Database = getDatabase()) {
  const insert = database.transaction(() => {
    const exists = database.prepare("SELECT 1 FROM derived_metric_definitions WHERE metric_key = ?");
    for (const definition of canonicalDefinitions) {
      if (!exists.get(definition.metricKey)) writeDefinition(database, definition);
    }
  });
  insert();
  registrySnapshots.delete(database);
  registryDiagnostics.delete(database);
}

export function listDerivedMetricDefinitions(database: Database.Database = getDatabase()) {
  return readDefinitions(database);
}

export function readDerivedMetricRegistryDiagnostics(database: Database.Database = getDatabase()) {
  return registryDiagnostics.get(database) ?? [];
}

/**
 * Monotonic counter bumped whenever a derived metric definition is activated,
 * so a consumer can tell whether anything it derived from the registry is still
 * current. Returns `null` when the registry state row is missing: a caller must
 * then treat its derived state as uncacheable rather than assume it is fresh.
 */
export function readDerivedMetricRegistryRevision(
  database: Database.Database = getDatabase()
): number | null {
  const row = database
    .prepare("SELECT revision FROM derived_metric_registry_state WHERE id = 1")
    .get() as { revision: number } | undefined;
  return row?.revision ?? null;
}

export function readDerivedMetricDefinition(metricKey: string, database: Database.Database = getDatabase()) {
  const definition = readDefinitions(database).find((candidate) => candidate.metricKey === metricKey);
  if (!definition) throw new DerivedMetricRegistryError("derived_metric_not_found", "Derived metric not found", [], 404);
  return definition;
}

export function initializeDerivedMetricRegistry(database: Database.Database = getDatabase()) {
  ensureManagedDerivedMetricDefinitions(database);
  const definitions = readDefinitions(database);
  const { compiled, diagnostics } = compileStoredRegistry(database, definitions);
  retireExcludedRuntimeRows(database, definitions, diagnostics);
  reconcileRuntimeRows(database, compiled);
  registrySnapshots.set(database, compiled);
  registryDiagnostics.set(database, diagnostics);
  return compiled;
}

function currentRegistry(database: Database.Database) {
  return registrySnapshots.get(database) ?? initializeDerivedMetricRegistry(database);
}

function normalizeDefinitionInput(input: DerivedMetricDefinition, existing?: DerivedMetricDefinition): DerivedMetricDefinition {
  if (existing?.managed) {
    throw new DerivedMetricRegistryError("derived_metric_managed_read_only", "Managed derived definitions are read-only", [
      { code: "managed-read-only", message: "Managed derived definitions are read-only" }
    ], 409);
  }
  return {
    ...input,
    description: input.description ?? "",
    managed: false,
    revision: (existing?.revision ?? 0) + 1
  };
}

function activateDefinition(
  database: Database.Database,
  definition: DerivedMetricDefinition,
  compiled: CompiledRegistry,
  previousDefinitions: DerivedMetricDefinition[]
) {
  const cachedPrevious = registrySnapshots.get(database);
  const hadCachedPrevious = cachedPrevious !== undefined;
  const cachedDiagnostics = registryDiagnostics.get(database);
  const hadCachedDiagnostics = cachedDiagnostics !== undefined;
  const previousSnapshot = cachedPrevious ?? compileStoredRegistry(database, previousDefinitions).compiled;
  const nextSnapshot = freezeCompiledRegistry({ ...compiled, revision: compiled.revision + 1 });
  const nextNodeIds = new Set(nextSnapshot.nodes.map(({ nodeId }) => nodeId));
  const removedNodes = previousSnapshot.nodes.filter(({ nodeId }) => !nextNodeIds.has(nodeId));
  try {
    database.transaction(() => {
      writeDefinition(database, definition);
      database.prepare("UPDATE derived_metric_registry_state SET revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1").run();
      for (const node of removedNodes) {
        const metricKey = node.definition.definition.metricKey;
        database.prepare("DELETE FROM derived_metric_evaluations WHERE metric_scope = ? AND metric_key = ?").run(node.metricScope, metricKey);
        database.prepare("DELETE FROM live_metric_values WHERE metric_scope = ? AND metric_key = ?").run(node.metricScope, metricKey);
      }
      registrySnapshots.set(database, nextSnapshot);
      registryDiagnostics.delete(database);
      evaluateRegistry(nextSnapshot, database, new Date());
    })();
  } catch (error) {
    if (hadCachedPrevious) registrySnapshots.set(database, cachedPrevious);
    else registrySnapshots.delete(database);
    if (hadCachedDiagnostics) registryDiagnostics.set(database, cachedDiagnostics);
    else registryDiagnostics.delete(database);
    throw error;
  }
}

export function saveDerivedMetricDefinition(
  input: DerivedMetricDefinition,
  database: Database.Database = getDatabase()
) {
  if (!input || typeof input !== "object" || !Array.isArray(input.inputs)) {
    throw new DerivedMetricRegistryError("derived_metric_validation_failed", "Invalid derived metric definition", [
      { code: "invalid-definition", message: "Invalid derived metric definition" }
    ], 422);
  }
  const scalarErrors = validateDefinitionScalars(input);
  if (scalarErrors.length > 0) {
    throw new DerivedMetricRegistryError("derived_metric_validation_failed", "Invalid derived metric definition", scalarErrors, 422);
  }
  const definitions = readDefinitions(database);
  const existing = definitions.find(({ metricKey }) => metricKey === input.metricKey);
  const candidate = normalizeDefinitionInput(input, existing);
  const proposed = [...definitions.filter(({ metricKey }) => metricKey !== candidate.metricKey), candidate];
  if (!candidate.enabled) {
    compileRegistry(database, [
      ...definitions.filter(({ metricKey }) => metricKey !== candidate.metricKey),
      { ...candidate, enabled: true }
    ]);
  }
  const compiled = compileRegistry(database, proposed);
  activateDefinition(database, candidate, compiled, definitions);
  return readDerivedMetricDefinition(candidate.metricKey, database);
}

export function setDerivedMetricEnabled(
  metricKey: string,
  enabled: boolean,
  database: Database.Database = getDatabase()
) {
  const definitions = readDefinitions(database);
  const existing = definitions.find((definition) => definition.metricKey === metricKey);
  if (!existing) throw new DerivedMetricRegistryError("derived_metric_not_found", "Derived metric not found", [], 404);
  if (existing.managed) throw new DerivedMetricRegistryError("derived_metric_managed_read_only", "Managed derived definitions are read-only", [], 409);
  const candidate = { ...existing, enabled, revision: existing.revision + 1 };
  const proposed = definitions.map((definition) => definition.metricKey === metricKey ? candidate : definition);
  const compiled = compileRegistry(database, proposed);
  activateDefinition(database, candidate, compiled, definitions);
  return readDerivedMetricDefinition(metricKey, database);
}

function normalizeKnownUnit(unit: string | null) {
  if (unit === null) return null;
  const candidate = unit.trim().toLowerCase();
  return Object.keys(unitFamilies).find((knownUnit) => knownUnit.toLowerCase() === candidate) ?? null;
}

function convertValue(value: number, sourceUnit: string | null, targetUnit: string) {
  const source = normalizeKnownUnit(sourceUnit);
  const target = normalizeKnownUnit(targetUnit);
  if (source === null || target === null) return null;
  if (source === target) return value;
  if (unitFamilies[source] !== unitFamilies[target]) return null;
  return value * unitScales[source]! / unitScales[target]!;
}

function convertPreviousValue(value: number | null, sourceUnit: string | null, targetUnit: string) {
  if (value === null || !Number.isFinite(value)) return null;
  const converted = convertValue(value, sourceUnit, targetUnit);
  return converted !== null && Number.isFinite(converted) ? converted : null;
}

const MAX_PROVENANCE_DIRECT_DEPENDENCIES = 64;
const MAX_PROVENANCE_NODES = 32;
const MAX_PROVENANCE_JSON_BYTES = 256 * 1024;
const MAX_PROVENANCE_SOURCE_TOPIC_BYTES = 128;

function cloneDependencyIdentity(dependency: DerivedMetricDependencyIdentity): DerivedMetricDependencyIdentity {
  const hasUpstream = Array.isArray(dependency.upstream);
  if (dependency.kind === "metric") {
    const sourceTopic = typeof dependency.sourceTopic === "string"
      && Buffer.byteLength(dependency.sourceTopic, "utf8") <= MAX_PROVENANCE_SOURCE_TOPIC_BYTES
      ? dependency.sourceTopic
      : undefined;
    const clone: DerivedMetricDependencyIdentity = {
      alias: dependency.alias,
      kind: dependency.kind,
      ...(dependency.metricKey !== undefined ? { metricKey: dependency.metricKey } : {}),
      ...(dependency.metricScope !== undefined ? { metricScope: dependency.metricScope } : {}),
      ...(dependency.timestamp !== undefined ? { timestamp: dependency.timestamp } : {}),
      ...(sourceTopic !== undefined ? { sourceTopic } : {}),
      unit: dependency.unit,
      value: dependency.value
    };
    if (hasUpstream) clone.upstream = [];
    return clone;
  }
  const clone: DerivedMetricDependencyIdentity = {
    alias: dependency.alias,
    kind: dependency.kind,
    ...(dependency.settingKey !== undefined ? { settingKey: dependency.settingKey } : {}),
    ...(dependency.settingRevision !== undefined ? { settingRevision: dependency.settingRevision } : {}),
    unit: dependency.unit,
    value: dependency.value
  };
  if (hasUpstream) clone.upstream = [];
  return clone;
}

function boundProvenance(
  dependencies: readonly DerivedMetricDependencyIdentity[]
): DerivedMetricDependencyIdentity[] {
  let remaining = MAX_PROVENANCE_NODES;
  const bounded: DerivedMetricDependencyIdentity[] = dependencies
    .slice(0, MAX_PROVENANCE_DIRECT_DEPENDENCIES)
    .map(cloneDependencyIdentity);
  const queue: Array<{
    dependencies: readonly DerivedMetricDependencyIdentity[];
    target: DerivedMetricDependencyIdentity[];
  }> = [];
  dependencies.slice(0, MAX_PROVENANCE_DIRECT_DEPENDENCIES).forEach((dependency, index) => {
    if (Array.isArray(dependency.upstream)) {
      queue.push({ dependencies: dependency.upstream, target: bounded[index]!.upstream! });
    }
  });
  while (queue.length > 0 && remaining > 0) {
    const current = queue.shift()!;
    for (const dependency of current.dependencies) {
      if (remaining === 0) break;
      remaining -= 1;
      const clone = cloneDependencyIdentity(dependency);
      current.target.push(clone);
      if (Array.isArray(dependency.upstream)) {
        clone.upstream = [];
        queue.push({ dependencies: dependency.upstream, target: clone.upstream });
      }
    }
  }
  return bounded;
}

function boundEvaluation(evaluation: DerivedMetricEvaluation): DerivedMetricEvaluation {
  return { ...evaluation, dependencies: boundProvenance(evaluation.dependencies) };
}

function worstFreshness(states: Array<string | null>) {
  return states.every((state) => state === "live") ? "fresh" as const : "stale" as const;
}

function readEvaluation(database: Database.Database, metricScope: MetricScope, metricKey: string): DerivedMetricEvaluation | null {
  const row = database.prepare(`
    SELECT metric_scope, metric_key, definition_revision, status, failure_code,
      retained_last_good, value, unit, source_timestamp, evaluated_at, provenance_json
    FROM derived_metric_evaluations WHERE metric_scope = ? AND metric_key = ?
  `).get(metricScope, metricKey) as EvaluationRow | undefined;
  if (!row) return null;
  const registry = currentRegistry(database);
  if (!registry.nodes.some(({ nodeId }) => nodeId === `${metricScope}:${metricKey}`)) return null;
  if (registryDiagnostics.get(database)?.some(({ metricKey: excludedKey }) => excludedKey === metricKey)) return null;
  const provenance = Buffer.byteLength(row.provenance_json, "utf8") > MAX_PROVENANCE_JSON_BYTES
    ? null
    : JSON.parse(row.provenance_json) as { dependencies?: DerivedMetricDependencyIdentity[] };
  const dependencies = provenance && Array.isArray(provenance.dependencies) ? provenance.dependencies : [];
  return {
    definitionRevision: row.definition_revision,
    dependencies: boundProvenance(dependencies),
    evaluatedAt: row.evaluated_at,
    failureCode: row.failure_code,
    freshnessState: row.status === "unavailable" ? "unavailable" : row.status === "ready" ? "fresh" : "stale",
    metricKey: row.metric_key,
    metricScope: row.metric_scope,
    outputUnit: row.unit,
    precision: registry.definitions.get(row.metric_key)?.definition.precision ?? 0,
    retainedLastGood: row.retained_last_good === 1,
    status: row.status,
    timestamp: row.source_timestamp,
    value: row.value
  };
}

function writeEvaluation(
  database: Database.Database,
  evaluation: DerivedMetricEvaluation,
  materialize: boolean
) {
  const provenanceJson = JSON.stringify({ dependencies: evaluation.dependencies });
  if (Buffer.byteLength(provenanceJson, "utf8") > MAX_PROVENANCE_JSON_BYTES) {
    throw new DerivedMetricRegistryError(
      "derived_metric_provenance_too_large",
      "Derived metric provenance exceeds 256 KiB",
      [],
      500
    );
  }
  database.prepare(`
    INSERT INTO derived_metric_evaluations (
      metric_scope, metric_key, definition_revision, status, failure_code,
      retained_last_good, value, unit, source_timestamp, evaluated_at, provenance_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
      definition_revision = excluded.definition_revision,
      status = excluded.status,
      failure_code = excluded.failure_code,
      retained_last_good = excluded.retained_last_good,
      value = excluded.value,
      unit = excluded.unit,
      source_timestamp = excluded.source_timestamp,
      evaluated_at = excluded.evaluated_at,
      provenance_json = excluded.provenance_json
  `).run(
    evaluation.metricScope,
    evaluation.metricKey,
    evaluation.definitionRevision,
    evaluation.status,
    evaluation.failureCode,
    evaluation.retainedLastGood ? 1 : 0,
    evaluation.value,
    evaluation.outputUnit,
    evaluation.timestamp,
    evaluation.evaluatedAt,
    provenanceJson
  );
  if (!materialize) return;
  if (evaluation.value === null || evaluation.status === "unavailable") {
    database.prepare("DELETE FROM live_metric_values WHERE metric_scope = ? AND metric_key = ?").run(evaluation.metricScope, evaluation.metricKey);
    return;
  }
  database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
      value = excluded.value,
      unit = excluded.unit,
      timestamp = excluded.timestamp,
      quality = excluded.quality,
      raw_payload = excluded.raw_payload
  `).run(
    evaluation.metricScope,
    evaluation.metricKey,
    evaluation.value,
    evaluation.outputUnit,
    evaluation.timestamp ?? evaluation.evaluatedAt,
    evaluation.status === "ready" ? "good" : "degraded",
    JSON.stringify({
      definitionRevision: evaluation.definitionRevision,
      dependencies: evaluation.dependencies,
      source: "derived-metric-registry",
      status: evaluation.status
    })
  );
}

function resolveSettingInput(settingKey: string, database: Database.Database) {
  const settings = readCalculationSettings(database) as unknown as Record<string, unknown>;
  const registration = settingInputs[settingKey as keyof typeof settingInputs];
  const value = settings[settingKey];
  const state = database.prepare("SELECT revision FROM calculation_settings WHERE id = 1").get() as {
    revision: number;
  } | undefined;
  return registration && typeof value === "number" && Number.isFinite(value)
    ? { revision: String(state?.revision ?? 1), unit: registration.unit, value }
    : null;
}

const globalCounterMetricKeys = {
  consumptionEnergy: "consumption",
  selfConsumptionEnergy: "selfConsumption",
  totalGeneration: "generation"
} as const;

function resolveGlobalCounterMetric(
  database: Database.Database,
  metricKey: keyof typeof globalCounterMetricKeys,
  nowMs: number
) {
  const row = database.prepare(`
    SELECT total_value, last_updated
    FROM cumulative_counters WHERE metric_scope = 'global' AND metric_key = ?
  `).get(globalCounterMetricKeys[metricKey]) as {
    last_updated: string | null;
    total_value: number | null;
  } | undefined;
  if (!row) return null;
  const timestamp = row.last_updated ? normalizeMetricTimestamp(row.last_updated) : null;
  const value = typeof row.total_value === "number" && Number.isFinite(row.total_value)
    ? row.total_value
    : null;
  return {
    metricKey,
    metricScope: "global" as const,
    value,
    unit: "kWh",
    timestamp,
    quality: value === null ? null : "good",
    freshness: timestamp
      ? evaluateMetricFreshness({ database, metricKey, nowMs, sourceTimestamp: timestamp })
      : null,
    provenance: null,
    override: null
  };
}

function resolveRegistryMetric(
  database: Database.Database,
  metricScope: MetricScope,
  metricKey: string,
  nowMs: number
) {
  const counter = metricScope === "global"
    && Object.prototype.hasOwnProperty.call(globalCounterMetricKeys, metricKey)
    ? resolveGlobalCounterMetric(database, metricKey as keyof typeof globalCounterMetricKeys, nowMs)
    : null;
  if (counter) return counter;
  const resolved = resolveMetric(database, { metricKey, metricScope }, nowMs);
  if (!metricKey.startsWith("factoryGeneration.")) return resolved;
  const row = database.prepare(`
    SELECT raw_payload FROM live_metric_values WHERE metric_scope = ? AND metric_key = ?
  `).get(metricScope, metricKey) as { raw_payload: string | null } | undefined;
  if (!row?.raw_payload) return resolved;
  try {
    const raw = JSON.parse(row.raw_payload) as { sourceTopic?: unknown; timestamp?: unknown };
    const resolvedWithProvenance = typeof raw.sourceTopic === "string"
      ? { ...resolved, provenance: { topic: raw.sourceTopic } }
      : resolved;
    const rawTimestamp = raw.timestamp;
    const sourceTimestamp = typeof rawTimestamp === "string"
      ? normalizeMetricTimestamp(rawTimestamp)
      : null;
    if (!sourceTimestamp) return resolvedWithProvenance;
    const timeoutRow = database.prepare("SELECT message_timeout FROM mqtt_settings LIMIT 1").get() as {
      message_timeout: number | null;
    } | undefined;
    const timeoutMs = typeof timeoutRow?.message_timeout === "number" && timeoutRow.message_timeout > 0
      ? timeoutRow.message_timeout * 1_000
      : 30_000;
    const ageMs = Math.abs(nowMs - Date.parse(sourceTimestamp));
    return {
      ...resolvedWithProvenance,
      freshness: {
        ageFrozen: false,
        ageMs,
        category: "realtime" as const,
        nextTransitionAt: new Date(Date.parse(sourceTimestamp) + timeoutMs).toISOString(),
        sourceTimestamp,
        state: ageMs > timeoutMs ? "stale" as const : "live" as const
      },
      timestamp: sourceTimestamp
    };
  } catch {
    return resolved;
  }
}

function failedEvaluation(
  node: CompiledNode,
  database: Database.Database,
  failureCode: DerivedMetricEvaluation["failureCode"],
  dependencies: DerivedMetricDependencyIdentity[],
  evaluatedAt: string
): DerivedMetricEvaluation {
  const definition = node.definition.definition;
  const previous = readEvaluation(database, node.metricScope, definition.metricKey);
  const previousReading = previous && previous.value !== null
    ? {
        timestamp: previous.timestamp,
        value: convertPreviousValue(previous.value, previous.outputUnit, definition.outputUnit)
      }
    : (() => {
        const reading = resolveMetric(database, {
          metricKey: definition.metricKey,
          metricScope: node.metricScope
        }, Date.parse(evaluatedAt));
        return {
          timestamp: reading.timestamp,
          value: convertPreviousValue(reading.value, reading.unit, definition.outputUnit)
        };
      })();
  const retain = definition.fallbackPolicy === "retain-last-good"
    && previousReading.value !== null;
  return {
    definitionRevision: definition.revision,
    dependencies,
    evaluatedAt,
    failureCode,
    freshnessState: retain ? "stale" : "unavailable",
    metricKey: definition.metricKey,
    metricScope: node.metricScope,
    outputUnit: definition.outputUnit,
    precision: definition.precision,
    retainedLastGood: retain,
    status: retain ? "degraded" : "unavailable",
    timestamp: retain ? previousReading.timestamp : null,
    value: retain ? previousReading.value : null
  };
}

function evaluateNode(
  node: CompiledNode,
  database: Database.Database,
  current: ReadonlyMap<string, DerivedMetricEvaluation>,
  now: Date
): DerivedMetricEvaluation {
  const definition = node.definition.definition;
  const dependencies: DerivedMetricDependencyIdentity[] = [];
  const values: Record<string, number> = {};
  const timestamps: string[] = [];
  const freshnessStates: Array<string | null> = [];
  for (const input of definition.inputs) {
    if (input.kind === "calculation-setting") {
      const setting = resolveSettingInput(input.settingKey, database);
      if (!setting) return failedEvaluation(node, database, "input-unavailable", dependencies, now.toISOString());
      values[input.alias] = setting.value;
      dependencies.push({
        alias: input.alias,
        kind: input.kind,
        settingKey: input.settingKey,
        settingRevision: setting.revision,
        unit: input.unit,
        value: setting.value
      });
      continue;
    }
    const metricScope = resolveInputScope(input, node.metricScope);
    const derived = current.get(`${metricScope}:${input.metricKey}`);
    const useDerived = derived !== undefined
      && !(metricScope === "global"
        && input.metricKey === "totalGeneration"
        && (derived.value === null || derived.timestamp === null));
    const selectedDerived = useDerived ? derived : undefined;
    const resolved = selectedDerived
      ? {
          freshness: selectedDerived.freshnessState === "fresh" ? { state: "live" } : { state: selectedDerived.freshnessState },
          timestamp: selectedDerived.timestamp,
          unit: selectedDerived.outputUnit,
          value: selectedDerived.value
        }
      : resolveRegistryMetric(database, metricScope, input.metricKey, now.getTime());
    const dependencyContext = {
      alias: input.alias,
      kind: input.kind,
      metricKey: input.metricKey,
      metricScope,
      ...(resolved.timestamp ? { timestamp: resolved.timestamp } : {}),
      ...(selectedDerived?.dependencies.length ? { upstream: selectedDerived.dependencies } : {}),
      ...("provenance" in resolved && resolved.provenance?.topic
        ? { sourceTopic: resolved.provenance.topic }
        : {}),
      unit: input.unit
    };
    if (resolved.value === null || resolved.timestamp === null) {
      dependencies.push({ ...dependencyContext, value: null });
      return failedEvaluation(node, database, "input-unavailable", dependencies, now.toISOString());
    }
    const converted = convertValue(resolved.value, resolved.unit, input.unit);
    if (converted === null || !Number.isFinite(converted)) {
      dependencies.push({ ...dependencyContext, value: null });
      return failedEvaluation(node, database, "invalid-input", dependencies, now.toISOString());
    }
    values[input.alias] = converted;
    dependencies.push({
      alias: input.alias,
      kind: input.kind,
      metricKey: input.metricKey,
      metricScope,
      timestamp: resolved.timestamp,
      ...(selectedDerived?.dependencies.length ? { upstream: selectedDerived.dependencies } : {}),
      ...("provenance" in resolved && resolved.provenance?.topic
        ? { sourceTopic: resolved.provenance.topic }
        : {}),
      unit: input.unit,
      value: converted
    });
    if (
      requiresCurrentMetricInputs.has(definition.metricKey)
      && resolved.freshness?.state !== "live"
    ) {
      return failedEvaluation(node, database, "input-stale", dependencies, now.toISOString());
    }
    timestamps.push(resolved.timestamp);
    freshnessStates.push(resolved.freshness?.state ?? null);
  }
  const arithmetic = evaluateDerivedMetricExpression(node.definition.ast, values);
  if (!arithmetic.ok) return failedEvaluation(node, database, arithmetic.code, dependencies, now.toISOString());
  const outputValue = convertDerivedMetricExpressionValue(
    node.definition.ast,
    Object.fromEntries(definition.inputs.map((input) => [input.alias, input.unit])),
    definition.outputUnit,
    arithmetic.value
  );
  if (outputValue === null) return failedEvaluation(node, database, "invalid-input", dependencies, now.toISOString());
  const timestamp = timestamps.sort((left, right) => Date.parse(left) - Date.parse(right))[0] ?? now.toISOString();
  if (definition.acceptancePolicy === "cumulative-nondecreasing") {
    const previous = readEvaluation(database, node.metricScope, definition.metricKey);
    const previousValue = previous && previous.value !== null
      ? convertPreviousValue(previous.value, previous.outputUnit, definition.outputUnit)
      : (() => {
          const reading = resolveMetric(database, {
            metricKey: definition.metricKey,
            metricScope: node.metricScope
          }, now.getTime());
          return convertPreviousValue(reading.value, reading.unit, definition.outputUnit);
        })();
    if (previousValue !== null && outputValue < previousValue) {
      return failedEvaluation(node, database, "acceptance-policy-rejected", dependencies, now.toISOString());
    }
  }
  const freshnessState = worstFreshness(freshnessStates);
  return {
    definitionRevision: definition.revision,
    dependencies,
    evaluatedAt: now.toISOString(),
    failureCode: null,
    freshnessState,
    metricKey: definition.metricKey,
    metricScope: node.metricScope,
    outputUnit: definition.outputUnit,
    precision: definition.precision,
    retainedLastGood: false,
    status: freshnessState === "fresh" ? "ready" : "degraded",
    timestamp,
    value: Number(outputValue.toFixed(definition.precision))
  };
}

export function evaluateDerivedMetrics(
  database: Database.Database = getDatabase(),
  now: Date = new Date(),
  options: DerivedMetricEvaluationOptions = {}
) {
  const registry = currentRegistry(database);
  return database.transaction(() => evaluateRegistry(registry, database, now, options))();
}

function collectAffectedNodeIds(
  registry: CompiledRegistry,
  changedMetrics: readonly DerivedMetricChange[],
  changedSettings: readonly string[]
) {
  const affectedNodeIds = new Set<string>();
  const pending = changedMetrics.map(({ metricScope, metricKey }) => `${metricScope}:${metricKey}`);
  for (const settingKey of changedSettings) {
    for (const nodeId of registry.reverseSettingDependencies.get(settingKey) ?? []) {
      if (affectedNodeIds.has(nodeId)) continue;
      affectedNodeIds.add(nodeId);
      pending.push(nodeId);
    }
  }
  for (let index = 0; index < pending.length; index += 1) {
    const dependencyId = pending[index]!;
    for (const nodeId of registry.reverseMetricDependencies.get(dependencyId) ?? []) {
      if (affectedNodeIds.has(nodeId)) continue;
      affectedNodeIds.add(nodeId);
      pending.push(nodeId);
    }
  }
  return affectedNodeIds;
}

function evaluateRegistry(
  registry: CompiledRegistry,
  database: Database.Database,
  now: Date,
  options: DerivedMetricEvaluationOptions = {}
) {
  const affectedNodeIds = options.changedMetrics === undefined && options.changedSettings === undefined
    ? null
    : collectAffectedNodeIds(
      registry,
      options.changedMetrics ?? [],
      options.changedSettings ?? []
    );
  const evaluations = new Map<string, DerivedMetricEvaluation>();
  for (const node of registry.nodes) {
    if (affectedNodeIds && !affectedNodeIds.has(node.nodeId)) continue;
    const evaluation = evaluateNode(node, database, evaluations, now);
    evaluations.set(node.nodeId, evaluation);
    writeEvaluation(database, boundEvaluation(evaluation), options.materialize !== false);
  }
  return [...evaluations.values()].map(boundEvaluation);
}

export function readDerivedMetricEvaluation(
  metricScope: MetricScope,
  metricKey: string,
  database: Database.Database = getDatabase()
) {
  return readEvaluation(database, metricScope, metricKey);
}

export function previewDerivedMetricDefinition(
  definition: DerivedMetricDefinition,
  metricScope: MetricScope,
  database: Database.Database = getDatabase(),
  now: Date = new Date()
) {
  if (!definition || typeof definition !== "object" || Array.isArray(definition) || !Array.isArray(definition.inputs)) {
    throw new DerivedMetricRegistryError("derived_metric_validation_failed", "Invalid derived metric definition", [
      { code: "invalid-definition", message: "Invalid derived metric definition" }
    ], 422);
  }
  const candidate = { ...definition, enabled: true, revision: definition.revision || 1 };
  const proposed = [
    ...readDefinitions(database).filter(({ metricKey }) => metricKey !== candidate.metricKey),
    candidate
  ];
  const compiled = compileRegistry(database, proposed);
  const node = compiled.nodes.find((entry) =>
    entry.metricScope === metricScope && entry.definition.definition.metricKey === candidate.metricKey
  );
  if (!node) throw new DerivedMetricRegistryError("derived_metric_invalid_preview_scope", "Preview scope does not match output scope", [], 422);
  const evaluations = new Map<string, DerivedMetricEvaluation>();
  for (const entry of compiled.nodes) {
    const evaluation = evaluateNode(entry, database, evaluations, now);
    evaluations.set(entry.nodeId, evaluation);
  }
  return boundEvaluation(evaluations.get(node.nodeId)!);
}
