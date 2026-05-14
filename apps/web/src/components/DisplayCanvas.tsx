import { useEffect, useState, type PropsWithChildren, type ReactNode } from "react";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

type CanvasScale = {
  x: number;
  y: number;
};

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

function computeCanvasScale(): CanvasScale {
  const viewport = getViewportSize();

  return {
    x: viewport.width / DESIGN_WIDTH,
    y: viewport.height / DESIGN_HEIGHT
  };
}

type DisplayCanvasProps = PropsWithChildren<{
  footer?: ReactNode;
  header?: ReactNode;
}>;

export function DisplayCanvas({ footer, header, children }: DisplayCanvasProps) {
  const [scale, setScale] = useState<CanvasScale>(() => computeCanvasScale());

  useEffect(() => {
    const updateScale = () => {
      setScale(computeCanvasScale());
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    window.visualViewport?.addEventListener("resize", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
      window.visualViewport?.removeEventListener("resize", updateScale);
    };
  }, []);

  return (
    <div
      data-shell-primitive="display-canvas-viewport"
      className="shell-stage relative h-screen w-screen overflow-hidden text-neutral-900"
    >
      <div
        data-shell-primitive="display-canvas-frame"
        className="absolute left-0 top-0"
        style={{
          height: `${DESIGN_HEIGHT}px`,
          transform: `scale(${scale.x}, ${scale.y})`,
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
