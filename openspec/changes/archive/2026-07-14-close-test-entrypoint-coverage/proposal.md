## Why

root test command 目前漏掉 `apps/server/src/` 頂層 5 個 test files（15 tests），也完全不執行 37 個 deploy tests；因此 test 綠燈不代表 repo 的既有測試都有被執行。需要一個名稱與實際覆蓋一致、失敗能可靠傳遞的 root verification entrypoint。

## What Changes

- 用明確 test discovery runner 取代依賴 shell globstar 的 server test script，穩定收錄頂層與巢狀 tests。
- 新增 root verify entrypoint，依序執行 build、完整 server tests、web tests 與 deploy tests。
- 為 test discovery runner 補自我測試，證明頂層測試會被列入且任一測試失敗會非零退出。
- root test 保持快速回饋但不得再宣稱不存在的覆蓋；同步移除 ops 文件中的手動繞路條款。

## Non-Goals

- 不新增 lint、coverage threshold、CI workflow 或跨瀏覽器 e2e。
- 不改動既有測試內容來湊數量。
- 不平行執行目前要求 serial 的 server tests。

## Capabilities

### New Capabilities

- `repository-verification-entrypoint`: 定義完整 test discovery、root verify 組成、計數證據與 failure propagation。

### Modified Capabilities

（無）

## Impact

- Affected specs: `repository-verification-entrypoint`
- Affected code:
  - Modified: `package.json`, `apps/server/package.json`, `docs/ops/conventions.md`
  - New: `apps/server/scripts/run-tests.mjs`, `apps/server/scripts/run-tests.test.mjs`
  - Removed: none
