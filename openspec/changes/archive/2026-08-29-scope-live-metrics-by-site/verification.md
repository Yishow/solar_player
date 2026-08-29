# Verification

## Passing commands

- `pnpm verify` — all stages passed: build, bundle-budget, server, web, deploy, and server-runner.
- `pnpm --filter @solar-display/server test` — 664 passed, 0 failed.
- `pnpm --filter @solar-display/web test` — 963 passed, 0 failed.
- `pnpm --filter @solar-display/server exec tsx --test ../../packages/shared/src/metricScope.test.ts ../../packages/shared/src/displayPageFreshness.test.ts` — 11 passed, 0 failed.
- `pnpm --filter @solar-display/server build` — passed.
- `pnpm --filter @solar-display/web build` — passed.
- Deploy verification — 110 passed, 1 skipped, 0 failed.
- Server-runner verification — 11 passed, 0 failed.

## Migration and rollback

- Migration `035_scoped_metric_identity` is transactional and idempotent once recorded in `schema_migrations`.
- A legacy database containing site-dependent rows without an inferable repository-known site alias must be started or migrated with `LEGACY_METRIC_SITE_SCOPE=cl` or `LEGACY_METRIC_SITE_SCOPE=kn`. Missing, `global`, empty, or unknown values fail before the scoped migration is committed.
- Before rollout, stop the server and retain a copy of the SQLite database, including any active `-wal` and `-shm` files after a clean checkpoint/stop.
- Rollback is restore-only: stop the new binary, restore the pre-migration SQLite backup, then start the previous binary. The old binary must not be pointed at a database after migration 035.
- Local automated verification does not constitute broker, Pi, LAN, or production acceptance.
