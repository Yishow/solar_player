import { useMemo } from "react";
import { ReferenceGlyph } from "../../components/ReferenceGlyph";
import { Sparkline } from "../../components/Sparkline";
import { useBodyClass } from "../../hooks/useBodyClass";
import { useDisplayPageConfig } from "../../hooks/useDisplayPageConfig";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import { trendSeries } from "../../mocks/metrics";
import { overviewAssetRuntimeMap } from "./assets";
import {
  createOverviewDisplayPageSeedConfig,
  type OverviewDisplayPageConfig
} from "./displayPageConfig";
import {
  overviewGoldLineLayout,
  overviewLeafLayout
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

export function Overview({ config }: { config?: OverviewDisplayPageConfig }) {
  useBodyClass("page-hero-shell");
  const { connectionState, isSocketConnected, snapshot } = useLiveMetrics();
  const seedConfig = useMemo(
    () => createOverviewDisplayPageSeedConfig(overviewAssetRuntimeMap.hero),
    []
  );
  const runtimeConfig = useDisplayPageConfig("overview", seedConfig, {
    enabled: config === undefined,
    stage: "live"
  });
  const viewModel = buildOverviewViewModel({
    connectionState,
    isSocketConnected,
    snapshot
  });
  const resolvedConfig = config ?? runtimeConfig.config;

  const titleLayout = withContentOffset(resolvedConfig.heroCopyLayout);
  const heroLayout = withContentOffset(resolvedConfig.heroContainer);
  const leafLayout = withContentOffset(overviewLeafLayout);
  const goldLineLayout = withContentOffset(overviewGoldLineLayout);

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
        <p className="overview-eyebrow">{resolvedConfig.heroCopy.eyebrow}</p>
        <h2 className="overview-display-title">
          {resolvedConfig.heroCopy.titleLines[0]}
          <br />
          {resolvedConfig.heroCopy.titleLines[1]}
        </h2>
        <p className="overview-hero-subtitle">
          {resolvedConfig.heroCopy.subtitleLines[0]}
          <br />
          {resolvedConfig.heroCopy.subtitleLines[1]}
        </p>
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
        <img alt={resolvedConfig.heroMedia.alt} src={resolvedConfig.heroMedia.src} />
      </figure>

      {overviewCardOrder.map((cardItem, index) => {
        const metric = viewModel.metrics[index]!;
        const layout = withContentOffset(resolvedConfig.kpiCards[cardItem.key]);

        return (
          <article
            key={metric.label}
            className="overview-kpi-card"
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
                  metric.accentColor ? "overview-kpi-icon-accent" : ""
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
          </article>
        );
      })}
    </section>
  );
}
