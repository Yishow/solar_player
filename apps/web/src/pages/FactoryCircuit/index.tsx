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
  buildFlowNodeTreatmentStyle,
  resolveFlowConnectorTreatmentConfig,
  resolveFlowNodeTreatmentConfig
} from "../shared/displayPageFlowTreatmentConfig";
import {
  buildFactoryLoadRowRhythmStyle,
  resolveFactoryLoadRowRhythmConfig
} from "../shared/displayPageFhdRhythmConfig";
import {
  createFactoryCircuitDisplayPageSeedConfig,
  type FactoryCircuitDisplayPageConfig
} from "./displayPageConfig";
import {
  factoryCircuitContentTopOffset,
  factoryCircuitGoldLayout,
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

const CONTENT_TOP_OFFSET = factoryCircuitContentTopOffset;
const factoryLineLeafReferenceUrl = new URL(
  "./assets/factory-line-leaf-reference.png",
  import.meta.url
).href;
const factoryLeafWatermarkReferenceUrl = new URL(
  "./assets/factory-leaf-watermark-reference.png",
  import.meta.url
).href;
const factoryLeafVineReferenceUrl = new URL(
  "./assets/factory-leaf-vine-reference.png",
  import.meta.url
).href;
function withContentOffset<T extends { top: number }>(layout: T) {
  return {
    ...layout,
    top: layout.top - CONTENT_TOP_OFFSET
  };
}

type RoutingPoint = { x: number; y: number };
type RoutingRect = { height: number; left: number; top: number; width: number };

function rectRightCenter(rect: RoutingRect): RoutingPoint {
  return { x: rect.left + rect.width, y: rect.top + rect.height / 2 };
}

function rectLeftCenter(rect: RoutingRect): RoutingPoint {
  return { x: rect.left, y: rect.top + rect.height / 2 };
}

function rectLoadRowAnchor(rect: RoutingRect): RoutingPoint {
  return { x: rect.left, y: rect.top + rect.height / 2 };
}

function straightRoutePath(from: RoutingPoint, to: RoutingPoint): string {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

// 忠實復刻 reference routing：自配電盤水平送至靠近配電盤的垂直主幹（bus），
// 以「圓角」轉折（quarter-circle arc）分支向右接到各負載，末端為實心圓點。
// 圓角是 reference 的關鍵質感；硬直角會顯廉價。
function roundedCombPath(from: RoutingPoint, to: RoutingPoint, busX: number): string {
  const radius = 12;
  const dy = to.y - from.y;
  if (Math.abs(dy) < radius * 2) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }
  const dir = dy > 0 ? 1 : -1;
  return [
    `M ${from.x} ${from.y}`,
    `L ${busX - radius} ${from.y}`,
    `Q ${busX} ${from.y} ${busX} ${from.y + dir * radius}`,
    `L ${busX} ${to.y - dir * radius}`,
    `Q ${busX} ${to.y} ${busX + radius} ${to.y}`,
    `L ${to.x} ${to.y}`
  ].join(" ");
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
    <img
      alt=""
      className={className}
      draggable={false}
      src={factoryLineLeafReferenceUrl}
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
    <img
      alt=""
      aria-hidden="true"
      className={className}
      draggable={false}
      src={factoryLeafWatermarkReferenceUrl}
      style={style}
    />
  );
}

function FactoryCircuitLeafVine({
  className,
  style
}: {
  className: string;
  style: CSSProperties;
}) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className={className}
      draggable={false}
      src={factoryLeafVineReferenceUrl}
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

  const runtimeResolvedConfig = config ?? runtimeConfig.config;
  const resolvedConfig: FactoryCircuitDisplayPageConfig = {
    ...runtimeResolvedConfig,
    rhythm: {
      ...seedConfig.rhythm,
      ...(runtimeResolvedConfig.rhythm ?? {})
    }
  };
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
  const loadRowRhythm = resolveFactoryLoadRowRhythmConfig(
    resolvedConfig.rhythm.factoryLoadRows,
    seedConfig.rhythm.factoryLoadRows
  );

  const titleLayout = withContentOffset(factoryCircuitTitleLayout);
  const copyLayout = withContentOffset(resolvedConfig.textBlocks.copy);
  const goldLayout = withContentOffset(factoryCircuitGoldLayout);
  const solarNode = withContentOffset(resolvedConfig.nodes.solar);
  const inverterNode = withContentOffset(resolvedConfig.nodes.inverter);
  const boardNode = withContentOffset(resolvedConfig.nodes.board);
  const solarToInverterTreatment = resolveFlowConnectorTreatmentConfig(
    resolvedConfig.connectorTreatments.solarToInverter,
    seedConfig.connectorTreatments.solarToInverter
  );
  const inverterToBoardTreatment = resolveFlowConnectorTreatmentConfig(
    resolvedConfig.connectorTreatments.inverterToBoard,
    seedConfig.connectorTreatments.inverterToBoard
  );
  const boardRight = rectRightCenter(boardNode);
  const loadBranches = loadRowOrder.map((loadRowKey) => {
    const loadRow = withContentOffset(resolvedConfig.loadRows[loadRowKey]);
    return { anchor: rectLoadRowAnchor(loadRow), key: `boardTo-${loadRowKey}` };
  });
  // 垂直 bus 緊鄰配電盤（board 右側 + 30），分支以圓角向右延伸至各負載，貼近 reference。
  const loadBusX = boardRight.x + 30;
  const routingPaths = [
    {
      key: "solarToInverter",
      treatment: solarToInverterTreatment,
      d: straightRoutePath(rectRightCenter(solarNode), rectLeftCenter(inverterNode))
    },
    {
      key: "inverterToBoard",
      treatment: inverterToBoardTreatment,
      d: straightRoutePath(rectRightCenter(inverterNode), rectLeftCenter(boardNode))
    },
    ...loadBranches.map((branch) => ({
      key: branch.key,
      treatment: inverterToBoardTreatment,
      d: roundedCombPath(boardRight, branch.anchor, loadBusX)
    }))
  ];

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
          height: "56px",
          left: "420px",
          top: `${374 - CONTENT_TOP_OFFSET}px`,
          width: "140px"
        }}
      />

      <FactoryCircuitLeafWatermark
        className="factory-circuit-leaf-watermark display-surface-leaf-ornament"
        style={{
          height: "148px",
          left: `${552 + resolvedConfig.chrome.ornaments.leaf.offsetX}px`,
          opacity: Math.min(1, resolvedConfig.chrome.ornaments.leaf.opacity / seedConfig.chrome.ornaments.leaf.opacity),
          top: `${585 - CONTENT_TOP_OFFSET + resolvedConfig.chrome.ornaments.leaf.offsetY}px`,
          transform: `scale(${resolvedConfig.chrome.ornaments.leaf.scale})`,
          transformOrigin: "center",
          width: "268px"
        }}
      />

      <FactoryCircuitLeafVine
        className="factory-circuit-leaf-vine"
        style={{
          height: "76px",
          left: "0px",
          top: `${680 - CONTENT_TOP_OFFSET}px`,
          width: "650px"
        }}
      />

      {viewModel.flowNodes.map((node) => {
        const layout = withContentOffset(resolvedConfig.nodes[node.key]);
        const nodeTreatment = resolveFlowNodeTreatmentConfig(
          resolvedConfig.nodeTreatments[node.key],
          seedConfig.nodeTreatments[node.key]
        );
        return (
          <article
            key={node.label}
            className={["factory-circuit-node", "display-node-frame", `factory-circuit-node-${node.key}`].join(" ")}
            style={{
              height: `${layout.height}px`,
              left: `${layout.left}px`,
              top: `${layout.top}px`,
              width: `${layout.width}px`,
              ...buildFlowNodeTreatmentStyle(nodeTreatment)
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

      <svg
        aria-hidden="true"
        className="factory-circuit-routing-svg"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        {routingPaths.map((route) => (
          <path
            key={route.key}
            d={route.d}
            data-route-key={route.key}
            fill="none"
            stroke={route.treatment.strokeColor}
            strokeWidth={route.treatment.strokeWidth}
            opacity={route.treatment.opacity}
            strokeLinecap={route.treatment.lineCap}
            strokeLinejoin="round"
          />
        ))}
        {loadBranches.map((branch) => (
          <circle
            key={`dot-${branch.key}`}
            cx={branch.anchor.x}
            cy={branch.anchor.y}
            r={4}
            fill={inverterToBoardTreatment.strokeColor}
          />
        ))}
      </svg>

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
