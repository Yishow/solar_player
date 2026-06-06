import React, { useEffect, useState, type PropsWithChildren, type ReactNode } from "react";
import type { PlaybackOrientation } from "@solar-display/shared";
import { computeCanvasLayout } from "./displayCanvasLayout";
import { resolveDisplayCanvasSurfaceStyle } from "./displayCanvasSurfaceStyle";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

function getViewportSize() {
  if (typeof window === "undefined") {
    return {
      height: DESIGN_HEIGHT,
      width: DESIGN_WIDTH
    };
  }

  return {
    height: window.visualViewport?.height ?? window.innerHeight,
    width: window.visualViewport?.width ?? window.innerWidth
  };
}

type DisplayCanvasProps = PropsWithChildren<{
  footer?: ReactNode;
  header?: ReactNode;
  brightness?: number;
  orientation?: PlaybackOrientation;
}>;

export function DisplayCanvas({ footer, header, children, brightness, orientation }: DisplayCanvasProps) {
  const isPortrait = orientation === "portrait";
  const measureViewport = () => {
    const viewport = getViewportSize();
    // portrait 旋轉後，內容沿實體螢幕長軸鋪排，故以對調的寬高計算 frame 縮放。
    return isPortrait ? { height: viewport.width, width: viewport.height } : viewport;
  };
  const [layout, setLayout] = useState(() => computeCanvasLayout(
    measureViewport(),
    { height: DESIGN_HEIGHT, width: DESIGN_WIDTH }
  ));

  useEffect(() => {
    const updateLayout = () => {
      setLayout(computeCanvasLayout(
        measureViewport(),
        { height: DESIGN_HEIGHT, width: DESIGN_WIDTH }
      ));
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    window.visualViewport?.addEventListener("resize", updateLayout);

    return () => {
      window.removeEventListener("resize", updateLayout);
      window.visualViewport?.removeEventListener("resize", updateLayout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPortrait]);

  const surfaceStyle = resolveDisplayCanvasSurfaceStyle({ brightness, orientation });

  return (
    <div
      data-shell-primitive="display-canvas-viewport"
      className="shell-stage relative h-screen w-screen overflow-hidden text-neutral-900"
      style={{
        backgroundColor: "var(--stage-bg)",
        ...surfaceStyle
      }}
    >
      <div
        data-shell-primitive="display-canvas-frame"
        className="absolute left-0 top-0"
        style={{
          height: `${DESIGN_HEIGHT}px`,
          transform: `translate(${layout.offsetX}px, ${layout.offsetY}px) scale(${layout.scale})`,
          transformOrigin: "top left",
          width: `${DESIGN_WIDTH}px`
        }}
      >
        <div
          data-shell-primitive="display-canvas-surface"
          className="shell-stage-surface relative flex h-full w-full flex-col overflow-hidden"
        >
          <div className="shell-stage-overlay pointer-events-none absolute inset-0" />
          {header}
          <main
            data-shell-primitive="display-canvas-content"
            className="relative min-h-0 flex-1 overflow-hidden"
          >
            {children}
          </main>
          {footer}
        </div>
      </div>
    </div>
  );
}
