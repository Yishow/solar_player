import React, { useEffect, useRef, useState, type PropsWithChildren } from "react";

export const MANAGEMENT_FIXED_LAYOUT_WIDTH = 1920;
export const MANAGEMENT_FIXED_LAYOUT_HEIGHT = 838;

type ViewportSize = {
  width: number;
  height: number;
};

export function computeManagementFixedLayoutScale({ height, width }: ViewportSize) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 1;
  }

  return Math.min(
    width / MANAGEMENT_FIXED_LAYOUT_WIDTH,
    height / MANAGEMENT_FIXED_LAYOUT_HEIGHT,
    1
  );
}

function getFallbackViewportSize(): ViewportSize {
  return {
    height: MANAGEMENT_FIXED_LAYOUT_HEIGHT,
    width: MANAGEMENT_FIXED_LAYOUT_WIDTH
  };
}

export function ManagementFixedLayoutFrame({ children }: PropsWithChildren) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState<ViewportSize>(() => getFallbackViewportSize());

  useEffect(() => {
    const viewportNode = viewportRef.current;
    if (!viewportNode) return;

    const updateViewportSize = (nextSize?: Partial<ViewportSize>) => {
      const nextWidth = nextSize?.width ?? viewportNode.clientWidth;
      const nextHeight = nextSize?.height ?? viewportNode.clientHeight;

      setViewportSize({
        height: nextHeight > 0 ? nextHeight : MANAGEMENT_FIXED_LAYOUT_HEIGHT,
        width: nextWidth > 0 ? nextWidth : MANAGEMENT_FIXED_LAYOUT_WIDTH
      });
    };

    updateViewportSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        updateViewportSize({
          height: entry.contentRect.height,
          width: entry.contentRect.width
        });
      });
      observer.observe(viewportNode);
      return () => observer.disconnect();
    }

    const handleResize = () => updateViewportSize();
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  const scale = computeManagementFixedLayoutScale(viewportSize);
  const scaledWidth = MANAGEMENT_FIXED_LAYOUT_WIDTH * scale;
  const scaledHeight = MANAGEMENT_FIXED_LAYOUT_HEIGHT * scale;

  return (
    <div
      ref={viewportRef}
      data-shell-primitive="management-fixed-layout-viewport"
      className="flex h-full min-h-full w-full justify-center"
    >
      <div
        data-shell-primitive="management-fixed-layout-bounds"
        className="relative shrink-0"
        style={{
          height: `${scaledHeight}px`,
          width: `${scaledWidth}px`
        }}
      >
        <div
          data-shell-primitive="management-fixed-layout-frame"
          className="absolute left-0 top-0 origin-top-left"
          style={{
            height: `${MANAGEMENT_FIXED_LAYOUT_HEIGHT}px`,
            transform: `scale(${scale})`,
            width: `${MANAGEMENT_FIXED_LAYOUT_WIDTH}px`
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
