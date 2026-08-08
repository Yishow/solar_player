import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDatabase } from "../db/index.js";

const KDF_NAME = "scrypt";
const KDF_COST = 16_384;
const KDF_BLOCK_SIZE = 8;
const KDF_PARALLELIZATION = 1;
const HASH_BYTES = 32;

export const PASSWORD_FAILURE_THRESHOLD = 5;
export const PASSWORD_COOLDOWN_MS = 60_000;

type PasswordRow = {
  enabled: number;
  password_hash: string | null;
  password_salt: string | null;
  kdf_name: string | null;
  kdf_cost: number | null;
  kdf_block_size: number | null;
  kdf_parallelization: number | null;
  failed_attempts: number;
  locked_until: string | null;
};

export type PasswordGateState = {
  enabled: boolean;
  lockedUntil: string | null;
};

export type PasswordVerification = {
  ok: boolean;
  lockedUntil: string | null;
  locked: boolean;
};

let now = () => new Date();

export function setManagementPasswordClockForTests(clock: () => Date) {
  now = clock;
}

export function resetManagementPasswordClockForTests() {
  now = () => new Date();
}

function row(): PasswordRow {
  return getDatabase()
    .prepare(
      "SELECT enabled,password_hash,password_salt,kdf_name,kdf_cost,kdf_block_size,kdf_parallelization,failed_attempts,locked_until FROM management_password_settings WHERE id=1"
    )
    .get() as PasswordRow;
}

function derive(
  password: string,
  salt: Buffer,
  cost = KDF_COST,
  blockSize = KDF_BLOCK_SIZE,
  parallelization = KDF_PARALLELIZATION
) {
  return scryptSync(password, salt, HASH_BYTES, {
    N: cost,
    r: blockSize,
    p: parallelization,
    maxmem: 32 * 1024 * 1024
  });
}

function passwordHash(password: string) {
  const salt = randomBytes(16);
  return { hash: derive(password, salt), salt };
}

function isLocked(value: string | null, at = now()) {
  return value !== null && Number.isFinite(Date.parse(value)) && at.getTime() < Date.parse(value);
}

function updateLock(failedAttempts: number, lockedUntil: string | null) {
  getDatabase()
    .prepare("UPDATE management_password_settings SET failed_attempts=?,locked_until=?,updated_at=? WHERE id=1")
    .run(failedAttempts, lockedUntil, now().toISOString());
}

export function readManagementPasswordState(): PasswordGateState {
  const settings = row();
  return {
    enabled: settings.enabled === 1,
    lockedUntil: isLocked(settings.locked_until) ? settings.locked_until : null
  };
}

export function setManagementPassword(password: string, enabled = true) {
  if (typeof password !== "string" || password.trim().length < 8 || password.length > 512) {
    throw new Error("Invalid password");
  }

  const { hash, salt } = passwordHash(password);
  getDatabase()
    .prepare(
      "UPDATE management_password_settings SET enabled=?,password_hash=?,password_salt=?,kdf_name=?,kdf_cost=?,kdf_block_size=?,kdf_parallelization=?,failed_attempts=0,locked_until=NULL,updated_at=? WHERE id=1"
    )
    .run(
      enabled ? 1 : 0,
      hash.toString("base64url"),
      salt.toString("base64url"),
      KDF_NAME,
      KDF_COST,
      KDF_BLOCK_SIZE,
      KDF_PARALLELIZATION,
      now().toISOString()
    );
}

export function disableManagementPassword() {
  getDatabase()
    .prepare("UPDATE management_password_settings SET enabled=0,failed_attempts=0,locked_until=NULL,updated_at=? WHERE id=1")
    .run(now().toISOString());
}

export function verifyManagementPassword(password: unknown): PasswordVerification {
  const settings = row();
  const lockedUntil = isLocked(settings.locked_until) ? settings.locked_until : null;
  if (lockedUntil) {
    return { ok: false, locked: true, lockedUntil };
  }

  if (
    typeof password !== "string"
    || !settings.password_hash
    || !settings.password_salt
    || settings.kdf_name !== KDF_NAME
    || !settings.kdf_cost
    || !settings.kdf_block_size
    || !settings.kdf_parallelization
  ) {
    return { ok: false, locked: false, lockedUntil: null };
  }

  const expected = Buffer.from(settings.password_hash, "base64url");
  const actual = derive(
    password,
    Buffer.from(settings.password_salt, "base64url"),
    settings.kdf_cost,
    settings.kdf_block_size,
    settings.kdf_parallelization
  );

  if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
    updateLock(0, null);
    return { ok: true, locked: false, lockedUntil: null };
  }

  const attempts = settings.failed_attempts + 1;
  const nextLock = attempts >= PASSWORD_FAILURE_THRESHOLD
    ? new Date(now().getTime() + PASSWORD_COOLDOWN_MS).toISOString()
    : null;
  updateLock(nextLock ? 0 : attempts, nextLock);

  return { ok: false, locked: Boolean(nextLock), lockedUntil: nextLock };
}
