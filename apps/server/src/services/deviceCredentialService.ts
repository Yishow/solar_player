import type {
  AuthenticatedDeviceIdentity,
  DevicePairingErrorCode,
  PairingTokenIssue,
  SiteScope
} from "@solar-display/shared";
import { createHash, randomBytes } from "node:crypto";
import { getDatabase } from "../db/index.js";

const PAIRING_TOKEN_LIFETIME_MS = 15 * 60 * 1_000;
const DEVICE_CREDENTIAL_LIFETIME_MS = 365 * 24 * 60 * 60 * 1_000;

type PairingTokenRow = {
  device_id: number;
  expires_at: string;
  id: number;
  used_at: string | null;
};

type CredentialRow = {
  client_id: string;
  credential_id: number;
  device_enabled: number;
  device_id: number;
  expires_at: string;
  group_enabled: number | null;
  group_id: number | null;
  playback_profile_id: number | null;
  revoked_at: string | null;
  site_scope: SiteScope | null;
};

type DeviceCredentialClock = () => Date;

let readNow: DeviceCredentialClock = () => new Date();

export class DeviceCredentialServiceError extends Error {
  constructor(
    public readonly code: DevicePairingErrorCode,
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
    this.name = "DeviceCredentialServiceError";
  }
}

function hashSecret(secret: string) {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

function createSecret() {
  return randomBytes(32).toString("base64url");
}

function normalizeSecret(value: unknown, code: DevicePairingErrorCode) {
  if (typeof value !== "string" || value.length < 32 || value.length > 512) {
    throw new DeviceCredentialServiceError(code, "Invalid secret");
  }
  return value;
}

function expiresAtFrom(now: Date, lifetimeMs: number) {
  return new Date(now.getTime() + lifetimeMs).toISOString();
}

function readExpiry(value: string, code: DevicePairingErrorCode, statusCode: number) {
  const expiry = Date.parse(value);
  if (!Number.isFinite(expiry)) {
    throw new DeviceCredentialServiceError(code, "Stored expiry is invalid", statusCode);
  }
  return expiry;
}

export function setDeviceCredentialClockForTests(clock: DeviceCredentialClock) {
  readNow = clock;
}

export function resetDeviceCredentialClockForTests() {
  readNow = () => new Date();
}

export function issuePairingToken(deviceId: number): PairingTokenIssue {
  const database = getDatabase();
  const device = database
    .prepare("SELECT id FROM devices WHERE id = ?")
    .get(deviceId) as { id: number } | undefined;

  if (!device) {
    throw new DeviceCredentialServiceError(
      "device_not_found",
      "Device does not exist",
      404
    );
  }

  const now = readNow();
  const token = createSecret();
  const expiresAt = expiresAtFrom(now, PAIRING_TOKEN_LIFETIME_MS);
  database
    .prepare(
      `INSERT INTO pairing_tokens (
         device_id, token_hash, expires_at, used_at, created_at
       ) VALUES (?, ?, ?, NULL, ?)`
    )
    .run(deviceId, hashSecret(token), expiresAt, now.toISOString());

  return {
    expiresAt,
    pairingPath: `/device-pairing#token=${encodeURIComponent(token)}`,
    token
  };
}

export function exchangePairingToken(value: unknown) {
  const token = normalizeSecret(value, "pairing_token_invalid");
  const database = getDatabase();

  return database.transaction(() => {
    const tokenRow = database
      .prepare(
        `SELECT id, device_id, expires_at, used_at
         FROM pairing_tokens
         WHERE token_hash = ?`
      )
      .get(hashSecret(token)) as PairingTokenRow | undefined;

    if (!tokenRow) {
      throw new DeviceCredentialServiceError(
        "pairing_token_invalid",
        "Pairing Token is invalid"
      );
    }
    if (tokenRow.used_at !== null) {
      throw new DeviceCredentialServiceError(
        "pairing_token_used",
        "Pairing Token was already used",
        409
      );
    }

    const now = readNow();
    if (
      now.getTime() >=
      readExpiry(tokenRow.expires_at, "pairing_token_expired", 409)
    ) {
      throw new DeviceCredentialServiceError(
        "pairing_token_expired",
        "Pairing Token has expired",
        409
      );
    }

    const consumed = database
      .prepare(
        `UPDATE pairing_tokens
         SET used_at = ?
         WHERE id = ? AND used_at IS NULL`
      )
      .run(now.toISOString(), tokenRow.id);
    if (consumed.changes !== 1) {
      throw new DeviceCredentialServiceError(
        "pairing_token_used",
        "Pairing Token was already used",
        409
      );
    }

    database
      .prepare(
        `UPDATE device_credentials
         SET revoked_at = ?
         WHERE device_id = ? AND revoked_at IS NULL`
      )
      .run(now.toISOString(), tokenRow.device_id);

    const credential = createSecret();
    const expiresAt = expiresAtFrom(now, DEVICE_CREDENTIAL_LIFETIME_MS);
    database
      .prepare(
        `INSERT INTO device_credentials (
           device_id, credential_hash, expires_at, revoked_at, created_at
         ) VALUES (?, ?, ?, NULL, ?)`
      )
      .run(
        tokenRow.device_id,
        hashSecret(credential),
        expiresAt,
        now.toISOString()
      );

    return { credential, expiresAt };
  })();
}

export function authenticateDeviceCredential(value: unknown): AuthenticatedDeviceIdentity {
  const credential = normalizeSecret(value, "credential_invalid");
  const row = getDatabase()
    .prepare(
      `SELECT
         device_credentials.id AS credential_id,
         device_credentials.expires_at,
         device_credentials.revoked_at,
         devices.id AS device_id,
         devices.client_id,
         devices.enabled AS device_enabled,
         devices.group_id,
         device_groups.enabled AS group_enabled,
         device_groups.site_scope,
         device_groups.playback_profile_id
       FROM device_credentials
       INNER JOIN devices ON devices.id = device_credentials.device_id
       LEFT JOIN device_groups ON device_groups.id = devices.group_id
       WHERE device_credentials.credential_hash = ?`
    )
    .get(hashSecret(credential)) as CredentialRow | undefined;

  if (!row) {
    throw new DeviceCredentialServiceError(
      "credential_invalid",
      "Device Credential is invalid",
      401
    );
  }
  if (row.revoked_at !== null) {
    throw new DeviceCredentialServiceError(
      "credential_revoked",
      "Device Credential was revoked",
      401
    );
  }
  if (
    readNow().getTime() >=
    readExpiry(row.expires_at, "credential_expired", 401)
  ) {
    throw new DeviceCredentialServiceError(
      "credential_expired",
      "Device Credential has expired",
      401
    );
  }
  if (row.device_enabled !== 1) {
    throw new DeviceCredentialServiceError(
      "device_disabled",
      "Device is disabled",
      403
    );
  }
  if (
    row.group_id === null ||
    row.group_enabled === null ||
    row.site_scope === null ||
    row.playback_profile_id === null
  ) {
    throw new DeviceCredentialServiceError(
      "group_missing",
      "Device Group is unavailable",
      403
    );
  }
  if (row.group_enabled !== 1) {
    throw new DeviceCredentialServiceError(
      "group_disabled",
      "Device Group is disabled",
      403
    );
  }

  return {
    clientId: row.client_id,
    credentialId: row.credential_id,
    deviceId: row.device_id,
    groupId: row.group_id,
    playbackProfileId: row.playback_profile_id,
    siteScope: row.site_scope
  };
}

export function revokeDeviceCredentials(deviceId: number) {
  const database = getDatabase();
  const device = database
    .prepare("SELECT id FROM devices WHERE id = ?")
    .get(deviceId) as { id: number } | undefined;
  if (!device) {
    throw new DeviceCredentialServiceError(
      "device_not_found",
      "Device does not exist",
      404
    );
  }

  const now = readNow().toISOString();
  const result = database
    .prepare(
      `UPDATE device_credentials
       SET revoked_at = ?
       WHERE device_id = ? AND revoked_at IS NULL`
    )
    .run(now, deviceId);
  return { revokedCount: result.changes };
}
