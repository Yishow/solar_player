import type { DisplayPageKey, PlaybackPage } from "@solar-display/shared";
import { isDisplayPageKey } from "@solar-display/shared";
import {
  LiveDisplayPagePreview,
  type LiveDisplayPagePreviewDefinition,
  type LiveDisplayPagePreviewState
} from "../shared/liveDisplayPagePreview";
import { slideshowCardOffsets } from "./layout";

type SlideshowPreviewCard = Pick<
  PlaybackPage,
  "displayOrder" | "id" | "labelEn" | "labelZh" | "pageKey"
> & {
  isCurrent: boolean;
  routeLabel: string;
  statusLabel: string;
};

function resolveCardPageKey(card: SlideshowPreviewCard): DisplayPageKey | null {
  if (isDisplayPageKey(card.pageKey)) {
    return card.pageKey;
  }

  const routeKey = card.routeLabel.replace(/^\//, "");
  return isDisplayPageKey(routeKey) ? routeKey : null;
}

function resolvePreviewState(
  pageKey: DisplayPageKey | null,
  states: Partial<Record<DisplayPageKey, LiveDisplayPagePreviewState>>
) {
  if (!pageKey) {
    return {
      detail: "目前無法解析此輪播卡片對應的展示頁。",
      status: "renderer-unavailable"
    } satisfies LiveDisplayPagePreviewState;
  }

  return states[pageKey] ?? {
    detail: "正在同步正式預覽...",
    status: "loading"
  };
}

export function LiveSlideshowPreviewCards({
  cards,
  definitions,
  states
}: {
  cards: SlideshowPreviewCard[];
  definitions: LiveDisplayPagePreviewDefinition[];
  states: Partial<Record<DisplayPageKey, LiveDisplayPagePreviewState>>;
}) {
  return (
    <>
      {cards.map((card, index) => {
        const pageKey = resolveCardPageKey(card);

        return (
          <article
            key={card.id}
            className={`sp-card${card.isCurrent ? " active" : ""}`}
            style={{ left: slideshowCardOffsets[index] ?? 0 }}
          >
            <span className="sp-card-num">
              {String(card.displayOrder).padStart(2, "0")}
            </span>
            <div className="sp-card-preview">
              <LiveDisplayPagePreview
                definitions={definitions}
                pageKey={pageKey ?? "overview"}
                pageLabel={card.labelZh}
                state={resolvePreviewState(pageKey, states)}
              />
            </div>
            <div className="sp-card-footer">
              <h3>{card.labelZh}</h3>
              <p>{card.labelEn}</p>
            </div>
          </article>
        );
      })}
    </>
  );
}
