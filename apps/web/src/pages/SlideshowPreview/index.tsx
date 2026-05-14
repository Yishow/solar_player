import {
  IconAutoplay,
  IconCalendar,
  IconClock,
  IconNextPage,
  IconOrder,
  IconPause,
  IconPlay,
  IconTransition
} from "../../components/icons";
import { usePageRotation } from "../../hooks/usePageRotation";
import { slideshowPreviewAssetRuntimeMap } from "./assets";
import { slideshowCardOffsets, slideshowLayout } from "./layout";
import "./preview.css";
import { buildSlideshowPreviewViewModel } from "./viewModel";

const summaryIcons = [
  <IconOrder key="order" />,
  <IconClock key="clock" />,
  <IconTransition key="trans" />,
  <IconAutoplay key="play" />,
  <IconCalendar key="cal" />
];

export function SlideshowPreview() {
  const {
    countdown,
    currentPage,
    errorMessage,
    isIdle,
    isLoading,
    isPlaying,
    nextPage,
    pages,
    prevPage,
    progress,
    settings,
    togglePlay
  } = usePageRotation();

  const viewModel = buildSlideshowPreviewViewModel({
    countdown,
    currentPage,
    errorMessage,
    isIdle,
    isLoading,
    isPlaying,
    pages,
    progress,
    settings
  });

  // Center the active card at index 2 (third position) by rotating the queue.
  const allCards = viewModel.queueCards;
  const activeIdx = Math.max(0, allCards.findIndex((c) => c.isCurrent));
  const visibleCards = allCards.length >= 5
    ? (Array.from({ length: 5 }, (_, i) => {
        const offset = i - 2; // positions: -2 -1 0 +1 +2 around active
        return allCards[(activeIdx + offset + allCards.length) % allCards.length];
      }).filter(Boolean) as typeof allCards)
    : allCards;

  return (
    <section className="sp-page">
      <section
        className="sp-title"
        style={{ left: slideshowLayout.title.left, top: slideshowLayout.title.top }}
      >
        <h1>
          循環<em>播放預覽頁</em>
        </h1>
        <p>Slideshow Preview</p>
      </section>

      {/* === Left status rail === */}
      <aside
        className="sp-status"
        style={{
          left: slideshowLayout.status.left,
          top: slideshowLayout.status.top,
          width: slideshowLayout.status.width
        }}
      >
        {/* Card 1: Playback status */}
        <div className="sp-status-card sp-status-card--playback">
          <span className="sp-sc-label">
            播放狀態 <small>Playback Status</small>
          </span>
          <div className="sp-sc-status-row">
            <span className={`sp-sc-dot${isPlaying ? " is-playing" : ""}`} />
            <span className={`sp-sc-status-text${isPlaying ? " is-playing" : ""}`}>
              {viewModel.statusLabel}
            </span>
          </div>
          <span className={`sp-sc-badge${!isPlaying ? " is-paused" : ""}`}>
            {isPlaying ? "Enabled" : "Paused"}
          </span>
          <button
            type="button"
            className={`sp-play-btn${!isPlaying ? " is-paused" : ""}`}
            onClick={togglePlay}
            aria-label={isPlaying ? "暫停" : "播放"}
          >
            {isPlaying ? <IconPause size={20} /> : <IconPlay size={20} />}
          </button>
        </div>

        {/* Card 2: Current page + sub-rows + progress */}
        <div className="sp-status-card sp-status-card--current">
          <span className="sp-sc-label">
            目前播放中 <small>Currently Playing</small>
          </span>
          <div className="sp-sc-index">{viewModel.currentIndexLabel}</div>
          <div className="sp-sc-page-name">
            <span>{viewModel.currentPageLabel}</span>
            <small>{viewModel.currentRouteLabel}</small>
          </div>
          <div className="sp-sc-rows">
            <div className="sp-sc-row">
              <span className="sp-sc-row-label">
                <IconClock size={13} />
                每頁停留時間
              </span>
              <span className="sp-sc-row-value">
                {currentPage ? currentPage.durationSeconds : "--"}
                <small>秒</small>
              </span>
            </div>
            <div className="sp-sc-row">
              <span className="sp-sc-row-label">
                <IconNextPage size={13} />
                下頁切換倒數
              </span>
              <span className="sp-sc-row-value">
                {countdown}
                <small>秒</small>
              </span>
            </div>
          </div>
          <div
            className="sp-progress"
            style={{ ["--progress-width" as string]: viewModel.progressLabel }}
          />
        </div>
      </aside>

      {/* === Carousel === */}
      <section
        className="sp-carousel"
        style={{
          height: slideshowLayout.carousel.height,
          left: slideshowLayout.carousel.left,
          top: slideshowLayout.carousel.top,
          width: slideshowLayout.carousel.width
        }}
      >
        {visibleCards.map((card, index) => {
          const asset =
            slideshowPreviewAssetRuntimeMap[
              card.previewAssetKey as keyof typeof slideshowPreviewAssetRuntimeMap
            ] ?? slideshowPreviewAssetRuntimeMap.fallback;
          return (
            <article
              key={card.id}
              className={`sp-card${card.isCurrent ? " active" : ""}`}
              style={{ left: slideshowCardOffsets[index] ?? 0 }}
            >
              <span className="sp-card-num">
                {String(card.displayOrder).padStart(2, "0")}
              </span>
              <img alt={card.labelZh} src={asset} />
              <div className="sp-card-footer">
                <h3>{card.labelZh}</h3>
                <p>{card.labelEn}</p>
              </div>
              {card.isCurrent && (
                <div className="sp-card-ctrls">
                  <button
                    type="button"
                    className="sp-ctrl-btn"
                    onClick={prevPage}
                    aria-label="上一頁"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="sp-ctrl-btn play"
                    onClick={togglePlay}
                    aria-label={isPlaying ? "暫停" : "播放"}
                  >
                    {isPlaying ? <IconPause size={18} /> : <IconPlay size={18} />}
                  </button>
                  <button
                    type="button"
                    className="sp-ctrl-btn"
                    onClick={nextPage}
                    aria-label="下一頁"
                  >
                    ›
                  </button>
                </div>
              )}
            </article>
          );
        })}
        <button type="button" className="sp-arrow prev" onClick={prevPage} aria-label="上一張">
          ‹
        </button>
        <button type="button" className="sp-arrow next" onClick={nextPage} aria-label="下一張">
          ›
        </button>
        <div className="sp-dots">
          {visibleCards.map((card) => (
            <i key={card.id} className={card.isCurrent ? "on" : ""} />
          ))}
        </div>
      </section>

      {/* === Bottom summary === */}
      <section
        className="sp-summary"
        style={{
          height: slideshowLayout.summary.height,
          left: slideshowLayout.summary.left,
          top: slideshowLayout.summary.top,
          width: slideshowLayout.summary.width
        }}
      >
        <h2>
          播放定義摘要 <small>Playback Summary</small>
        </h2>
        {viewModel.summaryRows.map((row, index) => (
          <div key={row.label} className={index === 3 && isPlaying ? "is-on" : ""}>
            <span className="sp-summary-icon" aria-hidden>
              {summaryIcons[index]}
            </span>
            <b>{row.label}</b>
            <span>{row.value}</span>
          </div>
        ))}
      </section>

      <div className="sp-leaf-bg" aria-hidden />
    </section>
  );
}
