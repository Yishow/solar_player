export const DEFAULT_SNAPSHOT_RETENTION_DAYS = 90;
export const DEFAULT_SUMMARY_RETENTION_DAYS = 1_825;
export const DEFAULT_RETENTION_SWEEP_INTERVAL_MS = 21_600_000;
export const DEFAULT_RETENTION_VACUUM_INTERVAL_MS = 604_800_000;

const DAY_IN_MS = 86_400_000;

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function assertPositiveRetentionDays(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer`);
  }
}

export function resolveRetentionCutoffs(
  now: Date,
  opts: {
    snapshotRetentionDays: number;
    summaryRetentionDays: number;
  }
) {
  // Defense in depth: configuration normally falls back to safe defaults, but
  // direct service construction or future callers must never turn a negative
  // retention value into a cutoff in the future and delete current history.
  assertPositiveRetentionDays(opts.snapshotRetentionDays, "snapshotRetentionDays");
  assertPositiveRetentionDays(opts.summaryRetentionDays, "summaryRetentionDays");

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
