import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "../config.js";
import { closeDatabaseConnection, getDatabase } from "./index.js";

export function migrateDatabase() {
  const database = getDatabase();

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
      database.exec(sql);
      insertMigration.run({ version });
    })();
  }
}

async function runFromCli() {
  try {
    migrateDatabase();
  } finally {
    closeDatabaseConnection();
  }
}

const entryFile = process.argv[1];

if (entryFile && import.meta.url === pathToFileURL(resolve(entryFile)).href) {
  void runFromCli();
}
