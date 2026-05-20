import type { DisplayPageTemplateKey } from "@solar-display/shared";
import {
  LiveDisplayPagePreview,
  type LiveDisplayPagePreviewDefinition,
  type LiveDisplayPagePreviewState
} from "../shared/liveDisplayPagePreview";
import type { RotationPreviewRow } from "../DisplayPagesEditor/rotationPreview";

function resolvePreviewState(
  templateKey: DisplayPageTemplateKey | null,
  states: Partial<Record<DisplayPageTemplateKey, LiveDisplayPagePreviewState>>
) {
  if (!templateKey) {
    return {
      detail: "目前無法從輪播頁面資料解析對應的展示頁 template。",
      status: "renderer-unavailable"
    } satisfies LiveDisplayPagePreviewState;
  }

  return states[templateKey] ?? {
    detail: "正在同步正式預覽...",
    status: "loading"
  };
}

const PLAYBACK_ROTATION_PREVIEW_SCALE = 101 / 1080;

export function LiveRotationPreviewList({
  definitions,
  rows,
  states
}: {
  definitions: LiveDisplayPagePreviewDefinition[];
  rows: RotationPreviewRow[];
  states: Partial<Record<DisplayPageTemplateKey, LiveDisplayPagePreviewState>>;
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
                  state={resolvePreviewState(page.templateKey, states)}
                />
              </div>
              <div className="ps-preview__label">
                <span className="ps-badge-number">{index + 1}</span> {page.labelEn}
                <small style={{ display: "block", opacity: 0.72 }}>{page.durationLabel}</small>
              </div>
            </div>
            {index < arr.length - 1 && <div className="ps-preview__arrow">&gt;</div>}
          </div>
        );
      })}
    </>
  );
}
