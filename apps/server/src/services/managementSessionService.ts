import { createHash, randomBytes } from "node:crypto";
import { getDatabase } from "../db/index.js";

export const MANAGEMENT_SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
let now = () => new Date();
export function setManagementSessionClockForTests(clock: () => Date) { now = clock; }
export function resetManagementSessionClockForTests() { now = () => new Date(); }
function hash(token: string) { return createHash("sha256").update(token, "utf8").digest("hex"); }
export function issueManagementSession() {
  const token = randomBytes(32).toString("base64url");
  const createdAt = now();
  const expiresAt = new Date(createdAt.getTime() + MANAGEMENT_SESSION_LIFETIME_MS).toISOString();
  getDatabase().prepare("INSERT INTO management_sessions (token_hash,created_at,expires_at) VALUES (?,?,?)").run(hash(token), createdAt.toISOString(), expiresAt);
  return { token, expiresAt };
}
export function verifyManagementSession(token: unknown) {
  if (typeof token !== "string" || token.length < 32 || token.length > 512) return false;
  const record = getDatabase().prepare("SELECT expires_at FROM management_sessions WHERE token_hash=?").get(hash(token)) as { expires_at: string } | undefined;
  if (!record || !Number.isFinite(Date.parse(record.expires_at)) || now().getTime() >= Date.parse(record.expires_at)) {
    if (record) getDatabase().prepare("DELETE FROM management_sessions WHERE token_hash=?").run(hash(token));
    return false;
  }
  return true;
}
export function revokeManagementSession(token: unknown) {
  if (typeof token === "string") getDatabase().prepare("DELETE FROM management_sessions WHERE token_hash=?").run(hash(token));
}
export function revokeAllManagementSessions() { getDatabase().prepare("DELETE FROM management_sessions").run(); }
