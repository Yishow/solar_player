## 1. Shared 總秒數函式

- [x] 1.1 在 packages/shared/src/imagePlaylist.test.ts 新增測試:給定含 enabled/disabled、playable/不可播、不同秒數的 entries，函式回 max(1, Σ enabled 且 playable 秒數);全部停用時回 0(代表 fallback)。先執行 `npx tsx --test packages/shared/src/imagePlaylist.test.ts` 確認新案例失敗(red)。
- [x] 1.2 在 packages/shared/src/imagePlaylist.ts 新增純函式，加總 enabled 且 isPlayable 的 entry 的 durationSeconds(下限 1;無符合 entry 回 0)，不更動既有 resolve 邏輯。驗證:`npx tsx --test packages/shared/src/imagePlaylist.test.ts` 全綠且 `pnpm run build` 通過。

## 2. Rotation 覆寫 Images 頁停留秒數

- [x] 2.1 實作 requirement「Derive the Images page rotation slot from the enabled playlist」:在 apps/server/src/services/displayRotationService.ts 組裝 rotation pages 時，對 templateKey 為 images 的頁，以第 1 組的 shared 總秒數函式覆寫 durationSeconds(總秒數 > 0 時)，否則沿用 registry duration;因 rotation preview 與 runtime 同源，覆寫一處同步生效。驗證:第 3 組 server 測試中 images 頁 duration 案例綠燈。

## 3. 測試與整體驗證

- [x] 3.1 更新 apps/server/src/routes/display-pages.test.ts 的 rotation-preview 案例:在已知 enabled image playlist 下，斷言 images 頁 durationSeconds 等於啟用且可播 entry 的秒數總和;另斷言空(全停用)playlist 時 images 頁 durationSeconds 等於 registry 設定值。驗證:`pnpm --filter @solar-display/server test` 全綠。
- [x] 3.2 整體回歸:確認 `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 全綠，且 `pnpm run build` 通過。驗證:三道指令輸出皆成功且無失敗測試。
