import assert from "node:assert/strict";
import test from "node:test";
import type { DerivedMetricDefinition } from "./derivedMetric.js";
import {
  DERIVED_METRIC_FALLBACK_POLICIES,
  DERIVED_METRIC_KNOWN_UNITS,
  DERIVED_METRIC_OUTPUT_SCOPE_POLICIES,
  DERIVED_METRIC_SCOPE_SELECTORS,
  derivedMetricCatalogMetadata,
  resolveDerivedMetricInputScopes
} from "./derivedMetric.js";

test("shared derived metric DTOs cover scope policies, inputs, selectors, units, and safe fields", () => {
  assert.deepEqual(DERIVED_METRIC_OUTPUT_SCOPE_POLICIES, ["site", "global"]);
  assert.deepEqual(DERIVED_METRIC_SCOPE_SELECTORS, ["output-site", "cl", "kn", "global"]);
  assert.deepEqual(DERIVED_METRIC_FALLBACK_POLICIES, ["unavailable", "retain-last-good"]);
  assert.ok(["%", "kW", "kWh", "MWh", "kg/kWh", "trees"].every((unit) => DERIVED_METRIC_KNOWN_UNITS.includes(unit)));

  const siteDefinition: DerivedMetricDefinition = {
    description: "site metric",
    enabled: true,
    expression: "source * 2",
    fallbackPolicy: "unavailable",
    inputs: [
      { alias: "source", kind: "metric", metricKey: "realTimePower", scope: "output-site", unit: "kW" },
      { alias: "factor", kind: "calculation-setting", settingKey: "estimatedTariffPerKwh", unit: "TWD/kWh" }
    ],
    managed: false,
    metricKey: "custom.siteMetric",
    name: "Site Metric",
    outputScopePolicy: "site",
    outputUnit: "kW",
    precision: 2,
    revision: 1
  };
  const globalDefinition: DerivedMetricDefinition = {
    ...siteDefinition,
    inputs: [{ alias: "source", kind: "metric", metricKey: "todayGeneration", scope: "global", unit: "MWh" }],
    metricKey: "custom.globalMetric",
    name: "Global Metric",
    outputScopePolicy: "global",
    outputUnit: "MWh"
  };

  assert.deepEqual(derivedMetricCatalogMetadata(siteDefinition).allowedScopes, ["inherit-device", "cl", "kn"]);
  assert.deepEqual(
    derivedMetricCatalogMetadata({ ...siteDefinition, siteScopes: ["cl"] }).allowedScopes,
    ["inherit-device", "cl"]
  );
  assert.deepEqual(
    derivedMetricCatalogMetadata({ ...siteDefinition, siteScopes: ["kn"] }).allowedScopes,
    ["inherit-device", "kn"]
  );
  assert.deepEqual(derivedMetricCatalogMetadata(globalDefinition).allowedScopes, ["global"]);
  assert.deepEqual(siteDefinition.inputs.map((input) => input.kind), ["metric", "calculation-setting"]);
  assert.equal(
    ["script", "code", "sql", "shell", "network", "file"].some((key) => key in siteDefinition),
    false
  );
});

test("derived metric input scopes expand explicit, output-site, and global selectors consistently", () => {
  const siteDefinition = { outputScopePolicy: "site" as const };
  assert.deepEqual(
    resolveDerivedMetricInputScopes(siteDefinition, {
      alias: "source", kind: "metric", metricKey: "sameKey", scope: "cl", unit: "kW"
    }),
    ["cl"]
  );
  assert.deepEqual(
    resolveDerivedMetricInputScopes({ ...siteDefinition, siteScopes: ["kn"] }, {
      alias: "source", kind: "metric", metricKey: "sameKey", scope: "output-site", unit: "kW"
    }),
    ["kn"]
  );
  assert.deepEqual(
    resolveDerivedMetricInputScopes(siteDefinition, {
      alias: "source", kind: "metric", metricKey: "sameKey", scope: "output-site", unit: "kW"
    }),
    ["cl", "kn"]
  );
  assert.deepEqual(
    resolveDerivedMetricInputScopes({ outputScopePolicy: "global" }, {
      alias: "source", kind: "metric", metricKey: "sameKey", scope: "global", unit: "kW"
    }),
    ["global"]
  );
});
