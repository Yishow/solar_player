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

/**
 * Marks a scoped live metrics payload that was delivered to a session only
 * because one of its bindings crosses site scope. Absent or `false` means the
 * payload belongs to the receiving session's own site (or to `global`), which
 * is why REST bootstrap responses and management broadcasts never set it.
 */
export type ForeignSiteDelivery = {
  foreignSite?: boolean;
};
