import type { SustainabilityPeriodKey } from "@solar-display/shared";
import { resolveDisplayPageMediaSource } from "@solar-display/shared";
import { useMemo, useState } from "react";
import { renderDisplayPageIcon } from "../../components/displayPageIconResolver";
import { Sparkline } from "../../components/Sparkline";
import {
  DisplayCardFooter,
  DisplayCardFrame,
  DisplayCardHeader,
  DisplayCardValueRow
} from "../../components/displayPageCards";
import { useBodyClass } from "../../hooks/useBodyClass";
import {
  shouldDeferDisplayPageRuntimeRender,
  useDisplayPageConfig
} from "../../hooks/useDisplayPageConfig";
import { useSustainabilityStoryRuntime } from "../../hooks/useSustainabilityStoryRuntime";
import { sustainabilityHighlights, sustainabilitySummary } from "../../mocks/sustainability";
import { trendSeries } from "../../mocks/metrics";
import { buildDisplayPageMediaStyle } from "../displayPageMediaStyle";
import { createDisplayCardStyleConfig } from "../shared/displayCardStyleConfig";
import {
  resolveRuntimeFallbackBannerState,
  RuntimeConfigFallbackBanner
} from "../runtimeConfigHydration";
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
import "../../components/displayPageCards.css";
import "./sustainability.css";
import { buildSustainabilityViewModel } from "./viewModel";
import { SustainabilityGlyph } from "./iconRegistry";

const CONTENT_TOP_OFFSET = 146;

function withContentOffset<T extends { top: number }>(layout: T) {
  return {
    ...layout,
    top: layout.top - CONTENT_TOP_OFFSET
  };
}

function periodLabel(period: SustainabilityPeriodKey) {
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

const sustainabilityStatOrder = ["procure", "esg", "trees"] as const;

export function Sustainability({ config }: { config?: SustainabilityDisplayPageConfig }) {
  useBodyClass("page-hero-shell");
  const runtimeHydrationEnabled = config === undefined;
  const runtimeStage = "live" as const;
  const seedConfig = useMemo(
    () => createSustainabilityDisplayPageSeedConfig(sustainabilityAssetMap.hero.src),
    []
  );
  const runtimeConfig = useDisplayPageConfig("sustainability", seedConfig, {
    enabled: runtimeHydrationEnabled,
    stage: runtimeStage
  });
  const [selectedPeriod, setSelectedPeriod] = useState<SustainabilityPeriodKey>("lifetime");
  const storyRuntime = useSustainabilityStoryRuntime(selectedPeriod, {
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
  const viewModel = buildSustainabilityViewModel({
    highlights: sustainabilityHighlights,
    selectedPeriod,
    story: storyRuntime.payload ?? undefined,
    summary: sustainabilitySummary
  });
  const runtimeFallbackBanner = resolveRuntimeFallbackBannerState({
    configErrorMessage: runtimeHydrationEnabled ? runtimeConfig.errorMessage : "",
    runtimeErrorMessage: runtimeHydrationEnabled ? storyRuntime.errorMessage : "",
    usesRuntimeFallback: storyRuntime.usesFallback
  });
  const heroMediaSource = resolveDisplayPageMediaSource(resolvedConfig.heroMedia, seedConfig.heroMedia.src);

  const titleLayout = withContentOffset(sustainabilityTitleLayout);
  const copyLayout = withContentOffset(sustainabilityCopyLayout);
  const leafLayout = withContentOffset(sustainabilityLeafLayout);
  const heroLayout = withContentOffset(resolvedConfig.heroMedia);

  return (
    <section className="sustainability-display-page">
      <RuntimeConfigFallbackBanner {...runtimeFallbackBanner} />
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
          src={heroMediaSource ?? undefined}
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
        const cardKey = sustainabilityKpiOrder[index]!;
        const layout = withContentOffset(resolvedConfig.kpiCards[cardKey]);
        const cardStyle = createDisplayCardStyleConfig(resolvedConfig.cardStyles[cardKey]);

        return (
          <DisplayCardFrame
            cardStyle={cardStyle}
            key={item.label}
            className="sustainability-kpi-card"
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
                alt: item.label,
                className: "h-full w-full",
                seedSource: seedConfig.iconSources.kpiCards[cardKey],
                source: resolvedConfig.iconSources.kpiCards[cardKey]
              })}
              iconContainerClassName="sustainability-card-icon"
              subtitle={item.helper}
              title={item.label}
            />
            <DisplayCardValueRow align={cardStyle.valueRowAlign} unit={item.unit} value={item.value} />
            {index === 2 ? (
              <DisplayCardFooter className="sustainability-card-footer">
                <div className="sustainability-growth-note">
                  <span>較去年成長 2.1%</span>
                  <SustainabilityGlyph name="trend" />
                </div>
              </DisplayCardFooter>
            ) : (
              <DisplayCardFooter className="sustainability-card-footer">
                <Sparkline className="sustainability-sparkline" values={trendSeries.map((value) => value - index * 1.8)} />
              </DisplayCardFooter>
            )}
          </DisplayCardFrame>
        );
      })}

      {viewModel.esgCards.map((card, index) => {
        const cardKey = sustainabilityStatOrder[index]!;
        const layout = withContentOffset(resolvedConfig.statCards[cardKey]);
        const cardStyle = createDisplayCardStyleConfig(resolvedConfig.cardStyles[cardKey]);
        const storyModule = viewModel.storyModules[index] ?? null;

        return (
          <DisplayCardFrame
            cardStyle={cardStyle}
            key={card.label}
            className="sustainability-stat-card"
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
                alt: storyModule?.title ?? card.label,
                className: "h-full w-full",
                seedSource: seedConfig.iconSources.statCards[cardKey],
                source: resolvedConfig.iconSources.statCards[cardKey]
              })}
              iconContainerClassName="sustainability-card-icon"
              subtitle={storyModule ? `${periodLabel(viewModel.selectedPeriod)}期故事模組` : card.subtitle}
              title={storyModule?.title ?? card.label}
            />
            {storyModule ? (
              "items" in card || storyModule.bullets.length > 0 ? (
                <DisplayCardFooter className="sustainability-card-footer">
                  <ul className="sustainability-esg-list">
                    {(storyModule.bullets.length > 0 ? storyModule.bullets : [storyModule.description]).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </DisplayCardFooter>
              ) : (
                <DisplayCardFooter className="sustainability-card-footer">
                  <div className={index === 0 ? "sustainability-stat-procure" : "sustainability-stat-value"}>
                    {storyModule.description}
                  </div>
                  <p className="sustainability-stat-desc">內容會跟隨 {periodLabel(viewModel.selectedPeriod)}期視角切換</p>
                </DisplayCardFooter>
              )
            ) : "value" in card ? (
              <>
                {index === 0 ? (
                  <DisplayCardFooter className="sustainability-card-footer">
                    <div className="sustainability-stat-procure">{card.value}</div>
                    <p className="sustainability-stat-desc">累計綠色採購金額</p>
                  </DisplayCardFooter>
                ) : (
                  <>
                    <DisplayCardValueRow align={cardStyle.valueRowAlign} value={card.value} />
                    <DisplayCardFooter className="sustainability-card-footer">
                      <Sparkline className="sustainability-trees-sparkline" values={trendSeries.map((value) => value - 2)} />
                    </DisplayCardFooter>
                  </>
                )}
              </>
            ) : (
              <DisplayCardFooter className="sustainability-card-footer">
                <ul className="sustainability-esg-list">
                  {card.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </DisplayCardFooter>
            )}
          </DisplayCardFrame>
        );
      })}
    </section>
  );
}
