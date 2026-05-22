## 1. Shared concurrency contract

- [x] 1.1 在 shared types 與 API helper 中定義可重用的 management draft save precondition / conflict envelope，並讓 display page draft 先成為第一個採用者。對應 design topic: decision: use envelope version as the optimistic concurrency token.
- [x] 1.2 調整 `apps/server/src/services/displayPagePublishingService.ts` 與 `apps/server/src/routes/display-pages.ts`，讓 draft save 必須驗證 `baseVersion`，落實 `Reject stale management draft saves with an explicit optimistic-concurrency conflict`。對應 design topic: decision: return an explicit conflict envelope instead of silently reloading.

## 2. Editor conflict handling

- [x] 2.1 更新 `apps/web/src/hooks/useDisplayPageConfig.ts`，讓 save 會帶上 `lastLoadedEnvelope.version` 並在 409 conflict 時保留 local draft session、最新 server baseline 與明確 conflict message。對應 design topic: decision: keep the conflict contract reusable for other management draft surfaces.
- [x] 2.2 調整 display page editor/publishing UI，讓 operator 在 conflict 後能重新同步或比較，而不是只看到 generic save failure。

## 3. Verification

- [x] 3.1 補齊 server / web tests，覆蓋成功 save、stale save 409 conflict、`Preserve local draft edits when a save conflict occurs` 與最新 baseline 回傳。
- [x] 3.2 執行 `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 與 `spectra analyze add-optimistic-concurrency-to-management-draft-saves`。
