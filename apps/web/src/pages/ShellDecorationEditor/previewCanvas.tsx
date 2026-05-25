import React from "react";
import type { ShellDecorationChannel, ShellDecorationObject } from "@solar-display/shared";
import { defaultBrandView } from "../../hooks/useBrandAssets";
import { AppFooterNav } from "../../components/AppFooterNav";
import { AppHeader } from "../../components/AppHeader";

const PREVIEW_SCALE = 0.5;
const SURFACE_WIDTH = 1920;
const SURFACE_HEIGHT = 1080;
const FOOTER_HEIGHT = 72;

function resolveObjectPreviewFrame(object: ShellDecorationObject) {
  const topOffset = object.mount === "footer" ? SURFACE_HEIGHT - FOOTER_HEIGHT : 0;

  return {
    height: object.frame.height * PREVIEW_SCALE,
    left: object.frame.left * PREVIEW_SCALE,
    top: (topOffset + object.frame.top) * PREVIEW_SCALE,
    width: object.frame.width * PREVIEW_SCALE
  };
}

export function ShellDecorationPreviewCanvas({
  channel,
  selectedObjectId
}: {
  channel: ShellDecorationChannel;
  selectedObjectId: string | null;
}) {
  const allObjects = [...channel.headerObjects, ...channel.footerObjects];
  const selectedObject = selectedObjectId
    ? allObjects.find((object) => object.id === selectedObjectId) ?? null
    : null;

  return (
    <div
      data-shell-preview-surface="true"
      className="relative overflow-hidden rounded-[28px] border border-[var(--shell-divider)] bg-[#eef2e6]"
      style={{
        height: `${SURFACE_HEIGHT * PREVIEW_SCALE}px`,
        width: `${SURFACE_WIDTH * PREVIEW_SCALE}px`
      }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          height: `${SURFACE_HEIGHT}px`,
          transform: `scale(${PREVIEW_SCALE})`,
          transformOrigin: "top left",
          width: `${SURFACE_WIDTH}px`
        }}
      >
        <div className="relative flex h-full w-full flex-col overflow-hidden bg-[var(--stage-bg)]">
          <AppHeader brandView={defaultBrandView} decorationObjects={channel.headerObjects} />
          <main className="flex-1 bg-[rgba(255,255,255,0.2)]" />
          <AppFooterNav brandView={defaultBrandView} decorationObjects={channel.footerObjects} />
        </div>
      </div>
      {selectedObject ? (
        <div
          data-shell-preview-selection={selectedObject.id}
          className="pointer-events-none absolute rounded-[10px] border-2 border-[rgba(63,122,52,0.88)] bg-[rgba(95,140,80,0.08)]"
          style={resolveObjectPreviewFrame(selectedObject)}
        />
      ) : null}
    </div>
  );
}
