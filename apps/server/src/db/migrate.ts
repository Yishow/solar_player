import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "../config.js";
import { closeDatabaseConnection, getDatabase } from "./index.js";
import {
  migrateScopedMetricIdentity,
  normalizeLegacySiteScope,
  type MigrationOptions
} from "./scopedMetricMigration.js";

export function migrateDatabase(options: MigrationOptions = {}) {
  const database = getDatabase();
  const legacySiteScope = normalizeLegacySiteScope(options.legacySiteScope);

  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const appliedVersions = new Set(
    (database
      .prepare("SELECT version FROM schema_migrations")
      .all() as Array<{ version: string }>).map((row) => row.version)
  );

  const migrationFiles = readdirSync(config.migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  const insertMigration = database.prepare(
    "INSERT INTO schema_migrations (version) VALUES (@version)"
  );

  for (const fileName of migrationFiles) {
    const version = fileName.replace(/\.sql$/u, "");

    if (appliedVersions.has(version)) {
      continue;
    }

    const sql = readFileSync(resolve(config.migrationsDir, fileName), "utf8");

    database.transaction(() => {
      if (version === "035_scoped_metric_identity") {
        migrateScopedMetricIdentity(database, { legacySiteScope });
      } else {
        database.exec(sql);
      }
      insertMigration.run({ version });
    })();
  }
}

export function migrateDatabaseFromEnvironment() {
  migrateDatabase({
    legacySiteScope: normalizeLegacySiteScope(process.env.LEGACY_METRIC_SITE_SCOPE)
  });
}

async function runFromCli() {
  try {
    migrateDatabaseFromEnvironment();
  } finally {
    closeDatabaseConnection();
  }
}

const entryFile = process.argv[1];

if (entryFile && import.meta.url === pathToFileURL(resolve(entryFile)).href) {
  void runFromCli();
}
