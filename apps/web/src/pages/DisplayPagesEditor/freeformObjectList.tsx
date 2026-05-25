import type { DisplayPageFreeformObject } from "@solar-display/shared";
import { sortDisplayPageFreeformObjects } from "@solar-display/shared";
import React from "react";
import { deepClone } from "../../hooks/displayPageConfigPaths";

type ObjectKind = DisplayPageFreeformObject["type"];

function buildDisplayPageObjectId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `page-object-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function resolveNextZIndex(objects: DisplayPageFreeformObject[]) {
  return objects.reduce((maxValue, object) => Math.max(maxValue, object.zIndex), 0) + 1;
}

function createDisplayPageObjectSeed(type: ObjectKind, id: string): DisplayPageFreeformObject {
  const base = {
    frame: {
      height: type === "line" ? 4 : type === "icon-asset" ? 96 : 140,
      left: 80,
      top: 80,
      width: type === "line" ? 280 : type === "icon-asset" ? 96 : 220
    },
    id,
    locked: false,
    metadata: {},
    mount: "content" as const,
    style: {
      opacity: 1,
      rotation: 0
    },
    visible: true,
    zIndex: 1
  } satisfies Omit<DisplayPageFreeformObject, "source" | "type">;

  if (type === "line") {
    return {
      ...base,
      source: { kind: "line" },
      style: {
        ...base.style,
        color: "#d2b46a",
        thickness: 4
      },
      type
    };
  }

  if (type === "asset-image") {
    return {
      ...base,
      source: { assetId: 0, fallbackSrc: "", kind: "asset-image" },
      type
    };
  }

  return {
    ...base,
    source: { assetId: 0, fallbackSrc: "", kind: "icon-asset" },
    type
  };
}

function resolveTypeLabel(type: ObjectKind) {
  switch (type) {
    case "asset-image":
      return "圖片";
    case "icon-asset":
      return "圖示";
    case "line":
    default:
      return "線條";
  }
}

function resolveSourceSummary(object: DisplayPageFreeformObject) {
  if (object.type === "line") {
    return `${object.frame.width}px / ${object.style.color ?? "#d2b46a"}`;
  }

  return object.source.fallbackSrc || `Asset #${object.source.assetId}`;
}

export function resolveDisplayPageObjectRows(objects: DisplayPageFreeformObject[]) {
  return sortDisplayPageFreeformObjects(objects).map((object, index) => ({
    id: object.id,
    label: `${resolveTypeLabel(object.type)} ${index + 1}`,
    object,
    sourceSummary: resolveSourceSummary(object),
    typeLabel: resolveTypeLabel(object.type)
  }));
}

export function updateDisplayPageObject(
  objects: DisplayPageFreeformObject[],
  objectId: string,
  updater: (object: DisplayPageFreeformObject) => DisplayPageFreeformObject
) {
  return objects.map((object) => (object.id === objectId ? updater(deepClone(object)) : object));
}

export function toggleDisplayPageObjectVisible(objects: DisplayPageFreeformObject[], objectId: string) {
  return updateDisplayPageObject(objects, objectId, (object) => ({
    ...object,
    visible: !object.visible
  }));
}

export function toggleDisplayPageObjectLocked(objects: DisplayPageFreeformObject[], objectId: string) {
  return updateDisplayPageObject(objects, objectId, (object) => ({
    ...object,
    locked: !object.locked
  }));
}

export function moveDisplayPageObject(
  objects: DisplayPageFreeformObject[],
  objectId: string,
  direction: "backward" | "forward"
) {
  const sorted = sortDisplayPageFreeformObjects(objects).map((object) => deepClone(object));
  const currentIndex = sorted.findIndex((object) => object.id === objectId);

  if (currentIndex === -1) {
    return objects;
  }

  const swapIndex = direction === "backward" ? currentIndex - 1 : currentIndex + 1;
  if (swapIndex < 0 || swapIndex >= sorted.length) {
    return sorted;
  }

  const current = sorted[currentIndex]!;
  const target = sorted[swapIndex]!;
  const nextCurrentZIndex = target.zIndex;
  target.zIndex = current.zIndex;
  current.zIndex = nextCurrentZIndex;
  sorted[currentIndex] = target;
  sorted[swapIndex] = current;
  return sorted;
}

export function deleteDisplayPageObject(
  objects: DisplayPageFreeformObject[],
  objectId: string,
  selectedObjectId: string | null
) {
  const nextObjects = objects.filter((object) => object.id !== objectId);

  if (selectedObjectId !== objectId) {
    return {
      objects: nextObjects,
      selectedObjectId
    };
  }

  const nextSelectedObjectId = sortDisplayPageFreeformObjects(nextObjects)[0]?.id ?? null;

  return {
    objects: nextObjects,
    selectedObjectId: nextSelectedObjectId
  };
}

export function duplicateDisplayPageObject(
  objects: DisplayPageFreeformObject[],
  objectId: string,
  createId: () => string = buildDisplayPageObjectId
) {
  const target = objects.find((object) => object.id === objectId);
  if (!target) {
    return { objects, selectedObjectId: null };
  }

  const duplicate = deepClone(target);
  const nextId = createId();
  duplicate.id = nextId;

  return {
    objects: [
      ...objects,
      {
        ...duplicate,
        zIndex: resolveNextZIndex(objects)
      }
    ],
    selectedObjectId: nextId
  };
}

export function addDisplayPageObject(
  objects: DisplayPageFreeformObject[],
  type: ObjectKind,
  createId: () => string = buildDisplayPageObjectId
) {
  const nextId = createId();
  const nextObject = createDisplayPageObjectSeed(type, nextId);
  nextObject.zIndex = resolveNextZIndex(objects);

  return {
    objects: [...objects, nextObject],
    selectedObjectId: nextId
  };
}

export function DisplayPageObjectList({
  objects,
  onDelete,
  onDuplicate,
  onMoveBackward,
  onMoveForward,
  onSelect,
  onToggleLocked,
  onToggleVisible,
  selectedObjectId
}: {
  objects: DisplayPageFreeformObject[];
  onDelete: (objectId: string) => void;
  onDuplicate: (objectId: string) => void;
  onMoveBackward: (objectId: string) => void;
  onMoveForward: (objectId: string) => void;
  onSelect: (objectId: string) => void;
  onToggleLocked: (objectId: string) => void;
  onToggleVisible: (objectId: string) => void;
  selectedObjectId: string | null;
}) {
  const rows = resolveDisplayPageObjectRows(objects);

  if (rows.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-[var(--shell-divider)] bg-[rgba(82,91,66,0.03)] px-3 py-4 text-[12px] text-[var(--shell-subtitle-ink)]">
        目前尚未建立自由物件。
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {rows.map((row) => {
        const isSelected = selectedObjectId === row.id;

        return (
          <div
            key={row.id}
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
                onClick={() => onSelect(row.id)}
              >
                <div className="break-words text-[14px] font-semibold text-[var(--shell-title-ink)]">
                  {row.label}
                </div>
                <div className="mt-1 text-[11px] text-[var(--shell-subtitle-ink)]">
                  {row.typeLabel} / {row.id}
                </div>
                <div className="mt-1 truncate text-[11px] text-[var(--shell-subtitle-ink)]">
                  {row.sourceSummary}
                </div>
              </button>
              <div className="flex shrink-0 flex-col gap-1 text-[11px] font-semibold">
                <button
                  type="button"
                  className="rounded-full border border-[var(--shell-divider)] px-2 py-1 text-[var(--shell-copy-ink)]"
                  onClick={() => onMoveBackward(row.id)}
                >
                  前移
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[var(--shell-divider)] px-2 py-1 text-[var(--shell-copy-ink)]"
                  onClick={() => onMoveForward(row.id)}
                >
                  後移
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-[var(--shell-divider)] px-2.5 py-1 text-[11px] font-semibold text-[var(--shell-copy-ink)]"
                onClick={() => onToggleVisible(row.id)}
              >
                {row.object.visible ? "隱藏" : "顯示"}
              </button>
              <button
                type="button"
                className="rounded-full border border-[var(--shell-divider)] px-2.5 py-1 text-[11px] font-semibold text-[var(--shell-copy-ink)]"
                onClick={() => onToggleLocked(row.id)}
              >
                {row.object.locked ? "解除鎖定" : "鎖定"}
              </button>
              <button
                type="button"
                className="rounded-full border border-[var(--shell-divider)] px-2.5 py-1 text-[11px] font-semibold text-[var(--shell-copy-ink)]"
                onClick={() => onDuplicate(row.id)}
              >
                複製
              </button>
              <button
                type="button"
                className="rounded-full border border-[rgba(180,82,52,0.25)] px-2.5 py-1 text-[11px] font-semibold text-[#8f452d]"
                onClick={() => onDelete(row.id)}
              >
                刪除
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
