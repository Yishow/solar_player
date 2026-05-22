export const DEFAULT_SNAPSHOT_RETENTION_DAYS = 90;
export const DEFAULT_SUMMARY_RETENTION_DAYS = 1_825;
export const DEFAULT_RETENTION_SWEEP_INTERVAL_MS = 21_600_000;
export const DEFAULT_RETENTION_VACUUM_INTERVAL_MS = 604_800_000;

const DAY_IN_MS = 86_400_000;

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function resolveRetentionCutoffs(
  now: Date,
  opts: {
    snapshotRetentionDays: number;
    summaryRetentionDays: number;
  }
) {
  return {
    snapshotCutoffIso: new Date(now.getTime() - (opts.snapshotRetentionDays * DAY_IN_MS)).toISOString(),
    summaryCutoffDate: toDateKey(
      new Date(now.getTime() - (opts.summaryRetentionDays * DAY_IN_MS))
    )
  };
}

export function shouldRunVacuum(input: {
  vacuumEnabled: boolean;
  deletedRows: number;
  lastVacuumAt: number | null;
  now: number;
  vacuumIntervalMs: number;
}) {
  if (!input.vacuumEnabled || input.deletedRows <= 0) {
    return false;
  }

  if (input.lastVacuumAt === null) {
    return true;
  }

  return (input.now - input.lastVacuumAt) >= input.vacuumIntervalMs;
}
