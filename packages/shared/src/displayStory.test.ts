import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMonitoringDisplayValue,
  resolveMonitoringMetricBinding
} from "./displayStory.js";

test("formatMonitoringDisplayValue converts sub-ton CO2 values to kilograms when enabled", () => {
  assert.deepEqual(
    formatMonitoringDisplayValue(0.011781, "t", {
      preferKilogramsForSubTonCo2: true
    }),
    {
      unit: "kg",
      value: "11.8"
    }
  );
  assert.deepEqual(
    formatMonitoringDisplayValue(0.495, "t", {
      preferKilogramsForSubTonCo2: true
    }),
    {
      unit: "kg",
      value: "495"
    }
  );
});

test("formatMonitoringDisplayValue keeps tons for zero, full-ton, or disabled preferences", () => {
  assert.deepEqual(
    formatMonitoringDisplayValue(0, "t", {
      preferKilogramsForSubTonCo2: true
    }),
    {
      unit: "t",
      value: "0.0"
    }
  );
  assert.deepEqual(
    formatMonitoringDisplayValue(1, "t", {
      preferKilogramsForSubTonCo2: true
    }),
    {
      unit: "t",
      value: "1.0"
    }
  );
  assert.deepEqual(
    formatMonitoringDisplayValue(0.011781, "t", {
      preferKilogramsForSubTonCo2: false
    }),
    {
      unit: "t",
      value: "0.01"
    }
  );
});

test("resolveMonitoringMetricBinding applies the shared kilogram preference only to bound readings", () => {
  const metric = resolveMonitoringMetricBinding({
    binding: {
      fallbackIndex: 0,
      label: "今日減碳量",
      metricKey: "todayCo2Reduction",
      unit: "t"
    },
    displayValueOptions: {
      preferKilogramsForSubTonCo2: true
    },
    isConnected: true,
    metricScope: "cl",
    reading: {
      quality: "good",
      timestamp: "2026-06-29T10:00:00.000Z",
      unit: "t",
      value: 0.011781
    }
  });

  assert.equal(metric.unit, "kg");
  assert.equal(metric.value, "11.8");

  const fallbackMetric = resolveMonitoringMetricBinding({
    binding: {
      fallbackIndex: 0,
      fallbackValue: "--",
      label: "今日減碳量",
      metricKey: "todayCo2Reduction",
      unit: "t"
    },
    displayValueOptions: {
      preferKilogramsForSubTonCo2: true
    },
    isConnected: false,
    metricScope: "cl",
    reading: null
  });

  assert.equal(fallbackMetric.unit, "t");
  assert.equal(fallbackMetric.value, "--");
});
