import type { DisplayPageAssetHealthReport, ImageAsset } from "@solar-display/shared";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";

export const UI_PERFORMANCE_FIXTURE_VERSION = "ui-performance-v1";
export const UI_PERFORMANCE_FIXED_TIME = "2026-09-12T00:00:00.000Z";

export function createPerformanceAssets(count: 100 | 1000): ImageAsset[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    filename: `ui-performance-${index + 1}.png`,
    originalName: `ui-performance-${index + 1}.png`,
    title: `Performance asset ${String(index + 1).padStart(4, "0")}`,
    description: "Isolated UI performance fixture",
    mimeType: "image/png",
    fileSize: 70,
    width: 1,
    height: 1,
    aspectRatio: 1,
    includedInSlideshow: false,
    isCover: false,
    displayDuration: 15,
    displayOrder: index + 1,
    category: (["background", "icon", "object"] as const)[index % 3],
    usageScope: "both",
    usageSummary: { draftCount: 0, liveCount: 0, referenceCount: 0 },
    seedKey: null
  }));
}

export const performanceAssetHealth: DisplayPageAssetHealthReport = {
  assets: [],
  findings: [],
  generatedAt: UI_PERFORMANCE_FIXED_TIME,
  status: "healthy"
};

// Synthetic mounted/fake-RAF input only; never written into a production page schema.
export function createPerformanceRegions(): ResolvedDisplayEditorRegion[] {
  return Array.from({ length: 100 }, (_, index) => {
    const id = `performance-region-${index + 1}`;
    return {
      id,
      label: `Performance region ${index + 1}`,
      nodeType: "region",
      fields: [],
      geometry: { left: 20 + (index % 10) * 180, top: 20 + Math.floor(index / 10) * 80, width: 80, height: 40 },
      geometryConstraint: { left: 0, top: 0, width: 1920, height: 934 },
      schema: {
        id,
        label: `Performance region ${index + 1}`,
        fields: [],
        geometry: {
          leftPath: ["regions", id, "left"],
          topPath: ["regions", id, "top"],
          widthPath: ["regions", id, "width"],
          heightPath: ["regions", id, "height"]
        }
      }
    };
  });
}

export type PerformanceSampleRun = {
  runIndex: number;
  durationMs: number;
  requestCount?: number;
  renderCount?: number;
  operationCount?: number;
  timestamp: string;
};

export type PerformanceEnvironmentIdentity = {
  node: string;
  platform: string;
  architecture: string;
  cpu: string;
  logicalCpus: number;
  memoryBytes: number;
  release: string;
};

export type PerformanceIdentity = {
  sourceRevision?: string;
  worktreeDiffHash?: string;
  lockfileHash?: string;
  fixtureVersion: string;
  fixtureHashes: {
    assets100?: string;
    assets1000?: string;
    regions100?: string;
  };
  environment: PerformanceEnvironmentIdentity;
};

export type PerformanceConditionReport = {
  condition: string;
  status: "comparable" | "non-comparable" | "incomplete";
  reason?: string;
  baselineRuns: PerformanceSampleRun[];
  candidateRuns?: PerformanceSampleRun[];
  baselineMedianDurationMs?: number;
  candidateMedianDurationMs?: number;
  durationDeltaMs?: number;
  outputEquivalent: boolean;
  boundedWorkSatisfied?: boolean;
};

export type PerformanceOverallReport = {
  version: string;
  generatedAt: string;
  baselineIdentity: PerformanceIdentity;
  candidateIdentity?: PerformanceIdentity;
  conditions: PerformanceConditionReport[];
  verifiedImprovementClaimed: boolean;
  limitations?: string[];
};

export function computeMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function evaluatePerformanceComparison(params: {
  condition: string;
  baselineIdentity: PerformanceIdentity | null | undefined;
  candidateIdentity?: PerformanceIdentity | null | undefined;
  baselineRuns: PerformanceSampleRun[];
  candidateRuns?: PerformanceSampleRun[];
  outputEquivalent: boolean;
  boundedWorkSatisfied?: boolean;
}): PerformanceConditionReport {
  if (!params.baselineIdentity || !params.baselineRuns || params.baselineRuns.length === 0) {
    return {
      condition: params.condition,
      status: "non-comparable",
      reason: "Missing baseline measurements or identity",
      baselineRuns: params.baselineRuns ?? [],
      candidateRuns: params.candidateRuns,
      outputEquivalent: params.outputEquivalent
    };
  }

  if (params.candidateRuns !== undefined && params.candidateIdentity) {
    if (params.candidateIdentity.fixtureVersion !== params.baselineIdentity.fixtureVersion) {
      return {
        condition: params.condition,
        status: "non-comparable",
        reason: "Fixture version mismatch between baseline and candidate",
        baselineRuns: params.baselineRuns,
        candidateRuns: params.candidateRuns,
        outputEquivalent: params.outputEquivalent
      };
    }

    if (
      params.candidateIdentity.environment.platform !== params.baselineIdentity.environment.platform ||
      params.candidateIdentity.environment.architecture !== params.baselineIdentity.environment.architecture
    ) {
      return {
        condition: params.condition,
        status: "non-comparable",
        reason: "Environment mismatch between baseline and candidate",
        baselineRuns: params.baselineRuns,
        candidateRuns: params.candidateRuns,
        outputEquivalent: params.outputEquivalent
      };
    }

    if (!params.outputEquivalent) {
      return {
        condition: params.condition,
        status: "non-comparable",
        reason: "Rendered or behavioral output differs from baseline",
        baselineRuns: params.baselineRuns,
        candidateRuns: params.candidateRuns,
        outputEquivalent: false
      };
    }

    if (params.baselineRuns.length < 5 || params.candidateRuns.length < 5) {
      return {
        condition: params.condition,
        status: "incomplete",
        reason: "Requires at least 5 raw runs for both baseline and candidate",
        baselineRuns: params.baselineRuns,
        candidateRuns: params.candidateRuns,
        outputEquivalent: params.outputEquivalent
      };
    }

    const baselineMedian = computeMedian(params.baselineRuns.map((r) => r.durationMs));
    const candidateMedian = computeMedian(params.candidateRuns.map((r) => r.durationMs));

    return {
      condition: params.condition,
      status: "comparable",
      baselineRuns: params.baselineRuns,
      candidateRuns: params.candidateRuns,
      baselineMedianDurationMs: baselineMedian,
      candidateMedianDurationMs: candidateMedian,
      durationDeltaMs: candidateMedian - baselineMedian,
      outputEquivalent: true,
      boundedWorkSatisfied: params.boundedWorkSatisfied ?? true
    };
  }

  if (params.baselineRuns.length < 5) {
    return {
      condition: params.condition,
      status: "incomplete",
      reason: "Requires at least 5 baseline raw runs",
      baselineRuns: params.baselineRuns,
      outputEquivalent: params.outputEquivalent
    };
  }

  const baselineMedian = computeMedian(params.baselineRuns.map((r) => r.durationMs));
  return {
    condition: params.condition,
    status: "comparable",
    baselineRuns: params.baselineRuns,
    baselineMedianDurationMs: baselineMedian,
    outputEquivalent: params.outputEquivalent,
    boundedWorkSatisfied: params.boundedWorkSatisfied
  };
}
