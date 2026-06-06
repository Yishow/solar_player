import type { CSSProperties } from "react";
import type { PlaybackOrientation } from "@solar-display/shared";

export type DisplayCanvasSurfaceSettings = {
  brightness?: number;
  orientation?: PlaybackOrientation;
};

const BRIGHTNESS_IDENTITY = 100;
const BRIGHTNESS_MIN = 0;
const BRIGHTNESS_MAX = 200;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * 把已持久化的 brightness / orientation 轉成 playback surface 級的 CSSProperties。
 * - brightness 100（或缺值）為 identity，不輸出 filter，避免無謂 compositing。
 * - portrait 以 rotate(90deg) + 對調寬高呈現於直立實體螢幕；landscape/缺值不旋轉。
 * 純函式、immutable，不依賴 DOM。
 */
export function resolveDisplayCanvasSurfaceStyle(
  settings: DisplayCanvasSurfaceSettings
): CSSProperties {
  const style: CSSProperties = {};

  const brightness = clamp(settings.brightness ?? BRIGHTNESS_IDENTITY, BRIGHTNESS_MIN, BRIGHTNESS_MAX);
  if (brightness !== BRIGHTNESS_IDENTITY) {
    style.filter = `brightness(${brightness / 100})`;
  }

  if (settings.orientation === "portrait") {
    // 直立實體螢幕：把 100vh×100vw 的 surface 以 top-left 為原點旋轉 90° 後平移回視窗，
    // 讓為橫向設計的內容填滿直立螢幕長軸。
    style.position = "fixed";
    style.top = 0;
    style.left = 0;
    style.width = "100vh";
    style.height = "100vw";
    style.transformOrigin = "top left";
    style.transform = "rotate(90deg) translateY(-100vh)";
  }

  return style;
}
