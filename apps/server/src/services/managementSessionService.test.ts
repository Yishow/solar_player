import assert from "node:assert/strict";
import test from "node:test";
import { getDatabase } from "../db/index.js";
import { migrateDatabase } from "../db/migrate.js";
import { issueManagementSession, revokeAllManagementSessions, verifyManagementSession } from "./managementSessionService.js";

migrateDatabase();
test.after(() => revokeAllManagementSessions());
test("management sessions are opaque, verifiable, and revocable", () => {
  const issued = issueManagementSession();
  assert.equal(verifyManagementSession(issued.token), true);
  const stored = getDatabase().prepare("SELECT token_hash FROM management_sessions").get() as { token_hash: string };
  assert.notEqual(stored.token_hash, issued.token);
  revokeAllManagementSessions();
  assert.equal(verifyManagementSession(issued.token), false);
});
