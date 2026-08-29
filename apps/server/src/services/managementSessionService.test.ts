import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-management-session-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  {
    issueManagementSession,
    resetManagementSessionClockForTests,
    revokeAllManagementSessions,
    setManagementSessionClockForTests,
    verifyManagementSession
  }
] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("./managementSessionService.js")
]);

migrateDatabase();
test.after(() => {
  revokeAllManagementSessions();
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});
test("management sessions are opaque, verifiable, and revocable", () => {
  const issued = issueManagementSession();
  assert.equal(verifyManagementSession(issued.token), true);
  const stored = getDatabase().prepare("SELECT token_hash FROM management_sessions").get() as { token_hash: string };
  assert.notEqual(stored.token_hash, issued.token);
  revokeAllManagementSessions();
  assert.equal(verifyManagementSession(issued.token), false);
});

test("issuing a session removes expired sessions and leaves valid ones alone", () => {
  revokeAllManagementSessions();
  const countSessions = () =>
    (getDatabase().prepare("SELECT COUNT(*) AS total FROM management_sessions").get() as { total: number }).total;

  try {
    setManagementSessionClockForTests(() => new Date("2026-01-01T00:00:00.000Z"));
    const expiring = issueManagementSession();

    setManagementSessionClockForTests(() => new Date("2026-01-01T04:00:00.000Z"));
    const surviving = issueManagementSession();
    assert.equal(countSessions(), 2);

    // Past the first session's 8 hour lifetime, still inside the second's.
    setManagementSessionClockForTests(() => new Date("2026-01-01T09:00:00.000Z"));
    issueManagementSession();

    assert.equal(countSessions(), 2);
    assert.equal(verifyManagementSession(expiring.token), false);
    assert.equal(verifyManagementSession(surviving.token), true);
  } finally {
    resetManagementSessionClockForTests();
    revokeAllManagementSessions();
  }
});
