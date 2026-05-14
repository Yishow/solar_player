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
  }
};
