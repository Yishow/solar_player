import React, { useEffect, useState, type PropsWithChildren, type ReactNode } from "react";
import { computeCanvasLayout } from "./displayCanvasLayout";

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
}>;

export function DisplayCanvas({ footer, header, children }: DisplayCanvasProps) {
  const [layout, setLayout] = useState(() => computeCanvasLayout(
    getViewportSize(),
    { height: DESIGN_HEIGHT, width: DESIGN_WIDTH }
  ));

  useEffect(() => {
    const updateLayout = () => {
      setLayout(computeCanvasLayout(
        getViewportSize(),
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
  }, []);

  return (
    <div
      data-shell-primitive="display-canvas-viewport"
      className="shell-stage relative h-screen w-screen overflow-hidden text-neutral-900"
      style={{
        backgroundColor: "var(--stage-bg)"
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
