## 1. Daily boundary integrity

- [ ] 1.1 調整 DailySummaryService 保存 last processed counters/date 並以 pre-midnight snapshot 關閉前一天。
- [ ] 1.2 新日 baseline 改從 previous-day closing counters 延續，確保 post-midnight delta 歸新日。
- [ ] 1.3 修正既有跨午夜 test，不再把 00:01 增量期待在前一天。
- [ ] 1.4 新增 restart-before/after-midnight 與 peak timestamp regression tests。

## 2. Retention safety

- [ ] 2.1 為 snapshot/summary retention env 實作 positive-integer startup validation。
- [ ] 2.2 在 retention plan/service 加 defensive validation，invalid window 不得算 cutoff 或執行 sweep。
- [ ] 2.3 更新 `.env.example` 與 config tests，涵蓋 unset/default、0、負數、小數與非數字。
- [ ] 2.4 新增 invalid config 下 zero destructive-query witness。

## 3. Verification

- [ ] 3.1 跑 DailySummaryService、MetricHistoryRetentionService、config/server-startup targeted tests。
- [ ] 3.2 跑 root `pnpm test`、`pnpm build` 與 `pnpm verify`。
