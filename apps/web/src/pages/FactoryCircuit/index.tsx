import type { CircuitConfig, DisplayPageFreeformObject } from "@solar-display/shared";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DisplayPageObjectLayer } from "../../components/DisplayPageObjectLayer";
import {
  DisplayCardFooter,
  DisplayCardFrame,
  DisplayCardHeader,
  DisplayCardValueRow
} from "../../components/displayPageCards";
import { DisplayPageLoadingState } from "../../components/DisplayPageLoadingState";
import { renderDisplayPageIcon } from "../../components/displayPageIconResolver";
import { Sparkline } from "../../components/Sparkline";
import { useBodyClass } from "../../hooks/useBodyClass";
import {
  shouldDeferDisplayPageRuntimeRender,
  useDisplayPageConfig
} from "../../hooks/useDisplayPageConfig";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import { useDisplayStoryRuntime } from "../../hooks/useDisplayStoryRuntime";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import { trendSeries } from "../../mocks/metrics";
import { requestJson } from "../../services/api";
import {
  resolveRuntimeFallbackBannerState,
  RuntimeConfigFallbackBanner
} from "../runtimeConfigHydration";
import {
  createFactoryCircuitDisplayPageSeedConfig,
  type FactoryCircuitDisplayPageConfig
} from "./displayPageConfig";
import {
  factoryCircuitContentTopOffset,
  factoryCircuitGoldLayout,
  factoryCircuitLeafLayout,
  factoryCircuitTitleLayout
} from "./layout";
import { resolveDisplayPageRuntimeRefreshSpec } from "../runtimeRefreshRegistry";
import "../../components/displayPageCards.css";
import "./factoryCircuit.css";
import {
  buildFactoryCircuitRuntimes,
  buildFactoryCircuitViewModel,
  type FactoryCircuitLoadState,
  type FactoryCircuitRuntime
} from "./viewModel";
import {
  FactoryCircuitReferenceSprite,
  factoryCircuitReferenceLeafRegions
} from "./iconRegistry";

const CONTENT_TOP_OFFSET = factoryCircuitContentTopOffset;

function withContentOffset<T extends { top: number }>(layout: T) {
  return {
    ...layout,
    top: layout.top - CONTENT_TOP_OFFSET
  };
}

const kpiLayoutOrder = [
  "totalPower",
  "solarShare",
  "selfConsumption",
  "peak",
  "flow"
] as const;

const loadRowOrder = [
  "production",
  "hvac",
  "lighting",
  "office",
  "ev",
  "infrastructure"
] as const;

function FactoryCircuitLineLeaf({
  className,
  style
}: {
  className: string;
  style: CSSProperties;
}) {
  return (
    <FactoryCircuitReferenceSprite
      className={className}
      region={factoryCircuitReferenceLeafRegions.lineLeaf}
      style={style}
    />
  );
}

function FactoryCircuitLeafWatermark({
  className,
  style
}: {
  className: string;
  style: CSSProperties;
}) {
  return (
    <FactoryCircuitReferenceSprite
      className={className}
      region={factoryCircuitReferenceLeafRegions.watermarkLeaf}
      style={style}
    />
  );
}

export function FactoryCircuit({
  config,
  pageId = "factory-circuit"
}: {
  config?: FactoryCircuitDisplayPageConfig;
  pageId?: string;
}) {
  useBodyClass("page-hero-shell");
  const { connectionState, snapshot } = useLiveMetrics();
  const runtimeHydrationEnabled = config === undefined;
  const runtimeStage = "live" as const;
  const seedConfig = useMemo(() => createFactoryCircuitDisplayPageSeedConfig(), []);
  const runtimeConfig = useDisplayPageConfig(pageId, seedConfig, {
    enabled: runtimeHydrationEnabled,
    stage: runtimeStage
  });
  const [circuits, setCircuits] = useState<FactoryCircuitRuntime[]>([]);
  const [loadState, setLoadState] = useState<FactoryCircuitLoadState>("loading");
  const circuitsRef = useRef<FactoryCircuitRuntime[]>([]);
  const requestIdRef = useRef(0);
  const loadCircuitsRef = useRef<(mode: "bootstrap" | "refresh") => Promise<void>>(async () => { });
  const mountedRef = useRef(true);

  useEffect(() => {
    circuitsRef.current = circuits;
  }, [circuits]);

  const factoryCircuitRefreshSpec = useMemo(
    () => resolveDisplayPageRuntimeRefreshSpec("factory-circuit"),
    []
  );

  loadCircuitsRef.current = async (mode) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (mode === "bootstrap" && circuitsRef.current.length === 0) {
      setLoadState("loading");
    }

    try {
      const data = await requestJson<{ success: boolean; data: CircuitConfig[] }>("/api/circuits");

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      setCircuits(buildFactoryCircuitRuntimes(data.data));
      setLoadState("ready");
    } catch {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      setLoadState("error");
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    void loadCircuitsRef.current("bootstrap");

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  useDisplaySyncRefresh(
    async () => {
      await loadCircuitsRef.current("refresh");
    },
    factoryCircuitRefreshSpec.fallbackRefreshScopes
  );
  const circuitDependencyKey = useMemo(
    () =>
      circuits
        .map((circuit) => `${circuit.id}:${circuit.displaySlot ?? "na"}:${circuit.enabled ? "on" : "off"}`)
        .join("|"),
    [circuits]
  );
  const factoryStoryRuntime = useDisplayStoryRuntime("factory-circuit", {
    dependencyKey: circuitDependencyKey,
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
  const viewModel = buildFactoryCircuitViewModel({
    circuits,
    connectionState,
    loadState,
    snapshot,
    factoryCircuitStory: factoryStoryRuntime.payload ?? undefined
  });
  const runtimeFallbackBanner = resolveRuntimeFallbackBannerState({
    configErrorMessage: runtimeHydrationEnabled ? runtimeConfig.errorMessage : "",
    runtimeErrorMessage: runtimeHydrationEnabled ? factoryStoryRuntime.errorMessage : "",
    usesRuntimeFallback: factoryStoryRuntime.usesFallback
  });
  const heroTypography = resolvedConfig.chrome.heroTypography;
  const freeformObjects =
    (resolvedConfig as typeof resolvedConfig & { freeformObjects?: DisplayPageFreeformObject[] }).freeformObjects ?? [];

  const titleLayout = withContentOffset(factoryCircuitTitleLayout);
  const copyLayout = withContentOffset(resolvedConfig.textBlocks.copy);
  const goldLayout = withContentOffset(factoryCircuitGoldLayout);
  const leafLayout = withContentOffset(factoryCircuitLeafLayout);
  const powerConnectors = Object.keys(resolvedConfig.connectors).map((connectorKey) => {
    const layout = withContentOffset(
      resolvedConfig.connectors[connectorKey as keyof typeof resolvedConfig.connectors]
    );
    const endX = layout.left + layout.width;
    const chevronOffsets = [30, 16];

    return {
      chevrons: chevronOffsets.map((offset) => {
        const leftX = endX - offset;
        return `M${leftX} ${layout.top - 10} L${leftX + 12} ${layout.top} L${leftX} ${layout.top + 10}`;
      }),
      key: connectorKey,
      linePath: `M${layout.left} ${layout.top} H${endX}`
    };
  });

  return (
    <section className="factory-circuit-display-page">
      <RuntimeConfigFallbackBanner {...runtimeFallbackBanner} />
      <section
        className="factory-circuit-title display-surface-hero-group"
        style={{
          left: `${titleLayout.left}px`,
          top: `${titleLayout.top}px`,
          width: `${titleLayout.width}px`
        }}
      >
        <p
          className="factory-circuit-eyebrow display-surface-hero-eyebrow"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.eyebrowFontSize}px`,
            letterSpacing: `${resolvedConfig.chrome.heroTypography.eyebrowLetterSpacing}px`,
            marginBottom: `${resolvedConfig.chrome.heroTypography.eyebrowMarginBottom}px`
          }}
        >
          {resolvedConfig.hero.eyebrow}
        </p>
        <h2
          className="factory-circuit-display-title display-surface-hero-title"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.titleFontSize}px`,
            fontWeight: heroTypography.titleEmphasisWeight,
            letterSpacing: `${resolvedConfig.chrome.heroTypography.titleLetterSpacing}px`,
            lineHeight: resolvedConfig.chrome.heroTypography.titleLineHeight
          }}
        >
          {resolvedConfig.hero.title}
        </h2>
        <p
          className="factory-circuit-subtitle display-surface-hero-subtitle"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.subtitleFontSize}px`,
            lineHeight: resolvedConfig.chrome.heroTypography.subtitleLineHeight,
            marginTop: `${resolvedConfig.chrome.heroTypography.subtitleMarginTop}px`
          }}
        >
          {resolvedConfig.hero.subtitle}
        </p>
      </section>

      <p
        className="factory-circuit-copy"
        style={{
          left: `${copyLayout.left}px`,
          top: `${copyLayout.top}px`,
          width: `${copyLayout.width}px`
        }}
      >
        {resolvedConfig.hero.copyZhLines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
        <span className="factory-circuit-copy-en">
          {resolvedConfig.hero.copyEnLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </span>
      </p>

      <div
        className="factory-circuit-gold-line display-surface-gold-line"
        style={{
          height: `${resolvedConfig.chrome.ornaments.goldLine.thickness}px`,
          left: `${goldLayout.left}px`,
          opacity: resolvedConfig.chrome.ornaments.goldLine.opacity,
          top: `${goldLayout.top + resolvedConfig.chrome.ornaments.goldLine.offsetY}px`,
          width: `${goldLayout.width}px`
        }}
      />

      <FactoryCircuitLineLeaf
        className="factory-circuit-line-leaf"
        style={{
          height: "62px",
          left: `${goldLayout.left + 376}px`,
          top: `${goldLayout.top - 28}px`,
          width: "116px"
        }}
      />

      <FactoryCircuitLeafWatermark
        className="factory-circuit-leaf-watermark display-surface-leaf-ornament"
        style={{
          height: `${leafLayout.height}px`,
          left: `${leafLayout.left + resolvedConfig.chrome.ornaments.leaf.offsetX}px`,
          opacity: Math.min(1, resolvedConfig.chrome.ornaments.leaf.opacity / seedConfig.chrome.ornaments.leaf.opacity),
          top: `${leafLayout.top + resolvedConfig.chrome.ornaments.leaf.offsetY}px`,
          transform: `rotate(-10deg) scale(${resolvedConfig.chrome.ornaments.leaf.scale})`,
          transformOrigin: "50% 50%",
          width: `${leafLayout.width}px`
        }}
      />

      {viewModel.flowNodes.map((node) => {
        const layout = withContentOffset(resolvedConfig.nodes[node.key]);
        return (
          <article
            key={node.label}
            className={["factory-circuit-node", "display-node-frame", `factory-circuit-node-${node.key}`].join(" ")}
            style={{
              height: `${layout.height}px`,
              left: `${layout.left}px`,
              top: `${layout.top}px`,
              width: `${layout.width}px`
            }}
          >
            <div className="display-node-icon">
              {renderDisplayPageIcon({
                alt: node.label,
                className: "h-full w-full",
                seedSource: seedConfig.iconSources.nodes[node.key],
                source: resolvedConfig.iconSources.nodes[node.key]
              })}
            </div>
            <h3 className="display-node-title">{node.label}</h3>
            <p className="display-node-subtitle">{node.subtitle}</p>
          </article>
        );
      })}

      <svg aria-hidden="true" className="factory-circuit-routing" viewBox="0 0 1920 1080">
        <g className="routing-power-chain">
          {powerConnectors.map((connector) => (
            <g key={connector.key}>
              <path className="routing-power-flow" d={connector.linePath} />
              {connector.chevrons.map((path, index) => (
                <path key={`${connector.key}-${index}`} className="routing-power-chevron" d={path} />
              ))}
            </g>
          ))}
        </g>
        <g className="routing-load-tree">
          <path className="routing-trunk" d="M1320 78 V553" />
          <path className="routing-board-branch" d="M1258 330 H1294 C1309 330 1320 318 1320 303" />
          <path className="routing-branch" d="M1320 102 C1320 88 1332 78 1346 78 H1382" />
          <path className="routing-branch" d="M1320 197 C1320 183 1332 173 1346 173 H1382" />
          <path className="routing-branch" d="M1320 292 C1320 278 1332 268 1346 268 H1382" />
          <path className="routing-branch" d="M1320 387 C1320 373 1332 363 1346 363 H1382" />
          <path className="routing-branch" d="M1320 482 C1320 468 1332 458 1346 458 H1382" />
          <path className="routing-branch" d="M1320 529 C1320 543 1332 553 1346 553 H1382" />
          <circle cx="1382" cy="78" r="5" />
          <circle cx="1382" cy="173" r="5" />
          <circle cx="1382" cy="268" r="5" />
          <circle cx="1382" cy="363" r="5" />
          <circle cx="1382" cy="458" r="5" />
          <circle cx="1382" cy="553" r="5" />
        </g>
      </svg>

      <section
        className="factory-circuit-load-panel"
        style={{
          height: `${resolvedConfig.loadPanel.height}px`,
          left: `${resolvedConfig.loadPanel.left}px`,
          top: `${resolvedConfig.loadPanel.top - CONTENT_TOP_OFFSET}px`,
          width: `${resolvedConfig.loadPanel.width}px`
        }}
      >
        {viewModel.loadRows.map((row, index) => {
          const layout = withContentOffset(resolvedConfig.loadRows[loadRowOrder[index]!]);
          return (
            <article
              key={`${row.labelZh}-${index}`}
              className="factory-circuit-load-row"
              style={{
                height: `${layout.height}px`,
                left: `${layout.left - resolvedConfig.loadPanel.left}px`,
                top: `${layout.top - (resolvedConfig.loadPanel.top - CONTENT_TOP_OFFSET)}px`,
                width: `${layout.width}px`
              }}
            >
              <div className="factory-circuit-load-icon">
                {renderDisplayPageIcon({
                  alt: row.labelZh,
                  className: "h-full w-full",
                  seedSource: seedConfig.iconSources.loadRows[loadRowOrder[index]!],
                  source: resolvedConfig.iconSources.loadRows[loadRowOrder[index]!]
                })}
              </div>
              <div className="factory-circuit-load-copy">
                <strong>{row.labelZh}</strong>
                <small>{row.labelEn}</small>
                <span className={`factory-circuit-load-state tone-${row.statusTone}`}>{row.statusLabel}</span>
              </div>
              <b>{row.isEmpty ? `${row.fallbackSharePercent}%` : `${row.sharePercent}%`}</b>
            </article>
          );
        })}
      </section>

      {viewModel.kpis.map((metric, index) => {
        const layout = withContentOffset(resolvedConfig.kpiCards[kpiLayoutOrder[index]!]);
        const className =
          kpiLayoutOrder[index] === "flow" ? "factory-circuit-kpi-card factory-circuit-kpi-routing" : "factory-circuit-kpi-card";

        return (
          <DisplayCardFrame
            key={metric.label}
            surface="metric"
            className={className}
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
            <DisplayCardValueRow unit={metric.unit} value={metric.value} />
            <DisplayCardFooter>
              <Sparkline className="factory-circuit-kpi-sparkline" values={trendSeries.map((value) => value - index * 1.5)} />
            </DisplayCardFooter>
          </DisplayCardFrame>
        );
      })}
      <DisplayPageObjectLayer objects={freeformObjects} />
    </section>
  );
}
