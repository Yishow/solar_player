import React, { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ShellDecorationMount, ShellDecorationObject } from "@solar-display/shared";
import { resolveShellBandHeight, sortShellDecorationObjects } from "@solar-display/shared";

export const SHELL_CHROME_CONTENT_Z_INDEX = 100;

export function partitionShellDecorationObjectsByPlane(
  objects: ShellDecorationObject[],
  contentZIndex = SHELL_CHROME_CONTENT_Z_INDEX
) {
  const background: ShellDecorationObject[] = [];
  const foreground: ShellDecorationObject[] = [];

  for (const object of sortShellDecorationObjects(objects)) {
    if (object.zIndex < contentZIndex) {
      background.push(object);
      continue;
    }

    foreground.push(object);
  }

  return { background, foreground };
}

function resolveRenderableShellDecorationObjects(args: {
  failedObjectIds: ReadonlySet<string>;
  mount: ShellDecorationMount;
  objects: ShellDecorationObject[];
}) {
  return sortShellDecorationObjects(args.objects).filter((object) => {
    if (!object.visible || object.mount !== args.mount) {
      return false;
    }

    if (args.failedObjectIds.has(object.id) && object.type === "asset-image") {
      return false;
    }

    if (object.type === "ornament-image") {
      return object.source.ornamentKey === "leaf" || typeof object.source.fallbackSrc === "string";
    }

    return true;
  });
}

function resolveObjectTransform(object: ShellDecorationObject) {
  const rotation = typeof object.style.rotation === "number" ? object.style.rotation : 0;
  return rotation === 0 ? undefined : `rotate(${rotation}deg)`;
}

function buildObjectStyle(object: ShellDecorationObject): CSSProperties {
  return {
    height: object.frame.height,
    left: object.frame.left,
    opacity: object.style.opacity ?? 1,
    pointerEvents: "none",
    position: "absolute",
    top: object.frame.top,
    transform: resolveObjectTransform(object),
    transformOrigin: "center center",
    width: object.frame.width,
    zIndex: object.zIndex
  };
}

function LeafShellDecoration() {
  return (
    <svg
      viewBox="0 0 64 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-full w-full"
    >
      <path
        d="M52 8C30 10 12 24 12 46C30 47 47 34 52 8Z"
        fill="var(--shell-leaf-fill)"
        stroke="var(--shell-leaf-stroke-strong)"
        strokeWidth="2"
      />
      <path
        d="M16 45C26 35 35 26 48 14"
        stroke="var(--shell-leaf-stroke-soft)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function renderShellDecorationObject(
  object: ShellDecorationObject,
  hasAssetFailed: boolean,
  onAssetError: (objectId: string) => void
): ReactNode {
  const style = buildObjectStyle(object);

  if (object.type === "line") {
    return (
      <div
        data-shell-decoration-object-id={object.id}
        data-shell-decoration-object-type={object.type}
        key={object.id}
        style={{
          ...style,
          backgroundColor: object.style.color ?? "var(--shell-divider-strong)",
          borderRadius: Math.max(object.frame.height, 1),
          height: object.style.thickness ?? object.frame.height
        }}
      />
    );
  }

  if (object.type === "asset-image") {
    return (
      <img
        key={object.id}
        data-shell-decoration-object-id={object.id}
        data-shell-decoration-object-type={object.type}
        alt={object.source.alt ?? ""}
        draggable={false}
        onError={() => {
          onAssetError(object.id);
        }}
        src={object.source.fallbackSrc}
        style={{
          ...style,
          objectFit: "contain"
        }}
      />
    );
  }

  const ornamentAssetSrc = typeof object.source.fallbackSrc === "string" ? object.source.fallbackSrc.trim() : "";

  if (!hasAssetFailed && ornamentAssetSrc.length > 0) {
    return (
      <img
        key={object.id}
        data-shell-decoration-object-id={object.id}
        data-shell-decoration-object-type={object.type}
        alt=""
        draggable={false}
        onError={() => {
          onAssetError(object.id);
        }}
        src={ornamentAssetSrc}
        style={{
          ...style,
          objectFit: "contain"
        }}
      />
    );
  }

  return (
    <div
      data-shell-decoration-object-id={object.id}
      data-shell-decoration-object-type={object.type}
      key={object.id}
      style={style}
    >
      <LeafShellDecoration />
    </div>
  );
}

function ShellDecorationPlane({
  mount,
  objects,
  plane,
  zIndex
}: {
  mount: ShellDecorationMount;
  objects: ReactNode[];
  plane: "background" | "foreground";
  zIndex: number;
}) {
  if (objects.length === 0) {
    return null;
  }

  return (
    <div
      data-shell-decoration-mount={mount}
      data-shell-decoration-plane={plane}
      data-shell-primitive="shell-decoration-layer"
      className="pointer-events-none absolute left-0 top-0"
      style={{
        height: resolveShellBandHeight(mount),
        width: "100%",
        zIndex
      }}
    >
      {objects}
    </div>
  );
}

export function ShellDecorationLayer({
  mount,
  objects,
  plane = "both"
}: {
  mount: ShellDecorationMount;
  objects?: ShellDecorationObject[];
  plane?: "background" | "foreground" | "both";
}) {
  const [failedObjectIds, setFailedObjectIds] = useState<Set<string>>(() => new Set());
  const renderableObjects = resolveRenderableShellDecorationObjects({
    failedObjectIds,
    mount,
    objects: objects ?? []
  });

  if (renderableObjects.length === 0) {
    return null;
  }

  const { background, foreground } = partitionShellDecorationObjectsByPlane(renderableObjects);
  const markAssetFailed = (objectId: string) => {
    setFailedObjectIds((current) => {
      if (current.has(objectId)) {
        return current;
      }

      const next = new Set(current);
      next.add(objectId);
      return next;
    });
  };

  return (
    <>
      {plane === "both" || plane === "background" ? (
        <ShellDecorationPlane
          mount={mount}
          objects={background.map((object) =>
            renderShellDecorationObject(object, failedObjectIds.has(object.id), markAssetFailed)
          )}
          plane="background"
          zIndex={0}
        />
      ) : null}
      {plane === "both" || plane === "foreground" ? (
        <ShellDecorationPlane
          mount={mount}
          objects={foreground.map((object) =>
            renderShellDecorationObject(object, failedObjectIds.has(object.id), markAssetFailed)
          )}
          plane="foreground"
          zIndex={SHELL_CHROME_CONTENT_Z_INDEX + 1}
        />
      ) : null}
    </>
  );
}
