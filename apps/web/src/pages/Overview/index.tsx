import { ReferenceGlyph } from "../../components/ReferenceGlyph";
import { Sparkline } from "../../components/Sparkline";
import { StatusBadge } from "../../components/StatusBadge";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import { trendSeries } from "../../mocks/metrics";
import { overviewAssetRuntimeMap } from "./assets";
import {
  overviewGoldLineLayout,
  overviewHeroLayout,
  overviewKpiLayout,
  overviewLeafLayout,
  overviewSummaryLayout,
  overviewTitleLayout
} from "./layout";
import "./overview.css";
import { buildOverviewViewModel } from "./viewModel";

const CONTENT_TOP_OFFSET = 146;

const overviewCardOrder = [
  {
    englishLabel: "Real-time Power",
    key: "power"
  },
  {
    englishLabel: "Today's Generation",
    key: "today"
  },
  {
    englishLabel: "Total Generation",
    key: "total"
  },
  {
    englishLabel: "Today's CO2 Reduction",
    key: "co2Today"
  },
  {
    englishLabel: "Total CO2 Reduction",
    key: "co2Total"
  }
] as const;

function withContentOffset<T extends { top: number }>(layout: T) {
  return {
    ...layout,
    top: layout.top - CONTENT_TOP_OFFSET
  };
}

export function Overview() {
  const { connectionState, isSocketConnected, snapshot } = useLiveMetrics();
  const viewModel = buildOverviewViewModel({
    connectionState,
    isSocketConnected,
    snapshot
  });

  const titleLayout = withContentOffset(overviewTitleLayout);
  const heroLayout = withContentOffset(overviewHeroLayout);
  const leafLayout = withContentOffset(overviewLeafLayout);
  const goldLineLayout = withContentOffset(overviewGoldLineLayout);
  const summaryLayout = withContentOffset(overviewSummaryLayout);

  return (
    <section className="overview-display-page">
      <div
        className="overview-leaf-watermark"
        style={{
          height: `${leafLayout.height}px`,
          left: `${leafLayout.left}px`,
          top: `${leafLayout.top}px`,
          width: `${leafLayout.width}px`
        }}
      />

      <div
        className="overview-gold-line"
        style={{
          left: `${goldLineLayout.left}px`,
          top: `${goldLineLayout.top}px`,
          width: `${goldLineLayout.width}px`
        }}
      />

      <section
        className="overview-title-group"
        style={{
          left: `${titleLayout.left}px`,
          top: `${titleLayout.top}px`,
          width: `${titleLayout.width}px`
        }}
      >
        <p className="overview-eyebrow">{viewModel.hero.eyebrow}</p>
        <h2 className="overview-display-title">
          以<em>綠色</em>製造
          <br />
          驅動美好生活
        </h2>
        <p className="overview-hero-subtitle">{viewModel.hero.subtitle}</p>
      </section>

      <figure
        className="overview-hero-banner"
        style={{
          height: `${heroLayout.height}px`,
          left: `${heroLayout.left}px`,
          top: `${heroLayout.top}px`,
          width: `${heroLayout.width}px`
        }}
      >
        <img alt="國瑞汽車中廠綠能展示場域" src={overviewAssetRuntimeMap.hero} />
      </figure>

      <section
        className="overview-summary"
        style={{
          left: `${summaryLayout.left}px`,
          top: `${summaryLayout.top}px`,
          width: `${summaryLayout.width}px`
        }}
      >
        <StatusBadge density="playback" status={viewModel.summary.status} label={viewModel.summary.statusLabel} />
        <p>聚焦即時功率、日發電量、自發自用與減碳成果，作為播放首頁的第一層敘事。</p>
      </section>

      {overviewCardOrder.map((cardItem, index) => {
        const metric = viewModel.metrics[index]!;
        const layout = withContentOffset(overviewKpiLayout[cardItem.key]);

        return (
          <article
            key={metric.label}
            className={[
              "overview-kpi-card",
              cardItem.key === "co2Today" ? "overview-kpi-card-highlight" : ""
            ].join(" ")}
            style={{
              height: `${layout.height}px`,
              left: `${layout.left}px`,
              top: `${layout.top}px`,
              width: `${layout.width}px`
            }}
          >
            <div className="overview-kpi-head">
              <div
                className={[
                  "overview-kpi-icon-shell",
                  metric.iconKey === "sun" ? "overview-kpi-icon-accent" : ""
                ].join(" ")}
              >
                <ReferenceGlyph className="overview-kpi-icon" name={metric.iconKey} />
              </div>
              <div>
                <h3>{metric.label}</h3>
                <p>{cardItem.englishLabel}</p>
              </div>
            </div>
            <div className="overview-kpi-value-row">
              <span className="overview-kpi-value">{metric.value}</span>
              <span className="overview-kpi-unit">{metric.unit}</span>
            </div>
            <Sparkline className="overview-kpi-sparkline" values={trendSeries} />
            <p className="overview-kpi-helper">{metric.helper}</p>
          </article>
        );
      })}
    </section>
  );
}
