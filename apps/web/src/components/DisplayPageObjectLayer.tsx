import type { DisplayPageFreeformObject } from "@solar-display/shared";
import { sortDisplayPageFreeformObjects } from "@solar-display/shared";
import React from "react";

function resolveObjectTransform(object: DisplayPageFreeformObject) {
  return object.style.rotation ? `rotate(${object.style.rotation}deg)` : undefined;
}

function renderObject(object: DisplayPageFreeformObject) {
  const baseStyle = {
    height: `${object.frame.height}px`,
    left: `${object.frame.left}px`,
    opacity: object.style.opacity ?? 1,
    top: `${object.frame.top}px`,
    transform: resolveObjectTransform(object),
    transformOrigin: "center center",
    width: `${object.frame.width}px`,
    zIndex: object.zIndex
  } as const;

  if (object.type === "line") {
    return (
      <div
        key={object.id}
        data-display-page-object-id={object.id}
        style={{
          ...baseStyle,
          backgroundColor: object.style.color ?? "#d2b46a",
          height: `${object.style.thickness ?? object.frame.height}px`,
          position: "absolute"
        }}
      />
    );
  }

  if (object.source.kind !== object.type || !object.source.fallbackSrc) {
    return null;
  }

  return (
    <img
      alt={object.source.alt ?? ""}
      data-display-page-object-id={object.id}
      key={object.id}
      src={object.source.fallbackSrc}
      style={{
        ...baseStyle,
        objectFit: object.type === "icon-asset" ? "contain" : "cover",
        pointerEvents: "none",
        position: "absolute"
      }}
    />
  );
}

export function DisplayPageObjectLayer({
  objects
}: {
  objects?: DisplayPageFreeformObject[];
}) {
  const renderableObjects = sortDisplayPageFreeformObjects(objects ?? []).filter((object) => object.visible);

  if (renderableObjects.length === 0) {
    return null;
  }

  return (
    <div
      data-display-page-object-layer="true"
      style={{ inset: 0, pointerEvents: "none", position: "absolute" }}
    >
      {renderableObjects.map(renderObject)}
    </div>
  );
}
