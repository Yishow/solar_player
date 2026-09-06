CREATE TABLE IF NOT EXISTS site_energy_profiles (
  profile_id TEXT NOT NULL,
  metric_scope TEXT NOT NULL CHECK (metric_scope IN ('cl', 'kn')),
  revision INTEGER NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  site_time_zone TEXT NOT NULL,
  status TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  site_total_json TEXT NOT NULL,
  departments_json TEXT NOT NULL,
  share_basis_json TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (metric_scope, revision)
);
