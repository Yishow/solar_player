import type { SiteScope } from "./deviceIdentity.js";

/** Data scopes are independent from the device/group SiteScope. */
export const metricScopes = ["cl", "kn", "global"] as const;
export type MetricScope = SiteScope | "global";

export function scopedIdentityKey(metricScope: MetricScope, identity: string) {
  return JSON.stringify([metricScope, identity]);
}

export function isMetricScope(value: unknown): value is MetricScope {
  return (metricScopes as readonly unknown[]).includes(value);
}

export type ScopedMetricIdentity = {
  metricKey: string;
  metricScope: MetricScope;
};

export type ScopedMetricReading = ScopedMetricIdentity & {
  quality: string | null;
  timestamp: string;
  unit: string | null;
  value: number;
};

export type ScopedMetricSnapshot = {
  metrics: ScopedMetricReading[];
  timestamp: string | null;
};
