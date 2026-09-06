import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import {
  acceptedSampleChecksum,
  activateProjection,
  readActiveProjection,
  rollbackProjection,
  shadowProject
} from "./consumptionProjectionService.js";

function createDatabase() {
  const database = new Database(":memory:");
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/001_init.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/040_meter_reading_contracts.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/041_site_energy_profiles.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/042_consumption_projections.sql"), "utf8"));
  return database;
}

test("E3 shadow activation and rollback keep the previous projection", () => {
  const database = createDatabase();
  const first = shadowProject(database, {
    profileRevision: 1,
    quality: "exact",
    siteTimeZone: "Asia/Taipei",
    valueKwh: "4300"
  }, "kn", "month", "checksum-a", "2026-09-01T00:00:00Z");
  activateProjection(database, first);
  const second = shadowProject(database, {
    profileRevision: 2,
    quality: "exact",
    siteTimeZone: "Asia/Taipei",
    valueKwh: "4500"
  }, "kn", "month", "checksum-b", "2026-09-02T00:00:00Z");
  activateProjection(database, second);
  assert.equal(readActiveProjection(database, "kn", "month")?.valueKwh, "4500");
  const rolled = rollbackProjection(database, "kn", "month");
  assert.equal(rolled?.valueKwh, "4300");
  assert.equal(readActiveProjection(database, "kn", "month")?.valueKwh, "4300");
  database.close();
});

test("E3 restart reads the persisted active projection without MQTT", () => {
  const database = createDatabase();
  const first = shadowProject(database, {
    profileRevision: 1,
    quality: "exact",
    siteTimeZone: "Asia/Taipei",
    valueKwh: "300"
  }, "kn", "day", "checksum-restart", "2026-09-01T00:00:00Z");
  activateProjection(database, first);
  const checksum = acceptedSampleChecksum(database, "kn");
  assert.equal(typeof checksum, "string");
  assert.equal(readActiveProjection(database, "kn", "day")?.valueKwh, "300");
  database.close();
});
