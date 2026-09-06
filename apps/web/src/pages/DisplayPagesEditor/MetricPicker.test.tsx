import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MetricPicker } from "./MetricPicker";

test("U4-R5 picker shows name, scope, kind, unit and incompatible reason", () => {
  const html = renderToStaticMarkup(
    <MetricPicker
      onChange={() => undefined}
      options={[
        {
          compatible: true,
          labelZh: "觀音月用量",
          measurementKind: "cumulative-energy",
          metricKey: "period.month.consumption",
          scope: "kn",
          unit: "kWh",
          coverage: "缺少期初基準",
          latestValue: "18300"
        },
        {
          compatible: false,
          incompatibleReason: "來源尚未進入可用目錄，不能當成已儲存綁定。",
          labelZh: "未入目錄",
          metricKey: "raw.register",
          scope: "kn"
        }
      ]}
      selected="period.month.consumption"
    />
  );
  assert.match(html, /data-metric-picker/);
  assert.match(html, /觀音月用量/);
  assert.match(html, /kn/);
  assert.match(html, /cumulative-energy/);
  assert.match(html, /kWh/);
  assert.match(html, /缺少期初基準/);
  assert.match(html, /尚未進入可用目錄/);
});
