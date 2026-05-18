import { useMemo } from "react";
import { solarAssetRuntimeMap } from "./assets";
import { useBodyClass } from "../../hooks/useBodyClass";
import { useDisplayPageConfig } from "../../hooks/useDisplayPageConfig";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import {
  createSolarDisplayPageSeedConfig,
  type SolarDisplayPageConfig
} from "./displayPageConfig";
import {
  solarTitleLayout
} from "./layout";
import "./solar.css";
import { buildSolarViewModel } from "./viewModel";

const CONTENT_TOP_OFFSET = 146;

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

function withContentOffset<T extends { top: number }>(layout: T) {
  return {
    ...layout,
    top: layout.top - CONTENT_TOP_OFFSET
  };
}

function splitSolarTitleLine(titleLine: string) {
  const emphasis = "新能量";

  if (!titleLine.endsWith(emphasis)) {
    return {
      emphasis: "",
      prefix: titleLine
    };
  }

  return {
    emphasis,
    prefix: titleLine.slice(0, -emphasis.length)
  };
}

export function Solar({ config }: { config?: SolarDisplayPageConfig }) {
  useBodyClass("page-hero-shell");
  const { isSocketConnected, snapshot } = useLiveMetrics();
  const seedConfig = useMemo(() => createSolarDisplayPageSeedConfig(solarAssetRuntimeMap.hero), []);
  const runtimeConfig = useDisplayPageConfig("solar", seedConfig, {
    enabled: config === undefined,
    stage: "live"
  });
  const viewModel = buildSolarViewModel({
    isSocketConnected,
    snapshot
  });
  const resolvedConfig = config ?? runtimeConfig.config;
  const solarTitleLine2 = splitSolarTitleLine(resolvedConfig.heroCopy.titleLines[1]);

  const titleLayout = withContentOffset(solarTitleLayout);
  const heroLayout = withContentOffset(resolvedConfig.heroContainer);
  const goldLineLayout = withContentOffset({
    left: 0,
    top: 500,
    width: 1075
  });
  const leafLayout = withContentOffset({
    height: 132,
    left: 565,
    top: 330,
    width: 190
  });

  return (
    <section className="solar-display-page">
      <div
        className="solar-leaf-watermark"
        style={{
          height: `${leafLayout.height}px`,
          left: `${leafLayout.left}px`,
          top: `${leafLayout.top}px`,
          width: `${leafLayout.width}px`
        }}
      />

      <div
        className="solar-gold-line"
        style={{
          left: `${goldLineLayout.left}px`,
          top: `${goldLineLayout.top}px`,
          width: `${goldLineLayout.width}px`
        }}
      />

      <section
        className="solar-title-group"
        style={{
          left: `${titleLayout.left}px`,
          top: `${titleLayout.top}px`,
          width: `${titleLayout.width}px`
        }}
      >
        <p className="solar-eyebrow">{resolvedConfig.heroCopy.eyebrow}</p>
        <h2 className="solar-display-title">
          {resolvedConfig.heroCopy.titleLines[0]}
          <br />
          {solarTitleLine2.prefix}
          {solarTitleLine2.emphasis ? <em>{solarTitleLine2.emphasis}</em> : null}
        </h2>
        <p className="solar-subtitle">
          {resolvedConfig.heroCopy.subtitleLines[0]}
          <span>{resolvedConfig.heroCopy.subtitleLines[1]}</span>
        </p>
      </section>

      <figure
        className="solar-hero-banner"
        style={{
          height: `${heroLayout.height}px`,
          left: `${heroLayout.left}px`,
          top: `${heroLayout.top}px`,
          width: `${heroLayout.width}px`
        }}
      >
        <img
          alt={resolvedConfig.heroMedia.alt}
          className="solar-hero-image"
          src={resolvedConfig.heroMedia.src}
        />
        <div className="solar-hero-fade" />
      </figure>

      {flowNodeOrder.map((flowItem, index) => {
        const node = viewModel.flowNodes[index]!;
        const layout = withContentOffset(resolvedConfig.flowNodes[flowItem.key]);
        const assetSrc = solarAssetRuntimeMap.flow[node.assetKey];

        return (
          <article
            key={node.label}
            className={[
              "solar-flow-node",
              flowItem.key === "co2" ? "solar-flow-node-co2" : ""
            ].join(" ")}
            style={{
              height: `${layout.height}px`,
              left: `${layout.left}px`,
              top: `${layout.top}px`,
              width: `${layout.width}px`
            }}
          >
            <img alt={node.label} className="solar-flow-icon" src={assetSrc} />
            <h3>{node.label}</h3>
            <p>{node.footnote}</p>
            <div className="solar-flow-value">{node.value}</div>
          </article>
        );
      })}

      {connectorOrder.map((connector) => {
        const layout = withContentOffset(resolvedConfig.connectors[connector.key]);

        return (
          <div
            key={connector.key}
            className={connector.className}
            style={{
              height: `${layout.height}px`,
              left: `${layout.left}px`,
              top: `${layout.top}px`,
              width: `${layout.width}px`
            }}
          />
        );
      })}

      {kpiCardOrder.map((cardItem, index) => {
        const metric = viewModel.kpis[index]!;
        const layout = withContentOffset(resolvedConfig.kpiCards[cardItem.key]);
        const assetSrc = solarAssetRuntimeMap.kpi[metric.iconKey];

        return (
          <article
            key={metric.label}
            className="solar-kpi-card"
            style={{
              height: `${layout.height}px`,
              left: `${layout.left}px`,
              top: `${layout.top}px`,
              width: `${layout.width}px`
            }}
          >
            <div className="solar-kpi-head">
              <img alt={metric.label} className="solar-kpi-icon" src={assetSrc} />
              <div>
                <h3>{metric.label}</h3>
                <p>{cardItem.englishLabel}</p>
              </div>
            </div>
            <div className="solar-kpi-value-row">
              <span className="solar-kpi-value">{metric.value}</span>
              <span className="solar-kpi-unit">{metric.unit}</span>
            </div>
            <p className="solar-kpi-helper">{metric.helper}</p>
          </article>
        );
      })}
    </section>
  );
}
