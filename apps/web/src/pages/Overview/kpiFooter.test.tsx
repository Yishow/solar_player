import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { OverviewKpiFooter } from "./OverviewKpiFooter";

test("overview KPI footer renders progress target and completion percentage", () => {
    const markup = renderToStaticMarkup(
        <OverviewKpiFooter
            footer={{ footerType: "progress", targetValue: 5000 }}
            metric={{ unit: "kWh", value: "2,340" }}
        />
    );

    assert.match(markup, /47%/);
    assert.match(markup, /目標 5,000 kWh/);
});

test("overview KPI footer renders configured text and ecological tree equivalents", () => {
    const textMarkup = renderToStaticMarkup(
        <OverviewKpiFooter
            footer={{ footerText: "自建置起 2022 \/ 01 至今", footerType: "text" }}
            metric={{ unit: "GWh", value: "71" }}
        />
    );
    const treeMarkup = renderToStaticMarkup(
        <OverviewKpiFooter
            footer={{ footerType: "co2-tree" }}
            metric={{ unit: "t", value: "12.4" }}
        />
    );

    assert.match(textMarkup, /自建置起 2022 \/ 01 至今/);
    assert.match(treeMarkup, /相當於種植 32 棵樹/);
});

test("overview KPI footer preserves sparkline mode and supports none mode", () => {
    const sparklineMarkup = renderToStaticMarkup(
        <OverviewKpiFooter
            footer={{ footerType: "sparkline" }}
            metric={{ trendSeries: [46, 52, 61, 68], unit: "kW", value: "68" }}
        />
    );
    const noneMarkup = renderToStaticMarkup(
        <OverviewKpiFooter
            footer={{ footerType: "none" }}
            metric={{ trendSeries: [46, 52, 61, 68], unit: "kW", value: "68" }}
        />
    );

    assert.match(sparklineMarkup, /overview-kpi-sparkline/);
    assert.equal(noneMarkup, "");
});