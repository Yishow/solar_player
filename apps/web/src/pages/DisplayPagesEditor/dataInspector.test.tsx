import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createOverviewDisplayPageSeedConfig, overviewDisplayPageEditorRegions } from "../Overview/displayPageConfig";
import {
  createDataBindingItemUpdate,
  DataInspectorPanel,
  resolveDataInspectorModel
} from "./dataInspector";

const powerCapability = overviewDisplayPageEditorRegions.find(
  (region) => region.id === "overview-kpi-power"
)?.dataBinding;

test("Data inspector exposes only compatible semantic metrics and read-only runtime context", () => {
  assert.ok(powerCapability);
  const config = createOverviewDisplayPageSeedConfig();
  const previewReading = {
    freshness: {
      ageFrozen: false,
      ageMs: 1_000,
      category: "realtime" as const,
      nextTransitionAt: null,
      sourceTimestamp: "2026-08-30T08:00:00.000Z",
      state: "live" as const
    },
    quality: "good",
    timestamp: "2026-08-30T08:00:00.000Z",
    unit: "kW",
    value: 813.26
  };
  const model = resolveDataInspectorModel({
    capability: powerCapability,
    config,
    pageKey: "overview",
    previewReading
  });

  assert.ok(model);
  assert.equal(model.binding.metricKey, "realTimePower");
  assert.equal(model.metricOptions.some((option) => option.label.startsWith("即時功率")), true);
  assert.equal(model.preview.value, "813.26 kW");
  assert.equal(model.preview.freshness, "即時");
  assert.equal(model.provenance.sourceClass, "mqtt-live");

  const html = renderToStaticMarkup(
    React.createElement(DataInspectorPanel, {
      capability: powerCapability,
      config,
      editMode: true,
      onChange: () => undefined,
      onReset: () => undefined,
      pageKey: "overview",
      previewReading
    })
  );

  assert.match(html, /語意指標/);
  assert.match(html, /穩定項目：power/);
  assert.match(html, /資料範圍/);
  assert.match(html, /小數位數/);
  assert.match(html, /單位顯示/);
  assert.match(html, /目前預覽值/);
  assert.match(html, /來源分類/);
  assert.doesNotMatch(html, /MQTT Topic|Raw Topic|Formula|公式編輯/);
});

test("Data inspector binding updates preserve the stable item identity and limit formatting", () => {
  const current = createOverviewDisplayPageSeedConfig().dataBindings.power;
  assert.ok(current);
  const next = createDataBindingItemUpdate(current, {
    metricKey: "todayGeneration",
    precision: 2,
    scope: "kn",
    unitDisplay: "hide"
  });

  assert.deepEqual(next, {
    dataBinding: {
      format: {
        precision: 2,
        unitDisplay: "hide"
      },
      metricKey: "todayGeneration",
      scope: "kn",
      sourceType: "metric"
    },
    itemId: "power"
  });
  assert.throws(() => createDataBindingItemUpdate(current, { precision: 4 }), /precision/);
});

test("Data inspector distinguishes temporary CL Preview Context from a KN-pinned binding", () => {
  assert.ok(powerCapability);
  const seed = createOverviewDisplayPageSeedConfig();
  const powerBinding = seed.dataBindings.power;
  assert.ok(powerBinding);
  const config = {
    ...seed,
    dataBindings: {
      ...seed.dataBindings,
      power: createDataBindingItemUpdate(powerBinding, { scope: "kn" })
    }
  };
  const html = renderToStaticMarkup(
    React.createElement(DataInspectorPanel, {
      capability: powerCapability,
      config,
      editMode: true,
      onChange: () => undefined,
      onReset: () => undefined,
      pageId: "overview",
      pageKey: "overview",
      previewContext: {
        contextKey: "site:cl",
        deviceId: null,
        groupId: null,
        kind: "site",
        label: "CL",
        profileId: null,
        siteScope: "cl"
      },
      previewItem: {
        configuredScope: "kn",
        dependencyIdentities: [{ metricKey: "realTimePower", metricScope: "kn" }],
        effectiveScope: "kn",
        format: null,
        freshness: null,
        itemId: "power",
        metricKey: "realTimePower",
        provenance: null,
        quality: "good",
        sourceClass: "mqtt-live",
        timestamp: null,
        unit: "kW",
        value: 22
      }
    })
  );

  assert.match(html, /暫時預覽情境/);
  assert.match(html, /此元件固定 KN/);
  assert.match(html, /不跟隨 CL 預覽情境/);
  assert.match(html, /有效範圍：KN/);
});

test("Data inspector identifies inherited binding as following Preview Context", () => {
  assert.ok(powerCapability);
  const html = renderToStaticMarkup(
    React.createElement(DataInspectorPanel, {
      capability: powerCapability,
      config: createOverviewDisplayPageSeedConfig(),
      editMode: true,
      onChange: () => undefined,
      onReset: () => undefined,
      pageId: "overview",
      pageKey: "overview",
      previewContext: {
        contextKey: "site:kn",
        deviceId: null,
        groupId: null,
        kind: "site",
        label: "KN",
        profileId: null,
        siteScope: "kn"
      },
      previewItem: {
        configuredScope: "inherit-device",
        dependencyIdentities: [{ metricKey: "realTimePower", metricScope: "kn" }],
        effectiveScope: "kn",
        format: null,
        freshness: null,
        itemId: "power",
        metricKey: "realTimePower",
        provenance: null,
        quality: "good",
        sourceClass: "mqtt-live",
        timestamp: null,
        unit: "kW",
        value: 22
      }
    })
  );

  assert.match(html, /此元件跟隨暫時預覽情境/);
  assert.match(html, /有效範圍：KN/);
});
