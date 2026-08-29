import type {
  DisplayPreviewContextSelection,
  ResolvedDisplayPreviewContext,
  SiteScope
} from "@solar-display/shared";
import {
  DeviceGroupServiceError,
  readDevice,
  readDeviceGroup
} from "./deviceGroupService.js";

type PreviewContextErrorCode =
  | "preview_context_disabled"
  | "preview_context_group_required"
  | "preview_context_invalid"
  | "preview_context_not_found";

export class DisplayPreviewContextServiceError extends Error {
  readonly code: PreviewContextErrorCode;
  readonly statusCode: number;

  constructor(code: PreviewContextErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = "DisplayPreviewContextServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readPositiveInteger(value: unknown, fieldName: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new DisplayPreviewContextServiceError(
      "preview_context_invalid",
      `${fieldName} must be a positive integer`,
      400
    );
  }
  return value;
}

function readSiteScope(value: unknown): SiteScope {
  if (value !== "cl" && value !== "kn") {
    throw new DisplayPreviewContextServiceError(
      "preview_context_invalid",
      "siteScope must be either cl or kn",
      400
    );
  }
  return value;
}

function assertSelectionFields(
  value: Record<string, unknown>,
  allowedFields: readonly string[]
) {
  const unsupportedField = Object.keys(value).find((field) => !allowedFields.includes(field));
  if (unsupportedField) {
    throw new DisplayPreviewContextServiceError(
      "preview_context_invalid",
      `Unsupported Preview Context field: ${unsupportedField}`,
      400
    );
  }
}

function readSelection(value: unknown): DisplayPreviewContextSelection {
  if (!isRecord(value)) {
    throw new DisplayPreviewContextServiceError(
      "preview_context_invalid",
      "Preview Context selection is required",
      400
    );
  }

  if (value.kind === "site") {
    assertSelectionFields(value, ["kind", "siteScope"]);
    return { kind: "site", siteScope: readSiteScope(value.siteScope) };
  }
  if (value.kind === "device") {
    assertSelectionFields(value, ["deviceId", "kind"]);
    return { deviceId: readPositiveInteger(value.deviceId, "deviceId"), kind: "device" };
  }
  if (value.kind === "group") {
    assertSelectionFields(value, ["groupId", "kind"]);
    return { groupId: readPositiveInteger(value.groupId, "groupId"), kind: "group" };
  }

  throw new DisplayPreviewContextServiceError(
    "preview_context_invalid",
    "Preview Context kind must be site, device, or group",
    400
  );
}

function readManagedEntity<T>(reader: () => T): T {
  try {
    return reader();
  } catch (error) {
    if (error instanceof DeviceGroupServiceError && error.statusCode === 404) {
      throw new DisplayPreviewContextServiceError(
        "preview_context_not_found",
        error.message,
        404
      );
    }
    throw error;
  }
}

export function resolveDisplayPreviewContext(
  value: unknown
): ResolvedDisplayPreviewContext {
  const selection = readSelection(value);

  if (selection.kind === "site") {
    return {
      contextKey: `site:${selection.siteScope}`,
      deviceId: null,
      groupId: null,
      kind: "site",
      label: selection.siteScope.toUpperCase(),
      profileId: null,
      siteScope: selection.siteScope
    };
  }

  if (selection.kind === "group") {
    const group = readManagedEntity(() => readDeviceGroup(selection.groupId));
    if (!group.enabled) {
      throw new DisplayPreviewContextServiceError(
        "preview_context_disabled",
        "Disabled Device Group cannot be used as Preview Context",
        403
      );
    }
    return {
      contextKey: `group:${group.id}`,
      deviceId: null,
      groupId: group.id,
      kind: "group",
      label: group.name,
      profileId: group.playbackProfileId,
      siteScope: group.siteScope
    };
  }

  const device = readManagedEntity(() => readDevice(selection.deviceId));
  if (!device.enabled) {
    throw new DisplayPreviewContextServiceError(
      "preview_context_disabled",
      "Disabled Device cannot be used as Preview Context",
      403
    );
  }
  if (!device.group) {
    throw new DisplayPreviewContextServiceError(
      "preview_context_group_required",
      "Device must belong to an enabled Group before it can be used as Preview Context",
      422
    );
  }
  if (!device.group.enabled) {
    throw new DisplayPreviewContextServiceError(
      "preview_context_disabled",
      "Device Group is disabled",
      403
    );
  }

  return {
    contextKey: `device:${device.id}`,
    deviceId: device.id,
    groupId: device.group.id,
    kind: "device",
    label: device.displayName,
    profileId: device.group.playbackProfileId,
    siteScope: device.group.siteScope
  };
}
