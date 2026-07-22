import { useMemo } from "react";
import {
  displayPageCardConfiguringLabel,
  resolveDisplayPageCardStatus,
  resolvePlaybackRuntimeMetricKeys
} from "@solar-display/shared";
import { renderDisplayPageIcon } from "../../components/displayPageIconResolver";
import {
  DisplayCardFrame,
  DisplayCardHeader,
  DisplayCardValueRow
} from "../../components/displayPageCards";
import { useLiveMetricsSelector } from "../../hooks/useLiveMetrics";
import type { LiveMetricsStoreState } from "../../hooks/liveMetricsStore";
import type { LiveMetricReading, LiveMetricsSnapshot, SocketConnectionState } from "../../services/socket";
import { buildDisplayCardStyleVars, createDisplayCardStyleConfig } from "../shared/displayCardStyleConfig";
import { buildOverviewViewModel } from "./viewModel";
import { OverviewKpiFooter } from "./OverviewKpiFooter";
import {
  resolveOverviewKpiCardTitle,
  shouldRenderOverviewDashboardWidget,
  shouldRenderOverviewKpiCard,
  type OverviewDisplayPageConfig
} from "./displayPageConfig";
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

const overviewRuntimeMetricKeys = resolvePlaybackRuntimeMetricKeys("overview");

type OverviewRuntimeSelection = {
  connectionState: SocketConnectionState["status"];
  isSocketConnected: boolean;
  readings: Array<LiveMetricReading | null>;
};

function withContentOffset<T extends { top: number }>(layout: T) {
  return {
    ...layout,
    top: layout.top - CONTENT_TOP_OFFSET
  };
}

function isLiveMetricReadingEqual(current: LiveMetricReading | null, next: LiveMetricReading | null) {
  if (current === next) {
    return true;
  }

  if (current === null || next === null) {
    return false;
  }

  return (
    current.quality === next.quality
    && current.timestamp === next.timestamp
    && current.unit === next.unit
    && current.value === next.value
  );
}

function selectOverviewRuntimeSelection(state: LiveMetricsStoreState): OverviewRuntimeSelection {
  return {
    connectionState: state.connectionState.status,
    isSocketConnected: state.connectionState.status === "connected",
    readings: overviewRuntimeMetricKeys.map((key) => state.snapshot.metrics[key] ?? null)
  };
}

function isOverviewRuntimeSelectionEqual(
  current: OverviewRuntimeSelection,
  next: OverviewRuntimeSelection
) {
  return (
    current.connectionState === next.connectionState
    && current.isSocketConnected === next.isSocketConnected
    && current.readings.length === next.readings.length
    && current.readings.every((reading, index) => {
      return isLiveMetricReadingEqual(reading, next.readings[index] ?? null);
    })
  );
}

function buildOverviewRuntimeSnapshot(
  readings: OverviewRuntimeSelection["readings"]
): LiveMetricsSnapshot {
  const metrics: LiveMetricsSnapshot["metrics"] = {};

  overviewRuntimeMetricKeys.forEach((metricKey, index) => {
    const reading = readings[index];

    if (reading) {
      metrics[metricKey] = reading;
    }
  });

  return {
    metrics,
    timestamp: null
  };
}

export function OverviewRuntimeContent({
  resolvedConfig,
  resolvedWeatherSnapshot,
  seedConfig,
  storyOverviewPayload
}: {
  resolvedConfig: OverviewDisplayPageConfig;
  resolvedWeatherSnapshot: Parameters<typeof buildOverviewViewModel>[0]["weatherSnapshot"];
  seedConfig: ReturnType<typeof import("./displayPageConfig").createOverviewDisplayPageSeedConfig>;
  storyOverviewPayload: Parameters<typeof buildOverviewViewModel>[0]["storyOverview"];
}) {
  const overviewRuntimeSelection = useLiveMetricsSelector(
    selectOverviewRuntimeSelection,
    isOverviewRuntimeSelectionEqual
  );
  const snapshot = useMemo(
    () => buildOverviewRuntimeSnapshot(overviewRuntimeSelection.readings),
    [overviewRuntimeSelection.readings]
  );
  const viewModel = useMemo(
    () =>
      buildOverviewViewModel({
        connectionState: overviewRuntimeSelection.connectionState,
        isSocketConnected: overviewRuntimeSelection.isSocketConnected,
        snapshot,
        storyOverview: storyOverviewPayload,
        weatherSnapshot: resolvedWeatherSnapshot
      }),
    [
      overviewRuntimeSelection.connectionState,
      overviewRuntimeSelection.isSocketConnected,
      resolvedWeatherSnapshot,
      snapshot,
      storyOverviewPayload
    ]
  );

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
  const generationTrendHours = useMemo(
    () => viewModel.metrics.find((metric) => metric.metricKey === "realTimePower")?.trendHours,
    [viewModel.metrics]
  );
  const generationTrendUnit = useMemo(
    () => viewModel.metrics.find((metric) => metric.metricKey === "realTimePower")?.trendUnit,
    [viewModel.metrics]
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
  const kpiCardShells = useMemo(
    () =>
      overviewCardOrder.map((cardItem, index) => {
        if (!shouldRenderOverviewKpiCard(resolvedConfig.kpiCards[cardItem.key])) {
          return null;
        }

        const layout = withContentOffset(resolvedConfig.kpiCards[cardItem.key]);
        const cardStyle = createDisplayCardStyleConfig(resolvedConfig.cardStyles[cardItem.key]);
        const status = resolveDisplayPageCardStatus(resolvedConfig.kpiCards[cardItem.key]);

        return {
          cardItem,
          cardStyle,
          index,
          status,
          style: {
            height: `${layout.height}px`,
            left: `${layout.left}px`,
            top: `${layout.top}px`,
            width: `${layout.width}px`
          }
        };
      }),
    [resolvedConfig]
  );

  return (
    <>
      {kpiCardShells.map((shell) => {
        if (!shell) {
          return null;
        }

        const metric = viewModel.metrics[shell.index]!;
        const isConfiguring = shell.status === "configuring";

        return (
          <DisplayCardFrame
            cardStyle={shell.cardStyle}
            key={metric.metricKey}
            className="overview-kpi-card"
            surface="metric"
            style={shell.style}
            title={metric.sourceTooltip}
          >
            <DisplayCardHeader
              icon={renderDisplayPageIcon({
                alt: metric.label,
                className: "overview-kpi-icon",
                seedSource: seedConfig.iconSources[shell.cardItem.key],
                source: resolvedConfig.iconSources[shell.cardItem.key]
              })}
              iconContainerClassName="overview-kpi-icon-shell"
              subtitle={shell.cardItem.englishLabel}
              title={resolveOverviewKpiCardTitle(
                resolvedConfig.kpiCards[shell.cardItem.key].titleOverride,
                metric.label
              )}
            />
            <DisplayCardValueRow
              align={shell.cardStyle.valueRowAlign}
              unit={isConfiguring ? "" : metric.unit}
              value={isConfiguring ? displayPageCardConfiguringLabel : metric.value}
            />
            <OverviewKpiFooter footer={resolvedConfig.kpiCards[shell.cardItem.key]} metric={metric} />
          </DisplayCardFrame>
        );
      })}
      {shouldRenderOverviewDashboardWidget(resolvedConfig.dashboardWidgets.weather) ? (
        <WeatherCardWidget
          weather={viewModel.weather}
          style={weatherWidgetStyle}
          themeMode={resolvedConfig.weatherThemeMode}
          manualTheme={resolvedConfig.weatherManualTheme}
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
          hours={generationTrendHours}
          series={generationTrendSeries}
          unit={generationTrendUnit}
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
    </>
  );
}
