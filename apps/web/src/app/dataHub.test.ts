import assert from "node:assert/strict";
import test from "node:test";
import { isMetricScope } from "@solar-display/shared";
import {
  DATA_HUB_SECTIONS,
  filterVisibleDataHubSections,
  isDataHubManagementScope,
  resolveDataHubSection,
  type DataHubManagementScope
} from "./dataHub";
import { routeMetaMap } from "./routeMeta";

test("Data Hub exposes every required section through management route metadata", () => {
  assert.deepEqual(
    DATA_HUB_SECTIONS.map(({ key }) => key),
    ["connections", "sources", "metrics", "derived", "usage", "diagnostics", "external"]
  );

  for (const section of DATA_HUB_SECTIONS) {
    const route = routeMetaMap.get(section.path);
    assert.equal(route?.group, "management");
    assert.equal(route?.navLabel, section.label);
  }

  assert.equal(resolveDataHubSection("/settings/data-hub/metrics")?.key, "metrics");
  assert.equal(resolveDataHubSection("/settings/data-hub/sources/operations")?.key, "sources");
  assert.equal(resolveDataHubSection("/settings/data-hub/diagnostics/operations")?.key, "diagnostics");
  assert.equal(resolveDataHubSection("/settings/data-hub/unknown"), null);
});

test("Data Hub operation routes retain management metadata under their parent sections", () => {
  for (const path of [
    "/settings/data-hub/sources/operations",
    "/settings/data-hub/diagnostics/operations"
  ]) {
    assert.equal(routeMetaMap.get(path)?.group, "management");
  }
});

test("Data Hub section navigation filters sections hidden by management visibility", () => {
  const hiddenPaths = new Set([
    "/settings/data-hub/sources",
    "/settings/data-hub/diagnostics"
  ]);

  assert.deepEqual(
    filterVisibleDataHubSections(DATA_HUB_SECTIONS, (path) => hiddenPaths.has(path)).map(({ key }) => key),
    ["connections", "metrics", "derived", "usage", "external"]
  );
});

test("management scope accepts all as a view filter without widening stored MetricScope", () => {
  const scopes: DataHubManagementScope[] = ["cl", "kn", "global", "all"];

  assert.deepEqual(scopes.filter(isDataHubManagementScope), scopes);
  assert.equal(isMetricScope("all"), false);
  assert.equal(isMetricScope("global"), true);
});
