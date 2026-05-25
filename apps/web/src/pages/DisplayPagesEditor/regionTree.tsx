import { useState } from "react";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";
import { localizeDisplayEditorLabel, localizeDisplayEditorRegionTreeLabel } from "./localization";

function groupRegionsByParent(regions: ResolvedDisplayEditorRegion[]) {
  return regions.reduce<Record<string, ResolvedDisplayEditorRegion[]>>((groups, region) => {
    const key = region.parentId ?? "__root__";
    groups[key] = [...(groups[key] ?? []), region];
    return groups;
  }, {});
}

export function DisplayEditorLeftPanel({
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
  onToggleRegionLock,
  regions,
  lockedRegionIds,
  selectedRegionId
}: {
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
  onToggleRegionLock: (regionId: string) => void;
  regions: ResolvedDisplayEditorRegion[];
  selectedRegionId: string | null;
  lockedRegionIds: string[];
}) {
  const [tab, setTab] = useState<"regions" | "actions">("regions");
  const saveDisabled = isLoading || isSaving || !dirty;
  const publishDisabled = isLoading || isSaving || isPublishing || isPublishBlocked;
  const groupedRegions = groupRegionsByParent(regions);

  function renderRegionNodes(parentId?: string, depth = 0) {
    const children = groupedRegions[parentId ?? "__root__"] ?? [];

    return children.map((region) => {
      const isSelected = selectedRegionId === region.id;
      const isLocked = lockedRegionIds.includes(region.id);

      return (
        <div key={region.id} className="grid gap-2">
          <div
            className={[
              "rounded-[16px] border px-3 py-2",
              isSelected
                ? "border-[var(--shell-accent)] bg-[rgba(95,140,80,0.08)]"
                : "border-[var(--shell-divider)] bg-white/80"
            ].join(" ")}
            style={{ marginLeft: `${depth * 14}px` }}
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                aria-pressed={isSelected}
                className="min-w-0 flex-1 text-left"
                onClick={() => onSelectRegion(region.id)}
              >
                <div className="break-words text-[14px] font-semibold text-[var(--shell-title-ink)]">
                  {localizeDisplayEditorRegionTreeLabel(region.label)}
                </div>
                <div className="mt-1 text-[11px] text-[var(--shell-subtitle-ink)]">{region.id}</div>
              </button>
              <button
                type="button"
                aria-label={`${localizeDisplayEditorRegionTreeLabel(region.label)} ${isLocked ? "解除鎖定" : "鎖定"}`}
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
          {renderRegionNodes(region.id, depth + 1)}
        </div>
      );
    });
  }

  return (
    <section className="flex h-full flex-col border-r border-[var(--shell-divider)] bg-white/70 backdrop-blur-sm">
      <div className="shrink-0 flex border-b border-[var(--shell-divider)]">
        {(["regions", "actions"] as const).map((t) => {
          const labels = { regions: "區域樹", actions: "操作" };
          return (
            <button
              key={t}
              type="button"
              className={[
                "flex-1 px-2 py-2.5 text-[11px] font-semibold transition-colors",
                tab === t
                  ? "border-b-2 border-[var(--shell-accent)] text-[var(--shell-title-ink)]"
                  : "text-[var(--shell-muted-ink)] hover:text-[var(--shell-copy-ink)]"
              ].join(" ")}
              onClick={() => setTab(t)}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {tab === "regions" && (
        <>
          <div className="shrink-0 px-4 pt-3 pb-1">
            <p className="text-[12px] text-[var(--shell-copy-ink)]">
              {editMode ? "選取或鎖定區域。" : "開啟編輯模式後可管理區域。"}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
            <div className="grid gap-2">{renderRegionNodes()}</div>
          </div>
        </>
      )}

      {tab === "actions" && (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div
            className={[
              "rounded-[18px] border px-3 py-2 text-[12px] leading-5",
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
          <button
            type="button"
            className="w-full rounded-full border border-[var(--shell-divider)] px-3 py-2.5 text-[13px] font-semibold text-[var(--shell-copy-ink)] disabled:opacity-55"
            disabled={isLoading}
            onClick={onReload}
          >
            重新同步
          </button>
          <button
            type="button"
            className="w-full rounded-full px-3 py-2.5 text-[13px] font-semibold"
            disabled={saveDisabled}
            onClick={onSave}
            style={saveDisabled
              ? {
                  backgroundColor: "rgba(95, 140, 80, 0.14)",
                  border: "1px solid rgba(95, 140, 80, 0.22)",
                  color: "var(--shell-muted-ink)"
                }
              : {
                  backgroundColor: "#5f8c50",
                  color: "#ffffff"
                }}
          >
            {isSaving ? "儲存中..." : "儲存設定"}
          </button>
          <button
            type="button"
            className="w-full rounded-full px-3 py-2.5 text-[13px] font-semibold"
            disabled={publishDisabled}
            onClick={onPublish}
            style={publishDisabled
              ? {
                  backgroundColor: "rgba(52, 56, 58, 0.14)",
                  border: "1px solid rgba(52, 56, 58, 0.18)",
                  color: "var(--shell-muted-ink)"
                }
              : {
                  backgroundColor: "#34383a",
                  color: "#ffffff"
                }}
          >
            {isPublishing ? "發布中..." : "發布草稿"}
          </button>
        </div>
      )}
    </section>
  );
}
