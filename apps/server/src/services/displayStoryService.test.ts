import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveMonitoringMetricBinding,
  resolveMonitoringSlotBinding,
  resolveMonitoringSummaryState
} from "@solar-display/shared";

test("shared monitoring story model keeps fallback diagnostics inspectable", () => {
  const metric = resolveMonitoringMetricBinding({
    binding: {
      fallbackIndex: 0,
      label: "即時發電功率",
      metricKey: "realTimePower",
      unit: "kW"
    },
    isConnected: false,
    now: "2026-05-13T10:30:00.000Z",
    reading: null
  });

  assert.equal(metric.bindingState, "missing");
  assert.equal(metric.fallbackReason, "socket-disconnected");
  assert.equal(metric.freshnessState, "fallback");
});

test("shared monitoring slot binding preserves missing-slot diagnostics", () => {
  const binding = resolveMonitoringSlotBinding({
    circuitId: null,
    slotKey: "production"
  });

  assert.equal(binding.bindingState, "missing");
  assert.equal(binding.fallbackReason, "missing-slot-binding");
});

test("shared monitoring summary state elevates stale bindings into warning tone", () => {
  const summary = resolveMonitoringSummaryState([
    {
      alertTone: "normal",
      bindingState: "bound",
      fallbackReason: null,
      freshnessState: "fresh"
    },
    {
      alertTone: "warning",
      bindingState: "bound",
      fallbackReason: "stale-data",
      freshnessState: "stale"
    }
  ]);

  assert.equal(summary.alertTone, "warning");
  assert.equal(summary.fallbackReason, "stale-data");
  assert.equal(summary.freshnessState, "stale");
});
