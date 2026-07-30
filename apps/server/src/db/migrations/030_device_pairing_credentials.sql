CREATE TABLE IF NOT EXISTS pairing_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS device_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  credential_hash TEXT NOT NULL UNIQUE CHECK (length(credential_hash) = 64),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS pairing_tokens_device_id_idx
ON pairing_tokens(device_id);

CREATE INDEX IF NOT EXISTS device_credentials_device_id_idx
ON device_credentials(device_id);

CREATE UNIQUE INDEX IF NOT EXISTS device_credentials_one_active_per_device_idx
ON device_credentials(device_id)
WHERE revoked_at IS NULL;
