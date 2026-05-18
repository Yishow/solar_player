import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { DisplayEditorCanvasOverlay, DisplayEditorInspectorFields, type ResolvedDisplayEditorRegion } from "./inspectorFields";

export function DisplayEditorCanvasCard({
  controls,
  editMode,
  lockedRegionIds,
  onSelectRegion,
  onStartInteraction,
  pageLabel,
  preview,
  regions,
  selectedRegionId,
  viewportHeight,
  viewportWidth
}: {
  controls: ReactNode;
  editMode: boolean;
  lockedRegionIds: string[];
  onSelectRegion: (regionId: string) => void;
  onStartInteraction: Parameters<typeof DisplayEditorCanvasOverlay>[0]["onStartInteraction"];
  pageLabel: string;
  preview: ReactNode;
  regions: ResolvedDisplayEditorRegion[];
  selectedRegionId: string | null;
  viewportHeight: number;
  viewportWidth: number;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / viewportWidth);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewportWidth]);

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
        <div
          className={[
            "rounded-full px-4 py-2 text-[13px] font-semibold",
            editMode
              ? "bg-[rgba(95,140,80,0.16)] text-[var(--shell-title-ink)]"
              : "bg-[rgba(82,91,66,0.08)] text-[var(--shell-muted-ink)]"
          ].join(" ")}
        >
          {editMode ? "Edit Mode ON" : "Edit Mode OFF"}
        </div>
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
          <DisplayEditorCanvasOverlay
            isInteractive={editMode}
            lockedRegionIds={lockedRegionIds}
            regions={regions}
            selectedRegionId={selectedRegionId}
            onSelect={onSelectRegion}
            onStartInteraction={onStartInteraction}
          />
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
