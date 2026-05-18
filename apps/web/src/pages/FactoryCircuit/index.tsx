import type { CircuitConfig } from "@solar-display/shared";
import { useEffect, useMemo, useState } from "react";
import { ReferenceGlyph } from "../../components/ReferenceGlyph";
import { Sparkline } from "../../components/Sparkline";
import { useBodyClass } from "../../hooks/useBodyClass";
import { useDisplayPageConfig } from "../../hooks/useDisplayPageConfig";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import { trendSeries } from "../../mocks/metrics";
import { requestJson } from "../../services/api";
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
  type FactoryCircuitIconKey,
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

function iconClassName(className?: string) {
  return ["h-full w-full", className ?? ""].join(" ").trim();
}

function FactoryCircuitGlyph({
  className,
  name
}: {
  className?: string;
  name: FactoryCircuitIconKey;
}) {
  switch (name) {
    case "bolt":
    case "bars":
    case "leaf":
    case "sun":
      return <ReferenceGlyph className={className} name={name} />;
    case "solar":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 96 96">
          <path d="M18 56 H78 L70 82 H10 Z" />
          <path d="M24 56 L20 82 M40 56 L38 82 M56 56 L58 82 M72 56 L76 82 M15 66 H75 M12 75 H72" />
          <circle cx="48" cy="34" r="10" />
          <path d="M48 8 V21 M31 16 L39 26 M65 16 L57 26 M29 35 H15 M81 35 H67 M22 48 L32 42 M74 48 L64 42" />
          <rect x="42" y="84" width="12" height="5" rx="1" />
        </svg>
      );
    case "inverter":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 96 96">
          <rect x="28" y="13" width="40" height="70" rx="7" />
          <rect x="37" y="23" width="22" height="7" rx="2" />
          <rect x="36" y="63" width="25" height="11" rx="2" />
          <path d="M51 37 L43 52 H53 L46 64" />
          <circle cx="40" cy="44" r="3" />
          <circle cx="57" cy="44" r="3" />
          <path d="M34 80 H62 M32 18 H64 M42 30 V36 M54 30 V36" />
        </svg>
      );
    case "switchboard":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 96 96">
          <rect x="28" y="13" width="40" height="70" rx="8" />
          <rect x="38" y="26" width="20" height="8" rx="1" />
          <path d="M52 40 L42 57 H54 L46 73" />
          <circle cx="39" cy="47" r="3" />
          <circle cx="57" cy="47" r="3" />
          <path d="M35 61 H61 M35 69 H55 M31 18 H65 M35 80 H61" />
        </svg>
      );
    case "production-line":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.45" viewBox="0 0 64 64">
          <path d="M8 49 H56" />
          <path d="M12 43 H52 V51 H12 Z" />
          <path d="M18 37 H34 L42 43 H15 Z" />
          <path d="M24 37 L31 24 L39 28 L34 37" />
          <circle cx="32" cy="23" r="4" />
          <path d="M36 20 L45 12 L50 17 L41 27" />
          <path d="M45 12 L53 10 M49 17 L57 18" />
          <path d="M18 55 H21 M28 55 H31 M38 55 H41 M48 55 H51" />
          <path d="M16 30 H23 M40 34 H51" />
        </svg>
      );
    case "hvac":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.45" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="20" />
          <circle cx="32" cy="32" r="5" />
          <path d="M32 27 C29 13 44 9 50 20 C48 29 42 32 32 32" />
          <path d="M37 35 C51 31 58 45 47 52 C38 52 33 46 32 35" />
          <path d="M27 35 C19 47 5 41 9 28 C16 22 23 23 32 32" />
          <path d="M21 18 C15 23 12 31 14 39 M45 46 C40 51 31 53 24 50" />
        </svg>
      );
    case "lighting":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.45" viewBox="0 0 64 64">
          <path d="M32 8 C22 8 14 16 14 26 C14 34 18 39 23 43 C26 46 27 49 27 52 H37 C37 49 38 46 41 43 C46 39 50 34 50 26 C50 16 42 8 32 8 Z" />
          <path d="M24 56 H40 M27 61 H37" />
          <path d="M25 27 H39 M32 19 V34 M28 34 H36" />
          <path d="M32 2 V5 M12 12 L15 15 M52 12 L49 15 M7 29 H10 M54 29 H57" />
        </svg>
      );
    case "office":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.45" viewBox="0 0 64 64">
          <circle cx="23" cy="20" r="7" />
          <circle cx="43" cy="19" r="7" />
          <path d="M9 53 C11 42 16 36 24 36 C32 36 38 42 40 53" />
          <path d="M31 53 C33 43 38 36 46 36 C53 36 57 42 58 53" />
          <path d="M14 53 H54 M25 29 C29 31 35 31 39 28" />
          <path d="M18 42 H30 M40 42 H51" />
        </svg>
      );
    case "ev":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.45" viewBox="0 0 64 64">
          <path d="M14 56 V9 H36 V56" />
          <path d="M20 16 H30 V25 H20 Z" />
          <path d="M20 34 H30 M20 42 H29" />
          <path d="M36 24 H43 C49 24 52 29 52 35 V44 C52 49 55 51 58 49 C61 47 61 42 57 39 L53 36" />
          <path d="M46 31 C47 21 54 16 60 14 C60 24 55 31 46 31 Z" />
          <path d="M47 31 C52 27 56 22 59 15" />
          <path d="M10 56 H40 M43 35 L50 35" />
        </svg>
      );
    case "infrastructure":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.45" viewBox="0 0 64 64">
          <path d="M12 56 V29 H27 V56 M27 56 V12 H45 V56 M45 56 V36 H56 V56" />
          <path d="M17 35 H22 M17 43 H22 M17 50 H22" />
          <path d="M33 19 H39 M33 28 H39 M33 37 H39 M33 46 H39" />
          <path d="M49 42 H53 M49 49 H53 M9 56 H59" />
          <path d="M30 12 L36 7 L42 12" />
        </svg>
      );
    default:
      return null;
  }
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

export function FactoryCircuit({ config }: { config?: FactoryCircuitDisplayPageConfig }) {
  useBodyClass("page-hero-shell");
  const { connectionState, snapshot } = useLiveMetrics();
  const seedConfig = useMemo(() => createFactoryCircuitDisplayPageSeedConfig(), []);
  const runtimeConfig = useDisplayPageConfig("factory-circuit", seedConfig, {
    enabled: config === undefined,
    stage: "live"
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

  const viewModel = buildFactoryCircuitViewModel({
    circuits,
    connectionState,
    loadState,
    snapshot
  });
  const resolvedConfig = config ?? runtimeConfig.config;

  const titleLayout = withContentOffset(factoryCircuitTitleLayout);
  const copyLayout = withContentOffset(resolvedConfig.textBlocks.copy);
  const goldLayout = withContentOffset(factoryCircuitGoldLayout);
  const leafLayout = withContentOffset(factoryCircuitLeafLayout);
  const statusLayout = withContentOffset(resolvedConfig.statusBlock);

  return (
    <section className="factory-circuit-display-page">
      <section
        className="factory-circuit-title"
        style={{
          left: `${titleLayout.left}px`,
          top: `${titleLayout.top}px`,
          width: `${titleLayout.width}px`
        }}
      >
        <p className="factory-circuit-eyebrow">{resolvedConfig.hero.eyebrow}</p>
        <h2 className="factory-circuit-display-title">
          {resolvedConfig.hero.title}
        </h2>
        <p className="factory-circuit-subtitle">{resolvedConfig.hero.subtitle}</p>
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
          left: `${goldLayout.left}px`,
          top: `${goldLayout.top}px`,
          width: `${goldLayout.width}px`
        }}
      />

      <div
        className="factory-circuit-leaf-watermark"
        style={{
          height: `${leafLayout.height}px`,
          left: `${leafLayout.left}px`,
          top: `${leafLayout.top}px`,
          width: `${leafLayout.width}px`
        }}
      />

      <section
        className="factory-circuit-status-note"
        style={{
          left: `${statusLayout.left}px`,
          top: `${statusLayout.top}px`,
          width: `${statusLayout.width}px`
        }}
      >
        <b>{viewModel.summary.statusLabel}</b>
        {viewModel.emptyState ? <p>{viewModel.emptyState.description}</p> : <p>保留六個迴路面板與五個 KPI witness，持續對齊 reference routing board。</p>}
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
              <FactoryCircuitGlyph name={node.iconKey as FactoryCircuitIconKey} />
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
                <FactoryCircuitGlyph name={row.iconKey} />
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
                <FactoryCircuitGlyph name={metric.iconKey as FactoryCircuitIconKey} />
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
