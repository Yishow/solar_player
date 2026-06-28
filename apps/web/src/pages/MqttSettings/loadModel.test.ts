import assert from "node:assert/strict";
import test from "node:test";

import { mergePolledTopicMappings } from "./loadModel";
import type { TopicMapping } from "./viewModel";

function buildTopicMapping(overrides: Partial<TopicMapping> = {}): TopicMapping {
  return {
    enabled: true,
    id: 1,
    lastReceivedAt: "2026-06-26T07:00:00.000Z",
    lastValue: 100,
    metricKey: "realTimePower",
    nameZh: null,
    nameEn: null,
    quality: "good",
    rawPayload: '{"value":100}',
    topic: "kuozui/plant/solar/power",
    unit: "kW",
    updatedAt: "2026-06-26T06:30:00.000Z",
    valuePath: "$.value",
    ...overrides
  };
}

test("mergePolledTopicMappings preserves a locally edited custom name as a draft", () => {
  const synced = buildTopicMapping();
  const currentDraft = buildTopicMapping({ nameZh: "一號廠輸出", nameEn: "Plant A Output" });
  const polled = buildTopicMapping({
    lastReceivedAt: "2026-06-26T07:05:00.000Z",
    lastValue: 123.4
  });

  const merged = mergePolledTopicMappings([currentDraft], [synced], [polled]);

  assert.equal(merged[0]?.nameZh, "一號廠輸出");
  assert.equal(merged[0]?.nameEn, "Plant A Output");
  // Runtime fields still refresh from the polled snapshot.
  assert.equal(merged[0]?.lastValue, 123.4);
});

test("mergePolledTopicMappings preserves local editable topic drafts while refreshing runtime fields", () => {
  const synced = buildTopicMapping();
  const currentDraft = buildTopicMapping({
    enabled: false,
    topic: "kuozui/plant/solar/custom-power",
    unit: "W",
    valuePath: "$.custom.value"
  });
  const polled = buildTopicMapping({
    lastReceivedAt: "2026-06-26T07:05:00.000Z",
    lastValue: 123.4,
    quality: "fresh",
    rawPayload: '{"value":123.4}',
    topic: "kuozui/plant/solar/power",
    unit: "kW",
    updatedAt: "2026-06-26T06:45:00.000Z"
  });

  assert.deepEqual(mergePolledTopicMappings([currentDraft], [synced], [polled]), [
    {
      ...polled,
      enabled: false,
      metricKey: "realTimePower",
      topic: "kuozui/plant/solar/custom-power",
      unit: "W",
      valuePath: "$.custom.value"
    }
  ]);
});

test("mergePolledTopicMappings adopts polled topics when there is no local editable draft", () => {
  const synced = buildTopicMapping();
  const polled = buildTopicMapping({
    lastReceivedAt: "2026-06-26T07:05:00.000Z",
    lastValue: 123.4,
    quality: "fresh",
    rawPayload: '{"value":123.4}'
  });

  assert.deepEqual(mergePolledTopicMappings([synced], [synced], [polled]), [polled]);
});

test("mergePolledTopicMappings preserves local drafts and appends new polled topics", () => {
  const synced = buildTopicMapping();
  const currentDraft = buildTopicMapping({
    enabled: false,
    topic: "kuozui/plant/solar/custom-power"
  });
  const refreshedDraftTopic = buildTopicMapping({
    lastReceivedAt: "2026-06-26T07:05:00.000Z",
    lastValue: 123.4,
    quality: "fresh",
    rawPayload: '{"value":123.4}',
    updatedAt: "2026-06-26T06:45:00.000Z"
  });
  const newPolledTopic = buildTopicMapping({
    id: 2,
    lastReceivedAt: "2026-06-26T07:06:00.000Z",
    lastValue: 88.6,
    metricKey: "gridPower",
    quality: "fresh",
    rawPayload: '{"value":88.6}',
    topic: "kuozui/grid/power",
    unit: "kW",
    updatedAt: "2026-06-26T06:46:00.000Z"
  });

  assert.deepEqual(
    mergePolledTopicMappings([currentDraft], [synced], [refreshedDraftTopic, newPolledTopic]),
    [
      {
        ...refreshedDraftTopic,
        enabled: false,
        metricKey: "realTimePower",
        topic: "kuozui/plant/solar/custom-power",
        unit: "kW",
        valuePath: "$.value"
      },
      newPolledTopic
    ]
  );
});

test("mergePolledTopicMappings drops remotely deleted synced topics while preserving other local drafts", () => {
  const syncedDraftTopic = buildTopicMapping();
  const syncedDeletedTopic = buildTopicMapping({
    id: 2,
    metricKey: "gridPower",
    topic: "kuozui/grid/power"
  });
  const currentDraft = buildTopicMapping({
    enabled: false,
    topic: "kuozui/plant/solar/custom-power"
  });
  const currentDeletedTopic = buildTopicMapping({
    id: 2,
    metricKey: "gridPower",
    topic: "kuozui/grid/power"
  });
  const refreshedDraftTopic = buildTopicMapping({
    lastReceivedAt: "2026-06-26T07:05:00.000Z",
    lastValue: 123.4,
    quality: "fresh",
    rawPayload: '{"value":123.4}',
    updatedAt: "2026-06-26T06:45:00.000Z"
  });

  assert.deepEqual(
    mergePolledTopicMappings(
      [currentDraft, currentDeletedTopic],
      [syncedDraftTopic, syncedDeletedTopic],
      [refreshedDraftTopic]
    ),
    [
      {
        ...refreshedDraftTopic,
        enabled: false,
        metricKey: "realTimePower",
        topic: "kuozui/plant/solar/custom-power",
        unit: "kW",
        valuePath: "$.value"
      }
    ]
  );
});

test("mergePolledTopicMappings only preserves editable fields for the rows that are actually dirty", () => {
  const syncedDraftTopic = buildTopicMapping();
  const syncedCleanTopic = buildTopicMapping({
    id: 2,
    metricKey: "gridPower",
    topic: "kuozui/grid/power",
    unit: "kW"
  });
  const currentDraftTopic = buildTopicMapping({
    enabled: false,
    topic: "kuozui/plant/solar/custom-power"
  });
  const currentCleanTopic = buildTopicMapping({
    id: 2,
    metricKey: "gridPower",
    topic: "kuozui/grid/power",
    unit: "kW"
  });
  const refreshedDraftTopic = buildTopicMapping({
    lastReceivedAt: "2026-06-26T07:05:00.000Z",
    lastValue: 123.4,
    quality: "fresh",
    rawPayload: '{"value":123.4}',
    updatedAt: "2026-06-26T06:45:00.000Z"
  });
  const refreshedCleanTopic = buildTopicMapping({
    id: 2,
    lastReceivedAt: "2026-06-26T07:06:00.000Z",
    lastValue: 88.6,
    metricKey: "gridPowerUpdated",
    quality: "fresh",
    rawPayload: '{"value":88.6}',
    topic: "kuozui/grid/power/updated",
    unit: "MW",
    updatedAt: "2026-06-26T06:46:00.000Z",
    valuePath: "$.reading"
  });

  assert.deepEqual(
    mergePolledTopicMappings(
      [currentDraftTopic, currentCleanTopic],
      [syncedDraftTopic, syncedCleanTopic],
      [refreshedDraftTopic, refreshedCleanTopic]
    ),
    [
      {
        ...refreshedDraftTopic,
        enabled: false,
        metricKey: "realTimePower",
        topic: "kuozui/plant/solar/custom-power",
        unit: "kW",
        valuePath: "$.value"
      },
      refreshedCleanTopic
    ]
  );
});
