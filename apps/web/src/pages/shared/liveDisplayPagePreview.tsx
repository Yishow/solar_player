import type { DisplayPageKey } from "@solar-display/shared";
import React from "react";
import type { ReactElement } from "react";

export type LiveDisplayPagePreviewDefinition = {
  id: DisplayPageKey;
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
      return "缺少預覽 renderer";
    case "runtime-unavailable":
      return "預覽資料暫時不可用";
    case "unpublished":
      return "尚未發布正式版";
    default:
      return "";
  }
}

export function LiveDisplayPagePreview({
  definitions,
  pageKey,
  pageLabel,
  state
}: {
  definitions: LiveDisplayPagePreviewDefinition[];
  pageKey: DisplayPageKey;
  pageLabel: string;
  state: LiveDisplayPagePreviewState;
}) {
  const definition = definitions.find((entry) => entry.id === pageKey);

  if (state.status !== "ready" || !definition?.renderPreview) {
    const status = state.status !== "ready" ? state.status : "renderer-unavailable";

    return (
      <section
        aria-label={`${pageLabel} live preview fallback`}
        data-live-preview-status={status}
        style={{
          alignItems: "center",
          background: "linear-gradient(160deg, rgba(241,246,233,0.98), rgba(226,235,214,0.94))",
          border: "1px solid rgba(109,133,84,0.18)",
          borderRadius: "18px",
          color: "#58724b",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          height: "100%",
          justifyContent: "center",
          padding: "16px",
          textAlign: "center"
        }}
      >
        <strong>{pageLabel}</strong>
        <span>{resolveFallbackHeadline(status)}</span>
        {"detail" in state && state.detail ? (
          <small style={{ lineHeight: 1.5, opacity: 0.8 }}>{state.detail}</small>
        ) : null}
        <small style={{ letterSpacing: "0.08em", opacity: 0.72 }}>唯讀預覽</small>
      </section>
    );
  }

  return (
    <section
      aria-label={`${pageLabel} live preview`}
      data-live-preview-status="ready"
      style={{
        background: "#f6f3ea",
        border: "1px solid rgba(109,133,84,0.16)",
        borderRadius: "18px",
        height: "100%",
        overflow: "hidden",
        position: "relative"
      }}
    >
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
      <div
        style={{
          height: "100%",
          pointerEvents: "none",
          width: "100%"
        }}
      >
        {definition.renderPreview(state.config)}
      </div>
    </section>
  );
}
