import type { MetricScope } from "./metricScope.js";

export const DERIVED_METRIC_SCOPE_SELECTORS = ["output-site", "cl", "kn", "global"] as const;
export const DERIVED_METRIC_OUTPUT_SCOPE_POLICIES = ["site", "global"] as const;
export const DERIVED_METRIC_FALLBACK_POLICIES = ["unavailable", "retain-last-good"] as const;
export const DERIVED_METRIC_KNOWN_UNITS = [
  "", "%", "W", "kW", "MW", "Wh", "kWh", "MWh", "GWh", "kg", "t", "trees",
  "kg/kWh", "h", "TWD", "TWD/kWh"
] as const;

export type DerivedMetricScopeSelector = typeof DERIVED_METRIC_SCOPE_SELECTORS[number];
export type DerivedMetricOutputScopePolicy = typeof DERIVED_METRIC_OUTPUT_SCOPE_POLICIES[number];
export type DerivedMetricFallbackPolicy = typeof DERIVED_METRIC_FALLBACK_POLICIES[number];
export type DerivedMetricSiteScope = Extract<MetricScope, "cl" | "kn">;

export type DerivedMetricInput =
  | {
      alias: string;
      kind: "metric";
      metricKey: string;
      scope: DerivedMetricScopeSelector;
      unit: string;
    }
  | {
      alias: string;
      kind: "calculation-setting";
      settingKey: string;
      unit: string;
    };

export type DerivedMetricDefinition = {
  acceptancePolicy?: "cumulative-nondecreasing";
  description: string;
  enabled: boolean;
  expression: string;
  fallbackPolicy: DerivedMetricFallbackPolicy;
  inputs: DerivedMetricInput[];
  managed: boolean;
  metricKey: string;
  name: string;
  outputScopePolicy: DerivedMetricOutputScopePolicy;
  outputUnit: string;
  precision: number;
  revision: number;
  siteScopes?: DerivedMetricSiteScope[];
};

export type DerivedMetricDependencyIdentity = {
  alias: string;
  kind: DerivedMetricInput["kind"];
  metricKey?: string;
  metricScope?: MetricScope;
  settingKey?: string;
  settingRevision?: string;
  sourceTopic?: string;
  timestamp?: string;
  unit: string;
  upstream?: DerivedMetricDependencyIdentity[];
  value: number | null;
};

export type DerivedMetricEvaluationFailureCode =
  | "acceptance-policy-rejected"
  | "divide-by-zero"
  | "input-stale"
  | "input-unavailable"
  | "invalid-input"
  | "non-finite-result";

export type DerivedMetricEvaluation = {
  definitionRevision: number;
  dependencies: DerivedMetricDependencyIdentity[];
  evaluatedAt: string;
  failureCode: DerivedMetricEvaluationFailureCode | null;
  freshnessState: "fresh" | "stale" | "unavailable";
  metricKey: string;
  metricScope: MetricScope;
  outputUnit: string;
  precision: number;
  retainedLastGood: boolean;
  status: "degraded" | "ready" | "unavailable";
  timestamp: string | null;
  value: number | null;
};

export type DerivedMetricRuntimeDiagnostics = {
  definitionRevision: number;
  effectiveOutputScope: MetricScope;
  evaluation: DerivedMetricEvaluation | null;
  inputs: DerivedMetricDefinition["inputs"];
  metricKey: string;
  provenance: DerivedMetricDependencyIdentity[];
};

export type DerivedMetricValidationErrorCode =
  | "cycle"
  | "duplicate-alias"
  | "expression-limit"
  | "invalid-arity"
  | "invalid-definition"
  | "invalid-scope"
  | "invalid-token"
  | "managed-read-only"
  | "metric-key-conflict"
  | "non-finite-number"
  | "syntax"
  | "unit-incompatible"
  | "unknown-function"
  | "unknown-input"
  | "unknown-setting";

export type DerivedMetricValidationError = {
  code: DerivedMetricValidationErrorCode;
  message: string;
  offset?: number;
  token?: string;
};

export function derivedMetricCatalogMetadata(definition: DerivedMetricDefinition) {
  const allowedScopes = definition.outputScopePolicy === "site"
    ? definition.siteScopes
      ? ["inherit-device", ...definition.siteScopes] as const
      : ["inherit-device", "cl", "kn"] as const
    : ["global"] as const;
  return {
    allowedScopes,
    dependencyKeys: [
      definition.metricKey,
      ...definition.inputs.flatMap((input) => input.kind === "metric" ? [input.metricKey] : [])
    ],
    label: definition.name,
    metricKey: definition.metricKey,
    sourceClass: "derived-metric" as const,
    unit: definition.outputUnit,
    unitFamily: definition.outputUnit,
    valueType: "numeric" as const
  };
}

export type DerivedMetricValidationResult =
  | { valid: true }
  | { errors: DerivedMetricValidationError[]; valid: false };
