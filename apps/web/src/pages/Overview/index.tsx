import { useMemo } from "react";
import { renderDisplayPageIcon } from "../../components/displayPageIconResolver";
import { Sparkline } from "../../components/Sparkline";
import {
  DisplayCardFooter,
  DisplayCardFrame,
  DisplayCardHeader,
  DisplayCardValueRow
} from "../../components/displayPageCards";
import { useBodyClass } from "../../hooks/useBodyClass";
import {
  shouldDeferDisplayPageRuntimeRender,
  useDisplayPageConfig
} from "../../hooks/useDisplayPageConfig";
import { useDisplayStoryRuntime } from "../../hooks/useDisplayStoryRuntime";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import { trendSeries } from "../../mocks/metrics";
import { resolveDisplayPageMediaSource } from "@solar-display/shared";
import { buildDisplayPageMediaStyle } from "../displayPageMediaStyle";
import {
  resolveRuntimeFallbackBannerState,
  RuntimeConfigFallbackBanner
} from "../runtimeConfigHydration";
import { overviewAssetRuntimeMap } from "./assets";
import {
  createOverviewDisplayPageSeedConfig,
  type OverviewDisplayPageConfig
} from "./displayPageConfig";
import {
  overviewGoldLineLayout,
  overviewLeafLayout
} from "./layout";
import "../../components/displayPageCards.css";
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
  const runtimeHydrationEnabled = config === undefined;
  const runtimeStage = "live" as const;
  const seedConfig = useMemo(
    () => createOverviewDisplayPageSeedConfig(overviewAssetRuntimeMap.hero),
    []
  );
  const runtimeConfig = useDisplayPageConfig("overview", seedConfig, {
    enabled: runtimeHydrationEnabled,
    stage: runtimeStage
  });
  const storyRuntime = useDisplayStoryRuntime("overview", {
    enabled: runtimeHydrationEnabled
  });

  if (
    shouldDeferDisplayPageRuntimeRender({
      runtimeHydrationEnabled,
      isLoading: runtimeConfig.isLoading,
      lastLoadedEnvelope: runtimeConfig.lastLoadedEnvelope,
      stage: runtimeStage
    })
  ) {
    return null;
  }

  const resolvedConfig = config ?? runtimeConfig.config;
  const viewModel = buildOverviewViewModel({
    connectionState,
    isSocketConnected,
    snapshot,
    storyOverview: storyRuntime.payload ?? undefined
  });
  const runtimeFallbackBanner = resolveRuntimeFallbackBannerState({
    configErrorMessage: runtimeHydrationEnabled ? runtimeConfig.errorMessage : "",
    runtimeErrorMessage: runtimeHydrationEnabled ? storyRuntime.errorMessage : "",
    usesRuntimeFallback: storyRuntime.usesFallback
  });
  const heroMediaSource = resolveDisplayPageMediaSource(resolvedConfig.heroMedia, seedConfig.heroMedia.src);

  const titleLayout = withContentOffset(resolvedConfig.heroCopyLayout);
  const heroLayout = withContentOffset(resolvedConfig.heroContainer);
  const leafLayout = withContentOffset(overviewLeafLayout);
  const goldLineLayout = withContentOffset(overviewGoldLineLayout);
  const summaryLayout = withContentOffset({
    left: 88,
    top: 430,
    width: 520
  });

  return (
    <section className="overview-display-page">
      <RuntimeConfigFallbackBanner {...runtimeFallbackBanner} />
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
        <img
          alt={resolvedConfig.heroMedia.alt}
          src={heroMediaSource ?? undefined}
          style={buildDisplayPageMediaStyle(resolvedConfig.heroMedia)}
        />
      </figure>

      <DisplayCardFrame
        className={[
          "overview-summary",
          `overview-summary-${viewModel.summary.alertTone}`
        ].join(" ")}
        surface="info"
        style={{
          left: `${summaryLayout.left}px`,
          top: `${summaryLayout.top}px`,
          width: `${summaryLayout.width}px`
        }}
      >
        <DisplayCardHeader title="Shared Story Summary" />
        <p className="overview-summary-body">{viewModel.summary.statusLabel}</p>
      </DisplayCardFrame>

      {overviewCardOrder.map((cardItem, index) => {
        const metric = viewModel.metrics[index]!;
        const layout = withContentOffset(resolvedConfig.kpiCards[cardItem.key]);

        return (
          <DisplayCardFrame
            key={metric.label}
            className="overview-kpi-card"
            surface="metric"
            style={{
              height: `${layout.height}px`,
              left: `${layout.left}px`,
              top: `${layout.top}px`,
              width: `${layout.width}px`
            }}
          >
            <DisplayCardHeader
              icon={renderDisplayPageIcon({
                alt: metric.label,
                className: "overview-kpi-icon",
                seedSource: seedConfig.iconSources[cardItem.key],
                source: resolvedConfig.iconSources[cardItem.key]
              })}
              iconContainerClassName={[
                "overview-kpi-icon-shell",
                metric.accentColor ? "overview-kpi-icon-accent" : ""
              ].join(" ")}
              subtitle={cardItem.englishLabel}
              title={metric.label}
            />
            <DisplayCardValueRow align="center" unit={metric.unit} value={metric.value} />
            <DisplayCardFooter>
              <Sparkline className="overview-kpi-sparkline" values={trendSeries} />
            </DisplayCardFooter>
          </DisplayCardFrame>
        );
      })}
    </section>
  );
}
