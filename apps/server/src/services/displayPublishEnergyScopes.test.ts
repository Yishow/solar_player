import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { readAssignedEnergyScopes } from "./displayPublishEnergyScopes.js";

test("publish scopes follow assigned playlists including devices awaiting rollout", () => {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE display_page_registry (id INTEGER, page_key TEXT, archived_at TEXT);
    CREATE TABLE playback_profile_pages (profile_id INTEGER, page_id INTEGER, enabled INTEGER);
    CREATE TABLE device_groups (id INTEGER, site_scope TEXT, playback_profile_id INTEGER, desired_profile_version_id INTEGER, enabled INTEGER);
    CREATE TABLE playback_profile_versions (id INTEGER, snapshot_json TEXT);
    CREATE TABLE devices (group_id INTEGER, applied_profile_version_id INTEGER, enabled INTEGER);
    INSERT INTO display_page_registry VALUES (1, 'overview-copy', NULL);
    INSERT INTO playback_profile_pages VALUES (10, 1, 1);
    INSERT INTO device_groups VALUES (1, 'kn', 10, NULL, 1), (2, 'cl', 20, NULL, 1);
  `);
  assert.deepEqual(readAssignedEnergyScopes(db, "overview-copy"), ["kn"]);
  const snapshot = JSON.stringify({ pages: [{ pageKey: "overview-copy", enabled: true }] });
  db.prepare("INSERT INTO playback_profile_versions VALUES (1, ?)").run(snapshot);
  db.exec("INSERT INTO devices VALUES (2, 1, 1)");
  assert.deepEqual(readAssignedEnergyScopes(db, "overview-copy"), ["cl", "kn"]);
  db.exec("UPDATE devices SET enabled = 0");
  assert.deepEqual(readAssignedEnergyScopes(db, "overview-copy"), ["kn"]);
  db.exec("UPDATE device_groups SET desired_profile_version_id = 1 WHERE id = 2");
  assert.deepEqual(readAssignedEnergyScopes(db, "overview-copy"), ["cl", "kn"]);
  assert.deepEqual(readAssignedEnergyScopes(db, "unused-page"), []);
  db.close();
});
