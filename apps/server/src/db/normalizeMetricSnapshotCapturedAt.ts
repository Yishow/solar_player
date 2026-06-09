import type Database from "better-sqlite3";

type LegacySnapshotRow = {
  captured_at: string;
  snapshot_rowid: number;
};

const legacyCapturedAtPattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

export function normalizeMetricSnapshotCapturedAt(database: Database.Database) {
  const legacyRows = database
    .prepare(
      `
        SELECT rowid AS snapshot_rowid, captured_at
        FROM metric_snapshots
        WHERE captured_at LIKE '____-__-__ __:__:__%'
      `
    )
    .all() as LegacySnapshotRow[];

  if (legacyRows.length === 0) {
    return 0;
  }

  const updateCapturedAt = database.prepare(
    "UPDATE metric_snapshots SET captured_at = ? WHERE rowid = ?"
  );

  return database.transaction((rows: LegacySnapshotRow[]) => {
    let normalized = 0;

    for (const row of rows) {
      if (!legacyCapturedAtPattern.test(row.captured_at)) {
        continue;
      }

      const parsed = new Date(row.captured_at.replace(" ", "T"));
      if (Number.isNaN(parsed.getTime())) {
        continue;
      }

      normalized += updateCapturedAt.run(parsed.toISOString(), row.snapshot_rowid).changes;
    }

    return normalized;
  })(legacyRows);
}
