import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export function DisplayEditorCanvasCard({
  controls,
  onScaleChange,
  onZoomDelta,
  preview,
  viewportHeight,
  viewportWidth
}: {
  controls: ReactNode;
  onScaleChange?: (scale: number) => void;
  onZoomDelta: (delta: number, focusPoint: { x: number; y: number }) => void;
  preview: ReactNode;
  viewportHeight: number;
  viewportWidth: number;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const onZoomDeltaRef = useRef(onZoomDelta);
  onZoomDeltaRef.current = onZoomDelta;

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        const next = entry.contentRect.width / viewportWidth;
        setScale(next);
        onScaleChange?.(next);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewportWidth, onScaleChange]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const pixelDelta = event.deltaMode === 1 ? event.deltaY * 20 : event.deltaY;
      onZoomDeltaRef.current(-pixelDelta / 1000, {
        x: event.offsetX / scaleRef.current,
        y: event.offsetY / scaleRef.current
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  return (
    <div className="self-start w-full">
      {controls}
      <div
        ref={wrapperRef}
        data-shell-primitive="workspace-panel"
        data-workspace-surface="preview-surface"
        className="mt-4 w-full overflow-hidden rounded-[24px] border border-[var(--workspace-surface-border)] bg-[var(--workspace-surface-muted)] shadow-[var(--workspace-surface-shadow)]"
        style={{ aspectRatio: `${viewportWidth} / ${viewportHeight}` }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            height: `${viewportHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${viewportWidth}px`
          }}
        >
          {preview}
        </div>
      </div>
    </div>
  );
}
