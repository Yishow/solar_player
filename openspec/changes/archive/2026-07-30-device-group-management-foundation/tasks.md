## 1. TDD 與資料模型

- [x] 1.1 先為 Persist stable devices and flat groups、Keep group assignment unambiguous、Preserve referential integrity during Group lifecycle changes 寫 failing migration/service contract tests；以 pnpm --filter @solar-display/server test src/routes/device-group-management.test.ts 驗證紅燈涵蓋 unique clientId、cl/kn、group_in_use 與 transaction rollback。
- [x] 1.2 實作 Enforce one active group assignment in the relational model 與 Reference the formal Playback Profile directly，使 migration 可重跑且啟用 Device 必有有效 Group/Profile；以 migration contract test 與 SQLite foreign-key assertions 驗證。

## 2. API 與信任邊界

- [x] 2.1 實作 Device／Group service 與 /api/devices、/api/device-groups CRUD，使 Protect Device and Group management mutations 與 Reuse the existing management mutation boundary 成立；以 Fastify inject 測試 trusted/untrusted、400/409 與無部分寫入。
- [x] 2.2 [P] 匯出 shared Device/Group/Site Scope contracts，使 server 與後續 Client Context 使用同一 data shape；以 pnpm run build:shared 與 type contract test 驗證。
- [x] 2.3 [P] 補 API integration tests 驗證 Device move、Group disable、Profile missing 與 disabled Device 保留 Group reference；直跑 src/routes/device-group-management.test.ts。

## 3. 整體驗證

- [x] 3.1 執行 pnpm test、pnpm build、pnpm verify 與 spectra analyze device-group-management-foundation，修正所有 Critical/Warning 並記錄實際輸出。
