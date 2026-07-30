import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  createDefaultFreshnessPolicy,
  evaluateFreshness
} from "@solar-display/shared";
import { advanceSustainabilityStoryWhileOffline } from "./useSustainabilityStoryRuntime";

const source = readFileSync(path.join(import.meta.dirname, "useSustainabilityStoryRuntime.ts"), "utf8");

test("sustainability story runtime keeps a period-scoped warm payload cache", () => {
  assert.match(source, /periodPayloadCacheRef = useRef\(new Map/);
  assert.match(source, /periodPayloadCacheRef\.current\.get\(selectedPeriod\)/);
  assert.match(source, /periodPayloadCacheRef\.current\.set\(selectedPeriod,\s*runtime\.payload\)/);
  assert.match(source, /const periodPayload = runtimePeriodPayload \?\? cachedPeriodPayload/);
  assert.match(source, /payload: resolvedPayload/);
});

test("sustainability story runtime still refreshes the selected period remotely", () => {
  assert.match(source, /fetchSustainabilityStory\(selectedPeriod\)/);
  assert.match(source, /resolveDisplayPageRuntimeRefreshSpec\("sustainability",\s*\{\s*selectedPeriod\s*\}\)/);
});

test("sustainability last-known provenance advances while offline", () => {
  const policy = createDefaultFreshnessPolicy();
  const freshness = evaluateFreshness({
    category: "cumulative",
    nowMs: Date.parse("2026-07-30T12:09:00.000Z"),
    policy,
    sourceTimestamp: "2026-07-30T12:00:00.000Z"
  });
  const provenance = {
    freshness,
    label: "累積發電",
    source: "factory-generation",
    sourceClass: "runtime-aggregate" as const,
    syncState: "fresh" as const,
    updatedAt: freshness.sourceTimestamp
  };
  const period = {
    bigNumberProvenance: {
      accumulatedCarbonReductionTons: provenance,
      accumulatedGenerationGwh: provenance,
      annualEnergySavingPercent: provenance,
      plantedTreeEquivalent: provenance
    },
    bigNumbers: {
      accumulatedCarbonReductionTons: 1,
      accumulatedGenerationGwh: 1,
      annualEnergySavingPercent: 1,
      plantedTreeEquivalent: 1
    },
    comparison: {
      delta: null,
      fallbackReason: null,
      label: "comparison",
      state: "available" as const
    },
    highlights: [],
    provenance
  };
  const payload = {
    freshnessPolicy: policy,
    period,
    periods: { month: period }
  } as unknown as Parameters<typeof advanceSustainabilityStoryWhileOffline>[0]["payload"];

  const advanced = advanceSustainabilityStoryWhileOffline({
    elapsedMonotonicMs: 120_000,
    payload,
    timeSyncState: "synced"
  });

  assert.equal(advanced.period.provenance.freshness?.state, "delayed");
  assert.equal(advanced.period.provenance.syncState, "warning");
});
