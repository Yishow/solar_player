## 1. Build Stabilization (pre-existing)

- [x] 1.1 修 `apps/web/src/hooks/displayTransition.ts` 的 `resolveDisplayTransitionMode` undefined 窄化；完成後以 `pnpm --filter @solar-display/web exec tsc --noEmit`（或 `pnpm run build:web`）該錯誤消失驗證。
- [x] 1.2 修 `apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts` 的 `string | undefined` 型別錯誤；完成後以 build/tsc 無該錯誤驗證。
- [x] 1.3 確認 `pnpm run build` 全綠（shared+web+server）。

## 2. Brightness + Orientation Surface Helper (TDD)

- [x] 2.1 為 `resolveDisplayCanvasSurfaceStyle({ brightness, orientation })` 先寫 focused test：brightness 100/缺值=identity、60→brightness(0.6)、150→brightness(1.5)；orientation portrait→rotate(90deg)、landscape/缺值=identity；完成後以新 test 檔 RED 驗證。
- [x] 2.2 實作 `apps/web/src/components/displayCanvasSurfaceStyle.ts` pure helper（immutable、clamp brightness 0–200）使 test GREEN；完成後以該 test pass 驗證。

## 3. Wire Into DisplayCanvas + LayoutShell

- [x] 3.1 `DisplayCanvas` 接受 `brightness`/`orientation` props 並把 helper 結果套到最外層 viewport style；補/調 DisplayCanvas 消費測試；完成後以 web test 驗證。
- [x] 3.2 `LayoutShell` 將 `controller.settings?.brightness`/`orientation` 傳入 `DisplayCanvas`；完成後以內容審查確認 settings 流向正確、未載入時為預設 identity。

## 4. Image Playlist Seed

- [x] 4.1 於 `apps/server/src/db/seed.ts` 補 ≥4 筆 image playlist/asset seed（upsert、固定 id，不改 image API/上傳限制）；補/調 server seed 測試；完成後以 `pnpm --filter @solar-display/server test` 驗證 ≥4 entries。

## 5. Gates + Manual Witness

- [x] 5.1 跑 `pnpm --filter @solar-display/web test`、`pnpm --filter @solar-display/server test`、`pnpm run build` 全綠；完成後以三者結束碼 0 驗證。
- [x] 5.2 在運行 app 手動確認 brightness（調低變暗）、orientation（portrait 旋轉 90°）生效，`/images` 顯示 4-up；完成後把觀察記入 change handoff。
- [x] 5.3 跑 Spectra gates：`spectra analyze` 無 Critical、`spectra validate --strict` 通過。
