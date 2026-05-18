import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { DisplayEditorInspectorFields, type ResolvedDisplayEditorRegion } from "./inspectorFields";

export function DisplayEditorCanvasCard({
  controls,
  editMode,
  onScaleChange,
  onToggleEditMode,
  onZoomDelta,
  pageLabel,
  preview,
  viewportHeight,
  viewportWidth
}: {
  controls: ReactNode;
  editMode: boolean;
  onScaleChange?: (scale: number) => void;
  onToggleEditMode: () => void;
  onZoomDelta: (delta: number, focusPoint: { x: number; y: number }) => void;
  pageLabel: string;
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
    <article className="self-start rounded-[28px] border border-[var(--shell-divider)] bg-[rgba(252,251,246,0.96)] p-5 shadow-[0_20px_45px_rgba(80,94,54,0.08)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[var(--shell-subtitle-ink)]">
            Canvas Preview
          </p>
          <h3 className="mt-2 text-[24px] font-semibold text-[var(--shell-title-ink)]">
            {pageLabel}
          </h3>
        </div>
        <button
          type="button"
          aria-pressed={editMode}
          title="切換編輯模式 (E)"
          className={[
            "rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
            editMode
              ? "bg-[rgba(95,140,80,0.16)] text-[var(--shell-title-ink)] hover:bg-[rgba(95,140,80,0.26)]"
              : "bg-[rgba(82,91,66,0.08)] text-[var(--shell-muted-ink)] hover:bg-[rgba(82,91,66,0.14)] hover:text-[var(--shell-title-ink)]"
          ].join(" ")}
          onClick={onToggleEditMode}
        >
          {editMode ? "Edit Mode ON" : "Edit Mode OFF"}
        </button>
      </div>
      {controls}
      <div
        ref={wrapperRef}
        className="mt-5 w-full overflow-hidden rounded-[24px] border border-[var(--shell-divider)] bg-[#eef1e7]"
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
    </article>
  );
}

export function DisplayEditorInspectorCard({
  actions,
  editMode,
  emptyMessage,
  onChange,
  onResetField,
  selectedRegion
}: {
  actions?: ReactNode;
  editMode: boolean;
  emptyMessage: string;
  onChange: Parameters<typeof DisplayEditorInspectorFields>[0]["onChange"];
  onResetField?: Parameters<typeof DisplayEditorInspectorFields>[0]["onResetField"];
  selectedRegion: ResolvedDisplayEditorRegion | null;
}) {
  return (
    <article className="rounded-[28px] border border-[var(--shell-divider)] bg-white/78 p-5 shadow-[0_20px_45px_rgba(80,94,54,0.08)]">
      <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[var(--shell-subtitle-ink)]">
        Inspector
      </p>
      {!editMode ? (
        <p className="mt-3 text-[15px] leading-7 text-[var(--shell-copy-ink)]">
          按 E 啟用編輯模式，然後選取畫布區塊進入後續 phase 的 inspector。
        </p>
      ) : selectedRegion ? (
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="text-[18px] font-semibold text-[var(--shell-title-ink)]">
              {selectedRegion.label}
            </h4>
            {selectedRegion.description ? (
              <p className="mt-1 text-[13px] leading-6 text-[var(--shell-copy-ink)]">
                {selectedRegion.description}
              </p>
            ) : null}
          </div>
          {actions}
          <DisplayEditorInspectorFields
            fields={selectedRegion.fields}
            onChange={onChange}
            onResetField={onResetField}
          />
        </div>
      ) : (
        <p className="mt-3 text-[15px] leading-7 text-[var(--shell-copy-ink)]">{emptyMessage}</p>
      )}
    </article>
  );
}
