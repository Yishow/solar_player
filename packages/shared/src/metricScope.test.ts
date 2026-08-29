import assert from "node:assert/strict";
import test from "node:test";

import {
  isMetricScope,
  metricScopes,
  type MetricScope,
  type ScopedMetricIdentity,
  type ScopedMetricReading,
  type ScopedMetricSnapshot
} from "./metricScope.js";
import type { SiteScope } from "./deviceIdentity.js";

type Equal<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends
  (<T>() => T extends TRight ? 1 : 2)
    ? true
    : false;
type Expect<T extends true> = T;

type _MetricScopeContract = Expect<Equal<MetricScope, "cl" | "kn" | "global">>;
type _DeviceSiteScopeContract = Expect<Equal<SiteScope, "cl" | "kn">>;

test("metric scope has explicit site and global data values", () => {
  assert.deepEqual(metricScopes, ["cl", "kn", "global"]);
  assert.equal(isMetricScope("cl"), true);
  assert.equal(isMetricScope("kn"), true);
  assert.equal(isMetricScope("global"), true);
  assert.equal(isMetricScope("all"), false);
  assert.equal(isMetricScope(""), false);
});

test("scoped metric snapshots allow identical semantic keys at both sites", () => {
  const readings = [
    {
      metricKey: "realTimePower",
      metricScope: "cl",
      quality: "good",
      timestamp: "2026-08-29T00:00:00.000Z",
      unit: "kW",
      value: 12
    },
    {
      metricKey: "realTimePower",
      metricScope: "kn",
      quality: "good",
      timestamp: "2026-08-29T00:00:00.000Z",
      unit: "kW",
      value: 34
    }
  ] satisfies ScopedMetricReading[];

  const snapshot = {
    metrics: readings,
    timestamp: "2026-08-29T00:00:00.000Z"
  } satisfies ScopedMetricSnapshot;

  assert.equal(snapshot.metrics[0]?.metricKey, snapshot.metrics[1]?.metricKey);
  assert.notEqual(snapshot.metrics[0]?.metricScope, snapshot.metrics[1]?.metricScope);
  assert.deepEqual(
    snapshot.metrics.map(({ metricScope, metricKey }) => ({ metricScope, metricKey })),
    [
      { metricKey: "realTimePower", metricScope: "cl" },
      { metricKey: "realTimePower", metricScope: "kn" }
    ]
  );
});

test("global is a metric data scope and cannot become a device SiteScope", () => {
  const globalIdentity = {
    metricKey: "totalGeneration",
    metricScope: "global"
  } satisfies ScopedMetricIdentity;

  assert.equal(globalIdentity.metricScope, "global");
  assert.notEqual(globalIdentity.metricScope, "cl");
  assert.notEqual(globalIdentity.metricScope, "kn");
});
