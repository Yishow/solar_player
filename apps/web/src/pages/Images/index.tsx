import { useMemo, useState } from "react";
import type { DisplayPageFreeformObject } from "@solar-display/shared";
import { resolveDisplayPageMediaSource } from "@solar-display/shared";
import { DisplayPageObjectLayer } from "../../components/DisplayPageObjectLayer";
import { renderDisplayPageIcon } from "../../components/displayPageIconResolver";
import {
  DisplayCardFooter,
  DisplayCardFrame,
  DisplayCardHeader
} from "../../components/displayPageCards";
import { DisplayPageLoadingState } from "../../components/DisplayPageLoadingState";
import { useBodyClass } from "../../hooks/useBodyClass";
import {
  shouldDeferDisplayPageRuntimeRender,
  useDisplayPageConfig
} from "../../hooks/useDisplayPageConfig";
import { useImagesAutoplay } from "../../hooks/useImagesAutoplay";
import { useImagePlaylistRuntime } from "../../hooks/useImagePlaylistRuntime";
import { buildDisplayPageMediaPresentation } from "../displayPageMediaStyle";
import { createDisplayCardStyleConfig } from "../shared/displayCardStyleConfig";
import {
  imagesMainStageMediaEffectResolverOptions
} from "../shared/displayPageMediaEffectConfig";
import {
  resolveRuntimeFallbackBannerState,
  RuntimeConfigFallbackBanner
} from "../runtimeConfigHydration";
import { imagesAssetRuntimeMap, imagesReferencePlaylistEntries } from "./assets";
import {
  createImagesDisplayPageSeedConfig,
  type ImagesDisplayPageConfig
} from "./displayPageConfig";
import {
  imagesContentTopOffset,
  imagesCounterLayout,
  imagesGrassLayout,
  imagesTitleLayout
} from "./layout";
import "../../components/displayPageCards.css";
import "./images.css";
import { buildImagesViewModel } from "./viewModel";

const CONTENT_TOP_OFFSET = imagesContentTopOffset;

const thumbSlotOrder = ["thumb1", "thumb2", "thumb3", "thumb4"] as const;

function withContentOffset<T extends { top: number }>(layout: T) {
  return {
    ...layout,
    top: layout.top - CONTENT_TOP_OFFSET
  };
}

function splitImagesTitle(title: string) {
  if (title.length <= 2) {
    return {
      emphasis: title,
      suffix: ""
    };
  }

  return {
    emphasis: title.slice(0, 2),
    suffix: title.slice(2)
  };
}

function resolveImagesReferenceEntry(index: number) {
  return imagesReferencePlaylistEntries[
    Math.min(index, imagesReferencePlaylistEntries.length - 1)
  ] ?? null;
}

export function Images({ config, pageId = "images" }: { config?: ImagesDisplayPageConfig; pageId?: string }) {
  useBodyClass("page-hero-shell");
  const runtimeHydrationEnabled = config === undefined;
  const runtimeStage = "live" as const;
  const seedConfig = useMemo(
    () => createImagesDisplayPageSeedConfig(imagesAssetRuntimeMap.main),
    []
  );
  const runtimeConfig = useDisplayPageConfig(pageId, seedConfig, {
    enabled: runtimeHydrationEnabled,
    stage: runtimeStage
  });
  const [requestedIndex, setRequestedIndex] = useState(0);
  const playlistRuntime = useImagePlaylistRuntime(requestedIndex, {
    enabled: runtimeHydrationEnabled
  });
  const runtimePlaylistEntries = playlistRuntime.payload?.entries ?? [];
  const playbackEntries = runtimeHydrationEnabled ? runtimePlaylistEntries : imagesReferencePlaylistEntries;
  const playbackActiveEntry =
    runtimeHydrationEnabled
      ? playlistRuntime.payload?.activeEntry ?? null
      : resolveImagesReferenceEntry(requestedIndex);
  const autoplay = useImagesAutoplay({
    activeEntry: playbackActiveEntry,
    entries: playbackEntries,
    requestedIndex,
    setRequestedIndex
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
  const mainStageSource = resolveDisplayPageMediaSource(
    resolvedConfig.mainStage,
    seedConfig.mainStage.src
  );
  const mainStageMediaPresentation = buildDisplayPageMediaPresentation(
    resolvedConfig.mainStage,
    imagesMainStageMediaEffectResolverOptions
  );
  const viewModel = buildImagesViewModel({
    activeEntry: playbackActiveEntry,
    activeIndex: autoplay.activeIndex,
    assets: [],
    coverAssetSource: mainStageSource,
    entries: playbackEntries
  });
  const runtimeFallbackBanner = resolveRuntimeFallbackBannerState({
    configErrorMessage: runtimeHydrationEnabled ? runtimeConfig.errorMessage : "",
    runtimeErrorMessage: runtimeHydrationEnabled ? playlistRuntime.errorMessage : "",
    usesRuntimeFallback: playlistRuntime.usesFallback
  });
  const heroTypography = resolvedConfig.chrome.heroTypography;
  const freeformObjects =
    (resolvedConfig as typeof resolvedConfig & { freeformObjects?: DisplayPageFreeformObject[] }).freeformObjects ?? [];
  const visibleStart = Math.min(
    Math.floor(viewModel.activeIndex / 4) * 4,
    Math.max(viewModel.thumbnails.length - 4, 0)
  );
  const visibleThumbnails = viewModel.thumbnails.slice(visibleStart, visibleStart + 4);

  const titleLayout = withContentOffset(imagesTitleLayout);
  const copyLayout = withContentOffset(resolvedConfig.textBlocks.copy);
  const grassLayout = withContentOffset(imagesGrassLayout);
  const counterLayout = withContentOffset(imagesCounterLayout);
  const mainLayout = withContentOffset(resolvedConfig.mainStage);
  const infoLayout = withContentOffset(resolvedConfig.infoPanel);
  const infoCardStyle = createDisplayCardStyleConfig(resolvedConfig.cardStyles.infoPanel);
  const titleTokens = splitImagesTitle(resolvedConfig.hero.title);
  const activeMainStageSource = viewModel.active.assetSource ?? mainStageSource ?? undefined;
  const isReferenceHeroCrop = viewModel.active.assetSource === imagesAssetRuntimeMap.main;
  const mainStageOverlayLayers = isReferenceHeroCrop ? [] : mainStageMediaPresentation.overlayLayers;

  return (
    <section className="images-display-page">
      <RuntimeConfigFallbackBanner {...runtimeFallbackBanner} />
      <section
        className="images-title-group display-surface-hero-group"
        style={{
          left: `${titleLayout.left}px`,
          top: `${titleLayout.top}px`,
          width: `${titleLayout.width}px`
        }}
      >
        <p
          className="images-eyebrow display-surface-hero-eyebrow"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.eyebrowFontSize}px`,
            letterSpacing: `${resolvedConfig.chrome.heroTypography.eyebrowLetterSpacing}px`,
            marginBottom: `${resolvedConfig.chrome.heroTypography.eyebrowMarginBottom}px`
          }}
        >
          {resolvedConfig.hero.eyebrow}
        </p>
        <h2
          className="images-display-title display-surface-hero-title"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.titleFontSize}px`,
            letterSpacing: `${resolvedConfig.chrome.heroTypography.titleLetterSpacing}px`,
            lineHeight: resolvedConfig.chrome.heroTypography.titleLineHeight
          }}
        >
          <em
            className="display-surface-hero-title-emphasis"
            style={{ fontWeight: heroTypography.titleEmphasisWeight }}
          >
            {titleTokens.emphasis}
          </em>
          {titleTokens.suffix}
        </h2>
        <p
          className="images-hero-subtitle display-surface-hero-subtitle"
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
        className="images-copy-block"
        style={{
          left: `${copyLayout.left}px`,
          top: `${copyLayout.top}px`,
          width: `${copyLayout.width}px`
        }}
      >
        {resolvedConfig.hero.copyLines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </p>

      <div
        className="images-gold-ornament images-grass-ornament display-surface-gold-ornament"
        style={{
          height: `${grassLayout.height}px`,
          left: `${grassLayout.left}px`,
          opacity: resolvedConfig.chrome.ornaments.goldLine.opacity,
          top: `${grassLayout.top + resolvedConfig.chrome.ornaments.goldLine.offsetY}px`,
          width: `${grassLayout.width}px`
        }}
      >
        <img alt="" src={imagesAssetRuntimeMap.leftOrnament} />
      </div>

      <section
        className="images-slide-counter"
        style={{
          height: `${counterLayout.height}px`,
          left: `${counterLayout.left}px`,
          top: `${counterLayout.top}px`,
          width: `${counterLayout.width}px`
        }}
      >
        <b style={{ fontSize: `${resolvedConfig.chrome.modules.counter.currentFontSize}px` }}>
          {viewModel.counter.current}
        </b>
        <span style={{ fontSize: `${resolvedConfig.chrome.modules.counter.totalFontSize}px` }}>/ {viewModel.counter.total}</span>
        <p
          style={{
            fontSize: `${resolvedConfig.chrome.modules.counter.bodyFontSize}px`,
            marginTop: `${resolvedConfig.chrome.modules.counter.bodyMarginTop}px`
          }}
        >
          自動輪播中，目前素材停留 {viewModel.active.durationSeconds} 秒
        </p>
        <div
          key={viewModel.active.entryId}
          className="images-progress-line"
          style={{
            height: `${resolvedConfig.chrome.modules.counter.progressThickness}px`,
            top: `${resolvedConfig.chrome.modules.counter.progressTopOffset}px`,
            ["--images-slide-duration" as string]: `${viewModel.active.durationSeconds * 1000}ms`
          }}
        />
      </section>

      <figure
        className={[
          "images-main-stage display-surface-media-stage",
          isReferenceHeroCrop ? "images-main-stage-reference" : "",
          mainStageMediaPresentation.stageClassName
        ].filter(Boolean).join(" ")}
        style={{
          ...mainStageMediaPresentation.stageStyle,
          height: `${mainLayout.height}px`,
          left: `${mainLayout.left}px`,
          top: `${mainLayout.top}px`,
          width: `${mainLayout.width}px`
        }}
      >
        {viewModel.active.assetSource ? (
          <img
            alt={resolvedConfig.mainStage.alt || viewModel.active.title}
            key={viewModel.active.entryId}
            src={activeMainStageSource}
            style={mainStageMediaPresentation.mediaStyle}
          />
        ) : (
          <div className="images-main-placeholder">
            <div className="glyph-shell">
              {renderDisplayPageIcon({
                alt: resolvedConfig.mainStage.alt || viewModel.active.title,
                className: "h-full w-full",
                seedSource: seedConfig.iconSources.mainStagePlaceholder,
                source: resolvedConfig.iconSources.mainStagePlaceholder
              })}
            </div>
            <h3>{viewModel.active.title}</h3>
            <p>{viewModel.active.placeholderLabel}</p>
          </div>
        )}
        {mainStageOverlayLayers.map((layer) => (
          <span
            key={layer.id}
            aria-hidden="true"
            className={layer.className}
            style={layer.style}
          />
        ))}
      </figure>

      {!isReferenceHeroCrop ? (
        <DisplayCardFrame
          cardStyle={infoCardStyle}
          className="images-info-card"
          surface="info"
          style={{
            height: `${infoLayout.height}px`,
            left: `${infoLayout.left}px`,
            top: `${infoLayout.top}px`,
            width: `${infoLayout.width}px`
          }}
        >
          <DisplayCardHeader
            icon={renderDisplayPageIcon({
              alt: "Images Info Icon",
              className: "h-full w-full",
              seedSource: seedConfig.iconSources.infoPanel,
              source: resolvedConfig.iconSources.infoPanel
            })}
            iconContainerClassName="images-info-icon"
            title={viewModel.active.infoPanel.title}
          />
          <p className="images-info-card-body">
            {viewModel.active.infoPanel.description}
          </p>
          <DisplayCardFooter>
            <small className="images-info-card-meta">
              {viewModel.active.infoPanel.area} · {viewModel.active.durationSeconds} 秒
              {viewModel.active.infoPanel.capturedAt !== "尚未同步"
                ? ` · ${viewModel.active.infoPanel.capturedAt}`
                : ""}
            </small>
          </DisplayCardFooter>
        </DisplayCardFrame>
      ) : null}

      <button
        aria-label="上一張圖片"
        className="images-gallery-arrow"
        style={{
          borderRadius: `${resolvedConfig.chrome.modules.arrows.borderRadius}px`,
          fontSize: `${resolvedConfig.chrome.modules.arrows.fontSize}px`,
          height: `${resolvedConfig.chrome.modules.arrows.buttonSize}px`,
          left: `${resolvedConfig.arrows.left.left}px`,
          top: `${resolvedConfig.arrows.left.top - CONTENT_TOP_OFFSET}px`,
          width: `${resolvedConfig.chrome.modules.arrows.buttonSize}px`
        }}
        onClick={() => autoplay.prev()}
        type="button"
      >
        <span aria-hidden="true" className="images-gallery-arrow-icon is-prev" />
      </button>
      <button
        aria-label="下一張圖片"
        className="images-gallery-arrow"
        style={{
          borderRadius: `${resolvedConfig.chrome.modules.arrows.borderRadius}px`,
          fontSize: `${resolvedConfig.chrome.modules.arrows.fontSize}px`,
          height: `${resolvedConfig.chrome.modules.arrows.buttonSize}px`,
          left: `${resolvedConfig.arrows.right.left}px`,
          top: `${resolvedConfig.arrows.right.top - CONTENT_TOP_OFFSET}px`,
          width: `${resolvedConfig.chrome.modules.arrows.buttonSize}px`
        }}
        onClick={() => autoplay.next()}
        type="button"
      >
        <span aria-hidden="true" className="images-gallery-arrow-icon is-next" />
      </button>

      {visibleThumbnails.map((thumbnail, thumbIndex) => {
        const layout = resolvedConfig.thumbnailSlots[thumbSlotOrder[thumbIndex]!];

        return (
          <button
            key={thumbnail.entryId}
            className={[
              "images-thumb",
              thumbnail.isActive ? "images-thumb-active" : ""
            ].join(" ")}
            style={{
              height: `${layout.height}px`,
              left: `${layout.left}px`,
              top: `${layout.top - CONTENT_TOP_OFFSET}px`,
              width: `${layout.width}px`
            }}
            onClick={() => autoplay.selectIndex(visibleStart + thumbIndex)}
            type="button"
          >
            {thumbnail.assetSource ? (
              <img alt={thumbnail.infoPanel.title} src={thumbnail.assetSource} />
            ) : (
              <div className="images-thumb-placeholder">
                {renderDisplayPageIcon({
                  alt: thumbnail.infoPanel.title,
                  className: "h-full w-full",
                  seedSource: seedConfig.iconSources.thumbnailSlots[thumbSlotOrder[thumbIndex]!],
                  source: resolvedConfig.iconSources.thumbnailSlots[thumbSlotOrder[thumbIndex]!]
                })}
              </div>
            )}
          </button>
        );
      })}
      <DisplayPageObjectLayer objects={freeformObjects} />
    </section>
  );
}
