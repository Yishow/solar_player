import type { MonitoringMetricSourceClass } from "./displayStory.js";
import type { SiteScope } from "./deviceIdentity.js";
import type { FreshnessResult } from "./freshnessPolicy.js";
import type { MetricScope } from "./metricScope.js";
import { resolvePlaybackDefaultMetricBoundItems } from "./playbackMetricContract.js";

export const METRIC_DATA_BINDING_SCOPES = [
  "inherit-device",
  "cl",
  "kn",
  "global"
] as const;

export type MetricDataBindingScope = (typeof METRIC_DATA_BINDING_SCOPES)[number];
export type MetricValueType = "numeric" | "text" | "state";
export type MetricUnitDisplay = "auto" | "hide";

export type MetricDataBindingFormat = {
  precision?: number;
  unitDisplay?: MetricUnitDisplay;
};

export type MetricDataBinding = {
  format?: MetricDataBindingFormat;
  metricKey: string;
  scope: MetricDataBindingScope;
  sourceType: "metric";
};

export type MetricBoundItem = {
  dataBinding: MetricDataBinding;
  itemId: string;
};

export type WidgetDataBindingPageKey =
  | "overview"
  | "solar"
  | "factory-circuit"
  | "factory-circuit-guanyin";

export function resolveWidgetDataBindingPageKey(args: {
  pageKey: string;
  templateKey: string;
}): WidgetDataBindingPageKey | null {
  if (args.templateKey === "overview" || args.templateKey === "solar") {
    return args.templateKey;
  }
  if (args.templateKey !== "factory-circuit") return null;
  return args.pageKey === "factory-circuit-guanyin"
    ? "factory-circuit-guanyin"
    : "factory-circuit";
}

export type DisplayPreviewContextSelection =
  | { kind: "site"; siteScope: SiteScope }
  | { deviceId: number; kind: "device" }
  | { groupId: number; kind: "group" };

export type ResolvedDisplayPreviewContext = {
  contextKey: string;
  deviceId: number | null;
  groupId: number | null;
  kind: DisplayPreviewContextSelection["kind"];
  label: string;
  profileId: number | null;
  siteScope: SiteScope;
};

export type DisplayDataPreviewItem = {
  configuredScope: MetricDataBindingScope;
  dependencyIdentities: Array<{ metricKey: string; metricScope: MetricScope }>;
  effectiveScope: MetricScope;
  format: MetricDataBindingFormat | null;
  freshness: FreshnessResult | null;
  itemId: string;
  metricKey: string;
  provenance: { topic: string } | null;
  quality: string | null;
  sourceClass: MonitoringMetricSourceClass;
  timestamp: string | null;
  unit: string | null;
  value: number | null;
};

export type DisplayDataPreview = {
  cacheKey: string;
  configRevision: number;
  configStage: "draft" | "live";
  context: ResolvedDisplayPreviewContext;
  items: DisplayDataPreviewItem[];
  pageId: string;
};

export function resolveRepositoryDefaultMetricBoundItems(
  pageKey: WidgetDataBindingPageKey
): readonly MetricBoundItem[] {
  return resolvePlaybackDefaultMetricBoundItems(pageKey);
}

export type MetricCatalogEntry = {
  allowedScopes?: readonly MetricDataBindingScope[];
  compatibleWidgetRoles?: readonly string[];
  dependencyKeys: readonly string[];
  globalDependencyKeys?: readonly string[];
  label: string;
  metricKey: string;
  sourceClass: MonitoringMetricSourceClass;
  unit: string | null;
  unitFamily: string | null;
  valueType: MetricValueType;
};

export type EffectiveMetricBinding = {
  configuredScope: MetricDataBindingScope;
  dependencyIdentities: Array<{ metricKey: string; metricScope: MetricScope }>;
  effectiveScope: MetricScope;
  format?: MetricDataBindingFormat;
  itemId: string;
  metricKey: string;
  sourceClass: MonitoringMetricSourceClass;
};

export type EffectiveBindingPlan = {
  contextKey: string;
  items: EffectiveMetricBinding[];
  pageId: string;
};

export type EffectiveBindingContext = {
  contextKey: string;
  siteScope: SiteScope | null;
};

export type MetricBindingItemConstraint = {
  valueType: MetricValueType;
  widgetRole?: string;
};

export type EffectiveBindingPlanErrorCode =
  | MetricBindingValidationErrorCode
  | "effective-binding-context-required"
  | "effective-binding-duplicate-item-id"
  | "effective-binding-item-constraint-required";

export type EffectiveBindingPlanCompileResult =
  | { ok: true; plan: EffectiveBindingPlan }
  | {
      error: {
        code: EffectiveBindingPlanErrorCode;
        field: string | null;
        itemId: string;
      };
      ok: false;
    };

export type MetricBindingValidationErrorCode =
  | "metric-binding-required"
  | "metric-binding-invalid-source-type"
  | "metric-binding-metric-key-required"
  | "metric-binding-unknown-metric"
  | "metric-binding-invalid-scope"
  | "metric-binding-incompatible-scope"
  | "metric-binding-incompatible-value-type"
  | "metric-binding-incompatible-widget-role"
  | "metric-binding-invalid-format"
  | "metric-binding-unsupported-field";

export type MetricBindingValidationResult =
  | { binding: MetricDataBinding; valid: true }
  | {
      error: {
        code: MetricBindingValidationErrorCode;
        field: string | null;
      };
      valid: false;
    };

type MetricBindingValidationOptions = {
  valueType: MetricValueType;
  widgetRole?: string;
};

const bindingFields = new Set(["format", "metricKey", "scope", "sourceType"]);
const formatFields = new Set(["precision", "unitDisplay"]);

function invalid(
  code: MetricBindingValidationErrorCode,
  field: string | null = null
): MetricBindingValidationResult {
  return { error: { code, field }, valid: false };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBindingScope(value: unknown): value is MetricDataBindingScope {
  return METRIC_DATA_BINDING_SCOPES.includes(value as MetricDataBindingScope);
}

function readFormat(value: unknown): MetricDataBindingFormat | null | "invalid" {
  if (value === undefined) return null;
  if (!isRecord(value)) return "invalid";
  if (Object.keys(value).some((field) => !formatFields.has(field))) return "invalid";
  if (
    value.precision !== undefined
    && (
      !Number.isInteger(value.precision)
      || (value.precision as number) < 0
      || (value.precision as number) > 3
    )
  ) {
    return "invalid";
  }
  if (
    value.unitDisplay !== undefined
    && value.unitDisplay !== "auto"
    && value.unitDisplay !== "hide"
  ) {
    return "invalid";
  }
  return {
    ...(value.precision === undefined ? {} : { precision: value.precision as number }),
    ...(value.unitDisplay === undefined
      ? {}
      : { unitDisplay: value.unitDisplay as MetricUnitDisplay })
  };
}

function readMetricDataBinding(value: unknown): MetricDataBinding | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((field) => !bindingFields.has(field))) return null;
  if (value.sourceType !== "metric") return null;
  if (typeof value.metricKey !== "string" || value.metricKey.trim().length === 0) return null;
  if (!isBindingScope(value.scope)) return null;
  const format = readFormat(value.format);
  if (format === "invalid") return null;

  return {
    ...(format === null ? {} : { format }),
    metricKey: value.metricKey,
    scope: value.scope,
    sourceType: "metric"
  };
}

export function normalizeMetricBoundPageConfig<T extends Record<string, unknown>>(
  pageKey: WidgetDataBindingPageKey,
  config: T
): T & { dataBindings: Record<string, MetricBoundItem> } {
  const existingBindings = isRecord(config.dataBindings) ? config.dataBindings : {};
  const entries: Array<[string, MetricBoundItem]> = [];
  const itemIds = new Set<string>();

  for (const [itemId, value] of Object.entries(existingBindings)) {
    const binding = isRecord(value) ? readMetricDataBinding(value.dataBinding) : null;
    if (!binding) continue;
    entries.push([itemId, { dataBinding: binding, itemId }]);
    itemIds.add(itemId);
  }

  for (const defaultItem of resolvePlaybackDefaultMetricBoundItems(pageKey)) {
    if (itemIds.has(defaultItem.itemId)) continue;
    entries.push([defaultItem.itemId, defaultItem]);
  }

  return {
    ...config,
    dataBindings: Object.fromEntries(entries)
  };
}

export function validateMetricDataBinding(
  value: unknown,
  catalog: readonly MetricCatalogEntry[],
  options: MetricBindingValidationOptions
): MetricBindingValidationResult {
  if (!isRecord(value)) return invalid("metric-binding-required");
  const unsupportedField = Object.keys(value).find((field) => !bindingFields.has(field));
  if (unsupportedField) {
    return invalid("metric-binding-unsupported-field", unsupportedField);
  }
  if (value.sourceType !== "metric") {
    return invalid("metric-binding-invalid-source-type", "sourceType");
  }
  if (typeof value.metricKey !== "string" || value.metricKey.trim().length === 0) {
    return invalid("metric-binding-metric-key-required", "metricKey");
  }
  if (!isBindingScope(value.scope)) {
    return invalid("metric-binding-invalid-scope", "scope");
  }
  const metric = catalog.find(({ metricKey }) => metricKey === value.metricKey);
  if (!metric) return invalid("metric-binding-unknown-metric", "metricKey");
  if (metric.allowedScopes && !metric.allowedScopes.includes(value.scope)) {
    return invalid("metric-binding-incompatible-scope", "scope");
  }
  if (metric.valueType !== options.valueType) {
    return invalid("metric-binding-incompatible-value-type", "metricKey");
  }
  if (
    options.widgetRole
    && metric.compatibleWidgetRoles
    && !metric.compatibleWidgetRoles.includes(options.widgetRole)
  ) {
    return invalid("metric-binding-incompatible-widget-role", "metricKey");
  }
  const format = readFormat(value.format);
  if (format === "invalid") return invalid("metric-binding-invalid-format", "format");

  return {
    binding: {
      ...(format === null ? {} : { format }),
      metricKey: value.metricKey,
      scope: value.scope,
      sourceType: "metric"
    },
    valid: true
  };
}

export function compileEffectiveBindingPlan(args: {
  catalog: readonly MetricCatalogEntry[];
  context: EffectiveBindingContext;
  itemConstraints: Readonly<Record<string, MetricBindingItemConstraint>>;
  items: readonly MetricBoundItem[];
  pageId: string;
}): EffectiveBindingPlanCompileResult {
  const itemIds = new Set<string>();
  const effectiveItems: EffectiveMetricBinding[] = [];

  for (const item of args.items) {
    if (itemIds.has(item.itemId)) {
      return {
        error: {
          code: "effective-binding-duplicate-item-id",
          field: "itemId",
          itemId: item.itemId
        },
        ok: false
      };
    }
    itemIds.add(item.itemId);

    const constraint = args.itemConstraints[item.itemId];
    if (!constraint) {
      return {
        error: {
          code: "effective-binding-item-constraint-required",
          field: null,
          itemId: item.itemId
        },
        ok: false
      };
    }
    const validation = validateMetricDataBinding(
      item.dataBinding,
      args.catalog,
      constraint
    );
    if (!validation.valid) {
      return {
        error: { ...validation.error, itemId: item.itemId },
        ok: false
      };
    }

    if (validation.binding.scope === "inherit-device" && args.context.siteScope === null) {
      return {
        error: {
          code: "effective-binding-context-required",
          field: "scope",
          itemId: item.itemId
        },
        ok: false
      };
    }

    const metric = args.catalog.find(
      ({ metricKey }) => metricKey === validation.binding.metricKey
    )!;
    const effectiveScope: MetricScope = validation.binding.scope === "inherit-device"
      ? args.context.siteScope!
      : validation.binding.scope;
    const globalDependencyKeys = new Set(metric.globalDependencyKeys ?? []);

    effectiveItems.push({
      configuredScope: validation.binding.scope,
      dependencyIdentities: metric.dependencyKeys.map((metricKey) => ({
        metricKey,
        metricScope: globalDependencyKeys.has(metricKey) ? "global" : effectiveScope
      })),
      effectiveScope,
      ...(validation.binding.format ? { format: validation.binding.format } : {}),
      itemId: item.itemId,
      metricKey: validation.binding.metricKey,
      sourceClass: metric.sourceClass
    });
  }

  return {
    ok: true,
    plan: {
      contextKey: args.context.contextKey,
      items: effectiveItems,
      pageId: args.pageId
    }
  };
}
