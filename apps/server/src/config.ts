import { dirname, resolve } from "node:path";
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
  return process.env.DATA_DIR ?? resolve(projectRoot, "data");
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
    return process.env.UPLOADS_DIR ?? resolve(projectRoot, "uploads/images");
  },
  get databasePath() {
    return process.env.DATABASE_PATH ?? resolve(resolveDataDir(), "solar-display.sqlite");
  }
};
