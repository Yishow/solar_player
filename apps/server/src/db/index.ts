import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { config } from "../config.js";

let database: Database.Database | null = null;

export function getDatabase() {
  if (!database) {
    mkdirSync(config.dataDir, { recursive: true });
    database = new Database(config.databasePath);
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");
  }

  return database;
}

export function closeDatabaseConnection() {
  if (database) {
    database.close();
    database = null;
  }
}
