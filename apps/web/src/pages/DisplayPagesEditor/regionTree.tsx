import type { DisplayPageFreeformObject } from "@solar-display/shared";
import { useEffect, useState } from "react";
import { DisplayPageObjectList } from "./freeformObjectList";
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
  freeformObjects,
  dirty,
  editMode,
  errorMessage,
  message,
  onAddObject,
  onDeleteObject,
  onDuplicateObject,
  onMoveObjectBackward,
  onMoveObjectForward,
  onSelectObject,
  onSelectRegion,
  onToggleObjectLocked,
  onToggleObjectVisible,
  onToggleRegionLock,
  regions,
  lockedRegionIds,
  selectedObjectId,
  selectedRegionId
}: {
  freeformObjects: DisplayPageFreeformObject[];
  dirty: boolean;
  editMode: boolean;
  errorMessage: string;
  message: string;
  onAddObject: (type: DisplayPageFreeformObject["type"]) => void;
  onDeleteObject: (objectId: string) => void;
  onDuplicateObject: (objectId: string) => void;
  onMoveObjectBackward: (objectId: string) => void;
  onMoveObjectForward: (objectId: string) => void;
  onSelectObject: (objectId: string) => void;
  onSelectRegion: (regionId: string) => void;
  onToggleObjectLocked: (objectId: string) => void;
  onToggleObjectVisible: (objectId: string) => void;
  onToggleRegionLock: (regionId: string) => void;
  regions: ResolvedDisplayEditorRegion[];
  selectedObjectId: string | null;
  selectedRegionId: string | null;
  lockedRegionIds: string[];
}) {
  const [tab, setTab] = useState<"objects" | "regions">(selectedObjectId ? "objects" : "regions");
  const groupedRegions = groupRegionsByParent(regions);

  useEffect(() => {
    if (selectedObjectId) {
      setTab("objects");
    }
  }, [selectedObjectId]);

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
                <details className="mt-1 text-[11px] text-[var(--shell-subtitle-ink)]">
                  <summary>技術識別</summary>
                  <code>{region.id}</code>
                </details>
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
        {(["regions", "objects"] as const).map((t) => {
          const labels = { regions: "區域樹", objects: "自由物件" };
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

      {tab === "objects" && (
        <>
          <div className="shrink-0 px-4 pt-3 pb-2">
            <p className="text-[12px] text-[var(--shell-copy-ink)]">
              {editMode ? "用物件列表精準挑選、排序與管理自由物件。" : "開啟編輯模式後可管理自由物件。"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {([
                { label: "新增線條", type: "line" },
                { label: "新增圖片", type: "asset-image" },
                { label: "新增圖示", type: "icon-asset" }
              ] as const).map((action) => (
                <button
                  key={action.type}
                  type="button"
                  className="rounded-full border border-[var(--shell-divider)] px-3 py-1.5 text-[11px] font-semibold text-[var(--shell-copy-ink)] disabled:opacity-45"
                  disabled={!editMode}
                  onClick={() => onAddObject(action.type)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            <DisplayPageObjectList
              objects={freeformObjects}
              onDelete={onDeleteObject}
              onDuplicate={onDuplicateObject}
              onMoveBackward={onMoveObjectBackward}
              onMoveForward={onMoveObjectForward}
              onSelect={onSelectObject}
              onToggleLocked={onToggleObjectLocked}
              onToggleVisible={onToggleObjectVisible}
              selectedObjectId={selectedObjectId}
            />
          </div>
        </>
      )}

      <div className="shrink-0 border-t border-[var(--shell-divider)] px-3 py-2 text-[11px] text-[var(--shell-copy-ink)]" role="status">
        {errorMessage || message || (dirty ? "此頁有未儲存草稿；請用頂列儲存。" : "此頁草稿已同步。")}
      </div>
    </section>
  );
}
