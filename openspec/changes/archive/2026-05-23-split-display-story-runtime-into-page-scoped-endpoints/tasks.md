## 1. Server Runtime API Split

- [x] 1.1 完成 `Expose page-scoped display story routes alongside the aggregate endpoint`，讓 `Expose page-scoped display story runtime endpoints` 對 `overview`、`solar`、`factory-circuit` 提供 `GET /api/display-story/:pageId`，且 response 只含單頁 payload wrapper；驗證方式為補齊 `apps/server/src/routes/display-story.test.ts` 並執行 `pnpm --filter @solar-display/server test`。
- [x] 1.2 完成 `Split displayStoryService into page readers with shared snapshot reuse`，讓 aggregate route 與 page routes 共用同一套 page readers 與 source snapshot，而不是維持單體讀取函式；驗證方式為 code review 確認 page readers 可獨立呼叫，並執行 `pnpm --filter @solar-display/server test`。
- [x] 1.3 完成 `Keep aggregate display story route compatible during migration`，讓既有 `GET /api/display-story` 仍維持 legacy shape，且 payload 與 page-scoped readers 對同一來源資料產生一致結果；驗證方式為 aggregate compatibility route test 加上 `pnpm --filter @solar-display/server test`。

## 2. Web Runtime Consumer Migration

- [x] 2.1 完成 `Switch useDisplayStoryRuntime to page-local payload fetches`，讓 web monitoring runtime 直接抓對應 page payload，而不是先抓 aggregate story 再切片，同時保持 hook 對頁面元件的回傳 shape 不變；驗證方式為補齊 `useDisplayStoryRuntime` / API helper 測試並執行 `pnpm --filter @solar-display/web test`。
- [x] 2.2 補齊 `Expose page-scoped display story runtime endpoints` 與 `Keep aggregate display story route compatible during migration` 的端到端驗證矩陣，確認 server 與 web 兩端都沿用新 contract，並以 `spectra analyze split-display-story-runtime-into-page-scoped-endpoints`、`spectra validate split-display-story-runtime-into-page-scoped-endpoints --strict` 驗證 artifact 完整性。
