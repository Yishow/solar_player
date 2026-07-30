import type {
  DisplayClientContext,
  DisplayClientContextErrorCode
} from "@solar-display/shared";
import { createHash } from "node:crypto";
import { getDatabase } from "../db/index.js";
import {
  authenticateDeviceCredential,
  DeviceCredentialServiceError
} from "./deviceCredentialService.js";

type ContextRevisionRow = {
  device_updated_at: string;
  group_updated_at: string;
  profile_updated_at: string;
};

export class DisplayClientContextServiceError extends Error {
  constructor(
    public readonly code: DisplayClientContextErrorCode,
    message: string,
    public readonly statusCode: 401 | 403
  ) {
    super(message);
    this.name = "DisplayClientContextServiceError";
  }
}

function mapCredentialError(error: DeviceCredentialServiceError) {
  switch (error.code) {
    case "credential_missing":
    case "credential_invalid":
      return new DisplayClientContextServiceError(
        "device_unpaired",
        "Display Client is not paired",
        401
      );
    case "credential_expired":
      return new DisplayClientContextServiceError(
        "credential_expired",
        error.message,
        401
      );
    case "credential_revoked":
      return new DisplayClientContextServiceError(
        "credential_revoked",
        error.message,
        403
      );
    case "device_disabled":
      return new DisplayClientContextServiceError(
        "device_disabled",
        error.message,
        403
      );
    case "group_disabled":
      return new DisplayClientContextServiceError(
        "group_disabled",
        error.message,
        403
      );
    case "group_missing":
      return new DisplayClientContextServiceError(
        "group_missing",
        error.message,
        403
      );
    default:
      throw error;
  }
}

function createContextRevision(parts: Array<number | string>) {
  return createHash("sha256").update(JSON.stringify(parts), "utf8").digest("hex");
}

export function resolveDisplayClientContext(
  credential: unknown
): DisplayClientContext {
  let identity;
  try {
    identity = authenticateDeviceCredential(credential);
  } catch (error) {
    if (error instanceof DeviceCredentialServiceError) {
      throw mapCredentialError(error);
    }
    throw error;
  }

  const revisionRow = getDatabase()
    .prepare(
      `SELECT
         devices.updated_at AS device_updated_at,
         device_groups.updated_at AS group_updated_at,
         playback_profiles.updated_at AS profile_updated_at
       FROM devices
       INNER JOIN device_groups ON device_groups.id = devices.group_id
       INNER JOIN playback_profiles
         ON playback_profiles.id = device_groups.playback_profile_id
       INNER JOIN playback_profile_settings
         ON playback_profile_settings.profile_id = playback_profiles.id
       WHERE devices.id = ?`
    )
    .get(identity.deviceId) as ContextRevisionRow | undefined;

  if (!revisionRow) {
    throw new DisplayClientContextServiceError(
      "profile_missing",
      "Playback Profile is unavailable",
      403
    );
  }

  return {
    clientId: identity.clientId,
    contextRevision: createContextRevision([
      identity.credentialId,
      identity.deviceId,
      revisionRow.device_updated_at,
      identity.groupId,
      revisionRow.group_updated_at,
      identity.siteScope,
      identity.playbackProfileId,
      revisionRow.profile_updated_at
    ]),
    deviceId: identity.deviceId,
    groupId: identity.groupId,
    profileId: identity.playbackProfileId,
    siteScope: identity.siteScope
  };
}
