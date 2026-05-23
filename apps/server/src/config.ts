import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, "../../..");

function readNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveDataDir() {
  return resolveEnvPath(process.env.DATA_DIR, resolve(projectRoot, "data"));
}

function resolveEnvPath(value: string | undefined, fallback: string) {
  if (!value || value.trim().length === 0) {
    return fallback;
  }

  return isAbsolute(value) ? value : resolve(projectRoot, value);
}

export const config = {
  projectRoot,
  openapiPath: resolve(projectRoot, "docs/openapi.yaml"),
  migrationsDir: resolve(projectRoot, "apps/server/src/db/migrations"),
  get host() {
    return process.env.HOST ?? "0.0.0.0";
  },
  get port() {
    return readNumber(process.env.PORT, 3000);
  },
  get dataDir() {
    return resolveDataDir();
  },
  get uploadsDir() {
    return resolveEnvPath(process.env.UPLOADS_DIR, resolve(projectRoot, "uploads/images"));
  },
  get brandUploadsDir() {
    return resolveEnvPath(process.env.BRAND_UPLOADS_DIR, resolve(projectRoot, "uploads/brand"));
  },
  get databasePath() {
    return resolveEnvPath(
      process.env.DATABASE_PATH,
      resolve(resolveDataDir(), "solar-display.sqlite")
    );
  },
  get managementTrustedOrigins() {
    return process.env.MANAGEMENT_TRUSTED_ORIGINS;
  },
  get managementAccessToken() {
    const value = process.env.MANAGEMENT_ACCESS_TOKEN?.trim();
    return value && value.length > 0 ? value : null;
  },
  get cwaAuthorization() {
    const value = process.env.CWA_AUTHORIZATION?.trim();
    return value && value.length > 0 ? value : null;
  },
  get cwaOpenDataUrl() {
    return process.env.CWA_OPEN_DATA_URL?.trim() || "https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001";
  },
  get weatherRequestTimeoutMs() {
    return readNumber(process.env.WEATHER_REQUEST_TIMEOUT_MS, 5_000);
  },
  get metricSnapshotRetentionDays() {
    return readNumber(process.env.METRIC_SNAPSHOT_RETENTION_DAYS, 90);
  },
  get dailySummaryRetentionDays() {
    return readNumber(process.env.DAILY_SUMMARY_RETENTION_DAYS, 1_825);
  },
  get metricRetentionVacuumEnabled() {
    return process.env.METRIC_RETENTION_VACUUM_ENABLED?.trim() !== "false";
  }
};
