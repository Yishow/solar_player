import {
  IconAutoplay,
  IconCalendar,
  IconCaretLeft,
  IconCaretRight,
  IconClock,
  IconNextPage,
  IconNodePath,
  IconPause,
  IconPlay,
  IconStar,
  IconTransition
} from "../../components/icons";
import { usePageRotation } from "../../hooks/usePageRotation";
import { slideshowPreviewAssetRuntimeMap } from "./assets";
import { slideshowCardOffsets, slideshowLayout } from "./layout";
import "./preview.css";
import { buildSlideshowPreviewViewModel } from "./viewModel";

const summaryIcons = [
  <IconStar key="star" />,
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
        <div className="sp-title-text">
          <h1>
            循環<em>播放預覽頁</em>
          </h1>
          <p>Slideshow Preview</p>
        </div>
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
        {/* Box 1: Playback status */}
        <div className="sp-status-card sp-status-card--playback">
          <span className="sp-sc-label">
            播放狀態 <small>Playback Status</small>
          </span>
          <div className="sp-sc-main">
            <div className="sp-sc-status-info">
              <span className={`sp-sc-status-text${isPlaying ? " is-playing" : ""}`}>
                {isPlaying ? "自動播放中" : "已暫停"}
                <small>Auto Play</small>
              </span>
              <span className={`sp-sc-badge${!isPlaying ? " is-paused" : ""}`}>
                {isPlaying ? "啟用中 Enabled" : "暫停中 Paused"}
              </span>
            </div>
            <div className={`sp-sc-play-icon${!isPlaying ? " is-paused" : ""}`}>
              <IconPlay size={28} />
            </div>
          </div>
        </div>

        {/* Box 2: Current page */}
        <div className="sp-status-card sp-status-card--current">
          <span className="sp-sc-label">
            目前頁面 <small>Current Page</small>
          </span>
          <div className="sp-sc-page-count">
            <span className="sp-sc-count-val">{viewModel.currentIndexLabel}</span>
            <div className="sp-sc-node-icon">
              <IconNodePath size={36} />
            </div>
          </div>
          <div className="sp-sc-page-name">
            <span>{viewModel.currentPageLabel}</span>
            <small>{viewModel.currentRouteLabel}</small>
          </div>
        </div>

        {/* Box 3: Display duration */}
        <div className="sp-status-card sp-status-card--compact">
          <span className="sp-sc-label">
            每頁停留時間 <small>Display Duration</small>
          </span>
          <div className="sp-sc-value-row">
            <span className="sp-sc-value-num">{currentPage ? currentPage.durationSeconds : "--"}</span>
            <small className="sp-sc-unit">秒 (sec.)</small>
          </div>
        </div>

        {/* Box 4: Next page countdown */}
        <div className="sp-status-card sp-status-card--compact">
          <span className="sp-sc-label">
            下一頁切換倒數 <small>Next Page In</small>
          </span>
          <div className="sp-sc-value-row">
            <span className="sp-sc-value-num is-countdown">{countdown}</span>
            <small className="sp-sc-unit">秒 (sec.)</small>
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
            </article>
          );
        })}
        <button type="button" className="sp-arrow prev" onClick={prevPage} aria-label="上一張">
          <IconCaretLeft size={28} />
        </button>
        <button type="button" className="sp-arrow next" onClick={nextPage} aria-label="下一張">
          <IconCaretRight size={28} />
        </button>
        <div className="sp-dots">
          <div className="sp-dots-line" />
          {pages.map((p, i) => (
            <i key={p.id} className={p.id === currentPage?.id ? "on" : ""} />
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
        <div className="sp-summary-title">
          <h2>
            播放設定摘要 <small>Playback Summary</small>
          </h2>
        </div>
        <div className="sp-summary-grid">
          {viewModel.summaryRows.map((row, index) => (
            <div key={row.label} className={`sp-summary-item${index === 3 && isPlaying ? " is-on" : ""}`}>
              <div className="sp-summary-header">
                <span className="sp-summary-icon" aria-hidden>
                  {summaryIcons[index]}
                </span>
                <div className="sp-summary-labels">
                  <b>{row.label}</b>
                  <small>{["Playback route", "Display Duration", "Transition Effect", "Auto Play", "Last Updated"][index]}</small>
                </div>
              </div>
              <div className="sp-summary-value">{row.value}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="sp-leaf-bg" aria-hidden />
    </section>
  );
}
