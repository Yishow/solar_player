import React from "react";
import type { ShellDecorationChannel, ShellDecorationMount, ShellDecorationObject } from "@solar-display/shared";
import { sortShellDecorationObjects } from "@solar-display/shared";
import { deepClone } from "../../hooks/displayPageConfigPaths";

type ObjectKind = ShellDecorationObject["type"];

const shellMounts: ShellDecorationMount[] = ["header", "footer"];

function objectCollectionKey(mount: ShellDecorationMount) {
  return mount === "header" ? "headerObjects" : "footerObjects";
}

function buildShellObjectId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `shell-object-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function createShellObjectSeed(mount: ShellDecorationMount, type: ObjectKind, id: string): ShellDecorationObject {
  const base = {
    frame: {
      height: type === "line" ? 2 : 40,
      left: 40,
      top: 16,
      width: type === "line" ? 240 : 120
    },
    id,
    locked: false,
    metadata: {},
    mount,
    style: type === "line" ? { color: "#d2b46a", thickness: 2 } : {},
    visible: true,
    zIndex: 1
  } satisfies Omit<ShellDecorationObject, "source" | "type">;

  if (type === "line") {
    return {
      ...base,
      source: { kind: "line" },
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
    source: { kind: "ornament-image", ornamentKey: "leaf" },
    type
  };
}

function updateObjectsForMount(
  channel: ShellDecorationChannel,
  mount: ShellDecorationMount,
  updater: (objects: ShellDecorationObject[]) => ShellDecorationObject[]
) {
  const key = objectCollectionKey(mount);
  return {
    ...channel,
    [key]: updater(channel[key])
  };
}

function findObject(channel: ShellDecorationChannel, objectId: string) {
  for (const mount of shellMounts) {
    const object = channel[objectCollectionKey(mount)].find((candidate) => candidate.id === objectId);
    if (object) {
      return { mount, object };
    }
  }

  return null;
}

function resolveNextZIndex(objects: ShellDecorationObject[]) {
  return objects.reduce((maxValue, object) => Math.max(maxValue, object.zIndex), 0) + 1;
}

function resolveTypeLabel(type: ObjectKind) {
  switch (type) {
    case "asset-image":
      return "圖片素材";
    case "ornament-image":
      return "裝飾圖片";
    case "line":
    default:
      return "線條";
  }
}

function resolveMountLabel(mount: ShellDecorationMount) {
  return mount === "header" ? "頁首" : "頁尾";
}

function resolveSourceSummary(object: ShellDecorationObject) {
  if (object.type === "asset-image") {
    return object.source.fallbackSrc || `素材 #${object.source.assetId}`;
  }

  if (object.type === "ornament-image") {
    return `裝飾 ${object.source.ornamentKey}`;
  }

  return `${object.frame.width}px`;
}

export function resolveShellObjectSections(channel: ShellDecorationChannel) {
  return shellMounts.map((mount) => ({
    label: resolveMountLabel(mount),
    mount,
    objects: sortShellDecorationObjects(channel[objectCollectionKey(mount)])
  }));
}

export function updateShellDecorationObject(
  channel: ShellDecorationChannel,
  objectId: string,
  updater: (object: ShellDecorationObject) => ShellDecorationObject
) {
  const found = findObject(channel, objectId);
  if (!found) {
    return channel;
  }

  return updateObjectsForMount(channel, found.mount, (objects) =>
    objects.map((object) => (object.id === objectId ? updater(deepClone(object)) : object))
  );
}

export function toggleShellDecorationObjectVisible(channel: ShellDecorationChannel, objectId: string) {
  return updateShellDecorationObject(channel, objectId, (object) => ({
    ...object,
    visible: !object.visible
  }));
}

export function toggleShellDecorationObjectLocked(channel: ShellDecorationChannel, objectId: string) {
  return updateShellDecorationObject(channel, objectId, (object) => ({
    ...object,
    locked: !object.locked
  }));
}

export function moveShellDecorationObject(
  channel: ShellDecorationChannel,
  objectId: string,
  direction: "backward" | "forward"
) {
  const found = findObject(channel, objectId);
  if (!found) {
    return channel;
  }

  return updateObjectsForMount(channel, found.mount, (objects) => {
    const sorted = sortShellDecorationObjects(objects).map((object) => deepClone(object));
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
  });
}

export function moveShellDecorationObjectToBoundary(
  channel: ShellDecorationChannel,
  objectId: string,
  boundary: "backward" | "forward"
) {
  const found = findObject(channel, objectId);
  if (!found) {
    return channel;
  }

  return updateObjectsForMount(channel, found.mount, (objects) => {
    const sorted = sortShellDecorationObjects(objects).map((object) => deepClone(object));
    const currentIndex = sorted.findIndex((object) => object.id === objectId);

    if (currentIndex === -1) {
      return objects;
    }

    const targetIndex = boundary === "backward" ? 0 : sorted.length - 1;
    if (currentIndex === targetIndex) {
      return sorted;
    }

    const [target] = sorted.splice(currentIndex, 1);
    if (!target) {
      return sorted;
    }
    sorted.splice(targetIndex, 0, target);
    return sorted.map((object, index) => ({
      ...object,
      zIndex: index + 1
    }));
  });
}

export function deleteShellDecorationObject(
  channel: ShellDecorationChannel,
  objectId: string,
  selectedObjectId: string | null
) {
  const found = findObject(channel, objectId);
  if (!found) {
    return { channel, selectedObjectId };
  }

  const nextChannel = updateObjectsForMount(channel, found.mount, (objects) =>
    objects.filter((object) => object.id !== objectId)
  );

  if (selectedObjectId !== objectId) {
    return { channel: nextChannel, selectedObjectId };
  }

  const remainingInMount = sortShellDecorationObjects(nextChannel[objectCollectionKey(found.mount)]);
  if (remainingInMount.length > 0) {
    return {
      channel: nextChannel,
      selectedObjectId: remainingInMount[0]?.id ?? null
    };
  }

  const remaining = [...sortShellDecorationObjects(nextChannel.headerObjects), ...sortShellDecorationObjects(nextChannel.footerObjects)];

  return {
    channel: nextChannel,
    selectedObjectId: remaining[0]?.id ?? null
  };
}

export function duplicateShellDecorationObject(
  channel: ShellDecorationChannel,
  objectId: string,
  createId: () => string = buildShellObjectId
) {
  const found = findObject(channel, objectId);
  if (!found) {
    return { channel, selectedObjectId: null };
  }

  const nextId = createId();
  const duplicate = deepClone(found.object);
  duplicate.id = nextId;

  return {
    channel: updateObjectsForMount(channel, found.mount, (objects) => [
      ...objects,
      {
        ...duplicate,
        zIndex: resolveNextZIndex(objects)
      }
    ]),
    selectedObjectId: nextId
  };
}

export function addShellDecorationObject(
  channel: ShellDecorationChannel,
  args: { mount: ShellDecorationMount; type: ObjectKind },
  createId: () => string = buildShellObjectId
) {
  const nextId = createId();
  const key = objectCollectionKey(args.mount);
  const nextObject = createShellObjectSeed(args.mount, args.type, nextId);
  nextObject.zIndex = resolveNextZIndex(channel[key]);

  return {
    channel: {
      ...channel,
      [key]: [...channel[key], nextObject]
    },
    selectedObjectId: nextId
  };
}

export function ShellDecorationObjectList({
  channel,
  onDelete,
  onDuplicate,
  onMoveBackward,
  onMoveForward,
  onSelect,
  onToggleLocked,
  onToggleVisible,
  selectedObjectId
}: {
  channel: ShellDecorationChannel;
  onDelete: (objectId: string) => void;
  onDuplicate: (objectId: string) => void;
  onMoveBackward: (objectId: string) => void;
  onMoveForward: (objectId: string) => void;
  onSelect: (objectId: string) => void;
  onToggleLocked: (objectId: string) => void;
  onToggleVisible: (objectId: string) => void;
  selectedObjectId: string | null;
}) {
  return (
    <div className="grid gap-4">
      {resolveShellObjectSections(channel).map((section) => (
        <section key={section.mount} className="grid gap-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted-ink)]">
            {section.label}
          </h3>
          <div className="grid gap-2">
            {section.objects.map((object) => {
              const isSelected = object.id === selectedObjectId;
              return (
                <div
                  key={object.id}
                  className={[
                    "rounded-[16px] border px-3 py-2",
                    isSelected
                      ? "border-[var(--shell-accent)] bg-[rgba(95,140,80,0.08)]"
                      : "border-[var(--shell-divider)] bg-white/80"
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(object.id)}>
                      <div className="break-words text-[14px] font-semibold text-[var(--shell-title-ink)]">
                        {resolveTypeLabel(object.type)}
                      </div>
                      <div className="mt-1 text-[11px] text-[var(--shell-subtitle-ink)]">{object.id}</div>
                      <div className="mt-1 text-[11px] text-[var(--shell-subtitle-ink)]">{resolveSourceSummary(object)}</div>
                    </button>
                    <div className="grid shrink-0 gap-1 text-right text-[11px] text-[var(--shell-copy-ink)]">
                      <button type="button" onClick={() => onMoveBackward(object.id)}>前移</button>
                      <button type="button" onClick={() => onMoveForward(object.id)}>後移</button>
                      <button type="button" onClick={() => onToggleVisible(object.id)}>
                        {object.visible ? "隱藏" : "顯示"}
                      </button>
                      <button type="button" onClick={() => onToggleLocked(object.id)}>
                        {object.locked ? "解鎖" : "鎖定"}
                      </button>
                      <button type="button" onClick={() => onDuplicate(object.id)}>複製</button>
                      <button type="button" onClick={() => onDelete(object.id)}>刪除</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
