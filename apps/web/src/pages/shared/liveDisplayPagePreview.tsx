import type { DisplayPageTemplateKey } from "@solar-display/shared";
import React from "react";
import type { ReactElement } from "react";

const LIVE_PREVIEW_CANVAS_WIDTH = 1920;
const LIVE_PREVIEW_CANVAS_HEIGHT = 1080;

export type LiveDisplayPagePreviewMode = "editor" | "showcase";

export type LiveDisplayPagePreviewDefinition = {
  id: DisplayPageTemplateKey;
  label: string;
  renderPreview?: (config: Record<string, unknown>) => ReactElement;
};

export type LiveDisplayPagePreviewState =
  | {
      config: Record<string, unknown>;
      status: "ready";
    }
  | {
      detail?: string;
      status:
        | "asset-unavailable"
        | "config-unavailable"
        | "loading"
        | "renderer-unavailable"
        | "runtime-unavailable"
        | "unpublished";
    };

function resolveFallbackHeadline(status: LiveDisplayPagePreviewState["status"]) {
  switch (status) {
    case "asset-unavailable":
      return "預覽暫時無法顯示";
    case "config-unavailable":
      return "正式設定尚未同步";
    case "loading":
      return "正在同步正式預覽";
    case "renderer-unavailable":
      return "缺少預覽元件";
    case "runtime-unavailable":
      return "預覽資料暫時不可用";
    case "unpublished":
      return "尚未發布正式版";
    default:
      return "";
  }
}

function resolveShowcaseFallbackHeadline(status: LiveDisplayPagePreviewState["status"]) {
  switch (status) {
    case "loading":
      return "正在同步展示頁";
    case "unpublished":
      return "尚未發布展示頁";
    default:
      return "展示頁暫不可用";
  }
}

export function LiveDisplayPagePreview({
  definitions,
  mode = "editor",
  templateKey,
  pageLabel,
  state,
  previewScale = 1
}: {
  definitions: LiveDisplayPagePreviewDefinition[];
  mode?: LiveDisplayPagePreviewMode;
  templateKey: DisplayPageTemplateKey;
  pageLabel: string;
  previewScale?: number;
  state: LiveDisplayPagePreviewState;
}) {
  const definition = definitions.find((entry) => entry.id === templateKey);
  const isShowcaseMode = mode === "showcase";

  if (state.status !== "ready" || !definition?.renderPreview) {
    const status = state.status !== "ready" ? state.status : "renderer-unavailable";

    return (
      <section
        aria-label={`${pageLabel} live preview fallback`}
        data-live-preview-mode={mode}
        data-live-preview-status={status}
        style={{
          alignItems: "center",
          background: isShowcaseMode
            ? "linear-gradient(180deg, rgba(250,248,241,0.98), rgba(239,235,224,0.94))"
            : "linear-gradient(160deg, rgba(241,246,233,0.98), rgba(226,235,214,0.94))",
          border: isShowcaseMode ? "0" : "1px solid rgba(109,133,84,0.18)",
          borderRadius: isShowcaseMode ? "0" : "18px",
          color: isShowcaseMode ? "#5c6f4f" : "#58724b",
          display: "flex",
          flexDirection: "column",
          gap: isShowcaseMode ? "10px" : "8px",
          height: "100%",
          justifyContent: "center",
          padding: isShowcaseMode ? "18px 16px" : "16px",
          textAlign: "center"
        }}
      >
        <strong>{pageLabel}</strong>
        <span>{isShowcaseMode ? resolveShowcaseFallbackHeadline(status) : resolveFallbackHeadline(status)}</span>
        {!isShowcaseMode && "detail" in state && state.detail ? (
          <small style={{ lineHeight: 1.5, opacity: 0.8 }}>{state.detail}</small>
        ) : null}
        {!isShowcaseMode ? (
          <small style={{ letterSpacing: "0.08em", opacity: 0.72 }}>唯讀預覽</small>
        ) : null}
      </section>
    );
  }

  return (
    <section
      aria-label={`${pageLabel} live preview`}
      data-live-preview-mode={mode}
      data-live-preview-status="ready"
      style={{
        background: isShowcaseMode ? "linear-gradient(180deg, #faf7ef, #f3efe5)" : "#f6f3ea",
        border: isShowcaseMode ? "0" : "1px solid rgba(109,133,84,0.16)",
        borderRadius: isShowcaseMode ? "0" : "18px",
        height: "100%",
        overflow: "hidden",
        position: "relative"
      }}
    >
      {!isShowcaseMode ? (
        <div
          style={{
            inset: "14px auto auto 14px",
            position: "absolute",
            zIndex: 2
          }}
        >
          <span
            style={{
              background: "rgba(255,250,242,0.88)",
              border: "1px solid rgba(109,133,84,0.16)",
              borderRadius: "999px",
              color: "#5b764c",
              display: "inline-flex",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              padding: "6px 10px"
            }}
          >
            唯讀預覽
          </span>
        </div>
      ) : null}
      <div
        style={{
          height: "100%",
          pointerEvents: "none",
          position: "relative",
          width: "100%"
        }}
      >
        <div
          style={{
            height: `${LIVE_PREVIEW_CANVAS_HEIGHT * previewScale}px`,
            left: "50%",
            overflow: "hidden",
            position: "absolute",
            top: 0,
            transform: "translateX(-50%)",
            width: `${LIVE_PREVIEW_CANVAS_WIDTH * previewScale}px`
          }}
        >
          <div
            data-live-preview-scaled-content="true"
            style={{
              height: `${LIVE_PREVIEW_CANVAS_HEIGHT}px`,
              transform: `scale(${previewScale})`,
              transformOrigin: "top left",
              width: `${LIVE_PREVIEW_CANVAS_WIDTH}px`
            }}
          >
            {definition.renderPreview(state.config)}
          </div>
        </div>
      </div>
    </section>
  );
}
