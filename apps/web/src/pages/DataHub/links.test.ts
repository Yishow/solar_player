import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDataHubDiagnosticsHref,
  buildDataHubUsageHref,
  buildDisplayEditorDataHref,
  buildMetricUsageDiagnosticsHref,
  buildMetricUsageDisplayEditorHref,
  resolveMetricUsageDiagnosticsScope
} from "./links";
import type { MetricUsageRow } from "./UsageModel";

function usageRow(overrides: Partial<MetricUsageRow> = {}): MetricUsageRow {
  return {
    configuredBindingScope: "inherit-device",
    configuredScope: "inherit-device",
    consumerId: "widget:overview.overviewPower",
    consumerType: "widget",
    inherited: true,
    itemId: "overviewPower",
    labelEn: "Overview",
    labelZh: null,
    metricKey: "realTimePower",
    pageId: "overview",
    pageInstanceId: 10,
    pageKey: "overview",
    pageLabelEn: "Overview",
    pageLabelZh: null,
    scopeLabel: "inherited",
    templateKey: "overview",
    ...overrides
  };
}

test("Data Hub link builders encode metric, scope, page, and item values", () => {
  assert.equal(
    buildDataHubUsageHref("metric/with space+sign", "kn"),
    "/settings/data-hub/usage?metricKey=metric%2Fwith%20space%2Bsign&scope=kn"
  );
  assert.equal(
    buildDataHubDiagnosticsHref("metric/with space+sign", "global"),
    "/settings/data-hub/diagnostics?metricKey=metric%2Fwith%20space%2Bsign&scope=global"
  );
  assert.equal(
    buildDisplayEditorDataHref("page/one", "item two"),
    "/display-pages/editor?page=page%2Fone&item=item%20two&tab=data"
  );
});

test("diagnostics links keep concrete configured scope and safely omit unresolved scope", () => {
  assert.equal(resolveMetricUsageDiagnosticsScope(usageRow({ configuredScope: "kn", inherited: false }), "all"), "kn");
  assert.equal(resolveMetricUsageDiagnosticsScope(usageRow({ configuredScope: "inherit-device", inherited: true }), "cl"), "cl");
  assert.equal(resolveMetricUsageDiagnosticsScope(usageRow({ configuredScope: "inherit-device", inherited: true }), "all"), null);
  assert.equal(resolveMetricUsageDiagnosticsScope(usageRow({ configuredScope: null, configuredBindingScope: null, inherited: false, scopeLabel: "registered" }), "cl"), null);
  assert.equal(
    buildMetricUsageDiagnosticsHref(usageRow({ configuredScope: "inherit-device", inherited: true }), "all"),
    "/settings/data-hub/diagnostics?metricKey=realTimePower"
  );
});

test("editor deep links are limited to widget consumers with a concrete item and page", () => {
  assert.equal(
    buildMetricUsageDisplayEditorHref(usageRow()),
    "/display-pages/editor?page=overview&item=overviewPower&tab=data"
  );
  assert.equal(buildMetricUsageDisplayEditorHref(usageRow({ consumerType: "story", itemId: "story-1" })), null);
  assert.equal(buildMetricUsageDisplayEditorHref(usageRow({ consumerType: "readiness", itemId: "ready-1" })), null);
  assert.equal(buildMetricUsageDisplayEditorHref(usageRow({ itemId: null })), null);
  assert.equal(buildMetricUsageDisplayEditorHref(usageRow({ pageId: "" })), null);
});
