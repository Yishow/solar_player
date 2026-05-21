import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveDisplayPageRuntimeRefreshSpec,
  resolveMonitoringHistoryRuntimeRefreshSpec
} from "./runtimeRefreshRegistry";

test("runtime refresh registry maps each display page to the expected runtime source", () => {
  assert.equal(resolveDisplayPageRuntimeRefreshSpec("overview").sourceKind, "display-story");
  assert.equal(resolveDisplayPageRuntimeRefreshSpec("solar").sourceKind, "display-story");
  assert.equal(resolveDisplayPageRuntimeRefreshSpec("factory-circuit").sourceKind, "display-story");
  assert.equal(resolveDisplayPageRuntimeRefreshSpec("images", { activeIndex: 2 }).sourceKind, "image-playlist");
  assert.equal(
    resolveDisplayPageRuntimeRefreshSpec("sustainability", { selectedPeriod: "year" }).sourceKind,
    "sustainability-story"
  );
});

test("runtime refresh registry derives stable refresh keys from page-specific parameters", () => {
  assert.equal(resolveDisplayPageRuntimeRefreshSpec("overview").refreshKey, "overview");
  assert.equal(resolveDisplayPageRuntimeRefreshSpec("solar").refreshKey, "solar");
  assert.equal(
    resolveDisplayPageRuntimeRefreshSpec("factory-circuit", { dependencyKey: "circuits:v2" }).refreshKey,
    "factory-circuit:circuits:v2"
  );
  assert.equal(
    resolveDisplayPageRuntimeRefreshSpec("images", { activeIndex: 3 }).refreshKey,
    "images:3"
  );
  assert.equal(
    resolveDisplayPageRuntimeRefreshSpec("sustainability", { selectedPeriod: "quarter" }).refreshKey,
    "sustainability:quarter"
  );
  assert.equal(
    resolveMonitoringHistoryRuntimeRefreshSpec("week").refreshKey,
    "monitoring-history:week"
  );
});

test("runtime refresh registry assigns dedicated refresh scopes for sustainability and monitoring history", () => {
  assert.deepEqual(
    resolveDisplayPageRuntimeRefreshSpec("factory-circuit").fallbackRefreshScopes,
    ["circuits", "display-pages"]
  );
  assert.deepEqual(
    resolveDisplayPageRuntimeRefreshSpec("sustainability", { selectedPeriod: "lifetime" }).refreshScopes,
    ["sustainability"]
  );
  assert.deepEqual(resolveMonitoringHistoryRuntimeRefreshSpec("month").refreshScopes, ["monitoring-history"]);
});
