import assert from "node:assert/strict";
import test from "node:test";
import type { DerivedMetricDefinition } from "@solar-display/shared";
import { createFactoryCircuitDisplayPageSeedConfig, factoryCircuitDisplayPageEditorRegions } from "../FactoryCircuit/displayPageConfig";
import { createSolarDisplayPageSeedConfig, solarDisplayPageEditorRegions } from "../Solar/displayPageConfig";
import { isDataInspectorBindingEditable, resolveDataInspectorModel } from "./dataInspector";

function siteDefinition(
  metricKey: string,
  siteScopes: readonly ("cl" | "kn")[],
  outputUnit = "kW"
): DerivedMetricDefinition {
  return {
    description: "",
    enabled: true,
    expression: "a",
    fallbackPolicy: "unavailable",
    inputs: [{ alias: "a", kind: "metric", metricKey: "realTimePower", scope: "output-site", unit: "kW" }],
    managed: true,
    metricKey,
    name: metricKey,
    outputScopePolicy: "site",
    outputUnit,
    precision: 2,
    revision: 1,
    siteScopes: [...siteScopes]
  };
}

const derivedDefinitions = [
  siteDefinition("selfConsumptionRatio", ["cl", "kn"], "%"),
  siteDefinition("factoryCircuit.jungliTotalPower", ["cl"]),
  siteDefinition("factoryCircuit.guanyinTotalPower", ["kn"])
];

function scopeValues(args: {
  capabilityId: string;
  config: Record<string, unknown>;
  definitions?: readonly DerivedMetricDefinition[];
  pageKey: "factory-circuit" | "factory-circuit-guanyin" | "overview" | "solar";
  regions: ReadonlyArray<{ dataBinding?: unknown; id: string }>;
}) {
  const capability = args.regions.find((region) => region.id === args.capabilityId)?.dataBinding;
  assert.ok(capability, `${args.capabilityId} must expose a data binding capability`);
  const model = resolveDataInspectorModel({
    capability: capability as Parameters<typeof resolveDataInspectorModel>[0]["capability"],
    config: args.config,
    derivedDefinitions: args.definitions ?? derivedDefinitions,
    excludedMetricKeys: new Set<string>(),
    pageKey: args.pageKey
  });
  assert.ok(model, `${args.pageKey}/${args.capabilityId} must resolve a data inspector model`);
  return model.scopeOptions.map(({ value }) => value);
}

test("scope options for a site-policy derived metric do not offer the global scope", () => {
  assert.deepEqual(
    scopeValues({
      capabilityId: "solar-kpi-selfConsumption",
      config: createSolarDisplayPageSeedConfig(),
      pageKey: "solar",
      regions: solarDisplayPageEditorRegions
    }),
    ["inherit-device", "cl", "kn"]
  );
});

test("scope options for factory circuit total power stay on the page's own site", () => {
  assert.deepEqual(
    scopeValues({
      capabilityId: "factory-kpi-totalPower",
      config: createFactoryCircuitDisplayPageSeedConfig(),
      pageKey: "factory-circuit",
      regions: factoryCircuitDisplayPageEditorRegions
    }),
    ["inherit-device", "cl"]
  );

  assert.deepEqual(
    scopeValues({
      capabilityId: "factory-kpi-totalPower",
      config: createFactoryCircuitDisplayPageSeedConfig(),
      pageKey: "factory-circuit-guanyin",
      regions: factoryCircuitDisplayPageEditorRegions
    }),
    ["inherit-device", "kn"]
  );
});

test("binding stays read-only until the derived metric catalog is loaded", () => {
  // Before the catalog resolves, the offered scopes are the un-narrowed
  // built-in ones, which include scopes the server rejects on save.
  assert.equal(isDataInspectorBindingEditable({ catalogLoaded: false, editMode: true }), false);
  assert.equal(isDataInspectorBindingEditable({ catalogLoaded: true, editMode: true }), true);
  assert.equal(isDataInspectorBindingEditable({ catalogLoaded: true, editMode: false }), false);
  assert.equal(isDataInspectorBindingEditable({ catalogLoaded: false, editMode: false }), false);
});

test("an un-narrowed catalog is exactly what a failed load would offer", () => {
  const withoutCatalog = scopeValues({
    capabilityId: "factory-kpi-totalPower",
    config: createFactoryCircuitDisplayPageSeedConfig(),
    definitions: [],
    pageKey: "factory-circuit",
    regions: factoryCircuitDisplayPageEditorRegions
  });

  assert.deepEqual(withoutCatalog, ["inherit-device", "cl", "kn", "global"]);
});
