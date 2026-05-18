import type { DisplayPageKey } from "@solar-display/shared";
import React from "react";
import type { ReactNode } from "react";
import type { DisplayEditorPageDefinition } from "./index";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";

export function DisplayEditorSidebar({
  assetHealthPanel,
  dirty,
  editMode,
  errorMessage,
  isLoading,
  isPublishing,
  isPublishBlocked,
  isSaving,
  message,
  onPublish,
  onReload,
  onSave,
  onSelectRegion,
  onSelectPage,
  onToggleRegionLock,
  pageDefinitions,
  publishingPanels,
  regions,
  lockedRegionIds,
  selectedRegionId,
  selectedPageId
}: {
  assetHealthPanel: ReactNode;
  dirty: boolean;
  editMode: boolean;
  errorMessage: string;
  isLoading: boolean;
  isPublishing: boolean;
  isPublishBlocked: boolean;
  isSaving: boolean;
  message: string;
  onPublish: () => void;
  onReload: () => void;
  onSave: () => void;
  onSelectRegion: (regionId: string) => void;
  onSelectPage: (pageId: DisplayPageKey) => void;
  onToggleRegionLock: (regionId: string) => void;
  pageDefinitions: DisplayEditorPageDefinition[];
  publishingPanels: ReactNode;
  regions: ResolvedDisplayEditorRegion[];
  selectedRegionId: string | null;
  selectedPageId: DisplayPageKey;
  lockedRegionIds: string[];
}) {
  return (
    <section className="rounded-[28px] border border-[var(--shell-divider)] bg-white/70 p-5 shadow-[0_20px_45px_rgba(80,94,54,0.08)] backdrop-blur-sm">
      <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[var(--shell-subtitle-ink)]">
        Rollout Pages
      </p>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-4 py-2 text-[13px] font-semibold text-[var(--shell-copy-ink)] disabled:opacity-55"
          disabled={isLoading}
          onClick={onReload}
        >
          重新同步
        </button>
        <button
          type="button"
          className="rounded-full bg-[var(--shell-accent)] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-55"
          disabled={isLoading || isSaving || !dirty}
          onClick={onSave}
        >
          {isSaving ? "儲存中..." : "儲存設定"}
        </button>
        <button
          type="button"
          className="rounded-full bg-[var(--shell-title-ink)] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-55"
          disabled={isLoading || isSaving || isPublishing || isPublishBlocked}
          onClick={onPublish}
        >
          {isPublishing ? "發布中..." : "發布草稿"}
        </button>
      </div>
      <div
        className={[
          "mt-4 rounded-[18px] border px-4 py-3 text-[13px] leading-6",
          errorMessage
            ? "border-[rgba(180,82,52,0.25)] bg-[rgba(180,82,52,0.08)] text-[#8f452d]"
            : dirty
              ? "border-[rgba(201,136,26,0.24)] bg-[rgba(201,136,26,0.08)] text-[#8e6410]"
              : "border-[var(--shell-divider)] bg-[rgba(82,91,66,0.05)] text-[var(--shell-copy-ink)]"
        ].join(" ")}
        role="status"
      >
        {errorMessage || message}
      </div>
      {publishingPanels}
      {assetHealthPanel}
      <div className="mt-4 grid gap-3">
        {pageDefinitions.map((page) => {
          const active = page.id === selectedPageId;
          return (
            <button
              key={page.id}
              type="button"
              className={[
                "rounded-[18px] border px-4 py-3 text-left transition-colors",
                active
                  ? "border-[var(--shell-accent)] bg-[rgba(95,140,80,0.12)] text-[var(--shell-title-ink)]"
                  : "border-[var(--shell-divider)] bg-white/70 text-[var(--shell-muted-ink)] hover:border-[var(--shell-divider-strong)] hover:text-[var(--shell-title-ink)]"
              ].join(" ")}
              onClick={() => onSelectPage(page.id)}
            >
              <div className="text-[15px] font-semibold">{page.label}</div>
              <div className="mt-1 text-[12px] text-[var(--shell-subtitle-ink)]">{page.id}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-5 rounded-[20px] border border-[var(--shell-divider)] bg-[rgba(82,91,66,0.03)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-subtitle-ink)]">
              Region Tree
            </div>
            <div className="mt-1 text-[12px] text-[var(--shell-copy-ink)]">
              {editMode ? "從樹狀清單選取或鎖定 region。" : "開啟 Edit Mode 後可直接管理 region。"}
            </div>
          </div>
          <div className="rounded-full bg-[rgba(82,91,66,0.08)] px-3 py-1 text-[12px] font-semibold text-[var(--shell-copy-ink)]">
            {regions.length} regions
          </div>
        </div>
        <div className="mt-3 grid gap-2">
          {regions.map((region) => {
            const isSelected = selectedRegionId === region.id;
            const isLocked = lockedRegionIds.includes(region.id);
            return (
              <div
                key={region.id}
                className={[
                  "rounded-[16px] border px-3 py-2",
                  isSelected
                    ? "border-[var(--shell-accent)] bg-[rgba(95,140,80,0.08)]"
                    : "border-[var(--shell-divider)] bg-white/80"
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onSelectRegion(region.id)}
                  >
                    <div className="truncate text-[14px] font-semibold text-[var(--shell-title-ink)]">
                      {region.label}
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--shell-subtitle-ink)]">{region.id}</div>
                  </button>
                  <button
                    type="button"
                    aria-label={`${region.label} ${isLocked ? "unlock" : "lock"}`}
                    className={[
                      "rounded-full px-3 py-1 text-[11px] font-semibold",
                      isLocked
                        ? "bg-[rgba(82,91,66,0.12)] text-[var(--shell-title-ink)]"
                        : "border border-[var(--shell-divider)] text-[var(--shell-copy-ink)]"
                    ].join(" ")}
                    onClick={() => onToggleRegionLock(region.id)}
                  >
                    {isLocked ? "已鎖定" : "可拖曳"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
