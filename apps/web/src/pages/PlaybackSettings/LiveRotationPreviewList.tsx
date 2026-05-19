import type { DisplayPageKey } from "@solar-display/shared";
import { isDisplayPageKey } from "@solar-display/shared";
import {
  LiveDisplayPagePreview,
  type LiveDisplayPagePreviewDefinition,
  type LiveDisplayPagePreviewState
} from "../shared/liveDisplayPagePreview";
import type { RotationPreviewRow } from "../DisplayPagesEditor/rotationPreview";

function resolvePageKey(row: RotationPreviewRow): DisplayPageKey | null {
  if (row.pageKey && isDisplayPageKey(row.pageKey)) {
    return row.pageKey;
  }

  const routeKey = row.route.replace(/^\//, "");
  return isDisplayPageKey(routeKey) ? routeKey : null;
}

function resolvePreviewState(
  pageKey: DisplayPageKey | null,
  states: Partial<Record<DisplayPageKey, LiveDisplayPagePreviewState>>
) {
  if (!pageKey) {
    return {
      detail: "目前無法從輪播頁面資料解析對應的展示頁 key。",
      status: "renderer-unavailable"
    } satisfies LiveDisplayPagePreviewState;
  }

  return states[pageKey] ?? {
    detail: "正在同步正式預覽...",
    status: "loading"
  };
}

export function LiveRotationPreviewList({
  definitions,
  rows,
  states
}: {
  definitions: LiveDisplayPagePreviewDefinition[];
  rows: RotationPreviewRow[];
  states: Partial<Record<DisplayPageKey, LiveDisplayPagePreviewState>>;
}) {
  return (
    <>
      {rows.map((page, index, arr) => {
        const pageKey = resolvePageKey(page);

        return (
          <div key={page.id} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div className="ps-preview__item">
              <div className="ps-preview__item-surface">
                <LiveDisplayPagePreview
                  definitions={definitions}
                  pageKey={pageKey ?? "overview"}
                  pageLabel={page.labelZh}
                  state={resolvePreviewState(pageKey, states)}
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
