import type { CircuitConfig } from "@solar-display/shared";
import { useEffect, useMemo, useState } from "react";
import { renderDisplayPageIcon } from "../../components/displayPageIconResolver";
import { Sparkline } from "../../components/Sparkline";
import { useBodyClass } from "../../hooks/useBodyClass";
import {
  shouldDeferDisplayPageRuntimeRender,
  useDisplayPageConfig
} from "../../hooks/useDisplayPageConfig";
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
  factoryCircuitGoldLayout,
  factoryCircuitLeafLayout,
  factoryCircuitTitleLayout
} from "./layout";
import "./factoryCircuit.css";
import {
  buildFactoryCircuitRuntimes,
  buildFactoryCircuitViewModel,
  type FactoryCircuitLoadState,
  type FactoryCircuitRuntime
} from "./viewModel";

const CONTENT_TOP_OFFSET = 146;

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

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await requestJson<{ success: boolean; data: CircuitConfig[] }>("/api/circuits");

        if (!active) {
          return;
        }

        setCircuits(buildFactoryCircuitRuntimes(data.data));
        setLoadState("ready");
      } catch {
        if (!active) {
          return;
        }

        setCircuits([]);
        setLoadState("error");
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);
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
    return null;
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
  const statusChrome = resolvedConfig.chrome.modules.statusBlock;

  const titleLayout = withContentOffset(factoryCircuitTitleLayout);
  const copyLayout = withContentOffset(resolvedConfig.textBlocks.copy);
  const goldLayout = withContentOffset(factoryCircuitGoldLayout);
  const leafLayout = withContentOffset(factoryCircuitLeafLayout);
  const statusLayout = withContentOffset(resolvedConfig.statusBlock);

  return (
    <section className="factory-circuit-display-page">
      <RuntimeConfigFallbackBanner {...runtimeFallbackBanner} />
      <section
        className="factory-circuit-title"
        style={{
          left: `${titleLayout.left}px`,
          top: `${titleLayout.top}px`,
          width: `${titleLayout.width}px`
        }}
      >
        <p
          className="factory-circuit-eyebrow"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.eyebrowFontSize}px`,
            letterSpacing: `${resolvedConfig.chrome.heroTypography.eyebrowLetterSpacing}px`,
            marginBottom: `${resolvedConfig.chrome.heroTypography.eyebrowMarginBottom}px`
          }}
        >
          {resolvedConfig.hero.eyebrow}
        </p>
        <h2
          className="factory-circuit-display-title"
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
          className="factory-circuit-subtitle"
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
        className="factory-circuit-gold-line"
        style={{
          height: `${resolvedConfig.chrome.ornaments.goldLine.thickness}px`,
          left: `${goldLayout.left}px`,
          opacity: resolvedConfig.chrome.ornaments.goldLine.opacity,
          top: `${goldLayout.top + resolvedConfig.chrome.ornaments.goldLine.offsetY}px`,
          width: `${goldLayout.width}px`
        }}
      />

      <div
        className="factory-circuit-leaf-watermark"
        style={{
          height: `${leafLayout.height}px`,
          left: `${leafLayout.left + resolvedConfig.chrome.ornaments.leaf.offsetX}px`,
          opacity: resolvedConfig.chrome.ornaments.leaf.opacity,
          top: `${leafLayout.top + resolvedConfig.chrome.ornaments.leaf.offsetY}px`,
          transform: `scale(${resolvedConfig.chrome.ornaments.leaf.scale})`,
          width: `${leafLayout.width}px`
        }}
      />

      <section
        className="factory-circuit-status-note"
        style={{
          borderRadius: `${statusChrome.radius}px`,
          gap: `${resolvedConfig.chrome.modules.statusBlock.gap}px`,
          left: `${statusLayout.left}px`,
          padding: `${resolvedConfig.chrome.modules.statusBlock.paddingTop}px ${resolvedConfig.chrome.modules.statusBlock.paddingRight}px ${resolvedConfig.chrome.modules.statusBlock.paddingBottom}px ${resolvedConfig.chrome.modules.statusBlock.paddingLeft}px`,
          top: `${statusLayout.top}px`,
          width: `${statusLayout.width}px`
        }}
      >
        <b style={{ fontSize: `${resolvedConfig.chrome.modules.statusBlock.titleFontSize}px` }}>
          {viewModel.summary.statusLabel}
        </b>
        {viewModel.emptyState ? (
          <p style={{ fontSize: `${resolvedConfig.chrome.modules.statusBlock.bodyFontSize}px` }}>
            {viewModel.emptyState.description}
          </p>
        ) : (
          <p style={{ fontSize: `${resolvedConfig.chrome.modules.statusBlock.bodyFontSize}px` }}>
            保留六個迴路面板與五個 KPI witness，持續對齊 reference routing board。
          </p>
        )}
      </section>

      {viewModel.flowNodes.map((node) => {
        const layout = withContentOffset(resolvedConfig.nodes[node.key]);
        return (
          <article
            key={node.label}
            className={["factory-circuit-node", `factory-circuit-node-${node.key}`].join(" ")}
            style={{
              height: `${layout.height}px`,
              left: `${layout.left}px`,
              top: `${layout.top}px`,
              width: `${layout.width}px`
            }}
          >
            <div className="factory-circuit-node-icon">
              {renderDisplayPageIcon({
                alt: node.label,
                className: "h-full w-full",
                seedSource: seedConfig.iconSources.nodes[node.key],
                source: resolvedConfig.iconSources.nodes[node.key]
              })}
            </div>
            <h3>{node.label}</h3>
            <p>{node.subtitle}</p>
          </article>
        );
      })}

      {Object.keys(resolvedConfig.connectors).map((connectorKey) => {
        const nextLayout = withContentOffset(
          resolvedConfig.connectors[connectorKey as keyof typeof resolvedConfig.connectors]
        );
        return (
          <div
            key={connectorKey}
            className="factory-circuit-connector"
            style={{
              left: `${nextLayout.left}px`,
              top: `${nextLayout.top}px`,
              width: `${nextLayout.width}px`
            }}
          />
        );
      })}

      <svg aria-hidden="true" className="factory-circuit-routing" viewBox="0 0 1920 1080">
        <path className="routing-main" d="M1258 440 H1306 C1319 440 1324 431 1324 418 V165 C1324 159 1329 154 1335 154 H1392" />
        <path className="routing-branch" d="M1324 251 C1324 234 1336 229 1353 229 H1392" />
        <path className="routing-branch" d="M1324 347 C1324 331 1336 324 1353 324 H1392" />
        <path className="routing-branch" d="M1324 440 H1392" />
        <path className="routing-branch" d="M1324 535 C1324 519 1336 514 1353 514 H1392" />
        <path className="routing-branch" d="M1324 630 C1324 614 1336 609 1353 609 H1392" />
        <circle cx="1324" cy="154" r="5" />
        <circle cx="1324" cy="249" r="5" />
        <circle cx="1324" cy="344" r="5" />
        <circle cx="1324" cy="439" r="5" />
        <circle cx="1324" cy="534" r="5" />
        <circle cx="1324" cy="629" r="5" />
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
          <article
            key={metric.label}
            className={className}
            style={{
              height: `${layout.height}px`,
              left: `${layout.left}px`,
              top: `${layout.top}px`,
              width: `${layout.width}px`
            }}
          >
            <div className="factory-circuit-kpi-head">
              <div className="factory-circuit-kpi-icon">
                {renderDisplayPageIcon({
                  alt: metric.label,
                  className: "h-full w-full",
                  seedSource: seedConfig.iconSources.kpiCards[kpiLayoutOrder[index]!],
                  source: resolvedConfig.iconSources.kpiCards[kpiLayoutOrder[index]!]
                })}
              </div>
              <div>
                <h3>{metric.label}</h3>
                <p>{metric.helper}</p>
              </div>
            </div>
            <div className="factory-circuit-kpi-value">
              <span>{metric.value}</span>
              <small>{metric.unit}</small>
            </div>
            <Sparkline className="factory-circuit-kpi-sparkline" values={trendSeries.map((value) => value - index * 1.5)} />
          </article>
        );
      })}
    </section>
  );
}
