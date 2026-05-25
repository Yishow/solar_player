import type { ImageAsset } from "@solar-display/shared";
import React from "react";

export type ShellDecorationAssetOption = {
  assetId: number;
  fallbackSrc: string;
  label: string;
};

export function ShellDecorationAssetPicker({
  onChange,
  options,
  value
}: {
  onChange: (assetId: number) => void;
  options: ShellDecorationAssetOption[];
  value: number | null;
}) {
  return (
    <label className="grid gap-2 text-[13px] text-[var(--shell-copy-ink)]">
      <span className="text-[12px] font-semibold text-[var(--shell-title-ink)]">素材</span>
      <select
        className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2"
        value={value ?? ""}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        <option value="" disabled>
          選擇圖片素材
        </option>
        {options.map((option) => (
          <option key={option.assetId} value={option.assetId}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function buildShellDecorationAssetLabel(asset: ImageAsset) {
  return asset.title ?? asset.originalName ?? asset.filename ?? `Image ${asset.id}`;
}
