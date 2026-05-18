import { useMemo, useState } from "react";
import { ReferenceGlyph } from "../../components/ReferenceGlyph";
import { Sparkline } from "../../components/Sparkline";
import { useBodyClass } from "../../hooks/useBodyClass";
import { useDisplayPageConfig } from "../../hooks/useDisplayPageConfig";
import { sustainabilityHighlights, sustainabilitySummary } from "../../mocks/sustainability";
import { trendSeries } from "../../mocks/metrics";
import { buildDisplayPageMediaStyle } from "../displayPageMediaStyle";
import {
  createSustainabilityDisplayPageSeedConfig,
  type SustainabilityDisplayPageConfig
} from "./displayPageConfig";
import {
  sustainabilityAssetMap,
  sustainabilityCopyLayout,
  sustainabilityKpiLayout,
  sustainabilityLeafLayout,
  sustainabilityStatLayout,
  sustainabilityTitleLayout
} from "./layout";
import "./sustainability.css";
import { buildSustainabilityViewModel } from "./viewModel";

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

function periodLabel(period: "lifetime" | "month" | "quarter" | "year") {
  switch (period) {
    case "month":
      return "月";
    case "quarter":
      return "季";
    case "year":
      return "年";
    default:
      return "累積";
  }
}

const sustainabilityKpiOrder = [
  "totalGeneration",
  "totalCo2",
  "annualSaving"
] as const;

const sustainabilityStatOrder = [
  "procure",
  "esg",
  "trees"
] as const;

function SustainabilityGlyph({
  className,
  name
}: {
  className?: string;
  name: "bars" | "co2" | "esg-doc" | "leaf" | "procure" | "tree" | "trend";
}) {
  switch (name) {
    case "bars":
    case "co2":
    case "leaf":
      return <ReferenceGlyph className={className} name={name} />;
    case "procure":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.35" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="21" />
          <path d="M18 23 H22 L26 42 H45" />
          <path d="M25 28 H46 L42 38 H28" />
          <circle cx="29" cy="45" r="2.7" fill="currentColor" stroke="none" />
          <circle cx="41" cy="45" r="2.7" fill="currentColor" stroke="none" />
          <path d="M40 18 C35 19 31 22 30 27 C35 27 39 25 40 18 Z" />
        </svg>
      );
    case "esg-doc":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.35" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="21" />
          <path d="M24 18 H38 L44 24 V46 H24 Z" />
          <path d="M38 18 V25 H44" />
          <path d="M29 31 H39 M29 36 H39 M29 41 H36" />
        </svg>
      );
    case "tree":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.35" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="21" />
          <path d="M32 19 C26 19 22 24 22 29 C22 32 23 34 25 36 C22 37 20 40 20 43 C20 48 24 52 31 52 H33 C40 52 44 48 44 43 C44 40 42 37 39 36 C41 34 42 32 42 29 C42 24 38 19 32 19 Z" />
          <path d="M32 34 V49" />
        </svg>
      );
    case "trend":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.35" viewBox="0 0 24 24">
          <path d="M4 16 L10 10 L14 14 L20 7" />
          <path d="M15 7 H20 V12" />
        </svg>
      );
    default:
      return null;
  }
}

export function Sustainability({ config }: { config?: SustainabilityDisplayPageConfig }) {
  useBodyClass("page-hero-shell");
  const seedConfig = useMemo(
    () => createSustainabilityDisplayPageSeedConfig(sustainabilityAssetMap.hero.src),
    []
  );
  const runtimeConfig = useDisplayPageConfig("sustainability", seedConfig, {
    enabled: config === undefined,
    stage: "live"
  });
  const [selectedPeriod, setSelectedPeriod] = useState<"lifetime" | "month" | "quarter" | "year">("lifetime");
  const viewModel = buildSustainabilityViewModel({
    highlights: sustainabilityHighlights,
    selectedPeriod,
    summary: sustainabilitySummary
  });
  const resolvedConfig = config ?? runtimeConfig.config;

  const titleLayout = withContentOffset(sustainabilityTitleLayout);
  const copyLayout = withContentOffset(sustainabilityCopyLayout);
  const leafLayout = withContentOffset(sustainabilityLeafLayout);
  const heroLayout = withContentOffset(resolvedConfig.heroMedia);

  return (
    <section className="sustainability-display-page">
      <section
        className="sustainability-title"
        style={{
          left: `${titleLayout.left}px`,
          top: `${titleLayout.top}px`,
          width: `${titleLayout.width}px`
        }}
      >
        <p className="sustainability-eyebrow">{resolvedConfig.hero.eyebrow}</p>
        <h2 className="sustainability-display-title">
          <em>{resolvedConfig.hero.title[0]}</em>
          <br />
          {resolvedConfig.hero.title[1]}
        </h2>
        <p className="sustainability-subtitle">{resolvedConfig.hero.subtitle}</p>
      </section>

      <section
        style={{
          position: "absolute",
          right: "88px",
          top: `${titleLayout.top}px`,
          zIndex: 14,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "14px"
        }}
      >
        <div style={{ display: "flex", gap: "10px" }}>
          {viewModel.periodOptions.map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              style={{
                border: "1px solid rgba(91, 128, 70, 0.24)",
                borderRadius: "999px",
                background: viewModel.selectedPeriod === period ? "#5b8046" : "rgba(255, 253, 247, 0.92)",
                color: viewModel.selectedPeriod === period ? "#fffdf8" : "#57774a",
                fontSize: "17px",
                fontWeight: 700,
                padding: "10px 16px"
              }}
            >
              {periodLabel(period)}
            </button>
          ))}
        </div>
        <div style={{ textAlign: "right", color: "#5f675f", fontSize: "15px", lineHeight: 1.55 }}>
          <div>資料來源：{viewModel.provenance.label} / {viewModel.provenance.source}</div>
          <div>同步狀態：{viewModel.provenance.syncState}{viewModel.provenance.updatedAt ? ` · ${viewModel.provenance.updatedAt}` : " · 尚未提供更新時間"}</div>
        </div>
      </section>

      <div
        className="sustainability-copy"
        style={{
          left: `${copyLayout.left}px`,
          top: `${copyLayout.top}px`,
          width: `${copyLayout.width}px`
        }}
      >
        {resolvedConfig.hero.copyZhLines.map((line) => (
          <p key={line} className="sustainability-copy-line">
            {line}
          </p>
        ))}
        <div className="sustainability-copy-en">
          {resolvedConfig.hero.copyEnLines.map((line) => (
            <p key={line} className="sustainability-copy-line">
              {line}
            </p>
          ))}
        </div>
      </div>

      <div
        className="sustainability-leaf-watermark"
        style={{
          height: `${leafLayout.height}px`,
          left: `${leafLayout.left}px`,
          top: `${leafLayout.top}px`,
          width: `${leafLayout.width}px`
        }}
      />

      <figure
        className="sustainability-hero"
        style={{
          height: `${heroLayout.height}px`,
          left: `${heroLayout.left}px`,
          top: `${heroLayout.top}px`,
          width: `${heroLayout.width}px`
        }}
      >
        <img
          alt={resolvedConfig.heroMedia.alt}
          src={resolvedConfig.heroMedia.src}
          style={buildDisplayPageMediaStyle(resolvedConfig.heroMedia)}
        />
      </figure>

      <section
        className="sustainability-highlight-rail"
        style={{
          height: `${resolvedConfig.highlightRail.container.height}px`,
          left: `${resolvedConfig.highlightRail.container.left}px`,
          top: `${resolvedConfig.highlightRail.container.top - CONTENT_TOP_OFFSET}px`,
          width: `${resolvedConfig.highlightRail.container.width}px`
        }}
      >
        {resolvedConfig.highlightRail.items.slice(0, viewModel.highlights.length).map((seedItem, index) => {
          const item = viewModel.highlights[index] ?? seedItem;

          return (
            <article key={`${item.label}-${item.unit}`} className="sustainability-highlight-item">
              <strong>{item.value}</strong>
              <span>{item.unit}</span>
              <small>{item.label}</small>
            </article>
          );
        })}
      </section>

      {viewModel.bigNumbers.map((item, index) => {
        const layout = withContentOffset(resolvedConfig.kpiCards[sustainabilityKpiOrder[index]!]);

        return (
          <article
            key={item.label}
            className="sustainability-kpi-card"
            style={{
              height: `${layout.height}px`,
              left: `${layout.left}px`,
              top: `${layout.top}px`,
              width: `${layout.width}px`
            }}
          >
            <div className="sustainability-card-head">
              <div className="sustainability-card-icon">
                <SustainabilityGlyph name={item.iconKey} />
              </div>
              <div>
                <h3>{item.label}</h3>
                <p>{item.helper}</p>
              </div>
            </div>
            <div className="sustainability-card-value">
              <span>{item.value}</span>
              <small>{item.unit}</small>
            </div>
            {index === 2 ? (
              <div className="sustainability-growth-note">
                <span>較去年成長 2.1%</span>
                <SustainabilityGlyph name="trend" />
              </div>
            ) : (
              <Sparkline className="sustainability-sparkline" values={trendSeries.map((value) => value - index * 1.8)} />
            )}
          </article>
        );
      })}

      {viewModel.esgCards.map((card, index) => {
        const layout = withContentOffset(resolvedConfig.statCards[sustainabilityStatOrder[index]!]);
        const storyModule = viewModel.storyModules[index] ?? null;

        return (
          <article
            key={card.label}
            className="sustainability-stat-card"
            style={{
              height: `${layout.height}px`,
              left: `${layout.left}px`,
              top: `${layout.top}px`,
              width: `${layout.width}px`
            }}
          >
            <div className="sustainability-card-head">
              <div className="sustainability-card-icon">
                <SustainabilityGlyph name={card.iconKey} />
              </div>
              <div>
                <h3>{storyModule?.title ?? card.label}</h3>
                <p>{storyModule ? `${periodLabel(viewModel.selectedPeriod)}期故事模組` : card.subtitle}</p>
              </div>
            </div>
            {storyModule ? (
              "items" in card || storyModule.bullets.length > 0 ? (
                <ul className="sustainability-esg-list">
                  {(storyModule.bullets.length > 0 ? storyModule.bullets : [storyModule.description]).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <>
                  <div className={index === 0 ? "sustainability-stat-procure" : "sustainability-stat-value"}>
                    {storyModule.description}
                  </div>
                  <p className="sustainability-stat-desc">內容會跟隨 {periodLabel(viewModel.selectedPeriod)}期視角切換</p>
                </>
              )
            ) : "value" in card ? (
              <>
                <div className={index === 0 ? "sustainability-stat-procure" : "sustainability-stat-value"}>
                  {card.value}
                </div>
                {index === 0 ? (
                  <p className="sustainability-stat-desc">累計綠色採購金額</p>
                ) : (
                  <Sparkline className="sustainability-trees-sparkline" values={trendSeries.map((value) => value - 2)} />
                )}
              </>
            ) : (
              <ul className="sustainability-esg-list">
                {card.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </section>
  );
}
