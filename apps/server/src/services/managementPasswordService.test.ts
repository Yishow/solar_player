import assert from "node:assert/strict";
import test from "node:test";
import { getDatabase } from "../db/index.js";
import { migrateDatabase } from "../db/migrate.js";
import { resetManagementPasswordClockForTests, setManagementPassword, verifyManagementPassword } from "./managementPasswordService.js";

migrateDatabase();
test.after(() => {
  getDatabase().prepare("UPDATE management_password_settings SET enabled=0,password_hash=NULL,password_salt=NULL,kdf_name=NULL,kdf_cost=NULL,kdf_block_size=NULL,kdf_parallelization=NULL,failed_attempts=0,locked_until=NULL").run();
  resetManagementPasswordClockForTests();
});

test("management passwords use independent salts and verify only the original text", () => {
  setManagementPassword("correct horse battery staple");
  const first = getDatabase().prepare("SELECT password_hash,password_salt FROM management_password_settings WHERE id=1").get() as { password_hash: string; password_salt: string };
  assert.equal(verifyManagementPassword("correct horse battery staple").ok, true);
  setManagementPassword("correct horse battery staple");
  const second = getDatabase().prepare("SELECT password_hash,password_salt FROM management_password_settings WHERE id=1").get() as { password_hash: string; password_salt: string };
  assert.notEqual(first.password_salt, second.password_salt);
  assert.notEqual(first.password_hash, second.password_hash);
  assert.equal(verifyManagementPassword("wrong password").ok, false);
});

test("repeated failures enter cooldown and a successful unlock resets failures", () => {
  setManagementPassword("correct horse battery staple");
  for (let i = 0; i < 4; i += 1) assert.equal(verifyManagementPassword("wrong password").locked, false);
  assert.equal(verifyManagementPassword("wrong password").locked, true);
  assert.equal(verifyManagementPassword("correct horse battery staple").locked, true);
});
