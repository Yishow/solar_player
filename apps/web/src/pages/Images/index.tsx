import { useMemo, useState } from "react";
import { ReferenceGlyph } from "../../components/ReferenceGlyph";
import { useBodyClass } from "../../hooks/useBodyClass";
import { useDisplayPageConfig } from "../../hooks/useDisplayPageConfig";
import { imageMocks } from "../../mocks/images";
import { buildDisplayPageMediaStyle } from "../displayPageMediaStyle";
import { imagesAssetRuntimeMap } from "./assets";
import {
  createImagesDisplayPageSeedConfig,
  type ImagesDisplayPageConfig
} from "./displayPageConfig";
import {
  imagesCounterLayout,
  imagesGoldLayout,
  imagesTitleLayout
} from "./layout";
import "./images.css";
import { buildImagesViewModel } from "./viewModel";

const CONTENT_TOP_OFFSET = 146;

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

export function Images({ config }: { config?: ImagesDisplayPageConfig }) {
  useBodyClass("page-hero-shell");
  const seedConfig = useMemo(
    () => createImagesDisplayPageSeedConfig(imagesAssetRuntimeMap.main),
    []
  );
  const runtimeConfig = useDisplayPageConfig("images", seedConfig, {
    enabled: config === undefined,
    stage: "live"
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const resolvedConfig = config ?? runtimeConfig.config;
  const assetSources = useMemo(
    () => [
      resolvedConfig.mainStage.src,
      imagesAssetRuntimeMap.thumbs[0],
      imagesAssetRuntimeMap.thumbs[1],
      imagesAssetRuntimeMap.thumbs[2],
      null
    ],
    [resolvedConfig.mainStage.src]
  );
  const viewModel = buildImagesViewModel({
    activeIndex,
    assetSources,
    slides: imageMocks
  });
  const visibleStart = Math.min(Math.max(activeIndex - 1, 0), Math.max(viewModel.thumbnails.length - 4, 0));
  const visibleThumbnails = viewModel.thumbnails.slice(visibleStart, visibleStart + 4);

  const titleLayout = withContentOffset(imagesTitleLayout);
  const copyLayout = withContentOffset(resolvedConfig.textBlocks.copy);
  const goldLayout = withContentOffset(imagesGoldLayout);
  const counterLayout = withContentOffset(imagesCounterLayout);
  const mainLayout = withContentOffset(resolvedConfig.mainStage);
  const infoLayout = withContentOffset(resolvedConfig.infoPanel);
  const titleTokens = splitImagesTitle(resolvedConfig.hero.title);

  return (
    <section className="images-display-page">
      <section
        className="images-title-group"
        style={{
          left: `${titleLayout.left}px`,
          top: `${titleLayout.top}px`,
          width: `${titleLayout.width}px`
        }}
      >
        <p className="images-eyebrow">{resolvedConfig.hero.eyebrow}</p>
        <h2 className="images-display-title">
          <em>{titleTokens.emphasis}</em>
          {titleTokens.suffix}
        </h2>
        <p className="images-hero-subtitle">{resolvedConfig.hero.subtitle}</p>
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
        className="images-gold-ornament"
        style={{
          height: `${goldLayout.height}px`,
          left: `${goldLayout.left}px`,
          top: `${goldLayout.top}px`,
          width: `${goldLayout.width}px`
        }}
      />

      <section
        className="images-slide-counter"
        style={{
          height: `${counterLayout.height}px`,
          left: `${counterLayout.left}px`,
          top: `${counterLayout.top}px`,
          width: `${counterLayout.width}px`
        }}
      >
        <b>{viewModel.counter.current}</b>
        <span>/ {viewModel.counter.total}</span>
        <p>自動輪播中，每 15 秒切換一張</p>
        <div
          className="images-progress-line"
          style={{
            ["--progress-width" as string]: `${((activeIndex + 1) / Math.max(viewModel.thumbnails.length, 1)) * 100}%`
          }}
        />
      </section>

      <figure
        className="images-main-stage"
        style={{
          height: `${mainLayout.height}px`,
          left: `${mainLayout.left}px`,
          top: `${mainLayout.top}px`,
          width: `${mainLayout.width}px`
        }}
      >
        {viewModel.active.hasAsset ? (
          <img
            alt={resolvedConfig.mainStage.alt || viewModel.active.title}
            src={viewModel.active.assetSource ?? resolvedConfig.mainStage.src ?? undefined}
            style={buildDisplayPageMediaStyle(resolvedConfig.mainStage)}
          />
        ) : (
          <div className="images-main-placeholder">
            <div className="glyph-shell">
              <ReferenceGlyph name="image" />
            </div>
            <h3>{viewModel.active.title}</h3>
            <p>{viewModel.active.placeholderLabel}</p>
          </div>
        )}
      </figure>

      <article
        className="images-info-card"
        style={{
          height: `${infoLayout.height}px`,
          left: `${infoLayout.left}px`,
          top: `${infoLayout.top}px`,
          width: `${infoLayout.width}px`
        }}
      >
        <div className="images-info-icon">
          <ReferenceGlyph name="image" />
        </div>
        <h3>{viewModel.active.title}</h3>
        <p>廠區播放素材會優先使用已同步資產；若素材缺漏，仍保留完整圖片版型與資訊欄位。</p>
        <small>
          {viewModel.active.id} · {viewModel.active.area} · {viewModel.active.resolution} · {viewModel.active.durationSec} 秒 · {viewModel.active.updatedAt}
        </small>
      </article>

      <button
        className="images-gallery-arrow"
        style={{
          left: `${resolvedConfig.arrows.left.left}px`,
          top: `${resolvedConfig.arrows.left.top - CONTENT_TOP_OFFSET}px`
        }}
        onClick={() =>
          setActiveIndex((index) => (index > 0 ? index - 1 : viewModel.thumbnails.length - 1))
        }
      >
        ‹
      </button>
      <button
        className="images-gallery-arrow"
        style={{
          left: `${resolvedConfig.arrows.right.left}px`,
          top: `${resolvedConfig.arrows.right.top - CONTENT_TOP_OFFSET}px`
        }}
        onClick={() => setActiveIndex((index) => (index < viewModel.thumbnails.length - 1 ? index + 1 : 0))}
      >
        ›
      </button>

      {visibleThumbnails.map((thumbnail, thumbIndex) => {
        const layout = resolvedConfig.thumbnailSlots[thumbSlotOrder[thumbIndex]!];
        const runtimeThumb = imagesAssetRuntimeMap.thumbs[(visibleStart + thumbIndex) % imagesAssetRuntimeMap.thumbs.length];

        return (
          <button
            key={thumbnail.id}
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
            onClick={() => setActiveIndex(visibleStart + thumbIndex)}
          >
            {thumbnail.hasAsset ? (
              <img alt={thumbnail.title} src={runtimeThumb ?? thumbnail.assetSource ?? undefined} />
            ) : (
              <div className="images-thumb-placeholder">
                <ReferenceGlyph name="image" />
              </div>
            )}
          </button>
        );
      })}
    </section>
  );
}
