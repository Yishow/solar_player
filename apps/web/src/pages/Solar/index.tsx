import { useMemo } from "react";
import { resolveDisplayPageMediaSource } from "@solar-display/shared";
import { renderDisplayPageIcon } from "../../components/displayPageIconResolver";
import {
  DisplayCardFooter,
  DisplayCardFrame,
  DisplayCardHeader,
  DisplayCardValueRow
} from "../../components/displayPageCards";
import { createDisplayCardStyleConfig } from "../shared/displayCardStyleConfig";
import { buildDisplayPageMediaStyle } from "../displayPageMediaStyle";
import { solarAssetRuntimeMap } from "./assets";
import { useBodyClass } from "../../hooks/useBodyClass";
import {
  shouldDeferDisplayPageRuntimeRender,
  useDisplayPageConfig
} from "../../hooks/useDisplayPageConfig";
import { useDisplayStoryRuntime } from "../../hooks/useDisplayStoryRuntime";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import {
  createSolarDisplayPageSeedConfig,
  type SolarDisplayPageConfig,
  type SolarIconAssetSources
} from "./displayPageConfig";
import {
  resolveRuntimeFallbackBannerState,
  RuntimeConfigFallbackBanner
} from "../runtimeConfigHydration";
import {
  solarTitleLayout
} from "./layout";
import "../../components/displayPageCards.css";
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

const solarSeedIconAssetSources: SolarIconAssetSources = {
  flowNodes: {
    co2: solarAssetRuntimeMap.flow["carbon-reduction-display"],
    factory: solarAssetRuntimeMap.flow["factory-consumption-display"],
    inverter: solarAssetRuntimeMap.flow["inverter-display"],
    solar: solarAssetRuntimeMap.flow["solar-panel-display"]
  },
  kpiCards: {
    co2: solarAssetRuntimeMap.kpi["metric-co2-today"],
    efficiency: solarAssetRuntimeMap.kpi["metric-efficiency"],
    generation: solarAssetRuntimeMap.kpi["metric-generation-sun"],
    selfConsumption: solarAssetRuntimeMap.kpi["metric-self-consumption"],
    totalCo2: solarAssetRuntimeMap.kpi["metric-co2-total"]
  }
};

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

export function Solar({ config, pageId = "solar" }: { config?: SolarDisplayPageConfig; pageId?: string }) {
  useBodyClass("page-hero-shell");
  const { isSocketConnected, snapshot } = useLiveMetrics();
  const runtimeHydrationEnabled = config === undefined;
  const runtimeStage = "live" as const;
  const seedConfig = useMemo(
    () =>
      createSolarDisplayPageSeedConfig(
        solarAssetRuntimeMap.hero,
        "太陽能車棚與綠能展示場域",
        solarSeedIconAssetSources
      ),
    []
  );
  const runtimeConfig = useDisplayPageConfig(pageId, seedConfig, {
    enabled: runtimeHydrationEnabled,
    stage: runtimeStage
  });
  const solarStoryRuntime = useDisplayStoryRuntime("solar", {
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
  const viewModel = buildSolarViewModel({
    isSocketConnected,
    snapshot,
    solarStory: solarStoryRuntime.payload ?? undefined
  });
  const runtimeFallbackBanner = resolveRuntimeFallbackBannerState({
    configErrorMessage: runtimeHydrationEnabled ? runtimeConfig.errorMessage : "",
    runtimeErrorMessage: runtimeHydrationEnabled ? solarStoryRuntime.errorMessage : "",
    usesRuntimeFallback: solarStoryRuntime.usesFallback
  });
  const solarTitleLine2 = splitSolarTitleLine(resolvedConfig.heroCopy.titleLines[1]);
  const heroMediaSource = resolveDisplayPageMediaSource(resolvedConfig.heroMedia, seedConfig.heroMedia.src);
  const heroTypography = resolvedConfig.chrome.heroTypography;

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
      <RuntimeConfigFallbackBanner {...runtimeFallbackBanner} />
      <div
        className="solar-leaf-watermark"
        style={{
          height: `${leafLayout.height}px`,
          left: `${leafLayout.left + resolvedConfig.chrome.ornaments.leaf.offsetX}px`,
          opacity: resolvedConfig.chrome.ornaments.leaf.opacity,
          top: `${leafLayout.top + resolvedConfig.chrome.ornaments.leaf.offsetY}px`,
          transform: `scale(${resolvedConfig.chrome.ornaments.leaf.scale})`,
          width: `${leafLayout.width}px`
        }}
      />

      <div
        className="solar-gold-line"
        style={{
          height: `${resolvedConfig.chrome.ornaments.goldLine.thickness}px`,
          left: `${goldLineLayout.left}px`,
          opacity: resolvedConfig.chrome.ornaments.goldLine.opacity,
          top: `${goldLineLayout.top + resolvedConfig.chrome.ornaments.goldLine.offsetY}px`,
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
        <p
          className="solar-eyebrow"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.eyebrowFontSize}px`,
            letterSpacing: `${resolvedConfig.chrome.heroTypography.eyebrowLetterSpacing}px`,
            marginBottom: `${resolvedConfig.chrome.heroTypography.eyebrowMarginBottom}px`
          }}
        >
          {resolvedConfig.heroCopy.eyebrow}
        </p>
        <h2
          className="solar-display-title"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.titleFontSize}px`,
            letterSpacing: `${resolvedConfig.chrome.heroTypography.titleLetterSpacing}px`,
            lineHeight: resolvedConfig.chrome.heroTypography.titleLineHeight
          }}
        >
          {resolvedConfig.heroCopy.titleLines[0]}
          <br />
          {solarTitleLine2.prefix}
          {solarTitleLine2.emphasis ? (
            <em style={{ fontWeight: heroTypography.titleEmphasisWeight }}>{solarTitleLine2.emphasis}</em>
          ) : null}
        </h2>
        <p
          className="solar-subtitle"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.subtitleFontSize}px`,
            lineHeight: resolvedConfig.chrome.heroTypography.subtitleLineHeight,
            marginTop: `${resolvedConfig.chrome.heroTypography.subtitleMarginTop}px`
          }}
        >
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
          src={heroMediaSource ?? undefined}
          style={buildDisplayPageMediaStyle(resolvedConfig.heroMedia)}
        />
        <div className="solar-hero-fade" />
      </figure>

      {flowNodeOrder.map((flowItem, index) => {
        const node = viewModel.flowNodes[index]!;
        const layout = withContentOffset(resolvedConfig.flowNodes[flowItem.key]);

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
            {renderDisplayPageIcon({
              alt: node.label,
              className: "solar-flow-icon",
              seedSource: seedConfig.iconSources.flowNodes[flowItem.key],
              source: resolvedConfig.iconSources.flowNodes[flowItem.key]
            })}
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
        const cardStyle = createDisplayCardStyleConfig(resolvedConfig.cardStyles[cardItem.key]);

        return (
          <DisplayCardFrame
            cardStyle={cardStyle}
            key={metric.label}
            className="solar-kpi-card"
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
                className: "solar-kpi-icon",
                seedSource: seedConfig.iconSources.kpiCards[cardItem.key],
                source: resolvedConfig.iconSources.kpiCards[cardItem.key]
              })}
              subtitle={cardItem.englishLabel}
              title={metric.label}
            />
            <DisplayCardValueRow align={cardStyle.valueRowAlign} unit={metric.unit} value={metric.value} />
            <DisplayCardFooter>
              <p className="solar-kpi-helper">{metric.helper}</p>
            </DisplayCardFooter>
          </DisplayCardFrame>
        );
      })}
    </section>
  );
}
