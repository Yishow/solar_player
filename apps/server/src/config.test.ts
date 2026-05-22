import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { config } from "./config.js";

test("config resolves relative env paths against project root instead of process cwd", () => {
  const originalDataDir = process.env.DATA_DIR;
  const originalDatabasePath = process.env.DATABASE_PATH;
  const originalUploadsDir = process.env.UPLOADS_DIR;
  const originalBrandUploadsDir = process.env.BRAND_UPLOADS_DIR;
  const originalCwd = process.cwd();

  process.env.DATA_DIR = "./data";
  process.env.DATABASE_PATH = "./data/solar-display.sqlite";
  process.env.UPLOADS_DIR = "./uploads/images";
  process.env.BRAND_UPLOADS_DIR = "./uploads/brand";
  process.chdir(resolve(config.projectRoot, "apps/server"));

  try {
    assert.equal(config.dataDir, resolve(config.projectRoot, "data"));
    assert.equal(config.databasePath, resolve(config.projectRoot, "data/solar-display.sqlite"));
    assert.equal(config.uploadsDir, resolve(config.projectRoot, "uploads/images"));
    assert.equal(config.brandUploadsDir, resolve(config.projectRoot, "uploads/brand"));
  } finally {
    process.chdir(originalCwd);
    restoreEnv("DATA_DIR", originalDataDir);
    restoreEnv("DATABASE_PATH", originalDatabasePath);
    restoreEnv("UPLOADS_DIR", originalUploadsDir);
    restoreEnv("BRAND_UPLOADS_DIR", originalBrandUploadsDir);
  }
});

test("config falls back to retention defaults and accepts explicit overrides", () => {
  const originalSnapshotDays = process.env.METRIC_SNAPSHOT_RETENTION_DAYS;
  const originalSummaryDays = process.env.DAILY_SUMMARY_RETENTION_DAYS;
  const originalVacuumEnabled = process.env.METRIC_RETENTION_VACUUM_ENABLED;

  delete process.env.METRIC_SNAPSHOT_RETENTION_DAYS;
  delete process.env.DAILY_SUMMARY_RETENTION_DAYS;
  delete process.env.METRIC_RETENTION_VACUUM_ENABLED;

  try {
    assert.equal(config.metricSnapshotRetentionDays, 90);
    assert.equal(config.dailySummaryRetentionDays, 1_825);
    assert.equal(config.metricRetentionVacuumEnabled, true);

    process.env.METRIC_SNAPSHOT_RETENTION_DAYS = "120";
    process.env.DAILY_SUMMARY_RETENTION_DAYS = "365";
    process.env.METRIC_RETENTION_VACUUM_ENABLED = "false";

    assert.equal(config.metricSnapshotRetentionDays, 120);
    assert.equal(config.dailySummaryRetentionDays, 365);
    assert.equal(config.metricRetentionVacuumEnabled, false);

    process.env.METRIC_SNAPSHOT_RETENTION_DAYS = "not-a-number";
    process.env.DAILY_SUMMARY_RETENTION_DAYS = "NaN";
    process.env.METRIC_RETENTION_VACUUM_ENABLED = "FALSE";

    assert.equal(config.metricSnapshotRetentionDays, 90);
    assert.equal(config.dailySummaryRetentionDays, 1_825);
    assert.equal(config.metricRetentionVacuumEnabled, true);
  } finally {
    restoreEnv("METRIC_SNAPSHOT_RETENTION_DAYS", originalSnapshotDays);
    restoreEnv("DAILY_SUMMARY_RETENTION_DAYS", originalSummaryDays);
    restoreEnv("METRIC_RETENTION_VACUUM_ENABLED", originalVacuumEnabled);
  }
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
