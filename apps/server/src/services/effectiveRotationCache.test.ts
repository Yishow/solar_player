import assert from "node:assert/strict";
import test from "node:test";
import {
  createEffectiveRotationCacheKey,
  EffectiveRotationCache,
  type EffectiveRotationCacheKeyParts
} from "./effectiveRotationCache.js";

test("25 CL and 25 KN clients perform one full evaluation per Site cohort", () => {
  const cache = new EffectiveRotationCache<{ siteScope: "cl" | "kn" }>();
  const baseKey = {
    freshnessRevision: "freshness-1",
    profileId: 1,
    profileRevision: "profile-1",
    readinessRevision: "readiness-1"
  } satisfies Omit<EffectiveRotationCacheKeyParts, "siteScope">;
  let evaluationCount = 0;
  const snapshots = (["cl", "kn"] as const).flatMap((siteScope) =>
    Array.from({ length: 25 }, () =>
      cache.getOrEvaluate(
        createEffectiveRotationCacheKey({ ...baseKey, siteScope }),
        () => {
          evaluationCount += 1;
          return { siteScope };
        }
      )
    )
  );

  assert.equal(evaluationCount, 2);
  assert.equal(cache.getEvaluationCount(), 2);
  assert.equal(new Set(snapshots.slice(0, 25)).size, 1);
  assert.equal(new Set(snapshots.slice(25)).size, 1);
  assert.equal(snapshots[0]?.siteScope, "cl");
  assert.equal(snapshots[25]?.siteScope, "kn");
});

test("Profile, Readiness, and Freshness revision changes invalidate snapshots", () => {
  const cache = new EffectiveRotationCache<number>();
  const baseKey = {
    freshnessRevision: "freshness-1",
    profileId: 1,
    profileRevision: "profile-1",
    readinessRevision: "readiness-1",
    siteScope: "cl"
  } satisfies EffectiveRotationCacheKeyParts;
  let evaluationCount = 0;
  const evaluate = () => {
    evaluationCount += 1;
    return evaluationCount;
  };

  const revisions = [
    baseKey,
    { ...baseKey, profileRevision: "profile-2" },
    { ...baseKey, readinessRevision: "readiness-2" },
    { ...baseKey, freshnessRevision: "freshness-2" }
  ];
  for (const parts of revisions) {
    cache.getOrEvaluate(createEffectiveRotationCacheKey(parts), evaluate);
  }

  assert.equal(evaluationCount, 4);
  assert.equal(cache.getEvaluationCount(), 4);
});
