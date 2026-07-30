import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  createDefaultFreshnessPolicy,
  type FactoryCircuitStoryPayload
} from "@solar-display/shared";
import {
  advanceFactoryCircuitStoryWhileOffline,
  loadDisplayStoryRuntimePayload
} from "./useDisplayStoryRuntime";

const source = readFileSync(path.join(import.meta.dirname, "useDisplayStoryRuntime.ts"), "utf8");

test("loadDisplayStoryRuntimePayload reads only the requested page payload from the page-scoped endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);

    return new Response(
      JSON.stringify({
        generatedAt: "2026-05-22T13:31:00.000Z",
        pageId: "solar",
        payload: {
          kpis: [
            {
              comparison: {
                delta: null,
                fallbackReason: null,
                label: "今日目標",
                state: "on-target"
              },
              metricKey: "todayGeneration"
            }
          ],
          story: {
            flowState: {
              reason: "ready",
              state: "normal"
            }
          }
        }
      }),
      {
        headers: {
          "Content-Type": "application/json"
        },
        status: 200
      }
    );
  };

  try {
    const payload = await loadDisplayStoryRuntimePayload("solar");

    assert.match(seenUrl, /\/api\/display-story\/solar$/);
    assert.equal(payload.story.flowState.state, "normal");
    assert.equal(payload.kpis[0]?.metricKey, "todayGeneration");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("display story runtime hook accepts an optional initial payload for staged hydration", () => {
  assert.match(source, /initialPayload\?: DisplayStoryPayloadByPageId\[PageKey\] \| null/);
  assert.match(source, /initialPayload:\s*options\?\.initialPayload/);
});

test("Factory Circuit Story advances Server freshness while offline", () => {
  const policy = createDefaultFreshnessPolicy();
  const liveFreshness = {
    ageFrozen: false,
    ageMs: 0,
    category: "realtime" as const,
    nextTransitionAt: "2026-07-30T00:00:30.000Z",
    sourceTimestamp: "2026-07-30T00:00:00.000Z",
    state: "live" as const
  };
  const payload: FactoryCircuitStoryPayload = {
    freshnessPolicy: policy,
    kpis: [{
      alertTone: "normal",
      bindingState: "bound",
      dependencyKeys: ["factoryStampingPower"],
      fallbackReason: null,
      fallbackStrategy: "placeholder",
      freshness: liveFreshness,
      freshnessState: "fresh",
      helper: "依目前總負載推估",
      label: "目前廠區總用電",
      metricKey: "totalPower",
      provenance: "aggregate",
      sourceClass: "slot-aggregate",
      unit: "kW",
      value: "42.0"
    }],
    slots: [{
      alertTone: "normal",
      bindingState: "bound",
      circuitId: 1,
      fallbackReason: null,
      freshness: liveFreshness,
      freshnessState: "fresh",
      label: "沖壓工程",
      livePowerKw: 42,
      metricKey: "factoryStampingPower",
      slotKey: "stamping"
    }],
    summary: {
      alertTone: "normal",
      bindingState: "bound",
      fallbackReason: null,
      freshnessState: "fresh"
    }
  };

  const advanced = advanceFactoryCircuitStoryWhileOffline({
    elapsedMonotonicMs: policy.realtime.staleAfterMs,
    payload,
    timeSyncState: "synced"
  });

  assert.equal(advanced.kpis[0]?.freshness?.state, "stale");
  assert.equal(advanced.kpis[0]?.freshnessState, "stale");
  assert.equal(advanced.kpis[0]?.helper, "依最近總負載推估");
  assert.equal(advanced.kpis[0]?.label, "廠區總用電");
  assert.equal(advanced.slots[0]?.fallbackReason, "stale-data");
  assert.equal(advanced.summary.freshnessState, "stale");
});
