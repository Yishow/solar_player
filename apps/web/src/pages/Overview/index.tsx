import type { DisplayPageFreeformObject } from "@solar-display/shared";
import { useMemo } from "react";
import { DisplayPageObjectLayer } from "../../components/DisplayPageObjectLayer";
import { renderDisplayPageIcon } from "../../components/displayPageIconResolver";
import {
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
import { useOverviewWeather } from "../../hooks/useOverviewWeather";
import { resolveDisplayPageMediaSource } from "@solar-display/shared";
import { buildDisplayPageMediaPresentation } from "../displayPageMediaStyle";
import { buildDisplayCardStyleVars, createDisplayCardStyleConfig } from "../shared/displayCardStyleConfig";
import { DisplayLeafOrnament } from "../shared/DisplayLeafOrnament";
import {
  overviewHeroMediaEffectResolverOptions
} from "../shared/displayPageMediaEffectConfig";
import {
  resolveRuntimeFallbackBannerState,
  RuntimeConfigFallbackBanner
} from "../runtimeConfigHydration";
import { overviewAssetRuntimeMap } from "./assets";
import { pickOverviewBackground } from "./backgroundPool";
import {
  createOverviewDisplayPageSeedConfig,
  resolveOverviewModernDefaultConfig,
  shouldRenderOverviewDashboardWidget,
  shouldRenderOverviewKpiCard,
  type OverviewDisplayPageConfig
} from "./displayPageConfig";
import {
  overviewGoldLineLayout,
  overviewLeafLayout
} from "./layout";
import "../../components/displayPageCards.css";
import "./overview.css";
import { OverviewKpiFooter } from "./OverviewKpiFooter";
import { buildOverviewViewModel } from "./viewModel";
import { AlertNotificationsWidget } from "./widgets/AlertNotificationsWidget";
import { GenerationTrendWidget } from "./widgets/GenerationTrendWidget";
import { PhasePowerTableWidget } from "./widgets/PhasePowerTableWidget";
import { WeatherCardWidget } from "./widgets/WeatherCardWidget";

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

function renderOverviewTitleLine(line: string) {
  const emphasisText = "綠色";
  const emphasisIndex = line.indexOf(emphasisText);

  if (emphasisIndex === -1) {
    return line;
  }

  return (
    <>
      {line.slice(0, emphasisIndex)}
      <em>{emphasisText}</em>
      {line.slice(emphasisIndex + emphasisText.length)}
    </>
  );
}

export function Overview({ config, pageId = "overview" }: { config?: OverviewDisplayPageConfig; pageId?: string }) {
  useBodyClass("page-hero-shell");
  const { connectionState, isSocketConnected, snapshot } = useLiveMetrics();
  const runtimeHydrationEnabled = config === undefined;
  const weatherSnapshot = useOverviewWeather(runtimeHydrationEnabled);
  const runtimeStage = "live" as const;
  const seedConfig = useMemo(
    () =>
      createOverviewDisplayPageSeedConfig(
        overviewAssetRuntimeMap.hero,
        undefined,
        overviewAssetRuntimeMap.backgrounds
      ),
    []
  );
  const runtimeConfig = useDisplayPageConfig(pageId, seedConfig, {
    enabled: runtimeHydrationEnabled,
    stage: runtimeStage
  });
  const storyRuntime = useDisplayStoryRuntime("overview", {
    enabled: runtimeHydrationEnabled
  });

  const resolvedConfig = useMemo(
    () => resolveOverviewModernDefaultConfig(config ?? runtimeConfig.config, seedConfig),
    [config, runtimeConfig.config, seedConfig]
  );
  const backgroundPoolSources = resolvedConfig.backgroundPool.sources;
  const backgroundPoolSignature = backgroundPoolSources
    .map((source) => source.src ?? source.assetId ?? "")
    .join("|");
  const selectedBackground = useMemo(
    () => pickOverviewBackground(backgroundPoolSources),
    // Re-randomise only when the candidate pool changes; each rotation entry
    // remounts the page (route host `key`), so mount = fresh random pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [backgroundPoolSignature]
  );

  const storyOverviewPayload = storyRuntime.payload ?? undefined;
  const viewModel = useMemo(
    () =>
      buildOverviewViewModel({
        connectionState,
        isSocketConnected,
        snapshot,
        storyOverview: storyOverviewPayload,
        weatherSnapshot
      }),
    [connectionState, isSocketConnected, snapshot, storyOverviewPayload, weatherSnapshot]
  );

  const backgroundSource = useMemo(
    () =>
      selectedBackground
        ? resolveDisplayPageMediaSource(selectedBackground, selectedBackground.src ?? null)
        : null,
    [selectedBackground]
  );
  const heroMediaSource = useMemo(
    () => resolveDisplayPageMediaSource(resolvedConfig.heroMedia, seedConfig.heroMedia.src),
    [resolvedConfig.heroMedia, seedConfig.heroMedia.src]
  );
  const heroMediaPresentation = useMemo(
    () =>
      buildDisplayPageMediaPresentation(resolvedConfig.heroMedia, overviewHeroMediaEffectResolverOptions),
    [resolvedConfig.heroMedia]
  );
  const heroTypography = resolvedConfig.chrome.heroTypography;
  const freeformObjects =
    (resolvedConfig as typeof resolvedConfig & { freeformObjects?: DisplayPageFreeformObject[] }).freeformObjects ?? [];

  const titleLayout = useMemo(() => withContentOffset(resolvedConfig.heroCopyLayout), [resolvedConfig.heroCopyLayout]);
  const heroLayout = useMemo(() => withContentOffset(resolvedConfig.heroContainer), [resolvedConfig.heroContainer]);
  const leafLayout = useMemo(() => withContentOffset(overviewLeafLayout), []);
  const goldLineLayout = useMemo(() => withContentOffset(overviewGoldLineLayout), []);
  const generationTrendLayout = useMemo(
    () => withContentOffset(resolvedConfig.dashboardWidgets.generationTrend),
    [resolvedConfig.dashboardWidgets.generationTrend]
  );
  const alertNotificationsLayout = useMemo(
    () => withContentOffset(resolvedConfig.dashboardWidgets.alertNotifications),
    [resolvedConfig.dashboardWidgets.alertNotifications]
  );
  const weatherLayout = useMemo(
    () => withContentOffset(resolvedConfig.dashboardWidgets.weather),
    [resolvedConfig.dashboardWidgets.weather]
  );
  const phasePowerLayout = useMemo(
    () => withContentOffset(resolvedConfig.dashboardWidgets.phasePower),
    [resolvedConfig.dashboardWidgets.phasePower]
  );
  const generationTrendSeries = useMemo(
    () => viewModel.metrics.find((metric) => metric.metricKey === "realTimePower")?.trendSeries ?? [],
    [viewModel.metrics]
  );

  const leafOrnamentStyle = useMemo(
    () => ({
      height: `${leafLayout.height}px`,
      left: `${leafLayout.left + resolvedConfig.chrome.ornaments.leaf.offsetX}px`,
      opacity: resolvedConfig.chrome.ornaments.leaf.opacity,
      top: `${leafLayout.top + resolvedConfig.chrome.ornaments.leaf.offsetY}px`,
      transform: `rotate(-15deg) scale(${resolvedConfig.chrome.ornaments.leaf.scale})`,
      width: `${leafLayout.width}px`
    }),
    [leafLayout, resolvedConfig.chrome.ornaments.leaf]
  );
  const goldLineStyle = useMemo(
    () => ({
      height: `${resolvedConfig.chrome.ornaments.goldLine.thickness}px`,
      left: `${goldLineLayout.left}px`,
      opacity: resolvedConfig.chrome.ornaments.goldLine.opacity,
      top: `${goldLineLayout.top + resolvedConfig.chrome.ornaments.goldLine.offsetY}px`,
      width: `${goldLineLayout.width}px`
    }),
    [goldLineLayout, resolvedConfig.chrome.ornaments.goldLine]
  );
  const titleGroupStyle = useMemo(
    () => ({
      left: `${titleLayout.left}px`,
      top: `${titleLayout.top}px`,
      width: `${titleLayout.width}px`
    }),
    [titleLayout]
  );
  const eyebrowStyle = useMemo(
    () => ({
      fontSize: `${heroTypography.eyebrowFontSize}px`,
      letterSpacing: `${heroTypography.eyebrowLetterSpacing}px`,
      marginBottom: `${heroTypography.eyebrowMarginBottom}px`
    }),
    [heroTypography]
  );
  const titleStyle = useMemo(
    () => ({
      fontSize: `${heroTypography.titleFontSize}px`,
      fontWeight: heroTypography.titleEmphasisWeight,
      letterSpacing: `${heroTypography.titleLetterSpacing}px`,
      lineHeight: heroTypography.titleLineHeight
    }),
    [heroTypography]
  );
  const subtitleStyle = useMemo(
    () => ({
      fontSize: `${heroTypography.subtitleFontSize}px`,
      lineHeight: heroTypography.subtitleLineHeight,
      marginTop: `${heroTypography.subtitleMarginTop}px`
    }),
    [heroTypography]
  );
  const heroBannerStyle = useMemo(
    () => ({
      ...heroMediaPresentation.stageStyle,
      height: `${heroLayout.height}px`,
      left: `${heroLayout.left}px`,
      top: `${heroLayout.top}px`,
      width: `${heroLayout.width}px`
    }),
    [heroMediaPresentation.stageStyle, heroLayout]
  );
  const weatherWidgetStyle = useMemo(
    () => ({
      ...buildDisplayCardStyleVars(resolvedConfig.widgetStyles.weather),
      height: `${weatherLayout.height}px`,
      left: `${weatherLayout.left}px`,
      top: `${weatherLayout.top}px`,
      width: `${weatherLayout.width}px`
    }),
    [resolvedConfig.widgetStyles.weather, weatherLayout]
  );
  const phasePowerWidgetStyle = useMemo(
    () => ({
      ...buildDisplayCardStyleVars(resolvedConfig.widgetStyles.phasePower),
      height: `${phasePowerLayout.height}px`,
      left: `${phasePowerLayout.left}px`,
      top: `${phasePowerLayout.top}px`,
      width: `${phasePowerLayout.width}px`
    }),
    [resolvedConfig.widgetStyles.phasePower, phasePowerLayout]
  );
  const generationTrendWidgetStyle = useMemo(
    () => ({
      ...buildDisplayCardStyleVars(resolvedConfig.widgetStyles.generationTrend),
      height: `${generationTrendLayout.height}px`,
      left: `${generationTrendLayout.left}px`,
      top: `${generationTrendLayout.top}px`,
      width: `${generationTrendLayout.width}px`
    }),
    [resolvedConfig.widgetStyles.generationTrend, generationTrendLayout]
  );
  const alertNotificationsWidgetStyle = useMemo(
    () => ({
      ...buildDisplayCardStyleVars(resolvedConfig.widgetStyles.alertNotifications),
      height: `${alertNotificationsLayout.height}px`,
      left: `${alertNotificationsLayout.left}px`,
      top: `${alertNotificationsLayout.top}px`,
      width: `${alertNotificationsLayout.width}px`
    }),
    [resolvedConfig.widgetStyles.alertNotifications, alertNotificationsLayout]
  );

  const kpiCards = useMemo(
    () =>
      overviewCardOrder.map((cardItem, index) => {
        if (!shouldRenderOverviewKpiCard(resolvedConfig.kpiCards[cardItem.key])) {
          return null;
        }

        const metric = viewModel.metrics[index]!;
        const layout = withContentOffset(resolvedConfig.kpiCards[cardItem.key]);
        const cardStyle = createDisplayCardStyleConfig(resolvedConfig.cardStyles[cardItem.key]);

        return (
          <DisplayCardFrame
            cardStyle={cardStyle}
            key={metric.metricKey}
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
            <OverviewKpiFooter footer={resolvedConfig.kpiCards[cardItem.key]} metric={metric} />
          </DisplayCardFrame>
        );
      }),
    [resolvedConfig, seedConfig.iconSources, viewModel.metrics]
  );

  const runtimeFallbackBanner = resolveRuntimeFallbackBannerState({
    configErrorMessage: runtimeHydrationEnabled ? runtimeConfig.errorMessage : "",
    runtimeErrorMessage: runtimeHydrationEnabled ? storyRuntime.errorMessage : "",
    usesRuntimeFallback: storyRuntime.usesFallback
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

  return (
    <section className="overview-display-page">
      <RuntimeConfigFallbackBanner {...runtimeFallbackBanner} />
      <DisplayLeafOrnament
        className="overview-leaf-watermark display-surface-leaf-ornament"
        config={resolvedConfig.chrome.ornaments.leaf}
        style={leafOrnamentStyle}
      />

      <div
        className="overview-gold-line display-surface-gold-line"
        style={goldLineStyle}
      />

      <section
        className="overview-title-group display-surface-hero-group"
        style={titleGroupStyle}
      >
        <p
          className="overview-eyebrow display-surface-hero-eyebrow"
          style={eyebrowStyle}
        >
          {resolvedConfig.heroCopy.eyebrow}
        </p>
        <h2
          className="overview-display-title display-surface-hero-title"
          style={titleStyle}
        >
          {renderOverviewTitleLine(resolvedConfig.heroCopy.titleLines[0])}
          <br />
          {renderOverviewTitleLine(resolvedConfig.heroCopy.titleLines[1])}
        </h2>
        <p
          className="overview-hero-subtitle display-surface-hero-subtitle"
          style={subtitleStyle}
        >
          {resolvedConfig.heroCopy.subtitleLines[0]}
          <br />
          {resolvedConfig.heroCopy.subtitleLines[1]}
        </p>
      </section>

      <figure
        className={`overview-hero-banner display-surface-media-stage${heroMediaPresentation.stageClassName ? ` ${heroMediaPresentation.stageClassName}` : ""}`}
        style={heroBannerStyle}
      >
        <img
          alt={selectedBackground?.alt ?? resolvedConfig.heroMedia.alt}
          src={backgroundSource ?? heroMediaSource ?? undefined}
          style={heroMediaPresentation.mediaStyle}
        />
        {heroMediaPresentation.overlayLayers.map((layer) => (
          <span
            key={layer.id}
            aria-hidden="true"
            className={layer.className}
            style={layer.style}
          />
        ))}
      </figure>

      {kpiCards}
      {shouldRenderOverviewDashboardWidget(resolvedConfig.dashboardWidgets.weather) ? (
        <WeatherCardWidget
          weather={viewModel.weather}
          style={weatherWidgetStyle}
        />
      ) : null}
      {shouldRenderOverviewDashboardWidget(resolvedConfig.dashboardWidgets.phasePower) ? (
        <PhasePowerTableWidget
          phasePower={viewModel.phasePower}
          style={phasePowerWidgetStyle}
        />
      ) : null}
      {shouldRenderOverviewDashboardWidget(resolvedConfig.dashboardWidgets.generationTrend) ? (
        <GenerationTrendWidget
          series={generationTrendSeries}
          style={generationTrendWidgetStyle}
        />
      ) : null}
      {shouldRenderOverviewDashboardWidget(resolvedConfig.dashboardWidgets.alertNotifications) ? (
        <AlertNotificationsWidget
          alerts={viewModel.alerts}
          alwaysShowThresholds={resolvedConfig.dashboardWidgets.alertNotifications.alwaysShowThresholds}
          style={alertNotificationsWidgetStyle}
        />
      ) : null}
      <DisplayPageObjectLayer objects={freeformObjects} />
    </section>
  );
}
