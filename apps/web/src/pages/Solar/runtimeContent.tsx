import { useMemo } from "react";
import {
  displayPageCardConfiguringLabel,
  resolveDisplayPageCardStatus
} from "@solar-display/shared";
import { renderDisplayPageIcon } from "../../components/displayPageIconResolver";
import {
  DisplayCardFooter,
  DisplayCardFrame,
  DisplayCardHeader,
  DisplayCardValueRow
} from "../../components/displayPageCards";
import { useLiveMetricsSelector } from "../../hooks/useLiveMetrics";
import type { LiveMetricsStoreState } from "../../hooks/liveMetricsStore";
import type { LiveMetricReading, LiveMetricsSnapshot } from "../../services/socket";
import { createDisplayCardStyleConfig } from "../shared/displayCardStyleConfig";
import {
  buildFlowConnectorTreatmentStyle,
  buildFlowNodeTreatmentStyle,
  resolveFlowConnectorTreatmentConfig,
  resolveFlowNodeTreatmentConfig
} from "../shared/displayPageFlowTreatmentConfig";
import { buildSolarViewModel } from "./viewModel";
import type { SolarDisplayPageConfig } from "./displayPageConfig";
import { solarContentTopOffset } from "./layout";

const CONTENT_TOP_OFFSET = solarContentTopOffset;

const flowNodeOrder = [
  {
    assetKey: "solar-panel-display",
    key: "solar"
  },
  {
    assetKey: "inverter-display",
    key: "inverter"
  },
  {
    assetKey: "factory-consumption-display",
    key: "factory"
  },
  {
    assetKey: "carbon-reduction-display",
    key: "co2"
  }
] as const;

const kpiCardOrder = [
  {
    englishLabel: "Today's Generation",
    iconKey: "metric-generation-sun",
    key: "generation"
  },
  {
    englishLabel: "Self-consumption Ratio",
    iconKey: "metric-self-consumption",
    key: "selfConsumption"
  },
  {
    englishLabel: "Today's CO2 Reduction",
    iconKey: "metric-co2-today",
    key: "co2"
  },
  {
    englishLabel: "Total CO2 Reduction",
    iconKey: "metric-co2-total",
    key: "totalCo2"
  },
  {
    englishLabel: "System Efficiency",
    iconKey: "metric-efficiency",
    key: "efficiency"
  }
] as const;

const connectorOrder = [
  {
    className: "solar-connector",
    key: "solarToInverter"
  },
  {
    className: "solar-connector",
    key: "inverterToFactory"
  },
  {
    className: "solar-connector solar-connector-orange solar-connector-l",
    key: "inverterToCo2"
  }
] as const;

const solarRuntimeMetricKeys = [
  "realTimePower",
  "systemEfficiency",
  "selfConsumptionRatio",
  "todayGeneration",
  "todayCo2Reduction",
  "totalCo2Reduction"
] as const;

type SolarRuntimeSelection = {
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

function selectSolarRuntimeSelection(state: LiveMetricsStoreState): SolarRuntimeSelection {
  return {
    isSocketConnected: state.connectionState.status === "connected",
    readings: solarRuntimeMetricKeys.map((key) => state.snapshot.metrics[key] ?? null)
  };
}

function isSolarRuntimeSelectionEqual(
  current: SolarRuntimeSelection,
  next: SolarRuntimeSelection
) {
  return (
    current.isSocketConnected === next.isSocketConnected
    && current.readings.length === next.readings.length
    && current.readings.every((reading, index) => {
      return isLiveMetricReadingEqual(reading, next.readings[index] ?? null);
    })
  );
}

function buildSolarRuntimeSnapshot(readings: SolarRuntimeSelection["readings"]): LiveMetricsSnapshot {
  const metrics: LiveMetricsSnapshot["metrics"] = {};

  solarRuntimeMetricKeys.forEach((metricKey, index) => {
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

export function SolarRuntimeContent({
  resolvedConfig,
  seedConfig,
  solarStoryPayload
}: {
  resolvedConfig: SolarDisplayPageConfig;
  seedConfig: ReturnType<typeof import("./displayPageConfig").createSolarDisplayPageSeedConfig>;
  solarStoryPayload: Parameters<typeof buildSolarViewModel>[0]["solarStory"];
}) {
  const solarRuntimeSelection = useLiveMetricsSelector(
    selectSolarRuntimeSelection,
    isSolarRuntimeSelectionEqual
  );
  const snapshot = useMemo(
    () => buildSolarRuntimeSnapshot(solarRuntimeSelection.readings),
    [solarRuntimeSelection.readings]
  );
  const viewModel = useMemo(
    () =>
      buildSolarViewModel({
        isSocketConnected: solarRuntimeSelection.isSocketConnected,
        snapshot,
        solarStory: solarStoryPayload
      }),
    [solarRuntimeSelection.isSocketConnected, snapshot, solarStoryPayload]
  );
  const flowNodeItems = useMemo(
    () =>
      flowNodeOrder.map((flowItem) => {
        const layout = withContentOffset(resolvedConfig.flowNodes[flowItem.key]);
        const nodeTreatment = resolveFlowNodeTreatmentConfig(
          resolvedConfig.flowNodeTreatments[flowItem.key],
          seedConfig.flowNodeTreatments[flowItem.key]
        );
        return {
          className: [
            "solar-flow-node",
            flowItem.key === "co2" ? "solar-flow-node-co2" : ""
          ].join(" "),
          key: flowItem.key,
          seedSource: seedConfig.iconSources.flowNodes[flowItem.key],
          source: resolvedConfig.iconSources.flowNodes[flowItem.key],
          style: {
            height: `${layout.height}px`,
            left: `${layout.left}px`,
            top: `${layout.top}px`,
            width: `${layout.width}px`,
            ...buildFlowNodeTreatmentStyle(nodeTreatment)
          }
        };
      }),
    [resolvedConfig, seedConfig]
  );
  const connectorItems = useMemo(
    () =>
      connectorOrder.map((connector) => {
        const layout = withContentOffset(resolvedConfig.connectors[connector.key]);
        const treatment = resolveFlowConnectorTreatmentConfig(
          resolvedConfig.connectorTreatments[connector.key],
          seedConfig.connectorTreatments[connector.key]
        );
        return {
          className: connector.className,
          key: connector.key,
          style: {
            height: `${treatment.strokeWidth}px`,
            left: `${layout.left}px`,
            top: `${layout.top + (layout.height - treatment.strokeWidth) / 2}px`,
            width: `${layout.width}px`,
            ...buildFlowConnectorTreatmentStyle(treatment)
          }
        };
      }),
    [resolvedConfig, seedConfig]
  );
  const kpiCardItems = useMemo(
    () =>
      kpiCardOrder.map((cardItem) => ({
        cardStyle: createDisplayCardStyleConfig(resolvedConfig.cardStyles[cardItem.key]),
        englishLabel: cardItem.englishLabel,
        key: cardItem.key,
        seedSource: seedConfig.iconSources.kpiCards[cardItem.key],
        source: resolvedConfig.iconSources.kpiCards[cardItem.key],
        status: resolveDisplayPageCardStatus(resolvedConfig.kpiCardStates?.[cardItem.key]),
        visible: resolvedConfig.kpiCardStates?.[cardItem.key]?.visible !== false,
        style: (() => {
          const layout = withContentOffset(resolvedConfig.kpiCards[cardItem.key]);
          return {
            height: `${layout.height}px`,
            left: `${layout.left}px`,
            top: `${layout.top}px`,
            width: `${layout.width}px`
          };
        })()
      })),
    [resolvedConfig, seedConfig]
  );

  void connectorItems;

  return (
    <>
      {flowNodeItems.map((item, index) => {
        const node = viewModel.flowNodes[index]!;

        return (
          <article
            key={item.key}
            className={item.className}
            style={item.style}
          >
            {renderDisplayPageIcon({
              alt: node.label,
              className: "solar-flow-icon",
              seedSource: item.seedSource,
              source: item.source
            })}
            <h3>{node.label}</h3>
            <p>{node.footnote}</p>
            <div className="solar-flow-value">{node.value}</div>
          </article>
        );
      })}

      <div aria-hidden="true" className="solar-routing">
        {(() => {
          const startX = 1025;
          const endX = 1180;
          const width = endX - startX;
          return (
            <svg
              style={{
                position: "absolute",
                left: `${startX}px`,
                top: `${167 - 8}px`,
                width: `${width}px`,
                height: "16px",
                overflow: "visible",
                zIndex: 10
              }}
              viewBox={`0 0 ${width} 16`}
            >
              <line x1={0} y1={8} x2={width} y2={8} stroke="rgba(82, 125, 59, 0.25)" strokeWidth={2.5} strokeLinecap="round" />
              <line x1={0} y1={8} x2={width} y2={8} stroke="#527d3b" strokeWidth={2.5} strokeLinecap="round" className="solar-flow-line-1" />
              <circle cx={0} cy={8} r={5} fill="#527d3b" />
              <circle cx={width} cy={8} r={5} fill="#527d3b" />
            </svg>
          );
        })()}

        {(() => {
          const startX = 1410;
          const endX = 1550;
          const width = endX - startX;
          return (
            <svg
              style={{
                position: "absolute",
                left: `${startX}px`,
                top: `${167 - 8}px`,
                width: `${width}px`,
                height: "16px",
                overflow: "visible",
                zIndex: 10
              }}
              viewBox={`0 0 ${width} 16`}
            >
              <line x1={0} y1={8} x2={width} y2={8} stroke="rgba(82, 125, 59, 0.25)" strokeWidth={2.5} strokeLinecap="round" />
              <line x1={0} y1={8} x2={width} y2={8} stroke="#527d3b" strokeWidth={2.5} strokeLinecap="round" className="solar-flow-line-2" />
              <circle cx={0} cy={8} r={5} fill="#527d3b" />
              <circle cx={width} cy={8} r={5} fill="#527d3b" />
            </svg>
          );
        })()}

        {(() => {
          const startX = 1365;
          const startY = 257.27; // 碰 Inverter 下圓周 (1366.25, 257.27)
          const endX = 1545;  // 碰 Co2 左圓周 (1545, 499)
          const endY = 499;
          const width = endX - startX;
          const vHeight = endY - startY;
          return (
            <svg
              style={{
                position: "absolute",
                left: `${startX}px`,
                top: `${startY}px`,
                width: `${width}px`,
                height: `${vHeight + 8}px`,
                overflow: "visible",
                zIndex: 10
              }}
              viewBox={`0 0 ${width} ${vHeight + 8}`}
            >
              <path
                d={`M 1.25 0 V ${vHeight} H ${width}`}
                fill="none"
                stroke="rgba(234, 161, 30, 0.25)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={`M 1.25 0 V ${vHeight} H ${width}`}
                fill="none"
                stroke="#eaa11e"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="solar-flow-line-orange"
              />
              <circle cx={1.25} cy={0} r={5} fill="#eaa11e" />
              <circle cx={width} cy={vHeight} r={5} fill="#eaa11e" />
            </svg>
          );
        })()}
      </div>

      {kpiCardItems.map((item, index) => {
        if (!item.visible) {
          return null;
        }

        const metric = viewModel.kpis[index]!;
        const isConfiguring = item.status === "configuring";

        return (
          <DisplayCardFrame
            cardStyle={item.cardStyle}
            key={item.key}
            className="solar-kpi-card"
            surface="metric"
            style={item.style}
            title={metric.sourceTooltip}
          >
            <DisplayCardHeader
              icon={renderDisplayPageIcon({
                alt: metric.label,
                className: "solar-kpi-icon",
                seedSource: item.seedSource,
                source: item.source
              })}
              subtitle={item.englishLabel}
              title={metric.label}
            />
            <DisplayCardValueRow
              align={item.cardStyle.valueRowAlign}
              unit={isConfiguring ? "" : metric.unit}
              value={isConfiguring ? displayPageCardConfiguringLabel : metric.value}
            />
            <DisplayCardFooter>
              <p className="solar-kpi-helper">{metric.helper}</p>
            </DisplayCardFooter>
          </DisplayCardFrame>
        );
      })}
    </>
  );
}
