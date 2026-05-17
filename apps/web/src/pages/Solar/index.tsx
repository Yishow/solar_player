import { solarAssetRuntimeMap } from "./assets";
import { useBodyClass } from "../../hooks/useBodyClass";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import {
  solarConnectorLayout,
  solarFlowNodeLayout,
  solarHeroLayout,
  solarKpiLayout,
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

function withContentOffset<T extends { top: number }>(layout: T) {
  return {
    ...layout,
    top: layout.top - CONTENT_TOP_OFFSET
  };
}

export function Solar() {
  useBodyClass("page-hero-shell");
  const { isSocketConnected, snapshot } = useLiveMetrics();
  const viewModel = buildSolarViewModel({
    isSocketConnected,
    snapshot
  });

  const titleLayout = withContentOffset(solarTitleLayout);
  const heroLayout = withContentOffset(solarHeroLayout);
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
        <p className="solar-eyebrow">{viewModel.hero.eyebrow}</p>
        <h2 className="solar-display-title">
          {viewModel.hero.titleLines[0]}
          <br />
          製造<em>新能量</em>
        </h2>
        <p className="solar-subtitle">
          {viewModel.hero.subtitleLines[0]}
          <span>{viewModel.hero.subtitleLines[1]}</span>
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
          alt="太陽能車棚與綠能展示場域"
          className="solar-hero-image"
          src={solarAssetRuntimeMap.hero}
        />
        <div className="solar-hero-fade" />
      </figure>

      {flowNodeOrder.map((flowItem, index) => {
        const node = viewModel.flowNodes[index]!;
        const layout = withContentOffset(solarFlowNodeLayout[flowItem.key]);
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

      <div
        className="solar-connector"
        style={{
          height: `${solarConnectorLayout.solarToInverter.height}px`,
          left: `${solarConnectorLayout.solarToInverter.left}px`,
          top: `${solarConnectorLayout.solarToInverter.top - CONTENT_TOP_OFFSET}px`,
          width: `${solarConnectorLayout.solarToInverter.width}px`
        }}
      />
      <div
        className="solar-connector"
        style={{
          height: `${solarConnectorLayout.inverterToFactory.height}px`,
          left: `${solarConnectorLayout.inverterToFactory.left}px`,
          top: `${solarConnectorLayout.inverterToFactory.top - CONTENT_TOP_OFFSET}px`,
          width: `${solarConnectorLayout.inverterToFactory.width}px`
        }}
      />
      <div
        className="solar-connector solar-connector-orange solar-connector-l"
        style={{
          height: `${solarConnectorLayout.inverterToCo2.height}px`,
          left: `${solarConnectorLayout.inverterToCo2.left}px`,
          top: `${solarConnectorLayout.inverterToCo2.top - CONTENT_TOP_OFFSET}px`,
          width: `${solarConnectorLayout.inverterToCo2.width}px`
        }}
      />

      {kpiCardOrder.map((cardItem, index) => {
        const metric = viewModel.kpis[index]!;
        const layout = withContentOffset(solarKpiLayout[cardItem.key]);
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
