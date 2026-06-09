## 1. 後端 bulk duration

- [x] 1.1 在 apps/server/src/services/imagePlaylistService.ts 新增 bulk 函式，將所有 Images playlist entry 的 duration_seconds 設為提供值(下限 1)，且不更動 display order、enabled、metadata 等其他欄位。驗證:由第 1.2 項的 route 測試涵蓋。
- [x] 1.2 實作 requirement「Set every Images playlist entry duration in one action」:在 apps/server/src/routes/image-playlist.ts 新增端點 PUT /api/image-playlist/duration-all(body 含 durationSeconds)呼叫 1.1 函式，沿用既有成功回應形狀並發出 images-updated 與 display-sync 事件;在 apps/server/src/routes/image-playlist.test.ts 斷言 bulk 後所有 entry duration 等於提供值、低於 1 時為 1、其他欄位不變、事件發出。驗證:`pnpm --filter @solar-display/server test` 全綠。

## 2. 管理 UI

- [x] 2.1 在 apps/web/src/services/api.ts 新增呼叫 bulk duration 端點的函式，並於 apps/web/src/pages/ImageManagement/index.tsx 與 apps/web/src/pages/ImageManagement/ImageManagementContent.tsx 加入「設定全部秒數」控制(輸入 N 後套用至所有 entry，套用後重新同步 playlist)。驗證:`pnpm --filter @solar-display/web test` 全綠，並內容審閱確認控制與 API 串接。

## 3. 整體驗證

- [x] 3.1 整體回歸:確認 `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 全綠，且 `pnpm run build` 通過。驗證:三道指令輸出皆成功且無失敗測試。
