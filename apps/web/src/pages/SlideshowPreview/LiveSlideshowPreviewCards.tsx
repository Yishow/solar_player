import type { DisplayPageTemplateKey, PlaybackPage } from "@solar-display/shared";
import { isDisplayPageTemplateKey } from "@solar-display/shared";
import {
  LiveDisplayPagePreview,
  type LiveDisplayPagePreviewDefinition,
  type LiveDisplayPagePreviewState
} from "../shared/liveDisplayPagePreview";
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
  states: Partial<Record<DisplayPageTemplateKey, LiveDisplayPagePreviewState>>
) {
  if (!templateKey) {
    return {
      detail: "目前無法解析此輪播卡片對應的展示頁。",
      status: "renderer-unavailable"
    } satisfies LiveDisplayPagePreviewState;
  }

  return states[templateKey] ?? {
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
  states: Partial<Record<DisplayPageTemplateKey, LiveDisplayPagePreviewState>>;
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
                pageLabel={card.labelZh}
                state={resolvePreviewState(templateKey, states)}
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
