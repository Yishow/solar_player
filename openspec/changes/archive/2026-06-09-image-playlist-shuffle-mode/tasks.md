## 1. Shuffle 設定儲存與 API

- [x] 1.1 實作 requirement「Provide a persisted playlist-level shuffle setting」(儲存與讀取):在 apps/server/src/services/imagePlaylistService.ts 以 ensure-table 模式新增 image_playlist_settings 單列表(shuffle INTEGER 預設 0)與讀寫函式，並讓 readImagePlaylist 回傳的 payload 含 settings.shuffle。驗證:apps/server/src/routes/image-playlist.test.ts 斷言預設 shuffle 為 off 且出現在 GET payload，`pnpm --filter @solar-display/server test` 綠燈。
- [x] 1.2 在 apps/server/src/routes/image-playlist.ts 新增 PUT /api/image-playlist/settings 更新 shuffle，沿用既有成功回應形狀並發出既有的 images-updated 與 display-sync 事件。驗證:apps/server/src/routes/image-playlist.test.ts 斷言 PUT 後 shuffle 持久化、再次 GET 為 on 且事件發出，`pnpm --filter @solar-display/server test` 綠燈。

## 2. Shared 排序純函式

- [x] 2.1 [P] 在 packages/shared/src/imagePlaylist.test.ts 新增測試:shuffle=false 回 display order;shuffle=true 在固定 seed 下回確定排列且涵蓋每個啟用且可播 entry 恰一次。先執行 `npx tsx --test packages/shared/src/imagePlaylist.test.ts` 確認新案例失敗(red)。
- [x] 2.2 實作 requirement「Randomize Images playback order when shuffle is on」:在 packages/shared/src/imagePlaylist.ts 新增純函式 resolveImagesPlaybackOrder(entries, { shuffle, seed })，回傳啟用且可播 entry 的 entryId 順序(shuffle 為 false 即 display order;為 true 以 seed 決定洗牌、每個恰一次)。驗證:`npx tsx --test packages/shared/src/imagePlaylist.test.ts` 全綠且 `pnpm run build` 通過。

## 3. Runtime 與管理 UI

- [x] 3.1 在 apps/web/src/hooks/useImagesAutoplay.ts 改為沿排序函式前進:取得 playlist payload 的 shuffle 旗標，shuffle on 時依洗牌順序前進、完成一輪後以新 seed 重洗;off 維持 display order。驗證:apps/web/src/hooks/useImagesAutoplay.test.ts 斷言 shuffle on 一輪涵蓋所有啟用 entry、off 維持 display order，`pnpm --filter @solar-display/web test` 綠燈。
- [x] 3.2 [P] 在 apps/web/src/services/api.ts 新增讀寫 shuffle 設定的呼叫，並於 apps/web/src/pages/ImageManagement/index.tsx 與 apps/web/src/pages/ImageManagement/ImageManagementContent.tsx 加入 shuffle 切換(讀目前值、切換後寫回 API)。驗證:`pnpm --filter @solar-display/web test` 全綠，並內容審閱確認 toggle 與 API 串接。

## 4. 整體驗證

- [x] 4.1 整體回歸:確認 `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 全綠，且 `pnpm run build` 通過。驗證:三道指令輸出皆成功且無失敗測試。
