import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createOverviewDisplayPageSeedConfig,
  shouldRenderOverviewDashboardWidget
} from "../displayPageConfig";
import { AlertNotificationsWidget } from "./AlertNotificationsWidget";
import { GenerationTrendWidget } from "./GenerationTrendWidget";

test("GenerationTrendWidget renders runtime trend series without mock values", () => {
  const markup = renderToStaticMarkup(
    <GenerationTrendWidget series={[82, 95, 101, 108]} />
  );

  assert.match(markup, /發電趨勢/);
  assert.match(markup, /82 kW/);
  assert.match(markup, /108 kW/);
  assert.match(markup, /overview-widget-trend-sparkline/);
  assert.doesNotMatch(markup, /586/);
});

test("GenerationTrendWidget renders an empty state when no runtime trend exists", () => {
  const markup = renderToStaticMarkup(<GenerationTrendWidget series={[]} />);

  assert.match(markup, /尚無發電趨勢資料/);
  assert.doesNotMatch(markup, /overview-widget-trend-sparkline/);
});

test("AlertNotificationsWidget renders runtime alerts without mock content", () => {
  const markup = renderToStaticMarkup(
    <AlertNotificationsWidget
      alerts={[
        {
          detail: "共享故事缺少今日發電量",
          id: "metric-todayGeneration",
          title: "故事版今日發電量",
          tone: "warning"
        },
        {
          detail: "尚未綁定即時發電功率 MQTT topic",
          id: "readiness-realTimePower",
          title: "即時發電功率",
          tone: "danger"
        }
      ]}
    />
  );

  assert.match(markup, /警示通知/);
  assert.match(markup, /故事版今日發電量/);
  assert.match(markup, /尚未綁定即時發電功率 MQTT topic/);
  assert.doesNotMatch(markup, /Mock Alert/);
});

test("AlertNotificationsWidget renders an empty state when there are no alerts", () => {
  const markup = renderToStaticMarkup(<AlertNotificationsWidget alerts={[]} />);

  assert.match(markup, /無警示/);
});

test("Overview bottom density row exposes four widgets visible by default for the Better rhythm", () => {
  const seed = createOverviewDisplayPageSeedConfig();
  const { visible: _visible, ...legacyAlert } = seed.dashboardWidgets.alertNotifications;

  assert.equal(seed.dashboardWidgets.weather.visible, true);
  assert.equal(seed.dashboardWidgets.phasePower.visible, true);
  assert.equal(seed.dashboardWidgets.generationTrend.visible, true);
  assert.equal(seed.dashboardWidgets.alertNotifications.visible, true);
  for (const key of ["weather", "phasePower", "generationTrend", "alertNotifications"] as const) {
    assert.equal(shouldRenderOverviewDashboardWidget(seed.dashboardWidgets[key]), true);
  }
  // Density widgets without an explicit visible flag remain hidden until upgraded.
  assert.equal(shouldRenderOverviewDashboardWidget({ ...legacyAlert }), false);
});
