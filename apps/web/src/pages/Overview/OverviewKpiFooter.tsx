import { Sparkline } from "../../components/Sparkline";
import { DisplayCardFooter } from "../../components/displayPageCards";
import type { OverviewKpiCardConfig } from "./displayPageConfig";

const co2TreeEquivalentFactor = 2.6;

type OverviewKpiFooterMetric = {
    trendSeries?: number[];
    unit: string;
    value: string;
};

function parseMetricNumber(value: string) {
    const parsed = Number(value.replaceAll(",", "").trim());
    return Number.isFinite(parsed) ? parsed : null;
}

function formatWholeNumber(value: number) {
    return Math.round(value).toLocaleString("zh-TW");
}

export function OverviewKpiFooter({
    footer,
    metric
}: {
    footer: Pick<OverviewKpiCardConfig, "footerText" | "footerType" | "targetValue">;
    metric: OverviewKpiFooterMetric;
}) {
    switch (footer.footerType) {
        case "none":
            return null;
        case "text":
            return footer.footerText ? (
                <DisplayCardFooter className="overview-kpi-footer overview-kpi-footer-note">
                    <span className="overview-kpi-footer-note-text">{footer.footerText}</span>
                </DisplayCardFooter>
            ) : null;
        case "co2-tree": {
            const metricNumber = parseMetricNumber(metric.value);
            const treeEquivalent = metricNumber === null ? null : Math.max(0, Math.round(metricNumber * co2TreeEquivalentFactor));

            return (
                <DisplayCardFooter className="overview-kpi-footer overview-kpi-footer-tree">
                    <span aria-hidden="true" className="overview-kpi-footer-tree-dot" />
                    <span className="overview-kpi-footer-tree-text">
                        相當於種植 {treeEquivalent === null ? "--" : treeEquivalent.toLocaleString("zh-TW")} 棵樹
                    </span>
                </DisplayCardFooter>
            );
        }
        case "progress": {
            const metricNumber = parseMetricNumber(metric.value);
            const targetValue = typeof footer.targetValue === "number" && footer.targetValue > 0
                ? footer.targetValue
                : null;
            const progressRatio = metricNumber !== null && targetValue !== null
                ? Math.max(0, Math.min(metricNumber / targetValue, 1))
                : 0;
            const progressPercent = `${Math.round(progressRatio * 100)}%`;

            return (
                <DisplayCardFooter className="overview-kpi-footer overview-kpi-footer-progress">
                    <div className="overview-kpi-progress-header">
                        <span className="overview-kpi-progress-percent">{progressPercent}</span>
                        <span className="overview-kpi-progress-target">
                            目標 {targetValue === null ? "--" : formatWholeNumber(targetValue)} {metric.unit}
                        </span>
                    </div>
                    <div aria-hidden="true" className="overview-kpi-progress-track">
                        <span
                            className="overview-kpi-progress-bar"
                            style={{ width: `${Math.round(progressRatio * 100)}%` }}
                        />
                    </div>
                </DisplayCardFooter>
            );
        }
        case "sparkline":
        default:
            return metric.trendSeries && metric.trendSeries.length > 0 ? (
                <DisplayCardFooter className="overview-kpi-footer overview-kpi-footer-sparkline">
                    <Sparkline className="overview-kpi-sparkline" values={metric.trendSeries} />
                </DisplayCardFooter>
            ) : null;
    }
}