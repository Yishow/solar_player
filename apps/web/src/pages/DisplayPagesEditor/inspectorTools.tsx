import React from "react";
import type { DisplayEditorGeometryClipboard } from "./displayEditorGeometry";
import type { DisplayEditorPresetOption } from "./displayEditorRegionState";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";

export function DisplayEditorInspectorTools({
  geometryClipboard,
  geometryClipboardCompatibility,
  onApplyPreset,
  onCopyGeometry,
  onPasteGeometry,
  onResetRegion,
  presetOptions,
  selectedRegion,
  selectedRegionLocked
}: {
  geometryClipboard: DisplayEditorGeometryClipboard | null;
  geometryClipboardCompatibility: { compatible: boolean; reason: string | null };
  onApplyPreset: (presetOption: DisplayEditorPresetOption) => void;
  onCopyGeometry: () => void;
  onPasteGeometry: () => void;
  onResetRegion: () => void;
  presetOptions: DisplayEditorPresetOption[];
  selectedRegion: ResolvedDisplayEditorRegion;
  selectedRegionLocked: boolean;
}) {
  return (
    <div className="grid gap-3 rounded-[18px] border border-[var(--shell-divider)] bg-[rgba(82,91,66,0.03)] p-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-45"
          disabled={selectedRegionLocked}
          onClick={onResetRegion}
        >
          Reset Region
        </button>
        {selectedRegion.geometry ? (
          <button
            type="button"
            className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold"
            onClick={onCopyGeometry}
          >
            Copy Geometry
          </button>
        ) : null}
        {selectedRegion.geometry ? (
          <button
            type="button"
            className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-45"
            disabled={selectedRegionLocked || !geometryClipboardCompatibility.compatible || !geometryClipboard}
            title={geometryClipboardCompatibility.reason ?? undefined}
            onClick={onPasteGeometry}
          >
            Paste Geometry
          </button>
        ) : null}
        {selectedRegionLocked ? (
          <span className="rounded-full bg-[rgba(82,91,66,0.12)] px-3 py-1.5 text-[12px] font-semibold text-[var(--shell-title-ink)]">
            Locked regions 無法直接改動
          </span>
        ) : null}
      </div>
      <div className="grid gap-2">
        <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--shell-subtitle-ink)]">
          Region Presets
        </div>
        {presetOptions.length > 0 ? (
          presetOptions.map((option) => (
            <button
              key={option.sourceRegionId}
              type="button"
              className="rounded-[14px] border border-[var(--shell-divider)] px-3 py-2 text-left text-[12px] text-[var(--shell-copy-ink)] disabled:opacity-45"
              disabled={selectedRegionLocked || !option.compatible}
              title={option.reason ?? undefined}
              onClick={() => onApplyPreset(option)}
            >
              {option.sourceRegionLabel}
              {!option.compatible ? "（不相容）" : ""}
            </button>
          ))
        ) : (
          <div className="text-[12px] text-[var(--shell-copy-ink)]">
            目前頁面沒有其他可用 preset。
          </div>
        )}
      </div>
    </div>
  );
}
