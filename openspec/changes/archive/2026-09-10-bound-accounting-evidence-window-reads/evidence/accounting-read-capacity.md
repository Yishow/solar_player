# Accounting read capacity evidence

Date: 2026-09-10  
Scope: local differential/capacity evidence only; this is not production or field capacity acceptance.

## Reproduction

From the repository root:

```sh
pnpm --filter @solar-display/server exec tsx "$PWD/openspec/changes/archive/2026-09-10-bound-accounting-evidence-window-reads/evidence/accounting-read-capacity-benchmark.mts" 10000
pnpm --filter @solar-display/server exec tsx "$PWD/openspec/changes/archive/2026-09-10-bound-accounting-evidence-window-reads/evidence/accounting-read-capacity-benchmark.mts" 100000
```

The runner uses fixed seed `20260910`, one unmeasured warm-up, then seven measured runs per operation. Environment: Node `v24.15.0`, SQLite `3.53.4`, `darwin-arm64`. Each database contains 1,000 other-channel rows, 1,000 other-scope rows, three requested rows, and either 10,000 or 100,000 older same-site rows belonging to a retired identity. The requested closure is the same `cl/main` September 2026 window at both sizes.

Latency values are milliseconds. Median is the fourth sorted sample; p95 is the nearest-rank seventh sample for this intentionally small seven-run description.

## Results

| History rows | Operation | Queries | Materialized rows | Raw 7 runs (ms) | Median | p95 |
|---:|---|---:|---:|---|---:|---:|
| 10,000 | Full-scope baseline | 1 | 11,003 | 7.6167, 7.6658, 8.2499, 8.4870, 6.7575, 6.8957, 7.7064 | 7.6658 | 8.4870 |
| 10,000 | Calculation selection | 6 | 4 | 0.7936, 0.7233, 0.7319, 0.7567, 0.7370, 0.7227, 0.7091 | 0.7319 | 0.7936 |
| 10,000 | Projection fingerprint | 7 | 4 | 0.7699, 0.7553, 0.7736, 0.7890, 0.7382, 0.7689, 0.7168 | 0.7689 | 0.7890 |
| 100,000 | Full-scope baseline | 1 | 101,003 | 84.5431, 68.7683, 88.2065, 69.0536, 76.2137, 72.2751, 74.1209 | 74.1209 | 88.2065 |
| 100,000 | Calculation selection | 6 | 4 | 6.0710, 6.0383, 5.6984, 5.7278, 5.6667, 5.7389, 5.7265 | 5.7278 | 6.0710 |
| 100,000 | Projection fingerprint | 7 | 4 | 5.7916, 5.7360, 5.7056, 5.8688, 5.8915, 5.7492, 5.9612 | 5.7916 | 5.9612 |

Hard-gate observations:

- Calculation selection remains at 6 query executions and 4 materialized rows when unrelated history grows 10x; the fourth row is the required newest baseline of the retired full identity.
- Projection fingerprint remains at 7 query executions and 4 materialized rows.
- The full-scope baseline materializes 90,000 additional unrelated rows.
- The bounded window plan is `SEARCH meter_readings_accepted USING INDEX meter_readings_accepted_channel_instant (metric_scope=? AND channel_id=? AND <expr>>? AND <expr><?)` at both sizes; no scope-wide accepted-reading scan is used.
- The two additive indexes cost 782,336 bytes at 10,000 history rows and 6,713,344 bytes at 100,000 history rows (SQLite page size 4,096 bytes).

## Memory observations

The runner records the largest `heapTotal` and process `maxRSS` observed immediately after each synchronous read. These values include fixture/database memory and are process-wide observations, not isolated per-operation allocations.

| History rows | Operation | Observed heapTotal peak | Observed maxRSS peak |
|---:|---|---:|---:|
| 10,000 | Full-scope baseline | 47,693,824 B | 118,960 KiB |
| 10,000 | Calculation selection | 47,693,824 B | 119,360 KiB |
| 10,000 | Projection fingerprint | 47,693,824 B | 121,888 KiB |
| 100,000 | Full-scope baseline | 218,939,392 B | 482,176 KiB |
| 100,000 | Calculation selection | 186,269,696 B | 482,544 KiB |
| 100,000 | Projection fingerprint | 186,269,696 B | 484,976 KiB |

The row/query invariants and indexed plans are the acceptance gates. Timing and process-wide memory values are descriptive local evidence only and must not be presented as a production SLA or capacity result.
