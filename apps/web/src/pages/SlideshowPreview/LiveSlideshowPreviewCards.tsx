import type { DisplayPageTemplateKey, PlaybackPage } from "@solar-display/shared";
import { isDisplayPageTemplateKey } from "@solar-display/shared";
import {
  LiveDisplayPagePreview,
  type LiveDisplayPagePreviewState,
  type LiveDisplayPagePreviewDefinition,
} from "../shared/liveDisplayPagePreview";
import {
  resolveLiveDisplayPagePreviewState,
  type LiveDisplayPagePreviewStates
} from "../shared/liveDisplayPagePreviewState";
import { slideshowCardOffsets } from "./layout";

type SlideshowPreviewCard = Pick<
  PlaybackPage,
  "displayOrder" | "id" | "labelEn" | "labelZh" | "pageKey" | "templateKey"
> & {
  isCurrent: boolean;
  routeLabel: string;
  statusLabel: string;
};

function resolveCardTemplateKey(card: SlideshowPreviewCard): DisplayPageTemplateKey | null {
  if (card.templateKey && isDisplayPageTemplateKey(card.templateKey)) {
    return card.templateKey;
  }

  const routeKey = card.routeLabel.replace(/^\//, "");
  return isDisplayPageTemplateKey(routeKey) ? routeKey : null;
}

function resolvePreviewState(
  templateKey: DisplayPageTemplateKey | null,
  pageKey: string,
  states: LiveDisplayPagePreviewStates
) : LiveDisplayPagePreviewState {
  if (!templateKey) {
    return {
      detail: "目前無法解析此輪播卡片對應的展示頁。",
      status: "renderer-unavailable"
    };
  }

  return resolveLiveDisplayPagePreviewState(pageKey, states);
}

export function LiveSlideshowPreviewCards({
  cards,
  definitions,
  states
}: {
  cards: SlideshowPreviewCard[];
  definitions: LiveDisplayPagePreviewDefinition[];
  states: LiveDisplayPagePreviewStates;
}) {
  return (
    <>
      {cards.map((card, index) => {
        const templateKey = resolveCardTemplateKey(card);

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
                mode="showcase"
                pageLabel={card.labelZh}
                state={resolvePreviewState(templateKey, card.pageKey, states)}
                templateKey={templateKey ?? "overview"}
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
