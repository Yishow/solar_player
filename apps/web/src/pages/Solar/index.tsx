import { useMemo, type CSSProperties } from "react";
import type { DisplayPageFreeformObject } from "@solar-display/shared";
import { resolveDisplayPageMediaSource } from "@solar-display/shared";
import { DisplayPageObjectLayer } from "../../components/DisplayPageObjectLayer";
import { renderDisplayPageIcon } from "../../components/displayPageIconResolver";
import {
  DisplayCardFooter,
  DisplayCardFrame,
  DisplayCardHeader,
  DisplayCardValueRow
} from "../../components/displayPageCards";
import { DisplayPageLoadingState } from "../../components/DisplayPageLoadingState";
import { createDisplayCardStyleConfig } from "../shared/displayCardStyleConfig";
import {
  createGoldLineChromeConfig,
  createLeafOrnamentChromeConfig
} from "../shared/displayPageChromeConfig";
import {
  buildFlowConnectorTreatmentStyle,
  buildFlowNodeTreatmentStyle,
  resolveFlowConnectorTreatmentConfig,
  resolveFlowNodeTreatmentConfig
} from "../shared/displayPageFlowTreatmentConfig";
import { DisplayLeafOrnament } from "../shared/DisplayLeafOrnament";
import { buildDisplayPageMediaPresentation } from "../displayPageMediaStyle";
import { solarHeroMediaEffectResolverOptions } from "../shared/displayPageMediaEffectConfig";
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
  solarContentTopOffset,
  solarTitleLayout
} from "./layout";
import "../../components/displayPageCards.css";
import "./solar.css";
import { buildSolarViewModel } from "./viewModel";

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

  const runtimeResolvedConfig = config ?? runtimeConfig.config;
  const resolvedConfig = useMemo<SolarDisplayPageConfig>(() => {
    const runtimeChrome = runtimeResolvedConfig.chrome ?? seedConfig.chrome;
    const runtimeOrnaments = runtimeChrome.ornaments ?? seedConfig.chrome.ornaments;
    return {
      ...runtimeResolvedConfig,
      chrome: {
        ...seedConfig.chrome,
        ...runtimeChrome,
        ornaments: {
          ...seedConfig.chrome.ornaments,
          ...runtimeOrnaments,
          goldLine: createGoldLineChromeConfig({
            ...seedConfig.chrome.ornaments.goldLine,
            ...(runtimeOrnaments.goldLine ?? {})
          }),
          leaf: createLeafOrnamentChromeConfig({
            ...seedConfig.chrome.ornaments.leaf,
            ...(runtimeOrnaments.leaf ?? {})
          })
        }
      }
    };
  }, [runtimeResolvedConfig, seedConfig]);
  const solarStoryPayload = solarStoryRuntime.payload ?? undefined;
  const viewModel = useMemo(
    () =>
      buildSolarViewModel({
        isSocketConnected,
        snapshot,
        solarStory: solarStoryPayload
      }),
    [isSocketConnected, snapshot, solarStoryPayload]
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

  const runtimeFallbackBanner = resolveRuntimeFallbackBannerState({
    configErrorMessage: runtimeHydrationEnabled ? runtimeConfig.errorMessage : "",
    runtimeErrorMessage: runtimeHydrationEnabled ? solarStoryRuntime.errorMessage : "",
    usesRuntimeFallback: solarStoryRuntime.usesFallback
  });
  const solarTitleLine2 = useMemo(
    () => splitSolarTitleLine(resolvedConfig.heroCopy.titleLines[1]),
    [resolvedConfig.heroCopy.titleLines]
  );
  const heroMediaSource = useMemo(
    () => resolveDisplayPageMediaSource(resolvedConfig.heroMedia, seedConfig.heroMedia.src),
    [resolvedConfig.heroMedia, seedConfig.heroMedia.src]
  );
  const heroMediaPresentation = useMemo(
    () =>
      buildDisplayPageMediaPresentation(
        resolvedConfig.heroMedia,
        solarHeroMediaEffectResolverOptions
      ),
    [resolvedConfig.heroMedia]
  );
  const heroTypography = resolvedConfig.chrome.heroTypography;
  const freeformObjects =
    (resolvedConfig as typeof resolvedConfig & { freeformObjects?: DisplayPageFreeformObject[] }).freeformObjects ?? [];

  const titleLayout = useMemo(() => withContentOffset(solarTitleLayout), []);
  const heroLayout = useMemo(() => withContentOffset(resolvedConfig.heroContainer), [resolvedConfig.heroContainer]);
  const goldLineLayout = useMemo(
    () =>
      withContentOffset({
        left: resolvedConfig.chrome.ornaments.goldLine.baseLeft,
        top: resolvedConfig.chrome.ornaments.goldLine.baseTop,
        width: resolvedConfig.chrome.ornaments.goldLine.baseWidth
      }),
    [resolvedConfig.chrome.ornaments.goldLine]
  );
  const leafLayout = useMemo(
    () =>
      withContentOffset({
        height: resolvedConfig.chrome.ornaments.leaf.baseHeight,
        left: resolvedConfig.chrome.ornaments.leaf.baseLeft,
        top: resolvedConfig.chrome.ornaments.leaf.baseTop,
        width: resolvedConfig.chrome.ornaments.leaf.baseWidth
      }),
    [resolvedConfig.chrome.ornaments.leaf]
  );

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
    <section className="solar-display-page">
      <RuntimeConfigFallbackBanner {...runtimeFallbackBanner} />
      <DisplayLeafOrnament
        className="solar-leaf-watermark display-surface-leaf-ornament"
        config={resolvedConfig.chrome.ornaments.leaf}
        style={{
          "--display-leaf-rotation": `${resolvedConfig.chrome.ornaments.leaf.rotationDeg}deg`,
          height: `${leafLayout.height}px`,
          left: `${leafLayout.left + resolvedConfig.chrome.ornaments.leaf.offsetX}px`,
          opacity: resolvedConfig.chrome.ornaments.leaf.opacity,
          top: `${leafLayout.top + resolvedConfig.chrome.ornaments.leaf.offsetY}px`,
          transform: `scale(${resolvedConfig.chrome.ornaments.leaf.scale})`,
          width: `${leafLayout.width}px`
        } as CSSProperties & Record<"--display-leaf-rotation", string>}
      />

      <div
        className="solar-gold-line display-surface-gold-line"
        style={{
          "--display-gold-line-rotation": `${resolvedConfig.chrome.ornaments.goldLine.rotationDeg}deg`,
          height: `${resolvedConfig.chrome.ornaments.goldLine.thickness}px`,
          left: `${goldLineLayout.left}px`,
          opacity: resolvedConfig.chrome.ornaments.goldLine.opacity,
          top: `${goldLineLayout.top + resolvedConfig.chrome.ornaments.goldLine.offsetY}px`,
          width: `${goldLineLayout.width}px`
        } as CSSProperties & Record<"--display-gold-line-rotation", string>}
      />

      <section
        className="solar-title-group display-surface-hero-group"
        style={{
          left: `${titleLayout.left}px`,
          top: `${titleLayout.top}px`,
          width: `${titleLayout.width}px`
        }}
      >
        <p
          className="solar-eyebrow display-surface-hero-eyebrow"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.eyebrowFontSize}px`,
            letterSpacing: `${resolvedConfig.chrome.heroTypography.eyebrowLetterSpacing}px`,
            marginBottom: `${resolvedConfig.chrome.heroTypography.eyebrowMarginBottom}px`
          }}
        >
          {resolvedConfig.heroCopy.eyebrow}
        </p>
        <h2
          className="solar-display-title display-surface-hero-title"
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
            <em
              className="display-surface-hero-title-emphasis"
              style={{ fontWeight: heroTypography.titleEmphasisWeight }}
            >
              {solarTitleLine2.emphasis}
            </em>
          ) : null}
        </h2>
        <p
          className="solar-subtitle display-surface-hero-subtitle"
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
        className={`solar-hero-banner display-surface-media-stage${heroMediaPresentation.stageClassName ? ` ${heroMediaPresentation.stageClassName}` : ""}`}
        style={{
          height: `${heroLayout.height}px`,
          left: `${heroLayout.left}px`,
          top: `${heroLayout.top}px`,
          width: `${heroLayout.width}px`,
          ...heroMediaPresentation.stageStyle
        }}
      >
        <img
          alt={resolvedConfig.heroMedia.alt}
          className="solar-hero-image"
          src={heroMediaSource ?? undefined}
          style={heroMediaPresentation.mediaStyle}
        />
        {heroMediaPresentation.overlayLayers.map((layer) => (
          <div
            aria-hidden="true"
            className={layer.className}
            key={layer.id}
            style={layer.style}
          />
        ))}
      </figure>

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

      {connectorItems.map((item) => (
        <div
          key={item.key}
          className={item.className}
          style={item.style}
        />
      ))}

      {kpiCardItems.map((item, index) => {
        const metric = viewModel.kpis[index]!;

        return (
          <DisplayCardFrame
            cardStyle={item.cardStyle}
            key={item.key}
            className="solar-kpi-card"
            surface="metric"
            style={item.style}
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
            <DisplayCardValueRow align={item.cardStyle.valueRowAlign} unit={metric.unit} value={metric.value} />
            <DisplayCardFooter>
              <p className="solar-kpi-helper">{metric.helper}</p>
            </DisplayCardFooter>
          </DisplayCardFrame>
        );
      })}
      <DisplayPageObjectLayer objects={freeformObjects} />
    </section>
  );
}
