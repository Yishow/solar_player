import type { DisplayPageFreeformObject } from "@solar-display/shared";
import { useMemo } from "react";
import { DisplayPageObjectLayer } from "../../components/DisplayPageObjectLayer";
import { renderDisplayPageIcon } from "../../components/displayPageIconResolver";
import { Sparkline } from "../../components/Sparkline";
import {
  DisplayCardFooter,
  DisplayCardFrame,
  DisplayCardHeader,
  DisplayCardValueRow
} from "../../components/displayPageCards";
import { DisplayPageLoadingState } from "../../components/DisplayPageLoadingState";
import { useBodyClass } from "../../hooks/useBodyClass";
import {
  shouldDeferDisplayPageRuntimeRender,
  useDisplayPageConfig
} from "../../hooks/useDisplayPageConfig";
import { useDisplayStoryRuntime } from "../../hooks/useDisplayStoryRuntime";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import { resolveDisplayPageMediaSource } from "@solar-display/shared";
import { buildDisplayPageMediaPresentation } from "../displayPageMediaStyle";
import { createDisplayCardStyleConfig } from "../shared/displayCardStyleConfig";
import {
  overviewHeroMediaEffectResolverOptions
} from "../shared/displayPageMediaEffectConfig";
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

export function Overview({ config, pageId = "overview" }: { config?: OverviewDisplayPageConfig; pageId?: string }) {
  useBodyClass("page-hero-shell");
  const { connectionState, isSocketConnected, snapshot } = useLiveMetrics();
  const runtimeHydrationEnabled = config === undefined;
  const runtimeStage = "live" as const;
  const seedConfig = useMemo(
    () => createOverviewDisplayPageSeedConfig(overviewAssetRuntimeMap.hero),
    []
  );
  const runtimeConfig = useDisplayPageConfig(pageId, seedConfig, {
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
    return <DisplayPageLoadingState />;
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
  const heroMediaPresentation = buildDisplayPageMediaPresentation(
    resolvedConfig.heroMedia,
    overviewHeroMediaEffectResolverOptions
  );
  const heroTypography = resolvedConfig.chrome.heroTypography;
  const freeformObjects =
    (resolvedConfig as typeof resolvedConfig & { freeformObjects?: DisplayPageFreeformObject[] }).freeformObjects ?? [];

  const titleLayout = withContentOffset(resolvedConfig.heroCopyLayout);
  const heroLayout = withContentOffset(resolvedConfig.heroContainer);
  const leafLayout = withContentOffset(overviewLeafLayout);
  const goldLineLayout = withContentOffset(overviewGoldLineLayout);
  return (
    <section className="overview-display-page">
      <RuntimeConfigFallbackBanner {...runtimeFallbackBanner} />
      <div
        className="overview-leaf-watermark display-surface-leaf-ornament"
        style={{
          height: `${leafLayout.height}px`,
          left: `${leafLayout.left + resolvedConfig.chrome.ornaments.leaf.offsetX}px`,
          opacity: resolvedConfig.chrome.ornaments.leaf.opacity,
          top: `${leafLayout.top + resolvedConfig.chrome.ornaments.leaf.offsetY}px`,
          transform: `rotate(-15deg) scale(${resolvedConfig.chrome.ornaments.leaf.scale})`,
          width: `${leafLayout.width}px`
        }}
      />

      <div
        className="overview-gold-line display-surface-gold-line"
        style={{
          height: `${resolvedConfig.chrome.ornaments.goldLine.thickness}px`,
          left: `${goldLineLayout.left}px`,
          opacity: resolvedConfig.chrome.ornaments.goldLine.opacity,
          top: `${goldLineLayout.top + resolvedConfig.chrome.ornaments.goldLine.offsetY}px`,
          width: `${goldLineLayout.width}px`
        }}
      />

      <section
        className="overview-title-group display-surface-hero-group"
        style={{
          left: `${titleLayout.left}px`,
          top: `${titleLayout.top}px`,
          width: `${titleLayout.width}px`
        }}
      >
        <p
          className="overview-eyebrow display-surface-hero-eyebrow"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.eyebrowFontSize}px`,
            letterSpacing: `${resolvedConfig.chrome.heroTypography.eyebrowLetterSpacing}px`,
            marginBottom: `${resolvedConfig.chrome.heroTypography.eyebrowMarginBottom}px`
          }}
        >
          {resolvedConfig.heroCopy.eyebrow}
        </p>
        <h2
          className="overview-display-title display-surface-hero-title"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.titleFontSize}px`,
            fontWeight: heroTypography.titleEmphasisWeight,
            letterSpacing: `${resolvedConfig.chrome.heroTypography.titleLetterSpacing}px`,
            lineHeight: resolvedConfig.chrome.heroTypography.titleLineHeight
          }}
        >
          {resolvedConfig.heroCopy.titleLines[0]}
          <br />
          {resolvedConfig.heroCopy.titleLines[1]}
        </h2>
        <p
          className="overview-hero-subtitle display-surface-hero-subtitle"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.subtitleFontSize}px`,
            lineHeight: resolvedConfig.chrome.heroTypography.subtitleLineHeight,
            marginTop: `${resolvedConfig.chrome.heroTypography.subtitleMarginTop}px`
          }}
        >
          {resolvedConfig.heroCopy.subtitleLines[0]}
          <br />
          {resolvedConfig.heroCopy.subtitleLines[1]}
        </p>
      </section>

      <figure
        className={`overview-hero-banner display-surface-media-stage${heroMediaPresentation.stageClassName ? ` ${heroMediaPresentation.stageClassName}` : ""}`}
        style={{
          ...heroMediaPresentation.stageStyle,
          height: `${heroLayout.height}px`,
          left: `${heroLayout.left}px`,
          top: `${heroLayout.top}px`,
          width: `${heroLayout.width}px`
        }}
      >
        <img
          alt={resolvedConfig.heroMedia.alt}
          src={heroMediaSource ?? undefined}
          style={heroMediaPresentation.mediaStyle}
        />
      </figure>

      {overviewCardOrder.map((cardItem, index) => {
        const metric = viewModel.metrics[index]!;
        const layout = withContentOffset(resolvedConfig.kpiCards[cardItem.key]);
        const cardStyle = createDisplayCardStyleConfig(resolvedConfig.cardStyles[cardItem.key]);

        return (
          <DisplayCardFrame
            cardStyle={cardStyle}
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
            <DisplayCardValueRow align={cardStyle.valueRowAlign} unit={metric.unit} value={metric.value} />
            {metric.trendSeries && metric.trendSeries.length > 0 ? (
              <DisplayCardFooter>
                <Sparkline className="overview-kpi-sparkline" values={metric.trendSeries} />
              </DisplayCardFooter>
            ) : null}
          </DisplayCardFrame>
        );
      })}
      <DisplayPageObjectLayer objects={freeformObjects} />
    </section>
  );
}
