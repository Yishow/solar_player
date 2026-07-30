import { createHash } from "node:crypto";

export type EffectiveRotationCacheKeyParts = {
  freshnessRevision: string;
  profileId: number;
  profileRevision: string;
  readinessRevision: string;
  siteScope: "cl" | "kn";
};

export function createEffectiveRotationCacheKey(
  parts: EffectiveRotationCacheKeyParts
) {
  return createHash("sha256")
    .update(JSON.stringify(parts), "utf8")
    .digest("hex");
}

export class EffectiveRotationCache<T> {
  private readonly entries = new Map<string, T>();

  constructor(private readonly maxEntries = 64) {}

  getOrEvaluate(key: string, evaluate: () => T): T {
    if (this.entries.has(key)) {
      return this.entries.get(key) as T;
    }

    const value = evaluate();
    this.entries.set(key, value);
    if (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey);
      }
    }
    return value;
  }

  clear() {
    this.entries.clear();
  }
}
