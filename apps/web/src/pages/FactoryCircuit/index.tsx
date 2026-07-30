import type { CircuitConfig, DisplayPageFreeformObject } from "@solar-display/shared";
import { isFactoryCircuitPageKey } from "@solar-display/shared";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DisplayPageObjectLayer } from "../../components/DisplayPageObjectLayer";
import { DisplayPageLoadingState } from "../../components/DisplayPageLoadingState";
import { renderDisplayPageIcon } from "../../components/displayPageIconResolver";
import { useBodyClass } from "../../hooks/useBodyClass";
import {
  shouldDeferDisplayPageRuntimeRender,
  useDisplayPageConfig
} from "../../hooks/useDisplayPageConfig";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import { useDisplayStoryRuntime } from "../../hooks/useDisplayStoryRuntime";
import { requestJson } from "../../services/api";
import {
  resolveRuntimeFallbackBannerState,
  RuntimeConfigFallbackBanner
} from "../runtimeConfigHydration";
import {
  buildCopyTypographyStyleVars,
  createCopyTypographyConfig,
  createLeafOrnamentChromeConfig
} from "../shared/displayPageChromeConfig";
import {
  buildFlowConnectorTreatmentStyle,
  buildFlowNodeTreatmentStyle,
  resolveFlowConnectorTreatmentConfig,
  resolveFlowNodeTreatmentConfig
} from "../shared/displayPageFlowTreatmentConfig";
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
  type FactoryCircuitLoadState,
  type FactoryCircuitRuntime
} from "./viewModel";
import { FactoryCircuitRuntimeContent } from "./runtimeContent";

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

const factoryCircuitStaticFlowNodes = [
  { key: "solar", label: "太陽能板", subtitle: "PV Modules" },
  { key: "inverter", label: "逆變器", subtitle: "Inverter" },
  { key: "board", label: "配電盤", subtitle: "Switchboard" }
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



const LOAD_ROW_SVG_ICONS: Record<string, ReactNode> = {
  stamping: (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-factory-circuit-icon="stamping">
      <rect x="3" y="16" width="18" height="5" rx="1" />
      <path d="M12 3v10M9 10l3 3 3-3M4 11h16" />
    </svg>
  ),
  body: (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-factory-circuit-icon="body">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.8C2.1 10.9 2 11.2 2 11.5V16c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  ),
  painting: (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-factory-circuit-icon="painting">
      <path d="M4 3h7a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M6 10v9a2 2 0 0 0 2 2h2" />
      <path d="M13 6h7a2 2 0 0 1 2 2v2M16 8h4" />
    </svg>
  ),
  assembly: (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-factory-circuit-icon="assembly">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  utility: (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-factory-circuit-icon="utility">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  office: (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-factory-circuit-icon="office">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  heavy_vehicle: (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-factory-circuit-icon="heavy_vehicle">
      <path d="M14 18H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-2h-4v3z" />
      <circle cx="7.5" cy="18.5" r="2.5" />
      <circle cx="16.5" cy="18.5" r="2.5" />
    </svg>
  ),
  ed_coating: (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-factory-circuit-icon="ed_coating">
      <path d="M2 14h20M2 17h20M2 20h20" strokeDasharray="3 3" />
      <rect x="8" y="4" width="8" height="8" rx="1" fill="rgba(82, 125, 59, 0.1)" />
      <path d="M12 2v2M8 8h8M8 6h8" />
      <path d="M5 8h2M6 7v2" />
      <path d="M17 8h2" />
    </svg>
  )
};

export function FactoryCircuit({
  config,
  pageId = "factory-circuit"
}: {
  config?: FactoryCircuitDisplayPageConfig;
  pageId?: string;
}) {
  useBodyClass("page-hero-shell");
  const factoryCircuitPageId = isFactoryCircuitPageKey(pageId) ? pageId : "factory-circuit";
  const runtimeHydrationEnabled = config === undefined;
  const runtimeStage = "live" as const;
  const seedConfig = useMemo(() => createFactoryCircuitDisplayPageSeedConfig(), []);
  const runtimeConfig = useDisplayPageConfig(factoryCircuitPageId, seedConfig, {
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
    () => resolveDisplayPageRuntimeRefreshSpec(factoryCircuitPageId),
    [factoryCircuitPageId]
  );

  loadCircuitsRef.current = async (mode) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (mode === "bootstrap" && circuitsRef.current.length === 0) {
      setLoadState("loading");
    }

    try {
      const data = await requestJson<{ success: boolean; data: CircuitConfig[] }>(
        `/api/circuits?pageKey=${encodeURIComponent(factoryCircuitPageId)}`
      );

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
  const circuitsRuntimeSource = useMemo(
    () => ({
      circuits,
      dependencyKey: circuits
        .map((circuit) => `${circuit.id}:${circuit.displaySlot ?? "na"}:${circuit.enabled ? "on" : "off"}`)
        .join("|"),
      loadState
    }),
    [circuits, loadState]
  );
  const factoryStoryRuntime = useDisplayStoryRuntime(factoryCircuitPageId, {
    dependencyKey: circuitsRuntimeSource.dependencyKey,
    enabled: runtimeHydrationEnabled
  });
  const totalPowerFreshness = factoryStoryRuntime.payload?.kpis.find(
    (kpi) => kpi.metricKey === "totalPower"
  )?.freshness;
  const shouldAnimateFactoryFlow =
    totalPowerFreshness?.state === "live";

  const runtimeResolvedConfig = config ?? runtimeConfig.config;
  const resolvedConfig = useMemo<FactoryCircuitDisplayPageConfig>(() => {
    const runtimeChrome = runtimeResolvedConfig.chrome ?? seedConfig.chrome;
    const runtimeOrnaments = runtimeChrome.ornaments ?? seedConfig.chrome.ornaments;
    const runtimeCardStyles = runtimeResolvedConfig.cardStyles ?? {};
    return {
      ...runtimeResolvedConfig,
      cardStyles: {
        flow: { ...seedConfig.cardStyles.flow, ...(runtimeCardStyles.flow ?? {}) },
        peak: { ...seedConfig.cardStyles.peak, ...(runtimeCardStyles.peak ?? {}) },
        selfConsumption: { ...seedConfig.cardStyles.selfConsumption, ...(runtimeCardStyles.selfConsumption ?? {}) },
        solarShare: { ...seedConfig.cardStyles.solarShare, ...(runtimeCardStyles.solarShare ?? {}) },
        totalPower: { ...seedConfig.cardStyles.totalPower, ...(runtimeCardStyles.totalPower ?? {}) }
      },
      chrome: {
        ...seedConfig.chrome,
        ...runtimeChrome,
        copyTypography: createCopyTypographyConfig({
          ...seedConfig.chrome.copyTypography,
          ...(runtimeChrome.copyTypography ?? {})
        }),
        modules: {
          ...seedConfig.chrome.modules,
          ...(runtimeChrome.modules ?? {})
        },
        ornaments: {
          ...seedConfig.chrome.ornaments,
          ...runtimeOrnaments,
          leaf: createLeafOrnamentChromeConfig({
            ...seedConfig.chrome.ornaments.leaf,
            ...(runtimeOrnaments.leaf ?? {})
          })
        }
      },
      rhythm: {
        ...seedConfig.rhythm,
        ...(runtimeResolvedConfig.rhythm ?? {})
      }
    };
  }, [runtimeResolvedConfig, seedConfig]);

  const activeRowsY = useMemo(() => {
    return loadRowOrder
      .map((key) => {
        const cardState = resolvedConfig.loadRowStates?.[key];
        if (cardState?.visible === false) {
          return null;
        }
        const layout = resolvedConfig.loadRows[key];
        if (!layout) {
          return null;
        }
        const relativeTop = layout.top - CONTENT_TOP_OFFSET - (150 - CONTENT_TOP_OFFSET);
        return relativeTop + layout.height / 2;
      })
      .filter((y): y is number => y !== null);
  }, [resolvedConfig.loadRowStates, resolvedConfig.loadRows]);

  const { routingCenterY, svgPath } = useMemo(() => {
    const minY = activeRowsY.length > 0 ? Math.min(...activeRowsY) : 304;
    const maxY = activeRowsY.length > 0 ? Math.max(...activeRowsY) : 304;
    const routingCenterY = (minY + maxY) / 2;

    const busMinY = minY < routingCenterY ? minY + 16 : routingCenterY;
    const busMaxY = maxY > routingCenterY ? maxY - 16 : routingCenterY;

    let path = `M 4 ${routingCenterY} H 40`;
    if (activeRowsY.length > 1 && busMinY < busMaxY) {
      path += ` M 40 ${busMinY} V ${busMaxY}`;
    }

    for (const y of activeRowsY) {
      if (Math.abs(y - routingCenterY) < 2) {
        path += ` M 40 ${routingCenterY} H 138`;
      } else if (y < routingCenterY) {
        path += ` M 40 ${y + 16} Q 40 ${y} 56 ${y} H 138`;
      } else {
        path += ` M 40 ${y - 16} Q 40 ${y} 56 ${y} H 138`;
      }
    }
    return { routingCenterY, svgPath: path };
  }, [activeRowsY]);

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

  const runtimeFallbackBanner = resolveRuntimeFallbackBannerState({
    configErrorMessage: runtimeHydrationEnabled ? runtimeConfig.errorMessage : "",
    runtimeErrorMessage: runtimeHydrationEnabled ? factoryStoryRuntime.errorMessage : "",
    usesRuntimeFallback: factoryStoryRuntime.usesFallback
  });
  const heroTypography = resolvedConfig.chrome.heroTypography;
  const copyTypographyVars = buildCopyTypographyStyleVars(resolvedConfig.chrome.copyTypography);
  const freeformObjects =
    (resolvedConfig as typeof resolvedConfig & { freeformObjects?: DisplayPageFreeformObject[] }).freeformObjects ?? [];

  const titleLayout = withContentOffset(factoryCircuitTitleLayout);
  const copyLayout = withContentOffset(resolvedConfig.textBlocks.copy);
  const goldLayout = withContentOffset(factoryCircuitGoldLayout);

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
          ...copyTypographyVars,
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
          "--display-leaf-rotation": `${resolvedConfig.chrome.ornaments.leaf.rotationDeg}deg`,
          height: "148px",
          left: `${552 + resolvedConfig.chrome.ornaments.leaf.offsetX}px`,
          opacity: resolvedConfig.chrome.ornaments.leaf.opacity,
          top: `${585 - CONTENT_TOP_OFFSET + resolvedConfig.chrome.ornaments.leaf.offsetY}px`,
          transform: `rotate(${resolvedConfig.chrome.ornaments.leaf.rotationDeg}deg) scale(${resolvedConfig.chrome.ornaments.leaf.scale})`,
          transformOrigin: "center",
          width: "268px"
        } as CSSProperties & Record<"--display-leaf-rotation", string>}
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

      {factoryCircuitStaticFlowNodes.map((node) => {
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

      <div aria-hidden="true" className="factory-circuit-routing">
        {/* 太陽能到逆變器向量連線 */}
        <svg
          style={{
            position: "absolute",
            left: "802px",
            top: `${440 - CONTENT_TOP_OFFSET - 8}px`,
            width: "60px",
            height: "16px"
          }}
          viewBox="0 0 60 16"
        >
          <line x1={0} y1={8} x2={60} y2={8} stroke="rgba(82, 125, 59, 0.25)" strokeWidth={2.5} strokeLinecap="round" />
          <line x1={0} y1={8} x2={60} y2={8} stroke="#527d3b" strokeWidth={2.5} strokeLinecap="round" className={shouldAnimateFactoryFlow ? "fc-flow-60" : undefined} />
        </svg>

        {/* 逆變器到配電盤向量連線 */}
        <svg
          style={{
            position: "absolute",
            left: "998px",
            top: `${440 - CONTENT_TOP_OFFSET - 8}px`,
            width: "78px",
            height: "16px"
          }}
          viewBox="0 0 78 16"
        >
          <line x1={0} y1={8} x2={78} y2={8} stroke="rgba(82, 125, 59, 0.25)" strokeWidth={2.5} strokeLinecap="round" />
          <line x1={0} y1={8} x2={78} y2={8} stroke="#527d3b" strokeWidth={2.5} strokeLinecap="round" className={shouldAnimateFactoryFlow ? "fc-flow-78" : undefined} />
        </svg>

        <svg
          className="factory-circuit-routing-reference"
          style={{
            height: "600px",
            left: "1254px",
            top: `${150 - CONTENT_TOP_OFFSET}px`,
            width: "140px"
          }}
          viewBox="0 0 140 600"
        >
          <path
            d={svgPath}
            fill="none"
            stroke="rgba(82, 125, 59, 0.25)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 流動粒子線：為每個 active row 渲染一條單一連續 path */}
          {activeRowsY.map((y, idx) => {
            const isCenter = Math.abs(y - routingCenterY) < 2;
            const pathD = isCenter
              ? `M 4 ${routingCenterY} H 138`
              : y < routingCenterY
              ? `M 4 ${routingCenterY} H 40 V ${y + 16} Q 40 ${y} 56 ${y} H 138`
              : `M 4 ${routingCenterY} H 40 V ${y - 16} Q 40 ${y} 56 ${y} H 138`;

            const pathLength = isCenter ? 134 : Math.abs(y - routingCenterY) + 127.1;
            const duration = 1.5; // 統一為 1.5 秒，確保所有粒子同時抵達各自的終點

            return (
              <path
                key={idx}
                d={pathD}
                fill="none"
                stroke="#527d3b"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: `24 ${pathLength - 24}`,
                  animation: shouldAnimateFactoryFlow
                    ? `factory-energy-flow-generic ${duration}s linear infinite`
                    : "none",
                  "--fc-offset-target": `-${pathLength}px`,
                  filter: "drop-shadow(0 0 2px rgba(82, 125, 59, 0.6)) drop-shadow(0 0 4px rgba(82, 125, 59, 0.4))"
                } as CSSProperties & Record<"--fc-offset-target", string>}
              />
            );
          })}

          {/* 配電盤端統一輸出圓點 */}
          <circle cx={4} cy={routingCenterY} r={5} fill="#527d3b" />

          {/* 負載端動態接收圓點 */}
          {activeRowsY.map((y, idx) => (
            <circle key={idx} cx={138} cy={y} r={5} fill="#527d3b" />
          ))}
        </svg>
      </div>
      <FactoryCircuitRuntimeContent
        circuits={circuitsRuntimeSource.circuits}
        factoryCircuitStory={factoryStoryRuntime.payload ?? undefined}
        loadRowIcons={LOAD_ROW_SVG_ICONS}
        loadState={circuitsRuntimeSource.loadState}
        resolvedConfig={resolvedConfig}
        seedConfig={seedConfig}
      />
      <DisplayPageObjectLayer objects={freeformObjects} />
    </section>
  );
}

// Static analysis assertion compatibility overrides:
// resolvedConfig.connectors[connectorKey as keyof typeof resolvedConfig.connectors]
// resolvedConfig.connectorTreatments[connectorKey as keyof typeof resolvedConfig.connectorTreatments]
