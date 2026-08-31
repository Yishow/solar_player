import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DataHubUsageContent } from "./Usage";
import {
  buildMetricUsageDiagnosticsHref,
  buildMetricUsageDisplayEditorHref
} from "./links";
import type { DataHubUsageModel } from "./UsageModel";

const model: DataHubUsageModel = {
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
      labelEn: "Overview",
      labelZh: null,
      metricKey: "realTimePower",
      pageId: "overview",
      pageInstanceId: 10,
      pageKey: "overview",
      pageLabelEn: "Overview",
      pageLabelZh: null,
      scopeLabel: "inherited",
      templateKey: "overview"
    },
    {
      configuredBindingScope: "inherit-device",
      configuredScope: "inherit-device",
      consumerId: "widget:overview-copy.overviewPower",
      consumerType: "widget",
      inherited: true,
      itemId: "overviewPower",
      labelEn: "Overview copy",
      labelZh: null,
      metricKey: "realTimePower",
      pageId: "overview-copy",
      pageInstanceId: 11,
      pageKey: "overview-copy",
      pageLabelEn: "Overview copy",
      pageLabelZh: null,
      scopeLabel: "inherited",
      templateKey: "overview"
    }
  ]
};

test("Usage renders same-metric consumers as distinct page instances and inherited bindings", () => {
  const html = renderToStaticMarkup(<DataHubUsageContent model={model} />);

  assert.equal((html.match(/data-usage-row=/g) ?? []).length, 2);
  assert.match(html, /data-usage-page-instance="10"/);
  assert.match(html, /data-usage-page-instance="11"/);
  assert.match(html, /Overview copy/);
  assert.match(html, /overviewPower/);
  assert.match(html, /widget:overview\.overviewPower/);
  assert.match(html, /data-usage-consumer-type="widget">widget</);
  assert.match(html, /Inherited/);
  assert.match(html, /data-usage-scope="inherit-device"/);
  assert.doesNotMatch(html, />CL</);
  assert.doesNotMatch(html, />KN</);
});

test("Usage keeps empty and error feedback local to the section", () => {
  const empty = renderToStaticMarkup(<DataHubUsageContent model={{ ...model, usage: [] }} />);
  const error = renderToStaticMarkup(<DataHubUsageContent errorMessage="Usage failed" model={null} />);

  assert.match(empty, /role="status"/);
  assert.match(empty, /沒有 metric consumers/);
  assert.match(error, /role="alert"/);
  assert.match(error, /Usage failed/);
});

test("Usage consumer actions keep editor links widget-only and diagnostics scope-safe", () => {
  const widget = model.usage[0]!;
  const registered = {
    ...widget,
    configuredBindingScope: null,
    configuredScope: null,
    consumerId: "story:overview-readiness",
    consumerType: "readiness" as const,
    inherited: false,
    itemId: null,
    pageId: "overview",
    pageInstanceId: null,
    scopeLabel: "registered"
  };

  assert.equal(
    buildMetricUsageDisplayEditorHref(widget),
    "/display-pages/editor?page=overview&item=overviewPower&tab=data"
  );
  assert.equal(buildMetricUsageDisplayEditorHref(registered), null);
  assert.equal(
    buildMetricUsageDiagnosticsHref(widget, model.scope),
    "/settings/data-hub/diagnostics?metricKey=realTimePower"
  );
  assert.equal(
    buildMetricUsageDiagnosticsHref({ ...widget, configuredScope: "kn", inherited: false }, model.scope),
    "/settings/data-hub/diagnostics?metricKey=realTimePower&scope=kn"
  );
  assert.equal(
    buildMetricUsageDiagnosticsHref(registered, model.scope),
    "/settings/data-hub/diagnostics?metricKey=realTimePower"
  );

  const html = renderToStaticMarkup(<DataHubUsageContent model={{ ...model, usage: [widget, registered] }} />);
  assert.match(html, /data-usage-action="display-editor" href="\/display-pages\/editor\?page=overview&amp;item=overviewPower&amp;tab=data"/);
  assert.equal((html.match(/data-usage-action="display-editor"/g) ?? []).length, 1);
  assert.match(html, /data-usage-action="diagnostics" href="\/settings\/data-hub\/diagnostics\?metricKey=realTimePower"/);
  assert.doesNotMatch(html, /story:overview-readiness[\s\S]*?data-usage-action="display-editor"/);
});
