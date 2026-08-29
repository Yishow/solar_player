import assert from "node:assert/strict";
import test from "node:test";
import {
  compileEffectiveBindingPlan,
  METRIC_DATA_BINDING_SCOPES,
  normalizeMetricBoundPageConfig,
  resolvePlaybackMetricCatalog,
  resolveRepositoryDefaultMetricBoundItems,
  validateMetricDataBinding,
  type MetricCatalogEntry
} from "@solar-display/shared";
import {
  createFactoryCircuitDisplayPageSeedConfig
} from "../FactoryCircuit/displayPageConfig";
import {
  createOverviewDisplayPageSeedConfig,
  resolveOverviewModernDefaultConfig,
  type OverviewDisplayPageConfig
} from "../Overview/displayPageConfig";
import { createSolarDisplayPageSeedConfig } from "../Solar/displayPageConfig";

function bindingPairs(pageKey: Parameters<typeof resolveRepositoryDefaultMetricBoundItems>[0]) {
  return resolveRepositoryDefaultMetricBoundItems(pageKey).map(({ dataBinding, itemId }) => [
    itemId,
    dataBinding.metricKey,
    dataBinding.scope
  ]);
}

const metricCatalog: readonly MetricCatalogEntry[] = [
  {
    allowedScopes: ["inherit-device", "cl", "kn"],
    compatibleWidgetRoles: ["kpi"],
    dependencyKeys: ["realTimePower"],
    label: "即時功率",
    metricKey: "realTimePower",
    sourceClass: "mqtt-live",
    unit: "kW",
    unitFamily: "power",
    valueType: "numeric"
  },
  {
    allowedScopes: ["global"],
    compatibleWidgetRoles: ["status"],
    dependencyKeys: ["systemState"],
    label: "系統狀態",
    metricKey: "systemState",
    sourceClass: "mqtt-live",
    unit: null,
    unitFamily: null,
    valueType: "state"
  }
];

test("repository defaults bind existing page items by stable semantic id", () => {
  assert.deepEqual(bindingPairs("overview"), [
    ["power", "realTimePower", "inherit-device"],
    ["today", "todayGeneration", "inherit-device"],
    ["total", "totalGeneration", "inherit-device"],
    ["co2Today", "todayCo2Reduction", "inherit-device"],
    ["co2Total", "totalCo2Reduction", "inherit-device"]
  ]);
  assert.deepEqual(bindingPairs("solar"), [
    ["generation", "todayGeneration", "inherit-device"],
    ["selfConsumption", "selfConsumptionRatio", "inherit-device"],
    ["co2", "todayCo2Reduction", "inherit-device"],
    ["totalCo2", "totalCo2Reduction", "inherit-device"],
    ["efficiency", "systemEfficiency", "inherit-device"],
    ["flow.solar", "realTimePower", "inherit-device"],
    ["flow.inverter", "systemEfficiency", "inherit-device"],
    ["flow.factory", "selfConsumptionRatio", "inherit-device"],
    ["flow.co2", "todayCo2Reduction", "inherit-device"]
  ]);
  assert.deepEqual(bindingPairs("factory-circuit"), [
    ["totalPower", "totalPower", "inherit-device"],
    ["solarShare", "solarShare", "inherit-device"],
    ["selfConsumption", "selfConsumption", "inherit-device"],
    ["peak", "peak", "inherit-device"],
    ["flow", "flow", "inherit-device"],
    ["stamping", "factoryCircuit.stampingPower", "inherit-device"],
    ["body", "factoryCircuit.bodyPower", "inherit-device"],
    ["painting", "factoryCircuit.paintingPower", "inherit-device"],
    ["assembly", "factoryCircuit.assemblyPower", "inherit-device"],
    ["utility", "factoryCircuit.utilityPower", "inherit-device"],
    ["office", "factoryCircuit.officePower", "inherit-device"],
    ["heavy_vehicle", "factoryCircuit.heavyVehiclePower", "inherit-device"],
    ["ed_coating", "factoryCircuit.edCoatingPower", "inherit-device"]
  ]);
  assert.deepEqual(
    bindingPairs("factory-circuit-guanyin"),
    bindingPairs("factory-circuit")
  );
});

test("playback metric catalogs expose every supported binding scope", () => {
  for (const pageKey of ["overview", "solar", "factory-circuit"] as const) {
    for (const entry of resolvePlaybackMetricCatalog(pageKey)) {
      assert.deepEqual(entry.allowedScopes, ["inherit-device", "cl", "kn", "global"]);
    }
  }
});

test("legacy config normalization assigns stable defaults without reading layout order", () => {
  const first = normalizeMetricBoundPageConfig("overview", {
    kpiOrder: ["co2Total", "power", "today", "total", "co2Today"]
  });
  const reordered = normalizeMetricBoundPageConfig("overview", {
    kpiOrder: ["today", "co2Today", "power", "co2Total", "total"]
  });

  assert.deepEqual(first.dataBindings, reordered.dataBindings);
  assert.deepEqual(Object.keys(first.dataBindings), [
    "power",
    "today",
    "total",
    "co2Today",
    "co2Total"
  ]);
  assert.equal(first.dataBindings.power?.itemId, "power");
  assert.equal(first.dataBindings.power?.dataBinding.metricKey, "realTimePower");
});

test("normalization is idempotent and preserves reordered, inserted, and explicitly bound items", () => {
  const normalized = normalizeMetricBoundPageConfig("overview", {});
  const customBinding = {
    dataBinding: {
      metricKey: "systemEfficiency",
      scope: "kn",
      sourceType: "metric"
    },
    itemId: "customKpi"
  } as const;
  const explicitlyBoundPower = {
    dataBinding: {
      metricKey: "todayGeneration",
      scope: "cl",
      sourceType: "metric"
    },
    itemId: "power"
  } as const;
  const reorderedBindings = Object.fromEntries([
    ["customKpi", customBinding],
    ...Object.entries(normalized.dataBindings).reverse()
  ]);
  reorderedBindings.power = explicitlyBoundPower;

  const migrated = normalizeMetricBoundPageConfig("overview", {
    ...normalized,
    dataBindings: reorderedBindings
  });

  assert.deepEqual(migrated.dataBindings.customKpi, customBinding);
  assert.deepEqual(migrated.dataBindings.power, explicitlyBoundPower);
  assert.deepEqual(normalizeMetricBoundPageConfig("overview", migrated), migrated);
});

test("page seed and legacy Overview normalization persist repository-owned binding maps", () => {
  const overview = createOverviewDisplayPageSeedConfig();
  const solar = createSolarDisplayPageSeedConfig();
  const factoryCircuit = createFactoryCircuitDisplayPageSeedConfig();

  assert.deepEqual(
    Object.values(overview.dataBindings),
    resolveRepositoryDefaultMetricBoundItems("overview")
  );
  assert.deepEqual(
    Object.values(solar.dataBindings),
    resolveRepositoryDefaultMetricBoundItems("solar")
  );
  assert.deepEqual(
    Object.values(factoryCircuit.dataBindings),
    resolveRepositoryDefaultMetricBoundItems("factory-circuit")
  );

  const { dataBindings: _legacyBindingOmission, ...legacyOverview } = overview;
  const migratedOverview = resolveOverviewModernDefaultConfig(
    legacyOverview as OverviewDisplayPageConfig,
    overview
  );
  assert.deepEqual(migratedOverview.dataBindings, overview.dataBindings);
});

test("metric binding scope values are closed and valid bindings preserve display-only format", () => {
  assert.deepEqual(METRIC_DATA_BINDING_SCOPES, ["inherit-device", "cl", "kn", "global"]);

  assert.deepEqual(
    validateMetricDataBinding(
      {
        format: { precision: 1, unitDisplay: "hide" },
        metricKey: "realTimePower",
        scope: "inherit-device",
        sourceType: "metric"
      },
      metricCatalog,
      { valueType: "numeric", widgetRole: "kpi" }
    ),
    {
      binding: {
        format: { precision: 1, unitDisplay: "hide" },
        metricKey: "realTimePower",
        scope: "inherit-device",
        sourceType: "metric"
      },
      valid: true
    }
  );
});

test("metric binding validation returns stable errors for missing, unknown, scope, and type failures", () => {
  const cases = [
    {
      binding: null,
      code: "metric-binding-required"
    },
    {
      binding: { metricKey: "", scope: "cl", sourceType: "metric" },
      code: "metric-binding-metric-key-required"
    },
    {
      binding: { metricKey: "notRegistered", scope: "cl", sourceType: "metric" },
      code: "metric-binding-unknown-metric"
    },
    {
      binding: { metricKey: "realTimePower", scope: "site", sourceType: "metric" },
      code: "metric-binding-invalid-scope"
    },
    {
      binding: { metricKey: "realTimePower", scope: "global", sourceType: "metric" },
      code: "metric-binding-incompatible-scope"
    },
    {
      binding: { metricKey: "systemState", scope: "global", sourceType: "metric" },
      code: "metric-binding-incompatible-value-type"
    },
    {
      binding: {
        format: { precision: 4 },
        metricKey: "realTimePower",
        scope: "cl",
        sourceType: "metric"
      },
      code: "metric-binding-invalid-format"
    }
  ] as const;

  for (const { binding, code } of cases) {
    const result = validateMetricDataBinding(binding, metricCatalog, {
      valueType: "numeric",
      widgetRole: "kpi"
    });
    assert.equal(result.valid, false);
    if (!result.valid) assert.equal(result.error.code, code);
  }
});

test("metric binding rejects raw MQTT and formula fields instead of persisting ETL behavior", () => {
  for (const forbiddenBinding of [
    {
      metricKey: "realTimePower",
      mqttTopic: "solar/CL/summary",
      scope: "cl",
      sourceType: "metric"
    },
    {
      formula: "realTimePower * 2",
      metricKey: "realTimePower",
      scope: "cl",
      sourceType: "metric"
    }
  ]) {
    const result = validateMetricDataBinding(forbiddenBinding, metricCatalog, {
      valueType: "numeric",
      widgetRole: "kpi"
    });
    assert.equal(result.valid, false);
    if (!result.valid) assert.equal(result.error.code, "metric-binding-unsupported-field");
  }
});

test("effective plan resolves inherited, explicit site, global, and mixed scopes by item id", () => {
  const result = compileEffectiveBindingPlan({
    catalog: metricCatalog,
    context: { contextKey: "device:7@rev-3", siteScope: "cl" },
    itemConstraints: {
      inherited: { valueType: "numeric", widgetRole: "kpi" },
      pinned: { valueType: "numeric", widgetRole: "kpi" },
      status: { valueType: "state", widgetRole: "status" }
    },
    items: [
      { dataBinding: { metricKey: "realTimePower", scope: "inherit-device", sourceType: "metric" }, itemId: "inherited" },
      { dataBinding: { metricKey: "realTimePower", scope: "kn", sourceType: "metric" }, itemId: "pinned" },
      { dataBinding: { metricKey: "systemState", scope: "global", sourceType: "metric" }, itemId: "status" }
    ],
    pageId: "overview-2"
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.plan.contextKey, "device:7@rev-3");
  assert.deepEqual(
    result.plan.items.map(({ dependencyIdentities, effectiveScope, itemId }) => ({
      dependencyIdentities,
      effectiveScope,
      itemId
    })),
    [
      { dependencyIdentities: [{ metricKey: "realTimePower", metricScope: "cl" }], effectiveScope: "cl", itemId: "inherited" },
      { dependencyIdentities: [{ metricKey: "realTimePower", metricScope: "kn" }], effectiveScope: "kn", itemId: "pinned" },
      { dependencyIdentities: [{ metricKey: "systemState", metricScope: "global" }], effectiveScope: "global", itemId: "status" }
    ]
  );
});

test("effective plan rejects missing inherited context and incompatible bindings with stable errors", () => {
  const base = {
    catalog: metricCatalog,
    context: { contextKey: "preview:none", siteScope: null },
    itemConstraints: { power: { valueType: "numeric" as const, widgetRole: "kpi" } },
    pageId: "overview"
  };

  const missingContext = compileEffectiveBindingPlan({
    ...base,
    items: [{ dataBinding: { metricKey: "realTimePower", scope: "inherit-device", sourceType: "metric" }, itemId: "power" }]
  });
  assert.deepEqual(missingContext, {
    error: { code: "effective-binding-context-required", field: "scope", itemId: "power" },
    ok: false
  });

  const incompatible = compileEffectiveBindingPlan({
    ...base,
    items: [{ dataBinding: { metricKey: "systemState", scope: "global", sourceType: "metric" }, itemId: "power" }]
  });
  assert.deepEqual(incompatible, {
    error: { code: "metric-binding-incompatible-value-type", field: "metricKey", itemId: "power" },
    ok: false
  });
});

test("effective plan resolves both inherited and explicit site directions", () => {
  for (const [siteScope, explicitScope] of [["cl", "kn"], ["kn", "cl"]] as const) {
    const result = compileEffectiveBindingPlan({
      catalog: metricCatalog,
      context: { contextKey: `site:${siteScope}`, siteScope },
      itemConstraints: {
        explicit: { valueType: "numeric", widgetRole: "kpi" },
        inherited: { valueType: "numeric", widgetRole: "kpi" }
      },
      items: [
        { dataBinding: { metricKey: "realTimePower", scope: "inherit-device", sourceType: "metric" }, itemId: "inherited" },
        { dataBinding: { metricKey: "realTimePower", scope: explicitScope, sourceType: "metric" }, itemId: "explicit" }
      ],
      pageId: "overview"
    });

    assert.equal(result.ok, true);
    if (!result.ok) continue;
    assert.deepEqual(
      result.plan.items.map(({ effectiveScope, itemId }) => [itemId, effectiveScope]),
      [["inherited", siteScope], ["explicit", explicitScope]]
    );
  }
});

test("effective plan keeps registered global dependencies global within inherited derived metrics", () => {
  const result = compileEffectiveBindingPlan({
    catalog: resolvePlaybackMetricCatalog("factory-circuit"),
    context: { contextKey: "site:cl", siteScope: "cl" },
    itemConstraints: { peak: { valueType: "numeric", widgetRole: "numeric-kpi" } },
    items: [{ dataBinding: { metricKey: "peak", scope: "inherit-device", sourceType: "metric" }, itemId: "peak" }],
    pageId: "factory-circuit"
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.plan.items[0]?.dependencyIdentities.find(
      ({ metricKey }) => metricKey === "factoryPeakMultiplier"
    ),
    { metricKey: "factoryPeakMultiplier", metricScope: "global" }
  );
  assert.ok(
    result.plan.items[0]?.dependencyIdentities.some(
      ({ metricKey, metricScope }) => metricKey.startsWith("factoryCircuit.") && metricScope === "cl"
    )
  );
});
