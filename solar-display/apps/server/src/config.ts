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

const dataDir = process.env.DATA_DIR ?? resolve(projectRoot, "data");

export const config = {
  host: process.env.HOST ?? "0.0.0.0",
  port: readNumber(process.env.PORT, 3000),
  projectRoot,
  dataDir,
  databasePath: process.env.DATABASE_PATH ?? resolve(dataDir, "solar-display.sqlite"),
  openapiPath: resolve(projectRoot, "docs/openapi.yaml"),
  uploadsDir: resolve(projectRoot, "uploads/images"),
  migrationsDir: resolve(projectRoot, "apps/server/src/db/migrations")
} as const;
