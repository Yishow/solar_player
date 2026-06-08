import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TopicWorkspaceRow } from "./TopicWorkspaceRow";
import type { TopicWorkspaceRowModel } from "./TopicWorkspaceRow";

const baseMockTopic: TopicWorkspaceRowModel = {
  id: 42,
  metricKey: "realTimePower",
  topic: "kuozui/plant/solar/power",
  unit: "kW",
  valuePath: "$.power",
  enabled: true,
  updatedAt: "2026-05-23T09:28:00.000Z",
  lastReceivedAt: "2026-05-23T09:29:00.000Z",
  lastValue: 588.8,
  quality: "good",
  rawPayload: '{"power": 588.8}',
  enabledLabel: "ON",
  lastReceivedLabel: "2026/5/23 17:29:00",
  lastUpdatedLabel: "2026/5/23 17:28:00",
  metricIcon: "bolt",
  metricLabelEn: "Real-time Power",
  metricLabelZh: "即時發電功率",
  coverageDetail: null,
  coverageStateLabel: null,
  qualityLabel: "Quality: good",
  runtimeLabel: "Live Stream",
  runtimeTone: "connected",
  valueLabel: "588.8"
};

test("TopicWorkspaceRow renders correctly with metrics, fields, and values", () => {
  const html = renderToStaticMarkup(
    React.createElement(TopicWorkspaceRow, {
      topic: baseMockTopic,
      handleTopicChange: () => undefined,
      removeTopicMapping: () => undefined
    })
  );

  // 驗證核心類別與屬性標籤
  assert.match(html, /class="[^"]*topic-workspace-row[^"]*"/);
  assert.match(html, /即時發電功率/);
  assert.match(html, /Real-time Power/);
  assert.match(html, /value="kuozui\/plant\/solar\/power"/);
  assert.match(html, /value="kW"/);
  assert.match(html, /588.8/);
  assert.match(html, /啟用 \(ON\)/);
  assert.match(html, /最後收值 2026\/5\/23 17:29:00/);
  assert.match(html, /最後更新 2026\/5\/23 17:28:00/);
  assert.match(html, /Quality: good/);
});

test("TopicWorkspaceRow renders coverage information when present", () => {
  const topicWithCoverage: TopicWorkspaceRowModel = {
    ...baseMockTopic,
    coverageStateLabel: "Ready",
    coverageDetail: "Fully mapped to active widgets"
  };

  const html = renderToStaticMarkup(
    React.createElement(TopicWorkspaceRow, {
      topic: topicWithCoverage,
      handleTopicChange: () => undefined,
      removeTopicMapping: () => undefined
    })
  );

  assert.match(html, /class="[^"]*coverage[^"]*"/);
  assert.match(html, /Ready · Fully mapped to active widgets/);
});
