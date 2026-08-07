CREATE TABLE IF NOT EXISTS management_password_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  password_hash TEXT,
  password_salt TEXT,
  kdf_name TEXT,
  kdf_cost INTEGER,
  kdf_block_size INTEGER,
  kdf_parallelization INTEGER,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO management_password_settings (id, updated_at)
VALUES (1, datetime('now'));

CREATE TABLE IF NOT EXISTS management_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
