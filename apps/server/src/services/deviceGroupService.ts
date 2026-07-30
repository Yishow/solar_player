import type {
  Device,
  DeviceGroup,
  SiteScope
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";

type DeviceGroupRow = {
  desired_profile_version_id: number | null;
  enabled: number;
  id: number;
  name: string;
  playback_profile_id: number;
  profile_is_default: number;
  profile_key: string;
  profile_name: string;
  site_scope: SiteScope;
};

type DeviceRow = {
  applied_profile_version_id: number | null;
  client_id: string;
  desired_profile_version_id: number | null;
  display_name: string;
  enabled: number;
  group_enabled: number | null;
  group_id: number | null;
  group_name: string | null;
  group_playback_profile_id: number | null;
  group_site_scope: SiteScope | null;
  id: number;
  paired: number;
  profile_is_default: number | null;
  profile_key: string | null;
  profile_name: string | null;
  profile_update_error: string | null;
  profile_update_state: "waiting" | "applied" | "failed";
};

type ServiceErrorCode =
  | "client_id_conflict"
  | "device_not_found"
  | "group_disabled"
  | "group_in_use"
  | "group_name_conflict"
  | "group_not_found"
  | "group_required"
  | "invalid_client_id"
  | "invalid_display_name"
  | "invalid_enabled"
  | "invalid_group_name"
  | "invalid_site_scope"
  | "profile_not_found";

export class DeviceGroupServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly statusCode: number;

  constructor(code: ServiceErrorCode, message: string, statusCode = 400) {
    super(message);
    this.name = "DeviceGroupServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

const GROUP_SELECT = `
  SELECT
    groups.id,
    groups.name,
    groups.enabled,
    groups.site_scope,
    groups.playback_profile_id,
    groups.desired_profile_version_id,
    profiles.profile_key,
    profiles.name AS profile_name,
    profiles.is_default AS profile_is_default
  FROM device_groups AS groups
  INNER JOIN playback_profiles AS profiles ON profiles.id = groups.playback_profile_id
`;

const DEVICE_SELECT = `
  SELECT
    devices.id,
    devices.client_id,
    devices.display_name,
    devices.enabled,
    devices.group_id,
    groups.name AS group_name,
    groups.enabled AS group_enabled,
    groups.site_scope AS group_site_scope,
    groups.playback_profile_id AS group_playback_profile_id,
    groups.desired_profile_version_id,
    devices.applied_profile_version_id,
    devices.profile_update_state,
    devices.profile_update_error,
    profiles.profile_key,
    profiles.name AS profile_name,
    profiles.is_default AS profile_is_default,
    EXISTS (
      SELECT 1
      FROM device_credentials AS credentials
      WHERE credentials.device_id = devices.id
        AND credentials.revoked_at IS NULL
        AND datetime(credentials.expires_at) > CURRENT_TIMESTAMP
    ) AS paired
  FROM devices
  LEFT JOIN device_groups AS groups ON groups.id = devices.group_id
  LEFT JOIN playback_profiles AS profiles ON profiles.id = groups.playback_profile_id
`;

function normalizeRequiredText(
  value: unknown,
  code: "invalid_client_id" | "invalid_display_name" | "invalid_group_name",
  fieldName: string
) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DeviceGroupServiceError(code, `${fieldName} must be a non-empty string`);
  }

  return value.trim();
}

function normalizeEnabled(value: unknown, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "boolean") {
    throw new DeviceGroupServiceError("invalid_enabled", "enabled must be a boolean");
  }
  return value;
}

function normalizeSiteScope(value: unknown, fallback?: SiteScope): SiteScope {
  if (value === undefined && fallback) {
    return fallback;
  }
  if (value !== "cl" && value !== "kn") {
    throw new DeviceGroupServiceError(
      "invalid_site_scope",
      "siteScope must be either cl or kn"
    );
  }
  return value;
}

function normalizeNullableId(value: unknown, fieldName: string): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new DeviceGroupServiceError(
      fieldName === "playbackProfileId" ? "profile_not_found" : "group_not_found",
      `${fieldName} must be a positive integer`
    );
  }
  return value;
}

function serializeGroup(row: DeviceGroupRow): DeviceGroup {
  return {
    desiredVersion: row.desired_profile_version_id,
    enabled: row.enabled === 1,
    id: row.id,
    name: row.name,
    playbackProfile: {
      id: row.playback_profile_id,
      isDefault: row.profile_is_default === 1,
      name: row.profile_name,
      profileKey: row.profile_key
    },
    playbackProfileId: row.playback_profile_id,
    siteScope: row.site_scope
  };
}

function serializeDevice(row: DeviceRow): Device {
  const group =
    row.group_id === null
      ? null
      : serializeGroup({
          desired_profile_version_id: row.desired_profile_version_id,
          enabled: row.group_enabled!,
          id: row.group_id,
          name: row.group_name!,
          playback_profile_id: row.group_playback_profile_id!,
          profile_is_default: row.profile_is_default!,
          profile_key: row.profile_key!,
          profile_name: row.profile_name!,
          site_scope: row.group_site_scope!
        });

  return {
    appliedVersion: row.applied_profile_version_id,
    clientId: row.client_id,
    displayName: row.display_name,
    enabled: row.enabled === 1,
    group,
    groupId: row.group_id,
    id: row.id,
    paired: row.paired === 1,
    profileUpdateError: row.profile_update_error,
    profileUpdateState: row.profile_update_state
  };
}

function readGroupRow(id: number): DeviceGroupRow | undefined {
  return getDatabase()
    .prepare(`${GROUP_SELECT} WHERE groups.id = ?`)
    .get(id) as DeviceGroupRow | undefined;
}

function readDeviceRow(id: number): DeviceRow | undefined {
  return getDatabase()
    .prepare(`${DEVICE_SELECT} WHERE devices.id = ?`)
    .get(id) as DeviceRow | undefined;
}

function resolvePlaybackProfileId(value: unknown): number {
  const database = getDatabase();
  const row =
    value === undefined
      ? (database
          .prepare(
            "SELECT id FROM playback_profiles WHERE is_default = 1 ORDER BY id LIMIT 1"
          )
          .get() as { id: number } | undefined)
      : (database
          .prepare("SELECT id FROM playback_profiles WHERE id = ?")
          .get(normalizeNullableId(value, "playbackProfileId")) as
          | { id: number }
          | undefined);

  if (!row) {
    throw new DeviceGroupServiceError(
      "profile_not_found",
      "Playback Profile does not exist"
    );
  }

  return row.id;
}

function assertGroupCanEnableDevice(groupId: number | null) {
  if (groupId === null) {
    throw new DeviceGroupServiceError(
      "group_required",
      "An enabled Device requires a Group"
    );
  }

  const group = readGroupRow(groupId);
  if (!group) {
    throw new DeviceGroupServiceError("group_not_found", "Device Group does not exist");
  }
  if (group.enabled !== 1) {
    throw new DeviceGroupServiceError("group_disabled", "Device Group is disabled");
  }
}

function mapUniqueConstraint(
  error: unknown,
  code: "client_id_conflict" | "group_name_conflict",
  message: string
): never {
  if (
    error instanceof Error
    && "code" in error
    && typeof error.code === "string"
    && error.code.startsWith("SQLITE_CONSTRAINT_UNIQUE")
  ) {
    throw new DeviceGroupServiceError(code, message, 409);
  }
  throw error;
}

export function listDeviceGroups(): DeviceGroup[] {
  return (
    getDatabase()
      .prepare(`${GROUP_SELECT} ORDER BY groups.id`)
      .all() as DeviceGroupRow[]
  ).map(serializeGroup);
}

export function readDeviceGroup(id: number): DeviceGroup {
  const row = readGroupRow(id);
  if (!row) {
    throw new DeviceGroupServiceError(
      "group_not_found",
      "Device Group does not exist",
      404
    );
  }
  return serializeGroup(row);
}

export function createDeviceGroup(input: {
  enabled?: unknown;
  name?: unknown;
  playbackProfileId?: unknown;
  siteScope?: unknown;
}): DeviceGroup {
  const database = getDatabase();

  try {
    return database.transaction(() => {
      const name = normalizeRequiredText(input.name, "invalid_group_name", "name");
      const enabled = normalizeEnabled(input.enabled, true);
      const siteScope = normalizeSiteScope(input.siteScope);
      const playbackProfileId = resolvePlaybackProfileId(input.playbackProfileId);
      const result = database
        .prepare(
          `INSERT INTO device_groups (
             name, enabled, site_scope, playback_profile_id,
             desired_profile_version_id, created_at, updated_at
           ) VALUES (?, ?, ?, ?, (
             SELECT id FROM playback_profile_versions
             WHERE profile_id = ?
             ORDER BY version_number DESC LIMIT 1
           ), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        )
        .run(
          name,
          enabled ? 1 : 0,
          siteScope,
          playbackProfileId,
          playbackProfileId
        );

      return readDeviceGroup(Number(result.lastInsertRowid));
    })();
  } catch (error) {
    return mapUniqueConstraint(
      error,
      "group_name_conflict",
      "Device Group name already exists"
    );
  }
}

export function updateDeviceGroup(
  id: number,
  input: {
    enabled?: unknown;
    name?: unknown;
    playbackProfileId?: unknown;
    siteScope?: unknown;
  }
): DeviceGroup {
  const database = getDatabase();

  try {
    return database.transaction(() => {
      const current = readGroupRow(id);
      if (!current) {
        throw new DeviceGroupServiceError(
          "group_not_found",
          "Device Group does not exist",
          404
        );
      }

      const name =
        input.name === undefined
          ? current.name
          : normalizeRequiredText(input.name, "invalid_group_name", "name");
      const enabled = normalizeEnabled(input.enabled, current.enabled === 1);
      const siteScope = normalizeSiteScope(input.siteScope, current.site_scope);
      const playbackProfileId =
        input.playbackProfileId === undefined
          ? current.playback_profile_id
          : resolvePlaybackProfileId(input.playbackProfileId);

      database
        .prepare(
          `UPDATE device_groups
           SET name = ?, enabled = ?, site_scope = ?, playback_profile_id = ?,
               desired_profile_version_id = (
                 SELECT id FROM playback_profile_versions
                 WHERE profile_id = ?
                 ORDER BY version_number DESC LIMIT 1
               ),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        )
        .run(
          name,
          enabled ? 1 : 0,
          siteScope,
          playbackProfileId,
          playbackProfileId,
          id
        );

      return readDeviceGroup(id);
    })();
  } catch (error) {
    if (error instanceof DeviceGroupServiceError) {
      throw error;
    }
    return mapUniqueConstraint(
      error,
      "group_name_conflict",
      "Device Group name already exists"
    );
  }
}

export function deleteDeviceGroup(id: number): { id: number } {
  const database = getDatabase();

  return database.transaction(() => {
    readDeviceGroup(id);
    const usage = database
      .prepare("SELECT COUNT(*) AS count FROM devices WHERE group_id = ?")
      .get(id) as { count: number };
    if (usage.count > 0) {
      throw new DeviceGroupServiceError(
        "group_in_use",
        "Device Group is still referenced by Devices",
        409
      );
    }
    database.prepare("DELETE FROM device_groups WHERE id = ?").run(id);
    return { id };
  })();
}

export function listDevices(): Device[] {
  return (
    getDatabase()
      .prepare(`${DEVICE_SELECT} ORDER BY devices.id`)
      .all() as DeviceRow[]
  ).map(serializeDevice);
}

export function readDevice(id: number): Device {
  const row = readDeviceRow(id);
  if (!row) {
    throw new DeviceGroupServiceError("device_not_found", "Device does not exist", 404);
  }
  return serializeDevice(row);
}

export function createDevice(input: {
  clientId?: unknown;
  displayName?: unknown;
  enabled?: unknown;
  groupId?: unknown;
}): Device {
  const database = getDatabase();

  try {
    return database.transaction(() => {
      const clientId = normalizeRequiredText(input.clientId, "invalid_client_id", "clientId");
      const displayName = normalizeRequiredText(
        input.displayName,
        "invalid_display_name",
        "displayName"
      );
      const enabled = normalizeEnabled(input.enabled, true);
      const groupId =
        input.groupId === undefined ? null : normalizeNullableId(input.groupId, "groupId");

      if (enabled) {
        assertGroupCanEnableDevice(groupId);
      } else if (groupId !== null && !readGroupRow(groupId)) {
        throw new DeviceGroupServiceError("group_not_found", "Device Group does not exist");
      }

      const result = database
        .prepare(
          `INSERT INTO devices (
             client_id, display_name, enabled, group_id, created_at, updated_at
           ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        )
        .run(clientId, displayName, enabled ? 1 : 0, groupId);

      return readDevice(Number(result.lastInsertRowid));
    })();
  } catch (error) {
    if (error instanceof DeviceGroupServiceError) {
      throw error;
    }
    return mapUniqueConstraint(error, "client_id_conflict", "Device clientId already exists");
  }
}

export function updateDevice(
  id: number,
  input: {
    clientId?: unknown;
    displayName?: unknown;
    enabled?: unknown;
    groupId?: unknown;
  }
): Device {
  const database = getDatabase();

  try {
    return database.transaction(() => {
      const current = readDeviceRow(id);
      if (!current) {
        throw new DeviceGroupServiceError(
          "device_not_found",
          "Device does not exist",
          404
        );
      }

      const clientId =
        input.clientId === undefined
          ? current.client_id
          : normalizeRequiredText(input.clientId, "invalid_client_id", "clientId");
      const displayName =
        input.displayName === undefined
          ? current.display_name
          : normalizeRequiredText(
              input.displayName,
              "invalid_display_name",
              "displayName"
            );
      const enabled = normalizeEnabled(input.enabled, current.enabled === 1);
      const groupId =
        input.groupId === undefined
          ? current.group_id
          : normalizeNullableId(input.groupId, "groupId");

      const requiresActiveGroup =
        enabled
        && (
          current.enabled !== 1
          || (input.groupId !== undefined && groupId !== current.group_id)
        );

      if (requiresActiveGroup) {
        assertGroupCanEnableDevice(groupId);
      } else if (groupId !== null && !readGroupRow(groupId)) {
        throw new DeviceGroupServiceError("group_not_found", "Device Group does not exist");
      }

      database
        .prepare(
          `UPDATE devices
           SET client_id = ?, display_name = ?, enabled = ?, group_id = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        )
        .run(clientId, displayName, enabled ? 1 : 0, groupId, id);

      return readDevice(id);
    })();
  } catch (error) {
    if (error instanceof DeviceGroupServiceError) {
      throw error;
    }
    return mapUniqueConstraint(error, "client_id_conflict", "Device clientId already exists");
  }
}

export function deleteDevice(id: number): { id: number } {
  const database = getDatabase();

  return database.transaction(() => {
    readDevice(id);
    database.prepare("DELETE FROM devices WHERE id = ?").run(id);
    return { id };
  })();
}
