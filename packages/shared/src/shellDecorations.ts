import type { ConfigStage, DisplayPageManagedAssetId, ValidationFinding, ValidationResult } from "./displayPageConfig.js";

export const displayObjectTypes = ["line", "asset-image", "ornament-image"] as const;

export type DisplayObjectType = (typeof displayObjectTypes)[number];

export const shellDecorationMounts = ["header", "footer"] as const;

export type ShellDecorationMount = (typeof shellDecorationMounts)[number];

export const SHELL_BAND_WIDTH = 1920;

export const shellBandHeightByMount: Record<ShellDecorationMount, number> = {
  header: 110,
  footer: 72
};

export type DisplayObjectFrame = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type DisplayObjectStyle = {
  color?: string;
  opacity?: number;
  rotation?: number;
  thickness?: number;
};

export type ShellDecorationLineSource = {
  kind: "line";
};

export type ShellDecorationAssetImageSource = {
  alt?: string;
  assetId: DisplayPageManagedAssetId;
  fallbackSrc: string;
  kind: "asset-image";
};

export type ShellDecorationOrnamentImageSource = {
  assetId?: DisplayPageManagedAssetId | null;
  fallbackSrc?: string;
  kind: "ornament-image";
  ornamentKey: string;
};

export type ShellDecorationSource =
  | ShellDecorationAssetImageSource
  | ShellDecorationLineSource
  | ShellDecorationOrnamentImageSource;

export type DisplayObjectBase<TMount extends string = string> = {
  frame: DisplayObjectFrame;
  id: string;
  locked: boolean;
  metadata: Record<string, unknown>;
  mount: TMount;
  style: DisplayObjectStyle;
  visible: boolean;
  zIndex: number;
};

export type ShellDecorationLineObject = DisplayObjectBase<ShellDecorationMount> & {
  source: ShellDecorationLineSource;
  type: "line";
};

export type ShellDecorationAssetImageObject = DisplayObjectBase<ShellDecorationMount> & {
  source: ShellDecorationAssetImageSource;
  type: "asset-image";
};

export type ShellDecorationOrnamentImageObject = DisplayObjectBase<ShellDecorationMount> & {
  source: ShellDecorationOrnamentImageSource;
  type: "ornament-image";
};

export type ShellDecorationObject =
  | ShellDecorationAssetImageObject
  | ShellDecorationLineObject
  | ShellDecorationOrnamentImageObject;

export type ShellDecorationChannel = {
  footerObjects: ShellDecorationObject[];
  headerObjects: ShellDecorationObject[];
};

export type ShellDecorationEnvelope = {
  footerObjects: ShellDecorationObject[];
  headerObjects: ShellDecorationObject[];
  publishedAt?: string | null;
  publishedBy?: string | null;
  stage: ConfigStage;
  updatedAt: string | null;
  validation?: ValidationResult | null;
  version: number;
};

export type PublicShellDecorationConfig = {
  footerObjects: ShellDecorationObject[];
  headerObjects: ShellDecorationObject[];
  updatedAt: string | null;
  version: number;
};

export function isShellDecorationMount(value: unknown): value is ShellDecorationMount {
  return typeof value === "string" && shellDecorationMounts.includes(value as ShellDecorationMount);
}

export function isDisplayObjectType(value: unknown): value is DisplayObjectType {
  return typeof value === "string" && displayObjectTypes.includes(value as DisplayObjectType);
}

export function resolveShellBandHeight(mount: ShellDecorationMount): number {
  return shellBandHeightByMount[mount];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFrameShape(value: unknown): value is DisplayObjectFrame {
  if (!isPlainObject(value)) {
    return false;
  }
  return (["height", "left", "top", "width"] as const).every(
    (key) => typeof value[key] === "number" && Number.isFinite(value[key])
  );
}

export function isShellDecorationObjectShape(value: unknown): value is ShellDecorationObject {
  if (!isPlainObject(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    isDisplayObjectType(value.type) &&
    isShellDecorationMount(value.mount) &&
    isFrameShape(value.frame) &&
    typeof value.visible === "boolean" &&
    typeof value.locked === "boolean" &&
    typeof value.zIndex === "number" &&
    isPlainObject(value.source) &&
    isPlainObject(value.style) &&
    isPlainObject(value.metadata)
  );
}

export function createEmptyShellDecorationChannel(): ShellDecorationChannel {
  return { footerObjects: [], headerObjects: [] };
}

export function createDefaultShellDecorationEnvelope(stage: ConfigStage): ShellDecorationEnvelope {
  return {
    footerObjects: [],
    headerObjects: [],
    stage,
    updatedAt: null,
    version: 1
  };
}

export function sortShellDecorationObjects(objects: ShellDecorationObject[]): ShellDecorationObject[] {
  return [...objects].sort((left, right) => {
    if (left.zIndex !== right.zIndex) {
      return left.zIndex - right.zIndex;
    }
    return left.id.localeCompare(right.id);
  });
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

function pushSourceValidationFinding(findings: ValidationFinding[], object: ShellDecorationObject) {
  if (object.type === "line") {
    if (!object.source || object.source.kind !== "line") {
      findings.push({
        code: "SHELL_OBJECT_INVALID_SOURCE",
        message: `${object.id} 的 line source payload 不合法`,
        regionId: object.id,
        severity: "blocking"
      });
    }
    return;
  }

  if (object.type === "asset-image") {
    const source = object.source as Partial<ShellDecorationAssetImageSource> | undefined;
    if (
      !source ||
      source.kind !== "asset-image" ||
      !isValidManagedAssetReference(source.assetId) ||
      !isNonEmptyString(source.fallbackSrc)
    ) {
      findings.push({
        code: "SHELL_OBJECT_INVALID_SOURCE",
        message: `${object.id} 的 asset-image source 缺少 managed asset reference 或 fallback source`,
        regionId: object.id,
        severity: "blocking"
      });
    }
    return;
  }

  const source = object.source as Partial<ShellDecorationOrnamentImageSource> | undefined;
  if (!source || source.kind !== "ornament-image" || !isNonEmptyString(source.ornamentKey)) {
    findings.push({
      code: "SHELL_OBJECT_INVALID_SOURCE",
      message: `${object.id} 的 ornament-image source 缺少 ornament reference`,
      regionId: object.id,
      severity: "blocking"
    });
  }
}

function validateShellObject(
  findings: ValidationFinding[],
  object: ShellDecorationObject,
  expectedMount: ShellDecorationMount
) {
  if (!isDisplayObjectType(object.type)) {
    findings.push({
      code: "SHELL_OBJECT_UNSUPPORTED_TYPE",
      message: `${object.id} 使用未支援的 object type`,
      regionId: object.id,
      severity: "blocking"
    });
    return;
  }

  if (object.mount !== expectedMount) {
    findings.push({
      code: "SHELL_OBJECT_INVALID_MOUNT",
      message: `${object.id} 的 mount 必須為 ${expectedMount}`,
      regionId: object.id,
      severity: "blocking"
    });
  }

  const frame = object.frame;
  const bandHeight = resolveShellBandHeight(expectedMount);
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
      code: "SHELL_OBJECT_INVALID_FRAME",
      message: `${object.id} 具有無效 frame`,
      regionId: object.id,
      severity: "blocking"
    });
  } else if (
    frame.left < 0 ||
    frame.top < 0 ||
    frame.left + frame.width > SHELL_BAND_WIDTH ||
    frame.top + frame.height > bandHeight
  ) {
    findings.push({
      code: "SHELL_OBJECT_BAND_OVERFLOW",
      message: `${object.id} 超出 ${expectedMount} band 範圍`,
      regionId: object.id,
      severity: "blocking"
    });
  }

  pushSourceValidationFinding(findings, object);
}

function validateMountOrdering(findings: ValidationFinding[], objects: ShellDecorationObject[]) {
  // zIndex ties are resolved deterministically by id in sortShellDecorationObjects,
  // so only a missing/non-finite zIndex makes ordering unresolvable.
  for (const object of objects) {
    if (!isFiniteNumber(object.zIndex)) {
      findings.push({
        code: "SHELL_OBJECT_UNSTABLE_ORDER",
        message: `${object.id} 缺少有效 zIndex，無法決定渲染順序`,
        regionId: object.id,
        severity: "blocking"
      });
    }
  }
}

export function validateShellDecorationChannel(channel: ShellDecorationChannel): ValidationResult {
  const findings: ValidationFinding[] = [];
  const seenIds = new Set<string>();

  const mounts: Array<{ mount: ShellDecorationMount; objects: ShellDecorationObject[] }> = [
    { mount: "header", objects: channel.headerObjects },
    { mount: "footer", objects: channel.footerObjects }
  ];

  for (const { mount, objects } of mounts) {
    for (const object of objects) {
      if (seenIds.has(object.id)) {
        findings.push({
          code: "SHELL_OBJECT_DUPLICATE_ID",
          message: `重複的 shell object id: ${object.id}`,
          regionId: object.id,
          severity: "blocking"
        });
      } else {
        seenIds.add(object.id);
      }

      validateShellObject(findings, object, mount);
    }

    validateMountOrdering(findings, objects);
  }

  return { canPublish: !findings.some((finding) => finding.severity === "blocking"), findings };
}

export function toPublicShellDecorationConfig(envelope: ShellDecorationEnvelope): PublicShellDecorationConfig {
  return {
    footerObjects: sortShellDecorationObjects(envelope.footerObjects),
    headerObjects: sortShellDecorationObjects(envelope.headerObjects),
    updatedAt: envelope.updatedAt,
    version: envelope.version
  };
}
