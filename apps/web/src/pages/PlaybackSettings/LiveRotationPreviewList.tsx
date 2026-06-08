import {
  LiveDisplayPagePreview,
  type LiveDisplayPagePreviewState,
  type LiveDisplayPagePreviewDefinition,
} from "../shared/liveDisplayPagePreview";
import {
  resolveLiveDisplayPagePreviewState,
  type LiveDisplayPagePreviewStates
} from "../shared/liveDisplayPagePreviewState";
import type { RotationPreviewRow } from "../DisplayPagesEditor/rotationPreview";

function resolvePreviewState(
  templateKey: string | null,
  pageId: string,
  states: LiveDisplayPagePreviewStates
) : LiveDisplayPagePreviewState {
  if (!templateKey) {
    return {
      detail: "目前無法從輪播頁面資料解析對應的展示頁版型。",
      status: "renderer-unavailable"
    };
  }

  return resolveLiveDisplayPagePreviewState(pageId, states);
}

const PLAYBACK_ROTATION_PREVIEW_SCALE = 101 / 1080;

export function LiveRotationPreviewList({
  definitions,
  rows,
  states
}: {
  definitions: LiveDisplayPagePreviewDefinition[];
  rows: RotationPreviewRow[];
  states: LiveDisplayPagePreviewStates;
}) {
  return (
    <>
      {rows.map((page, index, arr) => {
        return (
          <div key={page.id} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div className="ps-preview__item">
              <div className="ps-preview__item-surface">
                <LiveDisplayPagePreview
                  definitions={definitions}
                  templateKey={page.templateKey ?? "overview"}
                  pageLabel={page.labelZh}
                  previewScale={PLAYBACK_ROTATION_PREVIEW_SCALE}
                  state={resolvePreviewState(page.templateKey, page.pageId, states)}
                />
              </div>
              <div className="ps-preview__label">
                <span className="ps-badge-number">{index + 1}</span>
                <div className="ps-preview__label-copy">
                  <strong>{page.labelEn}</strong>
                  <small>{page.instanceLabel}</small>
                  <small>{page.durationLabel}</small>
                </div>
                <span className={`mgmt-chip ${page.stateTone === "warning" ? "is-warning" : page.stateTone === "accent" ? "is-accent" : "is-success"}`}>
                  {page.stateLabel}
                </span>
              </div>
            </div>
            {index < arr.length - 1 && <div className="ps-preview__arrow">&gt;</div>}
          </div>
        );
      })}
    </>
  );
}
