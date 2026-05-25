import React from "react";
import type { ReactNode } from "react";
import {
  displayEditorPathKey,
  type DisplayEditorArrayFieldSchema,
  type DisplayEditorCardRailChildSourceSchema,
  type DisplayEditorFieldSchema,
  type DisplayEditorNumberFieldSchema,
  type DisplayEditorPath,
  type DisplayEditorRegionSchema,
  type DisplayEditorSelectFieldSchema
} from "../../../../../packages/shared/src/displayEditorSchema";
import {
  DISPLAY_PAGE_CONTENT_SURFACE_HEIGHT,
  DISPLAY_PAGE_CONTENT_SURFACE_WIDTH,
  normalizeDisplayPageFreeformObjects,
  isDisplayPageCardRail,
  sortDisplayPageCardRailCards,
  type DisplayPageFreeformObject,
  type DisplayPageCardRailCard,
  type DisplayPageCardRailTemplateKey
} from "@solar-display/shared";
import { getValueAtPath } from "../../hooks/displayPageConfigPaths";
import {
  buildCardRailCardFields,
  buildCardRailCardRegionSchema,
  resolveCardRailCardLabel
} from "./cardRailTemplateFields";
import { localizeDisplayEditorLabel, localizeDisplayEditorMessage } from "./localization";
import { resolveDisplayEditorFieldValidationIssues } from "./displayEditorValidation";
import type { DisplayEditorOverlayState } from "./canvasOverlayState";

export type ResolvedDisplayEditorRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type ResolvedDisplayEditorField = {
  dirty: boolean;
  path: DisplayEditorPath;
  schema: DisplayEditorFieldSchema;
  value: unknown;
};

export type ResolvedDisplayEditorRegion = {
  cardId?: string;
  cardPath?: DisplayEditorPath;
  description?: string;
  fields: ResolvedDisplayEditorField[];
  freeformObjectType?: DisplayPageFreeformObject["type"];
  geometry?: ResolvedDisplayEditorRect;
  geometryConstraint?: ResolvedDisplayEditorRect;
  id: string;
  label: string;
  nodeType: "card-rail-card" | "freeform-object" | "region";
  objectPath?: DisplayEditorPath;
  parentId?: string;
  presetKey?: string;
  railPath?: DisplayEditorPath;
  schema: DisplayEditorRegionSchema;
  templateKey?: DisplayPageCardRailTemplateKey;
};

export function resolveDisplayEditorFieldIssues(field: ResolvedDisplayEditorField) {
  return resolveDisplayEditorFieldValidationIssues(
    {
      ...field.schema,
      label: localizeDisplayEditorLabel(field.schema.label)
    },
    field.value
  ).map((issue) =>
    issue.replace(/([^\x00-\x7F])\s+(必須|為|的值)/g, "$1$2")
  );
}

function localizeRegionAccessibilityLabel(label: string) {
  return localizeDisplayEditorLabel(label);
}

export function DisplayEditorCanvasOverlay({
  isInteractive,
  lockedRegionIds,
  onSelectTemporaryMeasureTarget,
  onStartInteraction,
  onStartMeasurementHandleDrag,
  overlayState,
  regions,
  selectedRegionId,
  selectedRegionIds,
  temporaryMeasureMode,
  onSelect
}: {
  isInteractive: boolean;
  lockedRegionIds: string[];
  onSelect: (regionId: string, options?: { additive?: boolean }) => void;
  onSelectTemporaryMeasureTarget: (regionId: string) => void;
  onStartInteraction: (
    event: React.PointerEvent<HTMLButtonElement>,
    region: ResolvedDisplayEditorRegion,
    type: "drag" | "resize"
  ) => void;
  onStartMeasurementHandleDrag: (
    event: React.PointerEvent<HTMLButtonElement>,
    axis: "x" | "y"
  ) => void;
  overlayState: DisplayEditorOverlayState;
  regions: ResolvedDisplayEditorRegion[];
  selectedRegionId: string | null;
  selectedRegionIds: string[];
  temporaryMeasureMode: boolean;
}) {
  if (!isInteractive) {
    return null;
  }

  const frameStyle =
    overlayState.preset.frameDensity === "strong"
      ? {
          background: "rgba(95, 140, 80, 0.08)",
          borderColor: "rgba(95, 140, 80, 0.42)"
        }
      : {
          background: "rgba(95, 140, 80, 0.02)",
          borderColor: "rgba(95, 140, 80, 0.18)"
        };

  return (
    <>
      <div className="pointer-events-none absolute inset-0">
        {overlayState.pageGuides.map((guide) => (
          <div
            key={`${guide.axis}-${guide.kind}-${guide.designPosition}`}
            className="absolute border-[rgba(103,124,84,0.5)]"
            data-guide-kind={guide.kind}
            style={
              guide.axis === "x"
                ? {
                    borderLeftStyle: "dashed",
                    borderLeftWidth: guide.kind === "center" ? "2px" : "1px",
                    bottom: 0,
                    left: `${guide.canvasPosition}px`,
                    top: 0
                  }
                : {
                    borderTopStyle: "dashed",
                    borderTopWidth: guide.kind === "center" ? "2px" : "1px",
                    left: 0,
                    right: 0,
                    top: `${guide.canvasPosition}px`
                  }
            }
          />
        ))}
        {overlayState.activeInteraction.guides.map((guide, index) => (
          <React.Fragment key={`${guide.axis}-${guide.position}-${index}`}>
            <div
              className="absolute border-[rgba(63,122,52,0.88)]"
              data-guide-kind={guide.targetType ? `snap-${guide.targetType}` : "active-boundary"}
              style={
                guide.axis === "x"
                  ? {
                      borderLeftStyle: "solid",
                      borderLeftWidth: "2px",
                      bottom: 0,
                      left: `${guide.position}px`,
                      top: 0
                    }
                  : {
                      borderTopStyle: "solid",
                      borderTopWidth: "2px",
                      left: 0,
                      right: 0,
                      top: `${guide.position}px`
                    }
              }
            />
            {guide.label ? (
              <span
                className="absolute rounded-full bg-[rgba(40,57,31,0.84)] px-2 py-1 text-[10px] font-semibold text-white"
                style={
                  guide.axis === "x"
                    ? { left: `${guide.position + 6}px`, top: "8px" }
                    : { left: "8px", top: `${guide.position + 6}px` }
                }
              >
                {guide.label}
              </span>
            ) : null}
          </React.Fragment>
        ))}
        {overlayState.selectionBounds ? (
          <>
            <div
              className="absolute rounded-[28px] border-2 border-dashed border-[rgba(63,122,52,0.42)]"
              data-selection-bounds="true"
              style={{
                height: `${overlayState.selectionBounds.height}px`,
                left: `${overlayState.selectionBounds.left}px`,
                top: `${overlayState.selectionBounds.top}px`,
                width: `${overlayState.selectionBounds.width}px`
              }}
            />
            {overlayState.selectionLabel ? (
              <span
                className="absolute rounded-full bg-[rgba(40,57,31,0.84)] px-2 py-1 text-[11px] font-semibold text-white"
                style={{
                  left: `${overlayState.selectionBounds.left + overlayState.selectionBounds.width / 2}px`,
                  top: `${Math.max(8, overlayState.selectionBounds.top - 12)}px`,
                  transform: "translateX(-50%)"
                }}
              >
                {overlayState.selectionLabel}
              </span>
            ) : null}
          </>
        ) : null}
        {overlayState.sessionDistanceLock ? (
          <span
            className="absolute rounded-full bg-[rgba(201,136,26,0.9)] px-2 py-1 text-[11px] font-semibold text-white"
            style={{ left: "16px", top: "36px" }}
          >
            {overlayState.sessionDistanceLock.axis.toUpperCase()} 間距 {overlayState.sessionDistanceLock.distance}
            {overlayState.sessionDistanceLock.boundaryClamped ? " / 邊界優先" : ""}
          </span>
        ) : null}
        {overlayState.axisTicks.map((tick) => (
          <div
            key={`${tick.axis}-${tick.designPosition}`}
            className="absolute text-[10px] font-semibold text-[rgba(82,91,66,0.88)]"
            style={
              tick.axis === "x"
                ? {
                    left: `${tick.canvasPosition + 4}px`,
                    top: "6px"
                  }
                : {
                    left: "6px",
                    top: `${tick.canvasPosition + 4}px`
                  }
            }
          >
            {tick.designPosition}
          </div>
        ))}
        {overlayState.measurement ? (
          <>
            <span
              className="absolute rounded-full bg-[rgba(40,57,31,0.84)] px-2 py-1 text-[11px] font-semibold text-white"
              style={{
                left: `${overlayState.measurement.rect.left + overlayState.measurement.rect.width / 2}px`,
                top: `${Math.max(8, overlayState.measurement.rect.top - 8)}px`,
                transform: "translateX(-50%)"
              }}
            >
              {overlayState.measurement.designRect.width} × {overlayState.measurement.designRect.height}
            </span>
            <span
              className="absolute rounded-full bg-[rgba(255,255,255,0.92)] px-2 py-1 text-[11px] font-semibold text-[var(--shell-title-ink)]"
              style={{
                left: `${overlayState.measurement.constraintRect.left + (overlayState.measurement.rect.left - overlayState.measurement.constraintRect.left) / 2}px`,
                top: `${overlayState.measurement.rect.top + overlayState.measurement.rect.height / 2}px`,
                transform: "translate(-100%, -50%)"
              }}
            >
              L {overlayState.measurement.distances.left}
            </span>
            <span
              className="absolute rounded-full bg-[rgba(255,255,255,0.92)] px-2 py-1 text-[11px] font-semibold text-[var(--shell-title-ink)]"
              style={{
                left: `${overlayState.measurement.rect.left + overlayState.measurement.rect.width + (overlayState.measurement.constraintRect.left + overlayState.measurement.constraintRect.width - (overlayState.measurement.rect.left + overlayState.measurement.rect.width)) / 2}px`,
                top: `${overlayState.measurement.rect.top + overlayState.measurement.rect.height / 2}px`,
                transform: "translateY(-50%)"
              }}
            >
              R {overlayState.measurement.distances.right}
            </span>
            <span
              className="absolute rounded-full bg-[rgba(255,255,255,0.92)] px-2 py-1 text-[11px] font-semibold text-[var(--shell-title-ink)]"
              style={{
                left: `${overlayState.measurement.rect.left + overlayState.measurement.rect.width / 2}px`,
                top: `${overlayState.measurement.constraintRect.top + (overlayState.measurement.rect.top - overlayState.measurement.constraintRect.top) / 2}px`,
                transform: "translate(-50%, -100%)"
              }}
            >
              T {overlayState.measurement.distances.top}
            </span>
            <span
              className="absolute rounded-full bg-[rgba(255,255,255,0.92)] px-2 py-1 text-[11px] font-semibold text-[var(--shell-title-ink)]"
              style={{
                left: `${overlayState.measurement.rect.left + overlayState.measurement.rect.width / 2}px`,
                top: `${overlayState.measurement.rect.top + overlayState.measurement.rect.height + (overlayState.measurement.constraintRect.top + overlayState.measurement.constraintRect.height - (overlayState.measurement.rect.top + overlayState.measurement.rect.height)) / 2}px`,
                transform: "translateX(-50%)"
              }}
            >
              B {overlayState.measurement.distances.bottom}
            </span>
          </>
        ) : null}
        {overlayState.relationalRulers.map((ruler) => (
          <React.Fragment key={`${ruler.axis}-${ruler.targetRegionId}`}>
            <div
              className="absolute border-[rgba(201,136,26,0.9)]"
              data-ruler-axis={ruler.axis}
              style={
                ruler.axis === "x"
                  ? {
                      borderTopStyle: "solid",
                      borderTopWidth: "2px",
                      left: `${Math.min(ruler.start.x, ruler.end.x)}px`,
                      top: `${ruler.start.y}px`,
                      width: `${Math.abs(ruler.end.x - ruler.start.x)}px`
                    }
                  : {
                      borderLeftStyle: "solid",
                      borderLeftWidth: "2px",
                      height: `${Math.abs(ruler.end.y - ruler.start.y)}px`,
                      left: `${ruler.start.x}px`,
                      top: `${Math.min(ruler.start.y, ruler.end.y)}px`
                    }
              }
            />
            <span
              className={[
                "absolute rounded-full bg-[rgba(255,247,230,0.94)] px-2 py-1 text-[11px] font-semibold text-[#8e6410]",
                ruler.compact ? "text-[10px]" : ""
              ].join(" ")}
              data-ruler-label-placement={ruler.labelPlacement}
              style={{
                left: `${ruler.labelPosition.x}px`,
                top: `${ruler.labelPosition.y}px`,
                transform: ruler.axis === "x" ? "translate(-50%, -50%)" : "translate(-50%, -50%)"
              }}
            >
              {ruler.distance}
            </span>
          </React.Fragment>
        ))}
      </div>
      {overlayState.relationalRulers.map((ruler) =>
        ruler.canDrag ? (
          <button
            key={`handle-${ruler.axis}-${ruler.targetRegionId}`}
            type="button"
            aria-label={`調整 ${ruler.axis === "x" ? "水平" : "垂直"} 量測`}
            className="absolute h-4 w-4 rounded-full border-2 border-white bg-[#c9881a]"
            style={{
              left: `${ruler.handlePosition.x}px`,
              top: `${ruler.handlePosition.y}px`,
              transform: "translate(-50%, -50%)"
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onStartMeasurementHandleDrag(event, ruler.axis);
            }}
          />
        ) : null
      )}
      {regions.map((region) => {
        if (!region.geometry) {
          return null;
        }

        const frame = overlayState.frames.find((item) => item.regionId === region.id);
        const isSelected = selectedRegionIds.includes(region.id) || frame?.isSelected === true;
        const isLocked = lockedRegionIds.includes(region.id) || frame?.isLocked === true;
        const isVisible = frame?.visible ?? false;
        return (
          <div
            key={region.id}
            className="absolute rounded-[22px] border-2 transition-colors"
            data-locked={isLocked ? "true" : "false"}
            style={{
              background: isLocked
                ? "rgba(82, 91, 66, 0.1)"
                : isSelected
                  ? "rgba(95, 140, 80, 0.18)"
                  : isVisible
                    ? frameStyle.background
                    : "transparent",
              borderColor: isSelected ? "rgba(63, 122, 52, 0.9)" : isVisible ? frameStyle.borderColor : "transparent",
              height: `${region.geometry.height}px`,
              left: `${region.geometry.left}px`,
              top: `${region.geometry.top}px`,
              width: `${region.geometry.width}px`,
              zIndex: region.parentId ? (isSelected ? 65 : 55) : isSelected ? 60 : 45
            }}
            >
            <button
              type="button"
              aria-pressed={isSelected}
              className="absolute inset-0"
              data-region-locked={isLocked ? "true" : "false"}
              onPointerDown={(event) => {
                event.preventDefault();
                if (temporaryMeasureMode && selectedRegionId && selectedRegionId !== region.id) {
                  onSelectTemporaryMeasureTarget(region.id);
                  return;
                }
                const additive = event.metaKey || event.ctrlKey || event.shiftKey;
                onSelect(region.id, { additive });
                if (!isLocked && !additive) {
                  onStartInteraction(event, region, "drag");
                }
              }}
            >
              <span className="sr-only">{localizeRegionAccessibilityLabel(region.label)}</span>
            </button>
            {frame?.label ? (
              <span className="absolute left-3 top-3 rounded-full bg-[rgba(255,255,255,0.9)] px-2 py-1 text-[11px] font-semibold text-[var(--shell-title-ink)]">
                {localizeDisplayEditorLabel(frame.label)}
              </span>
            ) : null}
            {isSelected && isLocked ? (
              <span className="absolute right-3 top-3 rounded-full bg-[rgba(82,91,66,0.82)] px-2 py-1 text-[11px] font-semibold text-white">
                {localizeDisplayEditorLabel("Locked")}
              </span>
            ) : null}
            {isSelected && !isLocked ? (
              <button
                type="button"
                aria-label={`${localizeRegionAccessibilityLabel(region.label)} 調整大小控制點`}
                className="absolute bottom-[-8px] right-[-8px] h-5 w-5 rounded-full border-2 border-white bg-[var(--shell-accent)]"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onStartInteraction(event, region, "resize");
                }}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function resolveDisplayEditorRegions(
  config: Record<string, unknown>,
  regionSchemas: DisplayEditorRegionSchema[],
  seedConfig: Record<string, unknown>
): ResolvedDisplayEditorRegion[] {
  return regionSchemas.flatMap((schema) => {
    const resolvedRegion: ResolvedDisplayEditorRegion = {
      description: schema.description,
      fields: resolveRegionFields(config, seedConfig, schema.fields),
      geometry: resolveRegionGeometry(config, schema),
      id: schema.id,
      label: schema.label,
      nodeType: "region",
      presetKey: schema.presetKey,
      schema
    };

    const childRegions = resolveCardRailChildRegions(config, seedConfig, resolvedRegion);

    return [resolvedRegion, ...childRegions];
  });
}

function buildFreeformObjectFieldSchemas(
  object: DisplayPageFreeformObject,
  objectPath: DisplayEditorPath
): DisplayEditorFieldSchema[] {
  const baseFields: DisplayEditorFieldSchema[] = [
    { fieldType: "number", id: "left", label: "X 座標", path: [...objectPath, "frame", "left"], step: 1 },
    { fieldType: "number", id: "top", label: "Y 座標", path: [...objectPath, "frame", "top"], step: 1 },
    { fieldType: "number", id: "width", label: "寬度", path: [...objectPath, "frame", "width"], step: 1 },
    { fieldType: "number", id: "height", label: "高度", path: [...objectPath, "frame", "height"], step: 1 },
    { fieldType: "number", id: "opacity", label: "透明度", path: [...objectPath, "style", "opacity"], step: 0.05 },
    { fieldType: "number", id: "rotation", label: "旋轉角度", path: [...objectPath, "style", "rotation"], step: 1 }
  ];

  if (object.type === "line") {
    return [
      ...baseFields,
      { fieldType: "text", id: "color", label: "線條顏色", path: [...objectPath, "style", "color"] },
      { fieldType: "number", id: "thickness", label: "線條厚度", path: [...objectPath, "style", "thickness"], step: 1 }
    ];
  }

  return [
    ...baseFields,
    { fieldType: "text", id: "alt", label: "替代文字", path: [...objectPath, "source", "alt"] }
  ];
}

function resolveFreeformObjectLabel(type: DisplayPageFreeformObject["type"]) {
  switch (type) {
    case "asset-image":
      return "自由圖片物件";
    case "icon-asset":
      return "自由圖示物件";
    case "line":
    default:
      return "自由線條物件";
  }
}

export function resolveDisplayPageFreeformObjectRegions(
  config: Record<string, unknown>,
  seedConfig: Record<string, unknown>
): ResolvedDisplayEditorRegion[] {
  const objects = normalizeDisplayPageFreeformObjects((config as { freeformObjects?: unknown }).freeformObjects);
  const seedObjects = normalizeDisplayPageFreeformObjects((seedConfig as { freeformObjects?: unknown }).freeformObjects);
  const comparableSeedConfig = {
    ...seedConfig,
    freeformObjects: objects.map(
      (object) =>
        seedObjects.find((candidate) => candidate.id === object.id) ??
        ({
          ...object,
          frame: { height: 0, left: 0, top: 0, width: 0 },
          source:
            object.type === "line"
              ? { kind: "line" }
              : { ...object.source, assetId: "", fallbackSrc: "" }
        } as DisplayPageFreeformObject)
    )
  };

  return objects.map((object, index) => {
    const objectPath: DisplayEditorPath = ["freeformObjects", index];
    const schema: DisplayEditorRegionSchema = {
      description:
        object.type === "line"
          ? "調整自由線條的位置、長度與樣式。"
          : "調整自由物件的位置、尺寸與素材來源。",
      fields: buildFreeformObjectFieldSchemas(object, objectPath),
      geometry: {
        compatibilityKey: `freeform-object:${object.type}`,
        heightPath: [...objectPath, "frame", "height"],
        leftPath: [...objectPath, "frame", "left"],
        maxHeight: DISPLAY_PAGE_CONTENT_SURFACE_HEIGHT,
        maxWidth: DISPLAY_PAGE_CONTENT_SURFACE_WIDTH,
        minHeight: object.type === "line" ? 2 : 16,
        minWidth: object.type === "line" ? 40 : 16,
        topPath: [...objectPath, "frame", "top"],
        widthPath: [...objectPath, "frame", "width"]
      },
      id: object.id,
      label: resolveFreeformObjectLabel(object.type)
    };

    return {
      description: schema.description,
      fields: resolveRegionFields(config, comparableSeedConfig, schema.fields),
      freeformObjectType: object.type,
      geometry: {
        height: object.frame.height,
        left: object.frame.left,
        top: object.frame.top,
        width: object.frame.width
      },
      id: object.id,
      label: schema.label,
      nodeType: "freeform-object",
      objectPath,
      schema
    };
  });
}

function resolveRegionFields(
  config: Record<string, unknown>,
  seedConfig: Record<string, unknown>,
  fields: DisplayEditorFieldSchema[]
): ResolvedDisplayEditorField[] {
  return fields
    .filter((field) => {
      if (!field.visibleWhen) {
        return true;
      }

      return getValueAtPath(config, field.visibleWhen.path) === field.visibleWhen.equals;
    })
    .map((field) => ({
      dirty: JSON.stringify(getValueAtPath(config, field.path)) !== JSON.stringify(getValueAtPath(seedConfig, field.path)),
      path: field.path,
      schema: field,
      value: getValueAtPath(config, field.path)
    }));
}

function resolveCardRailChildRegions(
  config: Record<string, unknown>,
  seedConfig: Record<string, unknown>,
  parentRegion: ResolvedDisplayEditorRegion
): ResolvedDisplayEditorRegion[] {
  const childSource = parentRegion.schema.childSource;
  const parentGeometry = parentRegion.geometry;
  if (!childSource || childSource.type !== "card-rail" || !parentGeometry) {
    return [];
  }

  const railValue = getValueAtPath(config, childSource.cardsPath.slice(0, -1));
  if (!isDisplayPageCardRail(railValue)) {
    return [];
  }

  return sortDisplayPageCardRailCards(railValue.cards).map((card) =>
    buildCardRailChildRegion({
      card,
      childSource,
      config,
      index: railValue.cards.findIndex((entry) => entry.id === card.id),
      parentGeometry,
      parentRegion,
      seedConfig
    })
  );
}

function buildCardRailChildRegion(args: {
  card: DisplayPageCardRailCard;
  childSource: DisplayEditorCardRailChildSourceSchema;
  config: Record<string, unknown>;
  index: number;
  parentGeometry: ResolvedDisplayEditorRect;
  parentRegion: ResolvedDisplayEditorRegion;
  seedConfig: Record<string, unknown>;
}): ResolvedDisplayEditorRegion {
  const cardPath = [...args.childSource.cardsPath, args.index];
  const schema = buildCardRailCardRegionSchema({
    cardPath,
    id: `${args.parentRegion.schema.id}-card`,
    label: `${args.parentRegion.schema.label} Card`
  });
  const fields = buildCardRailCardFields(args.card, cardPath);

  return {
    cardId: args.card.id,
    cardPath,
    description: args.parentRegion.description,
    fields: resolveRegionFields(args.config, args.seedConfig, fields),
    geometry: {
      height: args.card.frame.height,
      left: args.parentGeometry.left + args.card.frame.left,
      top: args.parentGeometry.top + args.card.frame.top,
      width: args.card.frame.width
    },
    geometryConstraint: args.parentGeometry,
    id: `${args.parentRegion.id}/${args.card.id}`,
    label: resolveCardRailCardLabel(args.card),
    nodeType: "card-rail-card",
    parentId: args.parentRegion.id,
    presetKey: args.parentRegion.presetKey,
    railPath: args.childSource.cardsPath.slice(0, -1),
    schema: {
      ...schema,
      fields
    },
    templateKey: args.card.template
  };
}

export function DisplayEditorInspectorFields({
  fields,
  onChange,
  onResetField
}: {
  fields: ResolvedDisplayEditorField[];
  onChange: (path: DisplayEditorPath, value: unknown) => void;
  onResetField?: (path: DisplayEditorPath) => void;
}) {
  return (
    <div className="grid gap-3">
      {fields.map((field) => renderField(field, onChange, onResetField))}
    </div>
  );
}

function renderField(
  field: ResolvedDisplayEditorField,
  onChange: (path: DisplayEditorPath, value: unknown) => void,
  onResetField?: (path: DisplayEditorPath) => void
) {
  const label = (
    <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold text-[var(--shell-title-ink)]">
        {localizeDisplayEditorLabel(field.schema.label)}
        {field.dirty ? (
          <span className="rounded-full bg-[rgba(201,136,26,0.12)] px-2 py-0.5 text-[11px] text-[#8e6410]">
            {localizeDisplayEditorLabel("dirty")}
          </span>
        ) : null}
      </span>
      {field.dirty && onResetField ? (
        <button
          type="button"
          className="rounded-full border border-[var(--shell-divider)] px-2 py-1 text-[11px] font-semibold text-[var(--shell-copy-ink)]"
          onClick={() => onResetField(field.path)}
        >
          {localizeDisplayEditorLabel("Reset Field")}
        </button>
      ) : null}
    </span>
  );

  if (isArrayFieldSchema(field.schema)) {
    const arraySchema = field.schema;
    const items = Array.isArray(field.value) ? field.value : [];
    return (
      <div
        key={displayEditorPathKey(field.path)}
        className="grid gap-3 rounded-[16px] border border-[var(--shell-divider)] bg-[rgba(82,91,66,0.03)] p-3"
      >
        {label}
        {items.map((item, index) => (
          <div key={`${displayEditorPathKey(field.path)}-${index}`} className="grid gap-3 rounded-[14px] bg-white p-3">
            <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--shell-subtitle-ink)]">
              {localizeDisplayEditorLabel(arraySchema.itemLabel)} {index + 1}
            </div>
            <div className="grid gap-3">
              {arraySchema.itemFields.map((itemField) =>
                renderField(
                  {
                    dirty: false,
                    path: [...field.path, index, ...itemField.path],
                    schema: itemField,
                    value: getValueAtPath(item, itemField.path)
                  },
                  onChange,
                  undefined
                )
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <label key={displayEditorPathKey(field.path)} className="grid gap-2 text-[13px] text-[var(--shell-copy-ink)]">
      {label}
      {renderFieldInput(field, onChange)}
      {resolveDisplayEditorFieldIssues(field).map((issue) => (
        <span
          key={`${displayEditorPathKey(field.path)}-${issue}`}
          className="text-[12px] text-[#8f452d]"
          role="alert"
        >
          {issue}
        </span>
      ))}
    </label>
  );
}

function renderFieldInput(
  field: ResolvedDisplayEditorField,
  onChange: (path: DisplayEditorPath, value: unknown) => void
): ReactNode {
  if (isNumberFieldSchema(field.schema)) {
    return (
      <input
        className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2 text-[14px] text-[var(--shell-title-ink)] outline-none focus:border-[var(--shell-divider-strong)]"
        step={field.schema.step}
        type="number"
        value={typeof field.value === "number" ? String(field.value) : ""}
        onChange={(event) => onChange(field.path, Number(event.target.value))}
      />
    );
  }

  if (field.schema.fieldType === "toggle") {
    return (
      <input
        checked={Boolean(field.value)}
        className="h-4 w-4"
        type="checkbox"
        onChange={(event) => onChange(field.path, event.target.checked)}
      />
    );
  }

  if (isSelectFieldSchema(field.schema)) {
    return (
      <select
        className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2 text-[14px] text-[var(--shell-title-ink)] outline-none focus:border-[var(--shell-divider-strong)]"
        value={String(field.value ?? "")}
        onChange={(event) => onChange(field.path, event.target.value)}
      >
        {field.schema.options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {localizeDisplayEditorLabel(option.label)}
          </option>
        ))}
      </select>
    );
  }

  if (field.schema.fieldType === "asset") {
    return (
      <input
        className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2 text-[14px] text-[var(--shell-title-ink)] outline-none focus:border-[var(--shell-divider-strong)]"
        placeholder={"placeholder" in field.schema ? field.schema.placeholder : undefined}
        type="text"
        value={
          typeof field.value === "number" || typeof field.value === "string"
            ? String(field.value)
            : ""
        }
        onChange={(event) => onChange(field.path, event.target.value)}
      />
    );
  }

  if (field.schema.fieldType === "text") {
    return (
      <input
        className="rounded-[14px] border border-[var(--shell-divider)] bg-white px-3 py-2 text-[14px] text-[var(--shell-title-ink)] outline-none focus:border-[var(--shell-divider-strong)]"
        type="text"
        value={typeof field.value === "string" ? field.value : ""}
        onChange={(event) => onChange(field.path, event.target.value)}
      />
    );
  }

  return (
    <div className="rounded-[14px] border border-dashed border-[var(--shell-divider-strong)] bg-[rgba(82,91,66,0.04)] px-3 py-2 text-[12px] text-[var(--shell-subtitle-ink)]">
      {localizeDisplayEditorMessage("Unknown field type")}: {field.schema.fieldType}
    </div>
  );
}

function resolveRegionGeometry(
  config: Record<string, unknown>,
  schema: DisplayEditorRegionSchema
): ResolvedDisplayEditorRect | undefined {
  if (!schema.geometry) {
    return undefined;
  }

  const left = Number(getValueAtPath(config, schema.geometry.leftPath) ?? 0);
  const topValue = Number(getValueAtPath(config, schema.geometry.topPath) ?? 0);
  const width = Number(getValueAtPath(config, schema.geometry.widthPath) ?? 0);
  const height = schema.geometry.heightPath
    ? Number(getValueAtPath(config, schema.geometry.heightPath) ?? schema.geometry.fallbackHeight ?? 68)
    : Number(schema.geometry.fallbackHeight ?? 68);

  return {
    height,
    left,
    top: topValue - (schema.geometry.topOffset ?? 0),
    width
  };
}

function isArrayFieldSchema(schema: DisplayEditorFieldSchema): schema is DisplayEditorArrayFieldSchema {
  return schema.fieldType === "array" && "itemFields" in schema;
}

function isNumberFieldSchema(
  schema: DisplayEditorFieldSchema
): schema is DisplayEditorNumberFieldSchema {
  return schema.fieldType === "number";
}

function isSelectFieldSchema(
  schema: DisplayEditorFieldSchema
): schema is DisplayEditorSelectFieldSchema {
  return schema.fieldType === "select" && "options" in schema;
}
