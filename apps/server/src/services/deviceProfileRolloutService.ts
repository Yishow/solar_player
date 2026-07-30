import type {
  DeviceProfileRolloutHeartbeat,
  DeviceProfileRolloutSnapshot,
  DeviceProfileRolloutStatus,
  FleetProfileRollout,
  PlaybackProfileVersion,
  ProfileUpdateState
} from "@solar-display/shared";
import type Database from "better-sqlite3";
import { getDatabase } from "../db/index.js";

type RolloutRow = {
  applied_version: number | null;
  desired_version: number | null;
  device_id: number;
  last_error: string | null;
  profile_id: number;
  update_state: ProfileUpdateState;
  updated_at: string | null;
};

function readRolloutRow(deviceId: number): RolloutRow {
  const row = getDatabase().prepare(
    `SELECT
       devices.id AS device_id,
       devices.applied_profile_version_id AS applied_version,
       devices.profile_update_state AS update_state,
       devices.profile_update_error AS last_error,
       devices.profile_update_at AS updated_at,
       groups.desired_profile_version_id AS desired_version,
       groups.playback_profile_id AS profile_id
     FROM devices
     INNER JOIN device_groups AS groups ON groups.id = devices.group_id
     WHERE devices.id = ?`
  ).get(deviceId) as RolloutRow | undefined;
  if (!row) {
    throw new Error("Device Profile rollout context was not found");
  }
  return row;
}

function serializeStatus(row: RolloutRow): DeviceProfileRolloutStatus {
  return {
    appliedVersion: row.applied_version,
    desiredVersion: row.desired_version,
    lastError: row.last_error,
    updatedAt: row.updated_at,
    updateState: row.update_state
  };
}

function readVersion(versionId: number): PlaybackProfileVersion {
  const row = getDatabase().prepare(
    `SELECT id, profile_id, version_number, schema_version, snapshot_json,
            created_at, created_by, rollback_from_version_id
     FROM playback_profile_versions WHERE id = ?`
  ).get(versionId) as {
    created_at: string;
    created_by: string;
    id: number;
    profile_id: number;
    rollback_from_version_id: number | null;
    schema_version: 1;
    snapshot_json: string;
    version_number: number;
  } | undefined;
  if (!row) {
    throw new Error("Desired Playback Profile Version was not found");
  }
  return {
    createdAt: row.created_at,
    createdBy: row.created_by,
    id: row.id,
    profileId: row.profile_id,
    rollbackFromVersionId: row.rollback_from_version_id,
    schemaVersion: row.schema_version,
    snapshot: JSON.parse(row.snapshot_json),
    versionNumber: row.version_number
  };
}

export function assignDesiredProfileVersion(
  profileId: number,
  versionId: number,
  database: Database.Database = getDatabase()
) {
  return database.prepare(
    `UPDATE device_groups
     SET desired_profile_version_id = ?, updated_at = CURRENT_TIMESTAMP
     WHERE playback_profile_id = ? AND enabled = 1`
  ).run(versionId, profileId).changes;
}

export function readDeviceProfileRollout(
  deviceId: number
): DeviceProfileRolloutSnapshot {
  const row = readRolloutRow(deviceId);
  const desired =
    row.desired_version === null ? null : readVersion(row.desired_version);
  if (desired && desired.profileId !== row.profile_id) {
    throw new Error("Desired Playback Profile Version does not match Device Group");
  }
  return {
    ...serializeStatus(row),
    desired
  };
}

function boundedError(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized.slice(0, 160) : null;
}

export function recordDeviceProfileRolloutHeartbeat(
  deviceId: number,
  heartbeat: DeviceProfileRolloutHeartbeat
) {
  const current = readRolloutRow(deviceId);
  let appliedVersion = current.applied_version;
  let updateState = heartbeat.updateState;
  let lastError = boundedError(heartbeat.updateError);

  if (heartbeat.desiredVersion !== current.desired_version) {
    updateState = "failed";
    lastError = "desired version mismatch";
  } else if (
    heartbeat.updateState === "applied"
    && heartbeat.appliedVersion !== null
    && !getDatabase().prepare(
      `SELECT 1 FROM playback_profile_versions
       WHERE id = ? AND profile_id = ?`
    ).get(heartbeat.appliedVersion, current.profile_id)
  ) {
    updateState = "failed";
    lastError = "applied version mismatch";
  } else if (
    heartbeat.updateState === "applied"
    && heartbeat.appliedVersion !== current.desired_version
  ) {
    updateState = "failed";
    lastError = "applied version does not match desired version";
  } else if (heartbeat.updateState === "applied") {
    appliedVersion = heartbeat.appliedVersion;
  } else if (heartbeat.appliedVersion !== current.applied_version) {
    updateState = "failed";
    lastError = "applied version mismatch";
  }

  if (
    appliedVersion === current.applied_version
    && updateState === current.update_state
    && lastError === current.last_error
  ) {
    return readDeviceProfileRollout(deviceId);
  }

  getDatabase().prepare(
    `UPDATE devices
     SET applied_profile_version_id = ?,
         profile_update_state = ?,
         profile_update_error = ?,
         profile_update_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(appliedVersion, updateState, lastError, deviceId);
  return readDeviceProfileRollout(deviceId);
}

export function deriveFleetProfileRollout(
  liveness: Array<{
    deviceId: number;
    state: "offline" | "online" | "stale";
  }>
): FleetProfileRollout {
  const livenessByDevice = new Map(
    liveness.map((entry) => [entry.deviceId, entry.state])
  );
  const devices = (getDatabase().prepare(
    `SELECT
       devices.id AS device_id,
       devices.applied_profile_version_id AS applied_version,
       devices.profile_update_state AS update_state,
       devices.profile_update_error AS last_error,
       devices.profile_update_at AS updated_at,
       groups.desired_profile_version_id AS desired_version,
       groups.playback_profile_id AS profile_id
     FROM devices
     INNER JOIN device_groups AS groups ON groups.id = devices.group_id
     WHERE devices.enabled = 1
     ORDER BY devices.id`
  ).all() as RolloutRow[]).map((row) => ({
    ...serializeStatus(row),
    deviceId: row.device_id,
    liveness: livenessByDevice.get(row.device_id) ?? "offline"
  }));
  const summary = devices.reduce((result, device) => {
    result.total += 1;
    if (device.liveness === "offline") {
      result.offline += 1;
    } else if (device.updateState === "failed") {
      result.failed += 1;
    } else if (
      device.updateState === "applied"
      && device.appliedVersion === device.desiredVersion
    ) {
      result.applied += 1;
    } else {
      result.waiting += 1;
    }
    return result;
  }, {
    applied: 0,
    failed: 0,
    offline: 0,
    total: 0,
    waiting: 0
  });
  return { devices, summary };
}
