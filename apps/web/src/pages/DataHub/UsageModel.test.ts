import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMetricUsagePath,
  normalizeMetricUsage,
  type MetricUsageResponse
} from "./UsageModel";

const response: MetricUsageResponse = {
  generatedAt: "2026-08-31T03:00:00.000Z",
  scope: "all",
  usage: [
    {
      configuredBindingScope: "inherit-device",
      configuredScope: "inherit-device",
      consumerId: "widget:overview.overviewPower",
      consumerType: "widget",
      inherited: true,
      itemId: "overviewPower",
      labelEn: "Overview copy",
      labelZh: "總覽副本",
      metricKey: "realTimePower",
      pageId: "overview-copy",
      pageInstanceId: 21,
      pageKey: "overview-copy",
      pageLabelEn: "Overview copy",
      pageLabelZh: "總覽副本",
      scopeLabel: "inherited",
      templateKey: "overview"
    }
  ]
};

test("Usage query preserves all as a read filter and encodes metric keys", () => {
  assert.equal(
    buildMetricUsagePath("https://display.local/settings/data-hub/usage?scope=all"),
    "/api/data-hub/usage?metricKey=&scope=all"
  );
  assert.equal(
    buildMetricUsagePath("https://display.local/settings/data-hub/usage?scope=cl&metricKey=power%2Ftotal%20%26%20ready"),
    "/api/data-hub/usage?metricKey=power%2Ftotal%20%26%20ready&scope=cl"
  );
  assert.equal(
    buildMetricUsagePath("https://display.local/settings/data-hub/usage?scope=unknown&metricKey=realTimePower"),
    "/api/data-hub/usage?metricKey=realTimePower&scope=all"
  );
});

test("Usage normalizer keeps semantic consumer identities and inherited scope", () => {
  const model = normalizeMetricUsage(response);

  assert.deepEqual(model.usage.map(({ pageInstanceId, pageKey, itemId, consumerId }) => ({
    consumerId,
    itemId,
    pageInstanceId,
    pageKey
  })), [
    {
      consumerId: "widget:overview.overviewPower",
      itemId: "overviewPower",
      pageInstanceId: 21,
      pageKey: "overview-copy"
    }
  ]);
  assert.equal(model.usage[0]?.configuredScope, "inherit-device");
  assert.equal(model.usage[0]?.inherited, true);
  assert.equal(model.usage[0]?.scopeLabel, "inherited");
});
