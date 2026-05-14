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
      className="relative h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(245,248,241,0.98)_38%,_rgba(234,241,229,1)_100%)] text-neutral-900"
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
          className="relative flex h-full w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_78%_12%,rgba(255,255,255,0.72),rgba(255,255,255,0)_34%),linear-gradient(120deg,#fffdf7_0%,#f8f4e9_74%,#f2efe5_100%)]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.25),rgba(255,255,255,0)_20%),radial-gradient(circle_at_20%_88%,rgba(108,132,82,0.11),transparent_17%)]" />
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
