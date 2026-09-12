import assert from "node:assert/strict";
import test from "node:test";
import {
  createPerformanceAssets,
  createPerformanceRegions,
  evaluatePerformanceComparison,
  type PerformanceIdentity,
  type PerformanceSampleRun
} from "./uiPerformanceFixtures";
import { resolveImageManagementLibraryModel } from "../ImageManagement/loadModel";
import { defaultDisplayEditorOverlayPreset, resolveDisplayEditorOverlayState } from "./canvasOverlayState";

test("performance fixtures enter the existing image library model without changing asset identities", () => {
  for (const count of [100, 1000] as const) {
    const assets = createPerformanceAssets(count);
    const model = resolveImageManagementLibraryModel({
      assets,
      storageUsage: { fileCount: count, usedBytes: count * 70, usedMB: (count * 70) / 1048576 }
    });
    assert.equal(model.assets, assets);
    assert.equal(model.lastSyncedAssets, assets);
    assert.equal(model.assets.length, count);
    assert.equal(new Set(model.assets.map((asset) => asset.id)).size, count);
    assert.equal(model.assets.at(-1)?.id, count);
  }
});

test("synthetic region fixture is accepted by the existing overlay with a bounded FHD geometry", () => {
  const regions = createPerformanceRegions();
  const overlay = resolveDisplayEditorOverlayState({
    canvasHeight: 934,
    canvasWidth: 1920,
    regions,
    selectedRegion: regions[0]!,
    lockedRegionIds: [],
    overlayPreset: { ...defaultDisplayEditorOverlayPreset, displayMode: "full-canvas" }
  });
  assert.equal(overlay.frames.length, 100);
  assert.equal(overlay.frames.filter((frame) => frame.visible).length, 100);
  assert.deepEqual(overlay.frames[0]?.rect, { left: 20, top: 20, width: 80, height: 40 });
  assert.deepEqual(overlay.frames[99]?.rect, { left: 1640, top: 740, width: 80, height: 40 });
});

const sampleIdentity: PerformanceIdentity = {
  fixtureVersion: "ui-performance-v1",
  fixtureHashes: { assets100: "hash100", assets1000: "hash1000", regions100: "hashreg" },
  environment: {
    node: "v24.15.0",
    platform: "darwin",
    architecture: "arm64",
    cpu: "Apple M4",
    logicalCpus: 10,
    memoryBytes: 17179869184,
    release: "25.6.0"
  }
};

const createFiveRuns = (durations: number[]): PerformanceSampleRun[] =>
  durations.map((durationMs, i) => ({
    runIndex: i + 1,
    durationMs,
    timestamp: "2026-09-12T00:00:00.000Z"
  }));

test("evaluatePerformanceComparison marks missing baseline as non-comparable", () => {
  const result = evaluatePerformanceComparison({
    condition: "test-cond",
    baselineIdentity: null,
    baselineRuns: [],
    outputEquivalent: true
  });
  assert.equal(result.status, "non-comparable");
  assert.match(result.reason ?? "", /Missing baseline/);
});

test("evaluatePerformanceComparison marks fixture version mismatch as non-comparable", () => {
  const candidateIdentity = { ...sampleIdentity, fixtureVersion: "ui-performance-v2" };
  const result = evaluatePerformanceComparison({
    condition: "test-cond",
    baselineIdentity: sampleIdentity,
    candidateIdentity,
    baselineRuns: createFiveRuns([10, 11, 12, 13, 14]),
    candidateRuns: createFiveRuns([9, 10, 11, 12, 13]),
    outputEquivalent: true
  });
  assert.equal(result.status, "non-comparable");
  assert.match(result.reason ?? "", /Fixture version mismatch/);
});

test("evaluatePerformanceComparison marks environment mismatch as non-comparable", () => {
  const candidateIdentity = {
    ...sampleIdentity,
    environment: { ...sampleIdentity.environment, platform: "linux" }
  };
  const result = evaluatePerformanceComparison({
    condition: "test-cond",
    baselineIdentity: sampleIdentity,
    candidateIdentity,
    baselineRuns: createFiveRuns([10, 11, 12, 13, 14]),
    candidateRuns: createFiveRuns([9, 10, 11, 12, 13]),
    outputEquivalent: true
  });
  assert.equal(result.status, "non-comparable");
  assert.match(result.reason ?? "", /Environment mismatch/);
});

test("evaluatePerformanceComparison marks non-equivalent output as non-comparable", () => {
  const result = evaluatePerformanceComparison({
    condition: "test-cond",
    baselineIdentity: sampleIdentity,
    candidateIdentity: sampleIdentity,
    baselineRuns: createFiveRuns([10, 11, 12, 13, 14]),
    candidateRuns: createFiveRuns([9, 10, 11, 12, 13]),
    outputEquivalent: false
  });
  assert.equal(result.status, "non-comparable");
  assert.match(result.reason ?? "", /output differs/);
});

test("evaluatePerformanceComparison marks fewer than 5 runs as incomplete", () => {
  const result = evaluatePerformanceComparison({
    condition: "test-cond",
    baselineIdentity: sampleIdentity,
    candidateIdentity: sampleIdentity,
    baselineRuns: createFiveRuns([10, 11, 12]),
    candidateRuns: createFiveRuns([9, 10, 11, 12, 13]),
    outputEquivalent: true
  });
  assert.equal(result.status, "incomplete");
  assert.match(result.reason ?? "", /at least 5 raw runs/);
});

test("evaluatePerformanceComparison calculates medians and delta when valid paired runs exist", () => {
  const result = evaluatePerformanceComparison({
    condition: "test-cond",
    baselineIdentity: sampleIdentity,
    candidateIdentity: sampleIdentity,
    baselineRuns: createFiveRuns([10, 12, 14, 16, 18]), // median = 14
    candidateRuns: createFiveRuns([8, 9, 10, 11, 12]),   // median = 10
    outputEquivalent: true,
    boundedWorkSatisfied: true
  });
  assert.equal(result.status, "comparable");
  assert.equal(result.baselineMedianDurationMs, 14);
  assert.equal(result.candidateMedianDurationMs, 10);
  assert.equal(result.durationDeltaMs, -4);
  assert.equal(result.outputEquivalent, true);
  assert.equal(result.boundedWorkSatisfied, true);
});
