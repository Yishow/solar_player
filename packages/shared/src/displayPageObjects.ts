import type { DisplayPageManagedAssetId, ValidationFinding, ValidationResult } from "./displayPageConfig.js";
import type { DisplayObjectBase } from "./shellDecorations.js";

export const displayPageFreeformObjectTypes = ["line", "asset-image", "icon-asset"] as const;

export type DisplayPageFreeformObjectType = (typeof displayPageFreeformObjectTypes)[number];

export const displayPageObjectMounts = ["content"] as const;

export type DisplayPageObjectMount = (typeof displayPageObjectMounts)[number];

export const DISPLAY_PAGE_CONTENT_SURFACE_WIDTH = 1920;
export const DISPLAY_PAGE_CONTENT_SURFACE_HEIGHT = 838;

export type DisplayPageLineObjectSource = {
  kind: "line";
};

export type DisplayPageAssetImageObjectSource = {
  alt?: string;
  assetId: DisplayPageManagedAssetId;
  fallbackSrc: string;
  kind: "asset-image";
};

export type DisplayPageIconAssetObjectSource = {
  alt?: string;
  assetId: DisplayPageManagedAssetId;
  fallbackSrc: string;
  kind: "icon-asset";
};

export type DisplayPageFreeformObjectSource =
  | DisplayPageAssetImageObjectSource
  | DisplayPageIconAssetObjectSource
  | DisplayPageLineObjectSource;

export type DisplayPageLineObject = DisplayObjectBase<DisplayPageObjectMount> & {
  source: DisplayPageLineObjectSource;
  type: "line";
};

export type DisplayPageAssetImageObject = DisplayObjectBase<DisplayPageObjectMount> & {
  source: DisplayPageAssetImageObjectSource;
  type: "asset-image";
};

export type DisplayPageIconAssetObject = DisplayObjectBase<DisplayPageObjectMount> & {
  source: DisplayPageIconAssetObjectSource;
  type: "icon-asset";
};

export type DisplayPageFreeformObject =
  | DisplayPageAssetImageObject
  | DisplayPageIconAssetObject
  | DisplayPageLineObject;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidManagedAssetReference(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  return isNonEmptyString(value);
}

export function isDisplayPageObjectMount(value: unknown): value is DisplayPageObjectMount {
  return typeof value === "string" && displayPageObjectMounts.includes(value as DisplayPageObjectMount);
}

export function isDisplayPageFreeformObjectType(value: unknown): value is DisplayPageFreeformObjectType {
  return typeof value === "string" && displayPageFreeformObjectTypes.includes(value as DisplayPageFreeformObjectType);
}

export function isDisplayPageFreeformObjectShape(value: unknown): value is DisplayPageFreeformObject {
  if (!isPlainObject(value) || !isPlainObject(value.frame)) {
    return false;
  }

  const frame = value.frame;

  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    isDisplayPageFreeformObjectType(value.type) &&
    isDisplayPageObjectMount(value.mount) &&
    isFiniteNumber(frame.left) &&
    isFiniteNumber(frame.top) &&
    isFiniteNumber(frame.width) &&
    isFiniteNumber(frame.height) &&
    typeof value.visible === "boolean" &&
    typeof value.locked === "boolean" &&
    typeof value.zIndex === "number" &&
    isPlainObject(value.source) &&
    isPlainObject(value.style) &&
    isPlainObject(value.metadata)
  );
}

export function normalizeDisplayPageFreeformObjects(value: unknown): DisplayPageFreeformObject[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isDisplayPageFreeformObjectShape);
}

export function sortDisplayPageFreeformObjects(
  objects: DisplayPageFreeformObject[]
): DisplayPageFreeformObject[] {
  return [...objects].sort((left, right) => {
    if (left.zIndex !== right.zIndex) {
      return left.zIndex - right.zIndex;
    }

    return left.id.localeCompare(right.id);
  });
}

function pushSourceValidationFinding(findings: ValidationFinding[], object: DisplayPageFreeformObject) {
  if (object.type === "line") {
    if (!object.source || object.source.kind !== "line") {
      findings.push({
        code: "PAGE_OBJECT_INVALID_SOURCE",
        message: `${object.id} 的 line source payload 不合法`,
        regionId: object.id,
        severity: "blocking"
      });
    }

    return;
  }

  const source = object.source;

  if (
    source.kind !== object.type ||
    !isValidManagedAssetReference(source.assetId) ||
    !isNonEmptyString(source.fallbackSrc)
  ) {
    findings.push({
      code: "PAGE_OBJECT_INVALID_SOURCE",
      message: `${object.id} 的 ${object.type} source 缺少 asset reference 或 fallback source`,
      regionId: object.id,
      severity: "blocking"
    });
  }
}

export function validateDisplayPageFreeformObjects(
  objects: DisplayPageFreeformObject[]
): ValidationResult {
  const findings: ValidationFinding[] = [];
  const seenIds = new Set<string>();

  for (const object of objects) {
    if (seenIds.has(object.id)) {
      findings.push({
        code: "PAGE_OBJECT_DUPLICATE_ID",
        message: `重複的 page object id: ${object.id}`,
        regionId: object.id,
        severity: "blocking"
      });
    } else {
      seenIds.add(object.id);
    }

    if (object.mount !== "content") {
      findings.push({
        code: "PAGE_OBJECT_INVALID_MOUNT",
        message: `${object.id} 的 mount 必須為 content`,
        regionId: object.id,
        severity: "blocking"
      });
    }

    if (!Number.isFinite(object.zIndex)) {
      findings.push({
        code: "PAGE_OBJECT_UNSTABLE_ORDER",
        message: `${object.id} 缺少有效 zIndex，無法決定渲染順序`,
        regionId: object.id,
        severity: "blocking"
      });
    }

    const frame = object.frame;
    if (
      !frame ||
      !isFiniteNumber(frame.left) ||
      !isFiniteNumber(frame.top) ||
      !isFiniteNumber(frame.width) ||
      !isFiniteNumber(frame.height) ||
      frame.width <= 0 ||
      frame.height <= 0
    ) {
      findings.push({
        code: "PAGE_OBJECT_INVALID_FRAME",
        message: `${object.id} 具有無效 frame`,
        regionId: object.id,
        severity: "blocking"
      });
    } else if (
      frame.left < 0 ||
      frame.top < 0 ||
      frame.left + frame.width > DISPLAY_PAGE_CONTENT_SURFACE_WIDTH ||
      frame.top + frame.height > DISPLAY_PAGE_CONTENT_SURFACE_HEIGHT
    ) {
      findings.push({
        code: "PAGE_OBJECT_CONTENT_OVERFLOW",
        message: `${object.id} 超出 content surface 範圍`,
        regionId: object.id,
        severity: "blocking"
      });
    }

    pushSourceValidationFinding(findings, object);
  }

  return {
    canPublish: !findings.some((finding) => finding.severity === "blocking"),
    findings
  };
}
