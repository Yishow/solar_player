import { useEffect, useMemo, useState, type ReactNode } from "react";
import { requestJson } from "../../services/api";
import { displayPageCardConfiguringLabel, resolveDisplayPageCardStatus } from "@solar-display/shared";
import type { LiveMetricReading, LiveMetricsSnapshot, SocketConnectionState } from "../../services/socket";
import { useLiveMetricsSelector } from "../../hooks/useLiveMetrics";
import type { LiveMetricsStoreState } from "../../hooks/liveMetricsStore";
import {
  DisplayCardFooter,
  DisplayCardFrame,
  DisplayCardHeader,
  DisplayCardValueRow
} from "../../components/displayPageCards";
import { renderDisplayPageIcon } from "../../components/displayPageIconResolver";
import { Sparkline } from "../../components/Sparkline";
import { trendSeries } from "../../mocks/metrics";
import { createDisplayCardStyleConfig } from "../shared/displayCardStyleConfig";
import {
  buildFactoryLoadRowRhythmStyle,
  resolveFactoryLoadRowRhythmConfig
} from "../shared/displayPageFhdRhythmConfig";
import type { FactoryCircuitDisplayPageConfig } from "./displayPageConfig";
import {
  buildFactoryCircuitViewModel,
  mapDepartmentShareToSlot,
  type FactoryCircuitLoadState,
  type FactoryCircuitRuntime
} from "./viewModel";
import { factoryCircuitContentTopOffset } from "./layout";

const CONTENT_TOP_OFFSET = factoryCircuitContentTopOffset;

const kpiLayoutOrder = [
  "totalPower",
  "solarShare",
  "selfConsumption",
  "peak",
  "flow"
] as const;

const loadRowOrder = [
  "stamping",
  "body",
  "painting",
  "assembly",
  "utility",
  "office",
  "heavy_vehicle",
  "ed_coating"
] as const;

const factoryCircuitRuntimeMetricKeys = [
  "realTimePower",
  "selfConsumptionEnergy",
  "todayGeneration"
] as const;

type FactoryCircuitRuntimeSelection = {
  connectionState: SocketConnectionState["status"];
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

function selectFactoryCircuitRuntimeSelection(
  state: LiveMetricsStoreState
): FactoryCircuitRuntimeSelection {
  return {
    connectionState: state.connectionState.status,
    readings: factoryCircuitRuntimeMetricKeys.map((key) => state.snapshot.metrics[key] ?? null)
  };
}

function isFactoryCircuitRuntimeSelectionEqual(
  current: FactoryCircuitRuntimeSelection,
  next: FactoryCircuitRuntimeSelection
) {
  return (
    current.connectionState === next.connectionState
    && current.readings.length === next.readings.length
    && current.readings.every((reading, index) => {
      return isLiveMetricReadingEqual(reading, next.readings[index] ?? null);
    })
  );
}

function buildFactoryCircuitRuntimeSnapshot(
  readings: FactoryCircuitRuntimeSelection["readings"]
): LiveMetricsSnapshot {
  const metrics: LiveMetricsSnapshot["metrics"] = {};
  let latestTimestamp: string | null = null;

  factoryCircuitRuntimeMetricKeys.forEach((metricKey, index) => {
    const reading = readings[index];

    if (reading) {
      metrics[metricKey] = reading;
      if (reading.timestamp && (latestTimestamp === null || reading.timestamp > latestTimestamp)) {
        latestTimestamp = reading.timestamp;
      }
    }
  });

  return {
    metrics,
    timestamp: latestTimestamp
  };
}

export function FactoryCircuitRuntimeContent({
  circuits,
  factoryCircuitStory,
  loadState,
  loadRowIcons,
  resolvedConfig,
  seedConfig
}: {
  circuits: FactoryCircuitRuntime[];
  factoryCircuitStory: Parameters<typeof buildFactoryCircuitViewModel>[0]["factoryCircuitStory"];
  loadState: FactoryCircuitLoadState;
  loadRowIcons: Record<string, ReactNode>;
  resolvedConfig: FactoryCircuitDisplayPageConfig;
  seedConfig: ReturnType<typeof import("./displayPageConfig").createFactoryCircuitDisplayPageSeedConfig>;
}) {
  const runtimeSelection = useLiveMetricsSelector(
    selectFactoryCircuitRuntimeSelection,
    isFactoryCircuitRuntimeSelectionEqual
  );
  const snapshot = useMemo(
    () => buildFactoryCircuitRuntimeSnapshot(runtimeSelection.readings),
    [runtimeSelection.readings]
  );
  const [energyShares, setEnergyShares] = useState<Record<string, number | null>>({});
  useEffect(() => {
    let cancelled = false;
    void requestJson<{ shares?: Array<{ departmentId: string; ratio: number | null }> }>(
      "/api/metrics/department-shares?range=month"
    ).then((payload) => {
      if (cancelled || !payload.shares) {
        return;
      }
      const next: Record<string, number | null> = {};
      for (const share of payload.shares) {
        next[mapDepartmentShareToSlot(share.departmentId)] = share.ratio === null ? null : Math.round(share.ratio * 100);
      }
      setEnergyShares(next);
    }).catch(() => {
      if (!cancelled) {
        setEnergyShares({});
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const viewModel = useMemo(
    () =>
      buildFactoryCircuitViewModel({
        circuits,
        connectionState: runtimeSelection.connectionState,
        energyShares,
        loadState,
        snapshot,
        factoryCircuitStory
      }),
    [circuits, energyShares, factoryCircuitStory, loadState, runtimeSelection.connectionState, snapshot]
  );
  const kpiSparklineValues = useMemo(
    () => viewModel.kpis.map((_, index) => trendSeries.map((value) => value - index * 1.5)),
    [viewModel.kpis]
  );
  const loadRowRhythm = resolveFactoryLoadRowRhythmConfig(
    resolvedConfig.rhythm.factoryLoadRows,
    seedConfig.rhythm.factoryLoadRows
  );

  return (
    <>
      <section
        className="factory-circuit-load-panel"
        style={{
          ...buildFactoryLoadRowRhythmStyle(loadRowRhythm),
          height: `${resolvedConfig.loadPanel.height}px`,
          left: `${resolvedConfig.loadPanel.left}px`,
          top: `${resolvedConfig.loadPanel.top - CONTENT_TOP_OFFSET}px`,
          width: `${resolvedConfig.loadPanel.width}px`
        }}
      >
        {loadRowOrder.map((slotKey) => {
          const row = viewModel.loadRows.find(
            (candidate) => candidate.itemId === slotKey
          );
          if (!row) return null;
          const cardState = resolvedConfig.loadRowStates?.[slotKey];
          if (cardState?.visible === false) {
            return null;
          }

          const layout = withContentOffset(resolvedConfig.loadRows[slotKey]);
          const isConfiguring = resolveDisplayPageCardStatus(cardState) === "configuring";
          const storySlot = factoryCircuitStory?.slots.find(
            (candidate) => candidate.itemId === slotKey
          );
          const sharePercent = row.sharePercent;
          const formattedSharePercent =
            sharePercent === null
              ? "—"
              : storySlot?.format?.precision === undefined
                ? String(sharePercent)
                : sharePercent.toFixed(storySlot.format.precision);
          const shareUnit = sharePercent === null || storySlot?.format?.unitDisplay === "hide" ? "" : "%";
          return (
            <article
              key={slotKey}
              className={`factory-circuit-load-row${layout.height <= 65 ? " is-compact" : ""}`}
              style={{
                height: `${layout.height}px`,
                left: `${layout.left - resolvedConfig.loadPanel.left}px`,
                top: `${layout.top - (resolvedConfig.loadPanel.top - CONTENT_TOP_OFFSET)}px`,
                width: `${layout.width}px`
              }}
            >
              <div className="factory-circuit-load-icon">
                {loadRowIcons[slotKey] ?? null}
              </div>
              <div className="factory-circuit-load-copy">
                <strong>{row.labelZh}</strong>
                <small>{row.labelEn}</small>
                <span className={`factory-circuit-load-state tone-${row.statusTone}`}>{row.statusLabel}</span>
              </div>
              <b>
                {isConfiguring
                  ? displayPageCardConfiguringLabel
                  : `${formattedSharePercent}${shareUnit}`}
              </b>
            </article>
          );
        })}
      </section>

      {viewModel.kpis.map((metric, index) => {
        const kpiKey = kpiLayoutOrder[index]!;
        const cardState = resolvedConfig.kpiCardStates?.[kpiKey];
        if (cardState?.visible === false) {
          return null;
        }

        const layout = withContentOffset(resolvedConfig.kpiCards[kpiKey]);
        const cardStyle = createDisplayCardStyleConfig(resolvedConfig.cardStyles[kpiKey]);
        const isConfiguring = resolveDisplayPageCardStatus(cardState) === "configuring";
        const className =
          kpiLayoutOrder[index] === "flow" ? "factory-circuit-kpi-card factory-circuit-kpi-routing" : "factory-circuit-kpi-card";

        return (
          <DisplayCardFrame
            key={metric.label}
            surface="metric"
            cardStyle={cardStyle}
            className={className}
            title={metric.sourceTooltip}
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
                className: "h-full w-full",
                seedSource: seedConfig.iconSources.kpiCards[kpiLayoutOrder[index]!],
                source: resolvedConfig.iconSources.kpiCards[kpiLayoutOrder[index]!]
              })}
              subtitle={metric.helper}
              title={metric.label}
            />
            <DisplayCardValueRow
              align={cardStyle.valueRowAlign}
              unit={isConfiguring ? "" : metric.unit}
              value={isConfiguring ? displayPageCardConfiguringLabel : metric.value}
            />
            <DisplayCardFooter>
              {metric.freshnessView && !metric.freshnessView.liveVisuals ? (
                <span>
                  {metric.freshnessView.labelZh}
                  {" · "}
                  {metric.freshnessView.sourceTimestamp}
                </span>
              ) : (
                <Sparkline className="factory-circuit-kpi-sparkline" values={kpiSparklineValues[index]!} />
              )}
            </DisplayCardFooter>
          </DisplayCardFrame>
        );
      })}
    </>
  );
}
