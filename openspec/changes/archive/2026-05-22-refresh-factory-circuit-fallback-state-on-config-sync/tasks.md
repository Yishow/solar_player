## 1. Fallback Refresh Lifecycle

- [x] 1.1 完成 `Reuse display sync invalidation for fallback circuits reload`，讓 `Replace Factory Circuit load heuristics with explicit slot binding` 在 `Factory Circuit` 使用 circuits fallback data 時，收到 `display:sync(scope=circuits|display-pages)` 會重新抓取最新 circuits source，而不是只靠初次 mount；驗證方式為新增 `FactoryCircuit` 頁面測試覆蓋同步後 row 更新，並執行 `pnpm --filter @solar-display/web test`。
- [x] 1.2 完成 `Keep circuits fallback reload page-local instead of extending useDisplayStoryRuntime`，把 circuits fallback reload 維持在 `Factory Circuit` 頁面的 page-local lifecycle，並確保較舊的 refresh response 不會覆蓋較新的同步結果；驗證方式為 code review 確認 `useDisplayStoryRuntime` contract 未擴張，且新增 race regression test 後執行 `pnpm --filter @solar-display/web test`。

## 2. Failure Handling And Regression Guards

- [x] 2.1 完成 `Preserve last settled fallback rows across refresh failures`，讓 sync-triggered circuits refresh 失敗時仍保留上一版已結算的 fallback rows，同時維持既有 fallback 或 error 訊號可見；驗證方式為新增 refresh failure regression test 並執行 `pnpm --filter @solar-display/web test`。
- [x] 2.2 補齊 `Replace Factory Circuit load heuristics with explicit slot binding` 的回歸矩陣，確認 bootstrap fallback、sync refresh、refresh failure 三條行為都被測試涵蓋，並以 `pnpm --filter @solar-display/web test`、`spectra analyze refresh-factory-circuit-fallback-state-on-config-sync --strict`、`spectra validate refresh-factory-circuit-fallback-state-on-config-sync --strict` 驗證完成。
