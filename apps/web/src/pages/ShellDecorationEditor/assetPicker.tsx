import type { ImageAsset } from "@solar-display/shared";
import React, { useMemo, useState } from "react";

export type ShellDecorationAssetOption = {
  assetId: number;
  category?: string | null;
  fallbackSrc: string;
  label: string;
  usageScope?: string | null;
};

const categoryLabels: Record<string, string> = {
  background: "背景",
  icon: "圖示",
  object: "物件"
};

const usageScopeLabels: Record<string, string> = {
  both: "頁面 + 殼層",
  "page-only": "僅頁面",
  "shell-only": "僅殼層"
};

function formatCategory(value: string | null | undefined) {
  return value ? categoryLabels[value] ?? value : "未分類";
}

function formatUsageScope(value: string | null | undefined) {
  return value ? usageScopeLabels[value] ?? value : "頁面 + 殼層";
}

export function ShellDecorationAssetPicker({
  onChange,
  onOpenAssetWorkspace,
  options,
  value
}: {
  onChange: (assetId: number) => void;
  onOpenAssetWorkspace?: () => void;
  options: ShellDecorationAssetOption[];
  value: number | null;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = useMemo(
    () => Array.from(new Set(options.map((option) => option.category).filter(Boolean))) as string[],
    [options]
  );
  const selectedOption = options.find((option) => option.assetId === value) ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter((option) => {
    if (category !== "all" && option.category !== category) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [option.label, option.category, option.usageScope].some((text) =>
      text?.toLowerCase().includes(normalizedQuery)
    );
  });

  return (
    <div className="grid gap-3 text-[13px] text-[var(--shell-copy-ink)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold text-[var(--shell-title-ink)]">素材</span>
        {onOpenAssetWorkspace ? (
          <button
            type="button"
            className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[12px] font-semibold text-[var(--shell-copy-ink)]"
            onClick={onOpenAssetWorkspace}
          >
            開啟資產庫
          </button>
        ) : null}
      </div>
      {selectedOption ? (
        <div className="grid grid-cols-[64px_1fr] gap-3 rounded-[14px] border border-[var(--shell-divider)] bg-white p-2">
          <img alt="" className="aspect-square rounded-[10px] object-cover" src={selectedOption.fallbackSrc} />
          <div className="min-w-0">
            <div className="truncate font-semibold text-[var(--shell-title-ink)]">{selectedOption.label}</div>
            <div className="mt-1 text-[12px] text-[var(--shell-subtitle-ink)]">
              {formatCategory(selectedOption.category)} · {formatUsageScope(selectedOption.usageScope)}
            </div>
            <div className="mt-1 text-[12px] text-[var(--shell-copy-ink)]">#{selectedOption.assetId}</div>
          </div>
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
        <input
          className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2"
          placeholder="搜尋素材"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">全部分類</option>
          {categories.map((categoryValue) => (
            <option key={categoryValue} value={categoryValue}>
              {formatCategory(categoryValue)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid max-h-[320px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {filteredOptions.map((option) => {
          const selected = option.assetId === value;
          return (
            <button
              key={option.assetId}
              type="button"
              aria-pressed={selected}
              data-asset-picker-card={option.assetId}
              className={[
                "rounded-[14px] border bg-white p-2 text-left transition-colors",
                selected
                  ? "border-[var(--shell-title-ink)] bg-[rgba(82,91,66,0.08)]"
                  : "border-[var(--shell-divider)] hover:border-[var(--shell-divider-strong)]"
              ].join(" ")}
              onClick={() => onChange(option.assetId)}
            >
              <img alt="" className="aspect-video w-full rounded-[10px] object-cover" src={option.fallbackSrc} />
              <div className="mt-2 truncate text-[13px] font-semibold text-[var(--shell-title-ink)]">{option.label}</div>
              <div className="mt-1 text-[11px] text-[var(--shell-subtitle-ink)]">
                {formatCategory(option.category)} · {formatUsageScope(option.usageScope)}
              </div>
            </button>
          );
        })}
      </div>
      {filteredOptions.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[var(--shell-divider)] px-3 py-2 text-[12px] text-[var(--shell-subtitle-ink)]">
          沒有符合條件的素材。
        </div>
      ) : null}
    </div>
  );
}

export function buildShellDecorationAssetLabel(asset: ImageAsset) {
  return asset.title ?? asset.originalName ?? asset.filename ?? `素材 ${asset.id}`;
}
